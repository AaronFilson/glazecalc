'use strict';

const { boronFor } = require('../chemistry');
const { approxCelsius, approxCone, coneLabel, isCone } = require('../cones/firing');
const { FIRING_BANDS, HESSELBERTH_ROY_LIMITS, bandOf, pastSide } = require('./limits');
const { say, figure } = require('./messages');

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
// pit firings, ash, the cones between low and mid fire) it says it cannot
// judge, rather than guess. A firing judged is never called a pass: no note
// says nothing about whether a glaze is stable or food safe.

/** Where each figure is from, for the note's sources. */
const SOURCES = Object.freeze({
  katz: Object.freeze({
    title: 'Matt Katz, "Boron in Glazes" (Ceramics Monthly, September 2012, pp. 14–15)',
    url: 'https://ceramicartsnetwork.org/docs/default-source/uploadedfiles/wp-content/uploads/2008/10/tf-boroninglazes-0912.pdf'
  }),
  'hesselberth-roy': HESSELBERTH_ROY_LIMITS.source,
  uk: Object.freeze({
    title: 'The UK traditional limits for cone 04–02, as Digitalfire gives them ("Limit formulas and target formulas")',
    url: 'https://digitalfire.com/article/limit+formulas+and+target+formulas'
  })
});

const HR = HESSELBERTH_ROY_LIMITS.unity;

/**
 * The figures the check compares with. Boron's margins around Katz's need are
 * the research report's, chosen on Glazy's glazes: a smaller margin for
 * "cooler" (0.20) tripled the false notes at cone 10, and testing alumina for
 * "hotter" raised them at cone 6 to 6%, as mattes are often high in it.
 */
const CONE_FIT = Object.freeze({
  /** "Looks cooler": boron at least this much over Katz's need for the firing. */
  boronOver: 0.3,
  /** "Looks hotter": boron at least this much under Katz's need. */
  boronUnder: 0.15,
  /** "Looks cooler": silica or alumina under Hesselberth & Roy's least for the band. */
  floor: Object.freeze({
    mid: Object.freeze({ SiO2: HR.mid.SiO2.min, Al2O3: HR.mid.Al2O3.min }),
    high: Object.freeze({ SiO2: HR.high.SiO2.min, Al2O3: HR.high.Al2O3.min })
  }),
  /**
   * "Looks hotter": silica over the band's most. At low fire the UK traditional
   * limits' cone 04–02 figure (Hesselberth & Roy have none); at cone 6
   * Hesselberth & Roy's.
   */
  ceiling: Object.freeze({ low: 3.0, mid: HR.mid.SiO2.max }),
  /** Can't judge: the published figures do not cover glazes melted this way. */
  lead: 0.05,
  lithium: 0.1,
  alkali: 0.45,
  zinc: 0.3,
  /** Can't judge: not a usual glaze's formula (a slip, a metallic, mostly colorant). */
  silica: Object.freeze({ min: 1, max: 8 }),
  colorants: 0.5
});

/** The cone a band chosen by hand is read at: the cone its figures are for (Hesselberth & Roy's 6 and 10; cone 04 at low fire). */
const BAND_CONES = Object.freeze({ low: '04', mid: '6', high: '10' });

/** Oxides that color rather than melt, for the "not a usual glaze" check. */
const COLORANTS = ['MnO', 'CuO', 'CoO', 'Fe2O3', 'FeO'];
/** Firings where the kiln does part of the glazing. */
const KILN_GLAZED = ['raku', 'salt', 'soda', 'wood', 'pit'];
/** Wood or plant ash, not bone ash or the carbonates once called pearl ash and soda ash. */
const ASH = /\bash\b/i;
const NOT_ASH = /\b(bone|pearl|soda)\s+ash\b/i;
const GERSTLEY = /gerstley/i;

const two = (x) => figure(x, 2);
const value = (unity, oxide) => unity[oxide] ?? 0;
const celsiusAt = (cone) => approxCelsius('orton', cone).celsius;
/** Katz's chart is for cone 06 to 10; cooler firings are not judged. */
const KATZ_FROM = celsiusAt('06');
/** The cones between low and mid fire, 01 to 3, which neither band's figures fit. */
const BETWEEN = Object.freeze({ from: celsiusAt('01'), to: celsiusAt('3') });

