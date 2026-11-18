import { boronFor } from '../chemistry/index.ts';
import { labelOf } from '../identity.ts';
import { traitsOf } from '../traits.ts';
import { prepareMaterial } from '../chemistry/materials.ts';
import { amountOf } from './amounts.ts';
import { asShown, bandOf, bandIn, pastSide, isLikely, isThin } from './limits.ts';
import { say, figure } from './messages.ts';
import { coneFitFigures } from './cone-fit.ts';
import type { Oxides } from '../types.ts';
import type { FiringBand, LimitSet, Past, UnityRange } from './limits.ts';
import type { AdditiveRecord, MaterialRecord } from './library.ts';
import type { Caution, CheckName, Quantity, RecipeMessage, Severity } from './messages.ts';
import type { Amount } from './amounts.ts';
import type { Host } from '../host.ts';

/** A line of a recipe to check: its material, and its amount. */
export interface CheckLine {
  material: MaterialRecord;
  amount: Amount;
}

export interface CheckInput {
  /** The new recipe's base materials and amounts. */
  lines: CheckLine[];
  /** Its unity formula, base materials only. */
  unity?: Oxides | null;
  /** The old recipe's unity formula, to warn only of what is new or worse. */
  old?: Oxides;
  /** The firing temperature, when it is known. */
  celsius?: number | null;
  /** The firing's band, when it is known by its cone (coneBand): it wins over the band of `celsius`. */
  band?: FiringBand;
  additives?: AdditiveRecord[];
  /** The old recipe's raw clay, as a percent of its batch. */
  oldClay?: number;
  /** Calculated expansion, before and after. */
  expansion?: { was: number | null; now: number | null };
  /** The limits on the unity formula to check against: the app's own (GLAZECALC_LIMITS) by default. */
  limitSet?: LimitSet;
}

/** What a check measured, and how serious it is. */
type Measured = Omit<Caution, 'check' | 'sentences'>;
type Serious = 'caution' | 'likely';

// Past a recommended limit, say what the fired glaze will likely do, rather
// than block (docs/adr/0012-choosing-materials.md, and the research report
// "Extra materials in glaze substitution"). Each warning has two strengths:
// between the app's caution and the published ceiling a glaze "tends to"
// show the fault; past the ceiling it "will probably". Limits depend on the
// firing where it is known. With an old recipe to compare, a value the old
// one already had is not news: only a limit newly crossed, or one made worse.
//
// A caution is the check that raised it, what it measured (the quantity, its
// value, the limit and which side of it is past, and how serious), and its
// sentences, each a message code with its values: where how sure it is
// changes a sentence, the sentence comes in both forms rather than with a
// phrase swapped in, so it translates whole.

const KNAO = (u: Oxides): number => (u['K2O'] ?? 0) + (u['Na2O'] ?? 0);
const value = (u: Oxides | null | undefined, oxide: string): number => (u ? (u[oxide] ?? 0) : 0);

// An additive that is this colorant (its trait, e.g. chrome) or carries one of its oxides.
const hasColorant = (host: Host, additives: AdditiveRecord[], colorant: string, oxides: string[]): boolean =>
  additives.some(
    (a) =>
      amountOf(a.amount) > 0 &&
      (traitsOf(host, a)[colorant] === true ||
        (a.fields ?? []).some((field) => oxides.includes(field.name) && Number(field.amount) > 0))
  );

// A material with no category (a potter's own; every standard one has a category) is known by its
// analysis: raw clay is 20% or more Al2O3 with an LOI of 8 to 16%, as kaolins and ball clays have;
// whiting is nearly all CaO once fired, with an LOI of 40 to 48% (pure whiting loses 44%); and
// dolomite, the carbonate of calcium and magnesium, nearly all CaO and MgO, more CaO than MgO (it
// fires to 58% CaO), with an LOI of 45 to 48% (pure dolomite loses 47.7%, magnesite 52%).
const OWN_CLAY = { alumina: 20, loi: [8, 16] };
const OWN_WHITING = { calcia: 0.9, loi: [40, 48] };
const OWN_DOLOMITE = { calciaMagnesia: 0.9, loi: [45, 48] };

