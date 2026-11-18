import { boronFor } from '../chemistry/index.ts';
import { approxCelsius, approxCone, isCone, ordinal } from '../cones/firing.ts';
import { FIRING_BANDS, bandOf, pastSide } from './limits.ts';
import { say, figure } from './messages.ts';
import type { ConeScale, FiringBlock } from '../cones/firing.ts';
import type { FiringBand, LimitSet } from './limits.ts';
import type { MessageParams, RecipeMessage, RecipeMessageCode } from './messages.ts';
import type { Oxides } from '../types.ts';
import type { Host } from '../host.ts';

/** What a cone's temperature rests on (cones/firing.ts approxCelsius). */
export type ApproxBasis = 'orton-150' | 'orton-150-halfway' | 'orton-2016-150' | 'kyoto' | 'stated';

/** A cone's approximate temperature and what it rests on. */
type Approx = { celsius: number; basis: ApproxBasis };

/** Where a figure is from: Katz's boron rule, Hesselberth & Roy's limits, or the UK traditional limits. */
export type ConeFitSource = 'katz' | 'hesselberth-roy' | 'uk';

/** Why a glaze is not judged. */
export type ConeFitSkip =
  | 'lead'
  | 'lithium'
  | 'alkali'
  | 'zinc'
  | 'notGlaze'
  | 'process'
  | 'ash'
  | 'noTemperature'
  | 'between'
  | 'belowChart'
  | 'aboveChart';

/** One of the two signals: an oxide's value against a figure, for a band, and where the figure is from. */
export interface ConeFitSignal {
  key: 'B2O3' | 'SiO2' | 'Al2O3';
  value: number;
  figure: number;
  /** The side of the figure the value is on. */
  side: 'above' | 'below';
  band: FiringBand;
  source: ConeFitSource;
}

export interface ConeFit {
  /** What was judged against: the firing's bands and its ends (a band chosen by hand is read at its cone). */
  stated: {
    bands: FiringBand[];
    ends: Array<{
      scale: ConeScale | 'band';
      cone?: string;
      band?: FiringBand;
      celsius?: number;
      basis?: ApproxBasis;
    }>;
    chosen?: FiringBand;
  };
  verdict: 'cooler' | 'hotter' | 'closer' | 'fits' | 'skipped';
  /** The band the chemistry looks like, for a note or 'closer'. */
  looksLike: FiringBand | null;
  /** For 'closer': the end of the range it looks closer to. */
  closerTo?: { scale: ConeScale | 'band'; cone?: string };
  signals: ConeFitSignal[];
  /** 'soft' for cone 6 against cone 10, which chemistry tells apart only roughly; null with no note. */
  strength: 'firm' | 'soft' | null;
  skipped?: ConeFitSkip;
  /** The recipe has Gerstley borate, whose boron varies from lot to lot. */
  gerstley?: true;
  /** What to say, as message codes; a note's last sentence says it is a guide, not a test. */
  sentences: RecipeMessage[];
  /** The sources of the figures a note rests on. */
  sources: Array<{ id: ConeFitSource }>;
}

/** The two signals at one temperature, where they agree. */
interface Judged {
  direction: 'cooler' | 'hotter';
  band: FiringBand;
  need: number;
  signals: ConeFitSignal[];
}

// Whether a glaze's chemistry fits the cone it is stated for
// (docs/adr/0022-chemistry-against-the-stated-cone.md, and the research report
// "Chemistry against the stated cone"). Boron is the one strong signal: Matt
// Katz's rule asks for 0.1 B2O3 more for every 50 °C below cone 10 (boronFor),
// and Seger's own cones follow the same slope. Silica and alumina rise with the
// cone too, but overlap so much between bands that they only back boron up. So
// a note comes only when boron and silica or alumina agree on a band outside
// every band the stated firing covers. The figures are fixed, whatever limit
// set the page shows: Katz's for boron, Hesselberth & Roy's for silica and
// alumina at cone 6 and 10, and the UK traditional limits for silica at low
// fire. Measured on Glazy's glazes, about 1 in 50 to 200 judged recipes gets a
// note it does not deserve; the check tells low fire from the rest well, and
// cone 6 from cone 10 only roughly, so that note is worded softest.
//
// Where the figures do not cover a glaze (lead, lithium, much soda and potash,
// much zinc, a formula that is not a usual glaze's, raku, salt, soda, wood and
// pit firings, ash, the cones between low and mid fire, and any firing hotter
// than cone 10, where Katz's rule and Hesselberth & Roy's figures end) it says
// it cannot judge, rather than guess. A firing judged is never called a pass:
// no note says nothing about whether a glaze is stable or food safe.