/** A cone's temperature: its own figure, or for an SK cone with none, its stated Orton equivalent's (SK 12 ≈ cone 10). */
function celsiusOf(scale, cone) {
  const own = approxCelsius(scale, cone);
  if (own) return own;
  const orton = approxCone(scale, cone, 'orton');
  return orton ? approxCelsius('orton', orton.cone) : null;
}

/** Why the glaze cannot be judged, from its formula, firing and materials; null when it can. */
function formulaSkip(unity, processes, materials) {
  if (value(unity, 'PbO') > CONE_FIT.lead) return { skipped: 'lead' };
  if (value(unity, 'Li2O') >= CONE_FIT.lithium) return { skipped: 'lithium' };
  if (value(unity, 'K2O') + value(unity, 'Na2O') >= CONE_FIT.alkali) return { skipped: 'alkali' };
  if (value(unity, 'ZnO') >= CONE_FIT.zinc) return { skipped: 'zinc' };
  const silica = value(unity, 'SiO2');
  const colorants = COLORANTS.reduce((sum, oxide) => sum + value(unity, oxide), 0);
  if (silica < CONE_FIT.silica.min || silica > CONE_FIT.silica.max || colorants > CONE_FIT.colorants) {
    return { skipped: 'notGlaze' };
  }
  const process = KILN_GLAZED.find((p) => processes.includes(p));
  if (process) return { skipped: 'process', process };
  if (materials.some((name) => ASH.test(name) && !NOT_ASH.test(name))) return { skipped: 'ash' };
  return null;
}

/**
 * The two signals at one temperature: whether the glaze looks cooler or hotter
 * than it, and the figures that say so; null when they do not agree.
 */