/**
 * What a material with no category is by its analysis: 'clay', 'whiting', 'dolomite', or null (or
 * with a category).
 */
function kindByAnalysis(host: Host, material: MaterialRecord): 'clay' | 'whiting' | 'dolomite' | null {
  if (material.category) return null;
  let prepared: ReturnType<typeof prepareMaterial>;
  try {
    prepared = prepareMaterial(host, material);
  } catch {
    return null;
  }
  const { analysis, loi } = prepared;
  const within = (range: number[]) => loi >= range[0] && loi <= range[1];
  if ((analysis['Al2O3'] ?? 0) >= OWN_CLAY.alumina && within(OWN_CLAY.loi)) return 'clay';
  const fired = Object.values(analysis).reduce((sum, percent) => sum + percent, 0);
  const calcia = analysis['CaO'] ?? 0;
  const magnesia = analysis['MgO'] ?? 0;
  if (fired > 0 && calcia >= OWN_WHITING.calcia * fired && within(OWN_WHITING.loi)) return 'whiting';
  if (
    fired > 0 &&
    calcia + magnesia >= OWN_DOLOMITE.calciaMagnesia * fired &&
    calcia >= magnesia &&
    within(OWN_DOLOMITE.loi)
  ) {
    return 'dolomite';
  }
  return null;
}

// A clay that loses less than this percent of its weight when fired has been calcined: a raw clay
// loses its chemical water, 4% and more (kaolin 14%), and Molochite, a calcined china clay, none.
const CALCINED_LOI = 2;

/**
 * Whether a material is raw (not calcined) clay, which shrinks as the glaze dries: by its category,
 * calcined by its traits or its LOI, or for one with no category by its analysis.
 */
const isRawClay = (host: Host, material: MaterialRecord): boolean =>
  (material.category === 'clay' &&
    !traitsOf(host, material).calcined &&
    !(Number(material.loi ?? NaN) < CALCINED_LOI)) ||
  kindByAnalysis(host, material) === 'clay';

/** Whether a material is raw whiting or dolomite: by its traits, or for one with no category by its analysis. */
const isRawCalcium = (host: Host, material: MaterialRecord): boolean =>
  traitsOf(host, material).rawCalcium === true ||
  ['whiting', 'dolomite'].includes(kindByAnalysis(host, material) as string);

/** Raw (not calcined) clay as a percent of the batch. */
function rawClayPercent(
  host: Host,
  lines: Array<MaterialRecord | (Omit<MaterialRecord, 'amount'> & { amount?: Amount })>
): number {
  const total = lines.reduce((sum, line) => sum + amountOf(line.amount), 0);
  const clay = lines
    .filter((line) => isRawClay(host, line as MaterialRecord))
    .reduce((sum, line) => sum + amountOf(line.amount), 0);
  return total > 0 ? (100 * clay) / total : 0;
}

/**
 * Whether raw clay at `clay` percent of the batch is too much to pass without
 * a caution: over the caution's 20%, and not about what the old recipe had
 * (`clayWas`, if there is one) when it was over too, as seriously: from under
 * the likely figure (25%) to it is news.
 */
function rawClayHigh(host: Host, clay: number, clayWas?: number): boolean {
  const already =
    clayWas !== undefined &&
    clayWas >= host.limits.checks.clay.caution &&
    (clayWas >= host.limits.checks.clay.likely || clay < host.limits.checks.clay.likely) &&
    clay <= clayWas * host.limits.checks.alreadyFactor;
  return clay > host.limits.checks.clay.caution && !already;
}

/** What a check measured: the quantity, its value, the limit and the side of it that is past. */
const measured = (
  quantity: Quantity,
  value: number,
  limit: number,
  direction: 'above' | 'below',
  severity: Severity
): Measured => ({ severity, quantity, value, limit, direction });

/** 'likely' at or past the likely figure, otherwise 'caution'. */
const severityOf = (x: number, likely: number): Serious => (x >= likely ? 'likely' : 'caution');