/**
 * The margins and cut-offs a host gives the check (host.policy.coneFit; the catalog's are in
 * lib/catalog/policy.ts, with why each is what it is).
 */
export interface ConeFitPolicy {
  /** "Looks cooler": boron at least this much over Katz's need for the firing. */
  readonly boronOver: number;
  /** "Looks hotter": boron at least this much under Katz's need. */
  readonly boronUnder: number;
  /** "Looks hotter" at low fire: silica over this, where the set cone fit reads has no low-fire figures. */
  readonly lowFireSilicaMost: number;
  /** Can't judge: the published figures do not cover glazes melted this way. */
  readonly lead: number;
  readonly lithium: number;
  readonly alkali: number;
  readonly zinc: number;
  /** Can't judge: not a usual glaze's formula (a slip, a metallic, mostly colorant). */
  readonly silica: Readonly<{ min: number; max: number }>;
  readonly colorants: number;
}

/** The figures the check compares with: the host's margins and cut-offs, and its set's silica and alumina. */
const coneFitFigures = (host: Host) => {
  const policy = host.policy.coneFit;
  // The set cone fit reads (host.limits.forFit, Hesselberth & Roy's) has both bands' silica and alumina figures.
  const HR = host.limits.forFit.unity as Required<LimitSet['unity']>;
  return Object.freeze({
    boronOver: policy.boronOver,
    boronUnder: policy.boronUnder,
    /** "Looks cooler": silica or alumina under Hesselberth & Roy's least for the band. */
    floor: Object.freeze({
      mid: Object.freeze({ SiO2: HR.mid['SiO2']!.min!, Al2O3: HR.mid['Al2O3']!.min! }),
      high: Object.freeze({ SiO2: HR.high['SiO2']!.min!, Al2O3: HR.high['Al2O3']!.min! })
    }),
    /** "Looks hotter": silica over the band's most, at cone 6 the set's. */
    ceiling: Object.freeze({ low: policy.lowFireSilicaMost, mid: HR.mid['SiO2']!.max! }),
    lead: policy.lead,
    lithium: policy.lithium,
    alkali: policy.alkali,
    zinc: policy.zinc,
    silica: policy.silica,
    colorants: policy.colorants
  });
};

/** The cone a band chosen by hand is read at: the cone its figures are for (Hesselberth & Roy's 6 and 10; cone 04 at low fire). */
const BAND_CONES: Readonly<Partial<Record<FiringBand, string>>> = Object.freeze({ low: '04', mid: '6', high: '10' });

/** Oxides that color rather than melt, for the "not a usual glaze" check. */
const COLORANTS = ['MnO', 'CuO', 'CoO', 'Fe2O3', 'FeO'];
/** Firings where the kiln does part of the glazing. */
const KILN_GLAZED = ['raku', 'salt', 'soda', 'wood', 'pit'];

const two = (x: number) => figure(x, 2);
const value = (unity: Oxides, oxide: string): number => unity[oxide] ?? 0;
const celsiusAt = (host: Host, cone: string): number => (approxCelsius(host, 'orton', cone) as Approx).celsius;
/**
 * Katz's chart is for cone 06 to 10; cooler and hotter firings are not judged.
 * Above cone 10 his rule asks for no boron at all, and Hesselberth & Roy's
 * silica and alumina are for cone 10: the check would only be reading a cone 10
 * glaze's figures as though they reached further (ADR 0022, amended 2026-10-20).
 */