function judgeAt(unity, celsius) {
  const band = bandOf(HESSELBERTH_ROY_LIMITS, celsius);
  const need = boronFor(celsius);
  const boron = value(unity, 'B2O3');
  const silica = value(unity, 'SiO2');
  const alumina = value(unity, 'Al2O3');
  const floor = CONE_FIT.floor[band];
  if (floor && pastSide(boron, { min: need + CONE_FIT.boronOver }) !== 'below') {
    const low = [
      ['SiO2', silica],
      ['Al2O3', alumina]
    ].filter(([key, v]) => pastSide(v, { min: floor[key] }) === 'below');
    if (low.length) {
      return {
        direction: 'cooler',
        band,
        need,
        signals: [
          { key: 'B2O3', value: boron, figure: need + CONE_FIT.boronOver, side: 'above', band, source: 'katz' },
          ...low.map(([key, v]) => ({
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
  const ceiling = CONE_FIT.ceiling[band];
  if (
    ceiling !== undefined &&
    pastSide(boron, { max: need - CONE_FIT.boronUnder }) !== 'above' &&
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
          figure: Math.max(0, need - CONE_FIT.boronUnder),
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
function looksLikeFrom(unity, judged) {
  const at = FIRING_BANDS.indexOf(judged.band);
  const step = judged.direction === 'cooler' ? -1 : 1;
  const next = FIRING_BANDS[at + step];
  if (next === 'mid') {
    const again = judgeAt(unity, celsiusOf('orton', BAND_CONES.mid).celsius);
    if (again?.direction === judged.direction) return FIRING_BANDS[at + 2 * step];
  }
  return next;
}

/** The firing as a message names it: a cone of its scale (or a range, to `high`), or a band chosen by hand. */
const named = (end, high) =>
  end.scale === 'band'
    ? { scale: 'band', band: end.band }
    : { scale: end.scale, cone: end.label + (high && high !== end ? '–' + high.label : '') };

/**
 * The ends of the firing judged: a band chosen by hand read at its cone, or the
 * stated block's low cone and its high one. Each with its temperature, what
 * that rests on, and its band; or why there is none.
 */
function endsOf(firing) {
  if (typeof firing === 'string') {
    if (!FIRING_BANDS.includes(firing)) return null;
    const at = celsiusOf('orton', BAND_CONES[firing]);
    return { ends: [{ scale: 'band', band: firing, cone: BAND_CONES[firing], celsius: at.celsius, basis: at.basis }] };
  }
  if (!firing || !isCone(firing.scale, firing.low)) return null;
  const cones = [firing.low, ...(firing.high && isCone(firing.scale, firing.high) ? [firing.high] : [])];
  const ends = [];
  for (const cone of cones) {
    const at = celsiusOf(firing.scale, cone);
    const end = { scale: firing.scale, cone, label: coneLabel(cone) };
    if (!at) return { ends: [end], skipped: 'noTemperature', at: end };
    ends.push({ ...end, celsius: at.celsius, basis: at.basis, band: bandOf(HESSELBERTH_ROY_LIMITS, at.celsius) });
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
 *   options.processes  the firing's processes, when the firing is a band
 *                      (a block brings its own)
 *   options.materials  the recipe's material names, for ash and Gerstley borate
 *
 * The answer's `verdict`: 'cooler' or 'hotter' (a note: boron and silica or
 * alumina agree on a band outside every band the firing covers, `looksLike`),
 * 'closer' (a range across bands whose chemistry looks closer to one end,
 * `closerTo`), 'fits' (nothing points away: not a pass), or 'skipped'
 * (`skipped` says why). `strength` is 'soft' when the note is only cone 6
 * against cone 10, which the chemistry tells apart roughly. `sentences` say
 * it, as message codes; every note's last is that it is a guide, not a test.
 */
function coneFit(unity, firing, options = {}) {
  const found = endsOf(firing);
  if (!found) return null;
  const processes = [...(options.processes ?? []), ...(typeof firing === 'object' ? (firing.processes ?? []) : [])];
  const materials = options.materials ?? [];
  const ends = found.ends;
  const judged = ends.filter((end) => end.celsius !== undefined);
  const bands = [...new Set(judged.map((end) => end.band))];
  const stated = {
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
    ...(typeof firing === 'string' && { chosen: firing })
  };
  const result = (fields) => ({
    stated,
    verdict: 'fits',
    looksLike: null,
    signals: [],
    strength: null,
    sentences: [],
    sources: [],
    ...fields
  });
  const skip = (reason, extra, end = ends[0]) =>
    result({
      verdict: 'skipped',
      skipped: reason,
      sentences: [say('coneFit.skip.' + reason, { ...named(end), ...extra })]
    });

  const formula = formulaSkip(unity ?? {}, processes, materials);
  if (formula) return skip(formula.skipped, formula.process ? { process: formula.process } : undefined);
  if (found.skipped) return skip(found.skipped, undefined, found.at);
  const between = judged.find((end) => end.celsius >= BETWEEN.from && end.celsius <= BETWEEN.to);
  if (between) return skip('between', undefined, between);
  const cool = judged.find((end) => end.celsius < KATZ_FROM);
  if (cool) return skip('belowChart', undefined, cool);

  const coolest = judged[0];
  const hottest = judged[judged.length - 1];
  const gerstley = materials.some((name) => GERSTLEY.test(name));
  const note = (verdict, judgedEnd, at, fields) => {
    const looksLike = looksLikeFrom(unity, at);
    const soft = verdict !== 'closer' && looksLike !== 'low' && at.band !== 'low';
    const firingWords = named(judgedEnd);
    const figures = {
      ...firingWords,
      boron: two(value(unity, 'B2O3')),
      silica: two(value(unity, 'SiO2')),
      alumina: two(value(unity, 'Al2O3'))
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
        ? say('coneFit.closer', named(fields.closerEnd))
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
      ...(verdict === 'closer' && { closerTo: { scale: fields.closerEnd.scale, cone: fields.closerEnd.cone } }),
      signals: at.signals,
      strength: verdict === 'closer' ? null : soft ? 'soft' : 'firm',
      ...(gerstley && { gerstley: true }),
      sentences: [
        headline,
        say('coneFit.' + what, figures),
        effect,
        gerstley && at.direction === 'cooler' ? say('coneFit.gerstley') : null,
        say('coneFit.guide')
      ].filter(Boolean),
      sources: sources.map((id) => ({ id, ...SOURCES[id] }))
    });
  };

  // Cooler than the coolest end is cooler than every band stated; hotter than the hottest, hotter than all.
  const atCoolest = judgeAt(unity, coolest.celsius);
  if (atCoolest?.direction === 'cooler') return note('cooler', coolest, atCoolest);
  const atHottest = judgeAt(unity, hottest.celsius);
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

module.exports = { CONE_FIT, CONE_FIT_SOURCES: SOURCES, coneFit };