/** How serious each severity is, to compare two: a likely fault is more so than a caution. */
const SERIOUS = Object.freeze({ caution: 1, likely: 2 });

// BaO in the unity formula, at any firing, from Digitalfire's Limit Formula page
// (https://digitalfire.com/glossary/123): "For functional glazes low BaO levels can often be
// tolerated (e.g. 0.05-0.1) if the glaze chemistry is balanced", and "any glaze that has 0.4 BaO
// would be off-the-scale for potential to leach" (CHECK_LIMITS.barium: 0.1 and 0.4). A range, read
// as the limit sets' are (pastSide, isLikely): at the two decimals shown, 0.10 itself within.
const bariumRange = (host: Host): UnityRange => ({
  max: host.limits.checks.barium.caution,
  maxLikely: host.limits.checks.barium.likely
});

/** How serious the BaO in a unity formula is: null to 0.10 as shown, 'likely' from 0.40, else 'caution'. */
function bariumSeverity(host: Host, barium: number): Serious | null {
  const range = bariumRange(host);
  if (pastSide(barium, range) !== 'above') return null;
  return isLikely(barium, range, 'above') ? 'likely' : 'caution';
}

/**
 * Cautions for what is past a recommended limit. The limits on the unity
 * formula come from `input.limitSet` (the app's own by default), for the band
 * the firing falls in: `input.band` where it is given (a cone's band, from
 * lib/cones/firing.js coneBand, read as the set's own), else the band of
 * `input.celsius`. With the firing unknown they are its `whenUnknown` band's,
 * but the checks that only mean something at a known firing (too little
 * boron, magnesia, raw whiting) are left out. A band the set has no figures
 * for (Hesselberth & Roy's low fire, every set's 'top') checks no ranges.
 */