const katzFrom = (host: Host): number => celsiusAt(host, '06');
const katzTo = (host: Host): number => celsiusAt(host, '10');
/** The hottest cone of each scale the check judges: Orton 10, and SK 12, Kyoto's own stand-in for it. */
const HOTTEST: Readonly<Partial<Record<string, string>>> = Object.freeze({ orton: '10', sk: '12' });
/** The cones between low and mid fire, 01 to 3, which neither band's figures fit. */
const betweenBands = (host: Host) => ({ from: celsiusAt(host, '01'), to: celsiusAt(host, '3') });

/** A cone's temperature: its own figure, or for an SK cone with none, its stated Orton equivalent's (SK 12 ≈ cone 10). */
function celsiusOf(host: Host, scale: ConeScale, cone: string): Approx | null {
  const own: Approx | null = approxCelsius(host, scale, cone);
  if (own) return own;
  const orton: { cone: string } | null = approxCone(host, scale, cone, 'orton');
  return orton ? approxCelsius(host, 'orton', orton.cone) : null;
}

/**
 * Why the glaze cannot be judged, from its formula, firing and materials; null when it can.
 */
function formulaSkip(
  host: Host,
  unity: Oxides,
  processes: string[],
  ash: boolean
): { skipped: ConeFitSkip; process?: string } | null {
  const figures = coneFitFigures(host);
  if (value(unity, 'PbO') > figures.lead) return { skipped: 'lead' };
  if (value(unity, 'Li2O') >= figures.lithium) return { skipped: 'lithium' };
  if (value(unity, 'K2O') + value(unity, 'Na2O') >= figures.alkali) return { skipped: 'alkali' };
  if (value(unity, 'ZnO') >= figures.zinc) return { skipped: 'zinc' };
  const silica = value(unity, 'SiO2');
  const colorants = COLORANTS.reduce((sum, oxide) => sum + value(unity, oxide), 0);
  if (silica < figures.silica.min || silica > figures.silica.max || colorants > figures.colorants) {
    return { skipped: 'notGlaze' };
  }
  const process = KILN_GLAZED.find((p) => processes.includes(p));
  if (process) return { skipped: 'process', process };
  if (ash) return { skipped: 'ash' };
  return null;
}

/**
 * The two signals at one temperature: whether the glaze looks cooler or hotter
 * than it, and the figures that say so; null when they do not agree.
 */
function judgeAt(host: Host, unity: Oxides, celsius: number): Judged | null {
  const figures = coneFitFigures(host);
  // A finite temperature always has a band.
  const band = bandOf(host.limits.forFit, celsius)!;
  const need = boronFor(celsius);
  const boron = value(unity, 'B2O3');
  const silica = value(unity, 'SiO2');
  const alumina = value(unity, 'Al2O3');
  const floor = (figures.floor as Partial<Record<FiringBand, { SiO2: number; Al2O3: number }>>)[band];
  if (floor && pastSide(boron, { min: need + figures.boronOver }) !== 'below') {
    const low = (
      [
        ['SiO2', silica],
        ['Al2O3', alumina]
      ] as Array<['SiO2' | 'Al2O3', number]>
    ).filter(([key, v]) => pastSide(v, { min: floor[key] }) === 'below');
    if (low.length) {
      return {
        direction: 'cooler',
        band,
        need,
        signals: [
          {
            key: 'B2O3',
            value: boron,
            figure: need + figures.boronOver,
            side: 'above',
            band,
            source: 'katz'
          },
          ...low.map(([key, v]): ConeFitSignal => ({
            key,
            value: v,
            figure: floor[key],
            side: 'below',
            band,
            source: 'hesselberth-roy'
          }))
        ]
      };
    }
  }
  const ceiling = (figures.ceiling as Partial<Record<FiringBand, number>>)[band];
  if (
    ceiling !== undefined &&
    pastSide(boron, { max: need - figures.boronUnder }) !== 'above' &&
    pastSide(silica, { max: ceiling }) === 'above'
  ) {
    return {
      direction: 'hotter',
      band,
      need,
      signals: [
        {
          key: 'B2O3',
          value: boron,
          figure: Math.max(0, need - figures.boronUnder),
          side: 'below',
          band,
          source: 'katz'
        },
        {
          key: 'SiO2',
          value: silica,
          figure: ceiling,
          side: 'above',
          band,
          source: band === 'low' ? 'uk' : 'hesselberth-roy'
        }
      ]
    };
  }
  return null;
}

/**
 * The band a glaze judged cooler or hotter than a band looks like: the next
 * band that way, or two bands away when it looks so at cone 6 as well.
 */
function looksLikeFrom(host: Host, unity: Oxides, judged: Judged): FiringBand | undefined {
  const at = FIRING_BANDS.indexOf(judged.band);
  const step = judged.direction === 'cooler' ? -1 : 1;
  const next = FIRING_BANDS[at + step];
  if (next === 'mid') {
    const again = judgeAt(host, unity, celsiusOf(host, 'orton', BAND_CONES.mid!)!.celsius);
    if (again?.direction === judged.direction) return FIRING_BANDS[at + 2 * step];
  }
  return next;
}

/**
 * One end of the firing judged: a cone of its scale, or a band chosen by hand
 * (scale 'band'), with its temperature, what that rests on and its band where
 * it has them.
 */
interface End {
  scale: ConeScale | 'band';
  cone?: string;
  label?: string;
  band?: FiringBand;
  celsius?: number;
  basis?: ApproxBasis;
  above?: boolean;
}

/** The firing as a message names it: a cone of its scale (or a range, to `coneTo`), or a band chosen by hand. */
const named = (end: End, high?: End): MessageParams =>
  end.scale === 'band'
    ? { scale: 'band', band: end.band! }
    : { scale: end.scale, cone: end.cone!, ...(high && high !== end && { coneTo: high.cone! }) };

/** Whether a cone is hotter than the check's hottest (HOTTEST), by its place in its scale, figure or not. */
const pastHottest = (host: Host, scale: ConeScale, cone: string): boolean =>
  HOTTEST[scale] !== undefined && ordinal(host, scale, cone) > ordinal(host, scale, HOTTEST[scale]);

/**
 * The ends of the firing judged: a band chosen by hand read at its cone, or the
 * stated block's low cone and its high one. Each with its temperature, what
 * that rests on, and its band; or why there is none. An end past the check's
 * hottest cone is marked `above`, with its temperature where there is one. The
 * 'top' band, chosen by hand, has no cone to be read at: it is past the figures.
 * Anything else (no firing, or text that is not a band) has no ends: null.
 */
function endsOf(host: Host, firing: Firing): { ends: End[]; skipped?: ConeFitSkip; at?: End } | null {
  if (typeof firing === 'string') {
    if (!FIRING_BANDS.includes(firing as FiringBand)) return null;
    if (firing === 'top') {
      const end: End = { scale: 'band', band: firing };
      return { ends: [end], skipped: 'aboveChart', at: end };
    }
    const band = firing as FiringBand;
    const at = celsiusOf(host, 'orton', BAND_CONES[band]!)!;
    return { ends: [{ scale: 'band', band, cone: BAND_CONES[band], celsius: at.celsius, basis: at.basis }] };
  }
  if (!firing || !isCone(host, firing.scale, firing.low)) return null;
  const cones = [firing.low!, ...(firing.high && isCone(host, firing.scale, firing.high) ? [firing.high] : [])];
  const ends: End[] = [];
  for (const cone of cones) {
    const at = celsiusOf(host, firing.scale, cone);
    const end: End = { scale: firing.scale, cone };
    // An Orton cone above 10 or an SK one above 12 is past the figures, whether it has a temperature or not.
    if (pastHottest(host, firing.scale, cone)) {
      const band: FiringBand | undefined = at ? bandOf(host.limits.forFit, at.celsius) : 'top';
      ends.push({ ...end, ...(at && { celsius: at.celsius, basis: at.basis }), band, above: true });
      continue;
    }
    if (!at) return { ends: [end], skipped: 'noTemperature', at: end };
    const band = bandOf(host.limits.forFit, at.celsius);
    ends.push({
      ...end,
      celsius: at.celsius,
      basis: at.basis,
      band,
      ...(at.celsius > katzTo(host) && { above: true })
    });
  }
  return { ends };
}