function pastLimits(host: Host, input: CheckInput): Caution[] {
  const fit = coneFitFigures(host);
  const { unity, old } = input;
  // Anything but a finite number is an unknown firing: null is not 0 °C.
  const celsius = Number.isFinite(input.celsius) ? (input.celsius as number) : undefined;
  const set = input.limitSet ?? host.limits.own;
  const additives = input.additives ?? [];
  const band = input.band !== undefined ? bandIn(set, input.band) : bandOf(set, celsius);
  const low = band === undefined ? undefined : band === 'low';
  const range: Readonly<Record<string, UnityRange>> = set.unity[band ?? set.whenUnknown] ?? {};
  const cautions: Caution[] = [];
  const sure = (x: number, likely: number, probably: RecipeMessage, tends: RecipeMessage) =>
    x >= likely ? probably : tends;
  // A range's caution: past it by the limits' own rule (pastSide, which the table uses too), and
  // 'likely' only past a set's figure for a likely fault. A set with none (Hesselberth & Roy give one
  // figure per edge) only cautions, as its table does.
  const graded = (likely: boolean): Serious => (likely ? 'likely' : 'caution');
  const worded = (likely: boolean, probably: RecipeMessage, tends: RecipeMessage) => (likely ? probably : tends);
  // Whether the old recipe already had it as bad: then it is not news. It had when it raised the
  // same caution as seriously or more (`severityIn` of a unity formula: null for no caution), and the
  // new one is worse by no more than alreadyFactor: more of `bad`, or less of it for a `floor`. A
  // limit newly crossed, from within it or from a caution to a likely fault, is news.
  const already = (bad: (u: Oxides) => number, severityIn: (u: Oxides) => Serious | null, floor = false) => {
    if (old === undefined) return false;
    const was = severityIn(old);
    // The new formula as the checks read it: severityIn and bad take a missing one as no oxides (value).
    const now = unity as Oxides;
    if (was === null || SERIOUS[was] < SERIOUS[severityIn(now)!]) return false;
    return floor
      ? bad(now) * host.limits.checks.alreadyFactor >= bad(old)
      : bad(now) <= bad(old) * host.limits.checks.alreadyFactor;
  };
  // The same for a range's caution, past it on `side` as the check reads it (boron's likely figure
  // is its own for a thin glaze).
  const alreadyPast = (bad: (u: Oxides) => number, r: UnityRange, side: Past) =>
    already(
      bad,
      (u: Oxides) => (pastSide(bad(u), r) === side ? graded(isLikely(bad(u), r, side, isThin(host, u))) : null),
      side === 'below'
    );
  // The band whose figures are used, which picks the words: the firing's, or the set's choice when
  // the firing is not known (low fire for the app's own set, cone 6 for Hesselberth & Roy's).
  const used = band ?? set.whenUnknown;
  const caution = (check: CheckName, fields: Measured, ...sentences: Array<RecipeMessage | null>) =>
    cautions.push({ check, ...fields, sentences: sentences.filter((s): s is RecipeMessage => Boolean(s)) });
  const two = (x: number) => figure(x, 2);
  // A percent, ratio or expansion is shown with a decimal more than it once was, so that what a caution
  // shows agrees with the limit it was judged by: 20.3% raw clay, not 20%, is over 20.

  // Boron, in the words of the band whose figures are used: cone 06-04's in a low band, cone 6's in
  // a mid band, and cone 10's in a set's high band (Hesselberth & Roy's). At cone 6 the app's own set
  // says industry counts its figure as high (0.33: the research report "Extra materials in glaze
  // substitution"); another set's figure is its own (Hesselberth & Roy's 0.35 is the top of their
  // cone 6 range), and the sentence says so.
  const boron = value(unity, 'B2O3');
  const thin = isThin(host, unity ?? {});
  const boronRange = range['B2O3'];
  if (
    boronRange?.max !== undefined &&
    pastSide(boron, boronRange) === 'above' &&
    !alreadyPast((u) => value(u, 'B2O3'), boronRange, 'above')
  ) {
    const likely = isLikely(boron, boronRange, 'above', thin);
    const fields = measured('B2O3', boron, boronRange.max, 'above', graded(likely));
    if (used === 'low') {
      caution(
        'boron-high',
        fields,
        say('checks.boronLowFire', { boron: two(boron) }),
        worded(likely, say('checks.boronLowFireProbably'), say('checks.boronLowFireTends')),
        say('checks.boronLowFireEffects')
      );
    } else {
      const figures = { boron: two(boron), high: two(boronRange.max) };
      caution(
        'boron-high',
        fields,
        used === 'high'
          ? say('checks.boronHighFire', figures)
          : set.id === host.limits.own.id
            ? say('checks.boronMidFire', figures)
            : say('checks.boronMidFireSet', figures),
        worded(likely, say('checks.boronMidFireProbably'), say('checks.boronMidFireTends')),
        say('checks.boronMidFireFix')
      );
    }
  }

  // Too little boron to melt at low fire: Katz's rule for the firing, the boron as shown. Not for a lead or
  // an alkaline glaze, which melt without it and which the rule is not for (cone-fit.js skips them too).
  const meltsWithoutBoron = value(unity, 'PbO') > fit.lead || value(unity, 'K2O') + value(unity, 'Na2O') >= fit.alkali;
  if (
    low &&
    celsius !== undefined &&
    !meltsWithoutBoron &&
    asShown(boron) < host.limits.checks.boronShortShare * boronFor(celsius)
  ) {
    caution(
      'boron-short',
      measured('B2O3', boron, host.limits.checks.boronShortShare * boronFor(celsius), 'below', 'caution'),
      say('checks.boronShort', { boron: two(boron), needed: two(boronFor(celsius)) }),
      say('checks.boronShortEffects')
    );
  }

  // Alumina, low or high. No alumina at all (a frit and silica, say) is the lowest there is, so it is
  // checked too; only a unity formula with nothing in it is not.
  const alumina = value(unity, 'Al2O3');
  const aluminaRange = range['Al2O3'];
  const anything = Object.values(unity ?? {}).some((moles) => moles > 0);
  if (
    aluminaRange?.min !== undefined &&
    anything &&
    pastSide(alumina, aluminaRange) === 'below' &&
    !alreadyPast((u) => value(u, 'Al2O3'), aluminaRange, 'below')
  ) {
    const likely = isLikely(alumina, aluminaRange, 'below');
    caution(
      'alumina-low',
      measured('Al2O3', alumina, aluminaRange.min, 'below', graded(likely)),
      say('checks.aluminaLow', { alumina: two(alumina) }),
      worded(likely, say('checks.aluminaLowProbably'), say('checks.aluminaLowTends')),
      say('checks.aluminaLowFix')
    );
  }
  const ratio = alumina > 0 ? value(unity, 'SiO2') / alumina : Infinity;
  const below = host.limits.checks.silicaAluminaBelow;
  if (ratio < below && !(old && value(old, 'Al2O3') > 0 && value(old, 'SiO2') / value(old, 'Al2O3') < below)) {
    caution(
      'alumina-high',
      measured('SiO2:Al2O3', ratio, below, 'below', 'caution'),
      say('checks.aluminaHigh', { ratio: figure(ratio, 2) }),
      say('checks.aluminaHighEffects'),
      low ? say('checks.aluminaHighLowFire') : null,
      say('checks.aluminaHighFix')
    );
  }

  // Boron blue, its figures read at the two decimals shown: B2O3 and CaO over 0.50, Al2O3 under 0.20.
  const pink = hasColorant(host, additives, 'pink', []);
  const blue = host.limits.checks.boronBlue;
  const isBlue = (u: Oxides | null | undefined) =>
    asShown(value(u, 'B2O3')) > blue.boron &&
    asShown(value(u, 'CaO')) > blue.calcia &&
    asShown(value(u, 'Al2O3')) < blue.alumina;
  if (isBlue(unity) && !(old && isBlue(old))) {
    caution(
      'boron-blue',
      measured('B2O3', boron, blue.boron, 'above', 'caution'),
      say('checks.boronBlue'),
      pink ? say('checks.boronBlueFixPink') : say('checks.boronBlueFix')
    );
  }

  // Soda and potash.
  const alkali = KNAO(unity as Oxides);
  const alkaliRange = range['K2O+Na2O'];
  if (
    alkaliRange?.max !== undefined &&
    pastSide(alkali, alkaliRange) === 'above' &&
    !alreadyPast(KNAO, alkaliRange, 'above')
  ) {
    const likely = isLikely(alkali, alkaliRange, 'above');
    caution(
      'alkali',
      measured('K2O+Na2O', alkali, alkaliRange.max, 'above', graded(likely)),
      say('checks.alkali', { alkali: two(alkali) }),
      worded(likely, say('checks.alkaliProbably'), say('checks.alkaliTends')),
      say('checks.alkaliFix')
    );
  }

  // Magnesia, at a known firing whose band the set limits it in (the app's own: low fire).
  // The words say it does not melt at cone 06-04, so only a low band's limit is used.
  const magnesia = value(unity, 'MgO');
  const magnesiaRange = low ? set.unity[band!]?.['MgO'] : undefined;
  if (
    magnesiaRange?.max !== undefined &&
    pastSide(magnesia, magnesiaRange) === 'above' &&
    !alreadyPast((u) => value(u, 'MgO'), magnesiaRange, 'above')
  ) {
    const likely = isLikely(magnesia, magnesiaRange, 'above');
    caution(
      'magnesia',
      measured('MgO', magnesia, magnesiaRange.max, 'above', graded(likely)),
      say('checks.magnesia', { magnesia: two(magnesia) }),
      worded(likely, say('checks.magnesiaProbably'), say('checks.magnesiaTends')),
      say('checks.magnesiaNote')
    );
  }

  // Zinc with colorants, and below cone 03: from ZnO 0.02 at the two decimals shown, as barium and the
  // limits are read, so 0.0196, shown as 0.02, is zinc that matters.
  const zinc = value(unity, 'ZnO');
  const zincIn = (u: Oxides | null | undefined) => value(u, 'ZnO');
  const zincMatters = (u: Oxides | null | undefined): Serious | null =>
    asShown(zincIn(u)) >= host.limits.checks.zinc ? 'caution' : null;
  if (zincMatters(unity) && !already(zincIn, zincMatters)) {
    const fields = measured('ZnO', zinc, host.limits.checks.zinc, 'above', 'caution');
    if (hasColorant(host, additives, 'chrome', ['Cr2O3'])) caution('zinc-chrome', fields, say('checks.zincChrome'));
    if (hasColorant(host, additives, 'iron', ['Fe2O3', 'FeO'])) caution('zinc-iron', fields, say('checks.zincIron'));
    if (hasColorant(host, additives, 'copper', ['CuO'])) caution('zinc-copper', fields, say('checks.zincCopper'));
    if (celsius !== undefined && celsius < host.limits.firing.zincMeltsFrom) {
      caution('zinc-low-fire', fields, say('checks.zincLowFire', { zinc: two(zinc) }));
    }
  }

  // Barium, which can leach from the fired glaze onto food, at any firing: past 0.10 as shown, and
  // likely from 0.40 (Digitalfire's Limit Formula page, https://digitalfire.com/glossary/123; bariumRange).
  const barium = value(unity, 'BaO');
  const bariumPast = bariumSeverity(host, barium);
  const bariumOf = (u: Oxides) => value(u, 'BaO');
  if (bariumPast && !already(bariumOf, (u) => bariumSeverity(host, bariumOf(u)))) {
    caution(
      'barium',
      measured('BaO', barium, host.limits.checks.barium.caution, 'above', bariumPast),
      say('checks.barium', { barium: two(barium) }),
      bariumPast === 'likely' ? say('checks.bariumLikely') : say('checks.bariumTends')
    );
  }

  // Materials: raw whiting at low fire, fluorspar, kaolin, soluble ones, frits doing the wrong job.
  const total = input.lines.reduce((sum, line) => sum + amountOf(line.amount), 0);
  const percent = (amount: Amount) => (total > 0 ? (100 * amountOf(amount)) / total : 0);
  const rawCalcium = input.lines.filter((line) => isRawCalcium(host, line.material));
  const rawShare = rawCalcium.reduce((sum, line) => sum + percent(line.amount), 0);
  if (low && rawShare > host.limits.checks.rawCalcium.caution) {
    caution(
      'whiting',
      measured(
        'raw-calcium-percent',
        rawShare,
        host.limits.checks.rawCalcium.caution,
        'above',
        severityOf(rawShare, host.limits.checks.rawCalcium.likely)
      ),
      say('checks.whiting'),
      sure(
        rawShare,
        host.limits.checks.rawCalcium.likely,
        say('checks.whitingProbably', { percent: figure(rawShare, 1) }),
        say('checks.whitingTends', { percent: figure(rawShare, 1) })
      ),
      say('checks.whitingFix')
    );
  }
  for (const line of input.lines) {
    if (line.material.fluorine && amountOf(line.amount) > 0) {
      caution(
        'fluorine',
        { severity: 'caution', material: labelOf(host, line.material) },
        say('checks.fluorine', { name: labelOf(host, line.material) })
      );
    }
  }
  const clay = input.lines
    .filter((line) => isRawClay(host, line.material))
    .reduce((sum, line) => sum + percent(line.amount), 0);
  const clayWas = input.oldClay;
  if (clay < host.limits.checks.clay.least && (clayWas === undefined || clayWas >= host.limits.checks.clay.least)) {
    const how =
      clay > 0
        ? clayWas !== undefined
          ? say('checks.clayLowWas', { clay: figure(clay, 1), was: figure(clayWas, 1) })
          : say('checks.clayLow', { clay: figure(clay, 1) })
        : clayWas !== undefined
          ? say('checks.clayNoneWas', { was: figure(clayWas, 1) })
          : say('checks.clayNone');
    caution(
      'clay-low',
      measured('raw-clay-percent', clay, host.limits.checks.clay.least, 'below', 'caution'),
      how,
      say('checks.clayLowFix')
    );
  }
  // As much raw clay as the old recipe had (to rounding, or a little more) is not news.
  if (rawClayHigh(host, clay, clayWas)) {
    caution(
      'clay-high',
      measured(
        'raw-clay-percent',
        clay,
        host.limits.checks.clay.caution,
        'above',
        severityOf(clay, host.limits.checks.clay.likely)
      ),
      say('checks.clayHigh', { clay: figure(clay, 1) }),
      sure(clay, host.limits.checks.clay.likely, say('checks.clayHighProbably'), say('checks.clayHighTends')),
      say('checks.clayHighFix')
    );
  }
  for (const line of input.lines) {
    if (line.material.soluble && amountOf(line.amount) > 0) {
      caution(
        'soluble',
        { severity: 'caution', material: labelOf(host, line.material) },
        say('checks.soluble', { name: labelOf(host, line.material) })
      );
    }
  }
  const main = [...input.lines].sort((p, q) => amountOf(q.amount) - amountOf(p.amount))[0];
  const role = main?.material.fritRole;
  const frit: Measured = { severity: 'note', material: labelOf(host, main?.material) };
  if (role === 'boron') caution('frit-role', frit, say('checks.boronFrit'));
  else if (role === 'low-expansion') caution('frit-role', frit, say('checks.lowExpansionFrit'));
  else if (role === 'alkali') caution('frit-role', frit, say('checks.alkaliFrit'));

  // Expansion against the old recipe: crazing or shivering.
  const was = input.expansion?.was ?? null;
  const now = input.expansion?.now ?? null;
  if (was !== null && now !== null) {
    const { expansionRises: rises, expansionFalls: falls } = host.limits.checks;
    if (now > was + rises.caution) {
      const likely = now > was + rises.likely;
      caution(
        'expansion-rises',
        measured('expansion', now, was + rises.caution, 'above', likely ? 'likely' : 'caution'),
        say('checks.expansionRises', { was: figure(was, 2), now: figure(now, 2) }),
        likely ? say('checks.expansionRisesProbably') : say('checks.expansionRisesMay'),
        say('checks.expansionRisesFix')
      );
    } else if (now < was - falls.caution) {
      const likely = now < was - falls.likely;
      caution(
        'expansion-falls',
        measured('expansion', now, was - falls.caution, 'below', likely ? 'likely' : 'caution'),
        say('checks.expansionFalls', { was: figure(was, 2), now: figure(now, 2) }),
        likely ? say('checks.expansionFallsProbably') : say('checks.expansionFallsCan'),
        say('checks.expansionFallsTest')
      );
    }
  }
  return cautions;
}