/**
 * Whether a glaze's unity formula fits the firing it is stated for, by the
 * research report's rule; null when there is no firing to judge against.
 *
 *   unity    the unity formula (oxide moles per mole of fluxes)
 *   firing   the recipe's firing block (lib/cones/firing.js), or a band
 *            chosen by hand ('low', 'mid', 'high'), read at cone 04, 6 or 10
 *            ('top', cone 12 up, is past the figures and never judged)
 *   options.processes  the firing's processes, when the firing is a band
 *                      (a block brings its own)
 *   options.ash        the recipe has wood or plant ash (not judged)
 *   options.gerstley   the recipe has Gerstley borate
 *
 * The answer's `verdict`: 'cooler' or 'hotter' (a note: boron and silica or
 * alumina agree on a band outside every band the firing covers, `looksLike`),
 * 'closer' (a range across bands whose chemistry looks closer to one end,
 * `closerTo`), 'fits' (nothing points away: not a pass), or 'skipped'
 * (`skipped` says why). `strength` is 'soft' when the note is only cone 6
 * against cone 10, which the chemistry tells apart roughly. `sentences` say
 * it, as message codes; every note's last is that it is a guide, not a test.
 */
function coneFit(
  host: Host,
  unity: Oxides | null | undefined,
  firing: Firing,
  options: { processes?: string[]; ash?: boolean; gerstley?: boolean } = {}
): ConeFit | null {
  const found = endsOf(host, firing);
  if (!found) return null;
  const processes: string[] = [
    ...(options.processes ?? []),
    ...(typeof firing === 'object' ? (firing?.processes ?? []) : [])
  ];
  const ends = found.ends;
  const judged = ends.filter((end) => end.celsius !== undefined);
  const bands = [...new Set(ends.filter((end) => end.band).map((end) => end.band!))];
  const stated: ConeFit['stated'] = {
    bands: FIRING_BANDS.filter(
      (b) =>
        bands.length &&
        FIRING_BANDS.indexOf(b) >= FIRING_BANDS.indexOf(bands[0]) &&
        FIRING_BANDS.indexOf(b) <= FIRING_BANDS.indexOf(bands[bands.length - 1])
    ),
    ends: ends.map((end) => ({
      scale: end.scale,
      cone: end.cone,
      ...(end.band && { band: end.band }),
      ...(end.celsius !== undefined && { celsius: end.celsius, basis: end.basis })
    })),
    ...(typeof firing === 'string' && { chosen: firing as FiringBand })
  };
  const result = (fields: Partial<ConeFit>): ConeFit => ({
    stated,
    verdict: 'fits',
    looksLike: null,
    signals: [],
    strength: null,
    sentences: [],
    sources: [],
    ...fields
  });
  // The code as a template, so the types check every reason has its message.
  const skip = (reason: ConeFitSkip, extra?: MessageParams, end: End = ends[0]) =>
    result({
      verdict: 'skipped',
      skipped: reason,
      sentences: [say(`coneFit.skip.${reason}` satisfies RecipeMessageCode, { ...named(end), ...extra })]
    });

  const formula = formulaSkip(host, unity ?? {}, processes, options.ash === true);
  // Past formulaSkip, `unity` is read as the formula it was (judgeAt and the notes read it as they did).
  const u = unity as Oxides;
  if (formula) return skip(formula.skipped, formula.process ? { process: formula.process } : undefined);
  if (found.skipped) return skip(found.skipped, undefined, found.at);
  const span = betweenBands(host);
  const between = judged.find((end) => end.celsius! >= span.from && end.celsius! <= span.to);
  if (between) return skip('between', undefined, between);
  const cool = judged.find((end) => end.celsius! < katzFrom(host));
  if (cool) return skip('belowChart', undefined, cool);
  const gerstley = options.gerstley === true;
  const note = (verdict: 'cooler' | 'hotter' | 'closer', judgedEnd: End, at: Judged, fields?: { closerEnd: End }) => {
    const looksLike = looksLikeFrom(host, u, at)!;
    const soft = verdict !== 'closer' && looksLike !== 'low' && at.band !== 'low';
    const firingWords = named(judgedEnd);
    const figures = {
      ...firingWords,
      boron: two(value(u, 'B2O3')),
      silica: two(value(u, 'SiO2')),
      alumina: two(value(u, 'Al2O3'))
    };
    const keys = at.signals.slice(1).map((s) => s.key);
    const what =
      at.direction === 'hotter'
        ? 'hotterSilica'
        : keys.length === 2
          ? 'coolerBoth'
          : keys[0] === 'SiO2'
            ? 'coolerSilica'
            : 'coolerAlumina';
    const headline =
      verdict === 'closer'
        ? say('coneFit.closer', named(fields!.closerEnd))
        : at.direction === 'cooler'
          ? say(soft ? 'coneFit.coolerSoft' : 'coneFit.cooler', { ...firingWords, looksLike })
          : say(soft ? 'coneFit.hotterSoft' : 'coneFit.hotter', { ...firingWords, looksLike });
    const effect =
      verdict === 'closer'
        ? null
        : at.direction === 'cooler'
          ? say('coneFit.coolerEffect')
          : say(soft ? 'coneFit.hotterEffectSoft' : 'coneFit.hotterEffect');
    const sources = [...new Set(at.signals.map((s) => s.source))];
    return result({
      verdict,
      looksLike,
      ...(verdict === 'closer' && { closerTo: { scale: fields!.closerEnd.scale, cone: fields!.closerEnd.cone } }),
      signals: at.signals,
      strength: verdict === 'closer' ? null : soft ? 'soft' : 'firm',
      ...(gerstley && { gerstley: true }),
      sentences: [
        headline,
        say(`coneFit.${what}` satisfies RecipeMessageCode, figures),
        effect,
        gerstley && at.direction === 'cooler' ? say('coneFit.gerstley') : null,
        say('coneFit.guide')
      ].filter((s): s is RecipeMessage => Boolean(s)),
      sources: sources.map((id) => ({ id }))
    });
  };

  // Past cone 10 nothing is judged, but a range that starts within the figures (cone 9–11) can still
  // look cooler than its coolest end, and so than every cone it states; else it is not judged.
  const above = ends.find((end) => end.above);
  if (above) {
    const within = judged.find((end) => !end.above);
    const atWithin = within && judgeAt(host, u, within.celsius!);
    if (atWithin?.direction === 'cooler') return note('cooler', within!, atWithin);
    return skip('aboveChart', undefined, above);
  }

  const coolest = judged[0];
  const hottest = judged[judged.length - 1];
  // Cooler than the coolest end is cooler than every band stated; hotter than the hottest, hotter than all.
  const atCoolest = judgeAt(host, u, coolest.celsius!);
  if (atCoolest?.direction === 'cooler') return note('cooler', coolest, atCoolest);
  const atHottest = judgeAt(host, u, hottest.celsius!);
  if (atHottest?.direction === 'hotter') return note('hotter', hottest, atHottest);
  // A range across bands: the chemistry may still point to one end of it.
  if (coolest.band !== hottest.band) {
    if (atHottest?.direction === 'cooler') return note('closer', hottest, atHottest, { closerEnd: coolest });
    if (atCoolest?.direction === 'hotter') return note('closer', coolest, atCoolest, { closerEnd: hottest });
  }
  return result({
    ...(gerstley && { gerstley: true }),
    sentences: [say('coneFit.fits', named(coolest, hottest))]
  });
}

/** A firing to judge against: a firing block, or a band chosen by hand; anything else has none. */
export type Firing = FiringBlock | FiringBand | string | null | undefined;

export { coneFitFigures, coneFit };