/**
 * Notes on the recipe's size and small amounts: many materials to buy and
 * weigh, or an amount too small to weigh well in a test batch.
 */
function sizeNotes(host: Host, lines: CheckLine[], low?: boolean): Caution[] {
  const used = lines.filter((line) => amountOf(line.amount) > 0);
  const total = used.reduce((sum, line) => sum + amountOf(line.amount), 0);
  const notes: Caution[] = [];
  const many = low ? host.limits.checks.manyMaterialsLowFire : host.limits.checks.manyMaterials;
  if (used.length >= many) {
    notes.push({
      check: 'many-materials',
      ...measured('materials', used.length, many, 'above', 'note'),
      sentences: [say('checks.manyMaterials', { count: used.length })]
    });
  }
  for (const line of used) {
    const percent = (100 * amountOf(line.amount)) / total;
    if (percent < host.limits.checks.smallPercent) {
      notes.push({
        check: 'small-amount',
        ...measured('material-percent', percent, host.limits.checks.smallPercent, 'below', 'note'),
        material: labelOf(host, line.material),
        sentences: [
          say('checks.smallAmount', {
            name: labelOf(host, line.material),
            percent: figure(percent, 2),
            reads: figure(host.limits.checks.scaleReads, 1)
          })
        ]
      });
    }
  }
  return notes;
}

export { pastLimits, sizeNotes, rawClayPercent, isRawClay, rawClayHigh, bariumSeverity };
