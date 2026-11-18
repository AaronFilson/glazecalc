// What a recipe is checked against, as functions of a limit set (docs/adr/0012, docs/adr/0019-shared-recipe-tools.md).
// The figures and the sets themselves are the catalog's (lib/catalog/limits.ts), given in the host (host.limits).
// A limit set gives, per firing band, a range for each oxide or sum of the unity formula it limits.

import type { Host } from '../host.ts';

/** A firing band: cone 06-02, cone 4-6, cone 9-11, or cone 12 up ('top', where no limit set has figures). */
export type FiringBand = 'low' | 'mid' | 'high' | 'top';

/**
 * A range for an oxide or sum in the unity formula, in moles. Under `min` or over `max` a caution
 * starts; at or past `minLikely` or `maxLikely` the fault is likely, and `maxLikelyThin` is boron's
 * when alumina or silica is thin.
 */
export interface UnityRange {
  readonly min?: number;
  readonly max?: number;
  readonly minLikely?: number;
  readonly maxLikely?: number;
  readonly maxLikelyThin?: number;
}

/** Which side of a range a value is past, or null within it. */
export type Past = 'below' | 'above' | null;

/**
 * A set of limits on the unity formula: its firing bands (coolest first, the last with no `belowC`),
 * the band whose figures apply when the firing is not known, and per band a range per oxide or sum.
 */
export interface LimitSet {
  readonly id: string;
  readonly bands: ReadonlyArray<{ readonly band: FiringBand; readonly belowC?: number }>;
  readonly whenUnknown: FiringBand;
  /** The cone each band's figures are for, as the source names it ('6', '10'), where it names one. */
  readonly cones?: Readonly<Partial<Record<FiringBand, string>>>;
  /** A band the set names but has no figures for is one it does not apply to. */
  readonly unity: Readonly<Partial<Record<FiringBand, Readonly<Record<string, UnityRange>>>>>;
}

/** A recipe's value against one of a set's ranges. */
export interface LimitRow {
  oxide: string;
  value: number;
  min?: number;
  max?: number;
  past: Past;
  likely: boolean;
}

/** Firing edges in °C: low fire below `lowFireBelow`, no limit set's figures from `topFrom`, zinc melting from `zincMeltsFrom`. */
export interface FiringFigures {
  readonly lowFireBelow: number;
  readonly topFrom: number;
  readonly zincMeltsFrom: number;
}

/** A check's two figures: past `caution` a glaze tends to show the fault, past `likely` it will probably. */
export interface Graded {
  readonly caution: number;
  readonly likely: number;
}

/** The figures the recipe checks warn at (the catalog's CHECK_LIMITS, lib/catalog/limits.ts, says what each is). */
export interface CheckLimits {
  readonly boronLowFire: Graded & { readonly thinLikely: number };
  readonly boronMidFire: Graded;
  readonly thin: { readonly alumina: number; readonly silica: number };
  readonly boronShortShare: number;
  readonly aluminaLowFire: Graded;
  readonly aluminaMidFire: Graded;
  readonly silicaAluminaBelow: number;
  readonly boronBlue: { readonly boron: number; readonly calcia: number; readonly alumina: number };
  readonly alkaliLowFire: Graded;
  readonly alkaliMidFire: Graded;
  readonly magnesiaLowFire: Graded;
  readonly zinc: number;
  readonly barium: Graded;
  readonly rawCalcium: Graded;
  readonly clay: Graded & { readonly least: number };
  readonly expansionRises: Graded;
  readonly expansionFalls: Graded;
  readonly alreadyFactor: number;
  readonly manyMaterials: number;
  readonly manyMaterialsLowFire: number;
  readonly smallPercent: number;
  readonly scaleReads: number;
}

/** The limits a host gives the core (host.limits): the figures, the app's own set, and the set cone fit reads. */
export interface LimitTable {
  readonly firing: FiringFigures;
  readonly checks: CheckLimits;
  /** The set the swaps' checks use when given none. */
  readonly own: LimitSet;
  /** The set whose silica and alumina cone fit compares with (Hesselberth & Roy's). */
  readonly forFit: LimitSet;
}

/**
 * The firing bands a limit set may have, coolest first: cone 06-02, cone 4-6,
 * cone 9-11, and cone 12 up ('top'), which no set has figures for (the limits
 * we found published, Hesselberth & Roy's, the UK traditional set and Green &
 * Cooper's, stop at cone 10; docs/adr/0021-recipe-firing.md, amended 2026-10-20).
 */
const FIRING_BANDS: ReadonlyArray<FiringBand> = Object.freeze(['low', 'mid', 'high', 'top'] as const);

/**
 * The band of a set a firing falls in: the first whose `belowC` it is under,
 * or the last band. Undefined when the firing is not known (anything but a
 * finite number: null is not 0 °C).
 */
function bandOf(set: LimitSet, celsius: number | null | undefined): FiringBand | undefined {
  if (!Number.isFinite(celsius)) return undefined;
  const c = celsius as number;
  const bands = set.bands;
  return (bands.find((band) => band.belowC !== undefined && c < band.belowC) ?? bands[bands.length - 1]).band;
}

/**
 * The band of a set a firing band is read as: the band itself where the set
 * names it, else the nearest it names, the cooler of two as near (the app's
 * own set, with no high band, reads cone 10 as its mid fire).
 */
function bandIn(set: LimitSet, band: FiringBand): FiringBand {
  const named = set.bands.map((b) => b.band);
  if (named.includes(band)) return band;
  const order = FIRING_BANDS.indexOf(band);
  return named.reduce((best, b) =>
    Math.abs(FIRING_BANDS.indexOf(b) - order) < Math.abs(FIRING_BANDS.indexOf(best) - order) ? b : best
  );
}

/**
 * A set's ranges for a band, or null where the set does not apply: a band it
 * names but gives no figures for (Hesselberth & Roy's at low fire, and every
 * set's 'top'). A band it does not name is read as its nearest (bandIn).
 */
function unityFor(set: LimitSet, band: FiringBand): Readonly<Record<string, UnityRange>> | null {
  return set.unity[bandIn(set, band)] ?? null;
}

/** A unity formula's value for an oxide or a sum of them ('K2O+Na2O'). */
const unityValue = (unity: Record<string, number>, key: string): number =>
  key.split('+').reduce((sum, oxide) => sum + (unity[oxide] ?? 0), 0);

/**
 * A value as the limits compare it: at the two decimals it is shown with
 * (recipe-limits.ts, and the checks' figures), so the table never says "below"
 * beside a figure that reads as the bound, and a float hair over a bound
 * (0.2 + 0.1 = 0.30000000000000004) is not past it. toFixed rounds the
 * double's exact value, as the page's number format does.
 */
const asShown = (value: number): number => (Number.isFinite(value) ? Number(value.toFixed(2)) : value);

/**
 * Which side of a range a value is past, or null within it. A range is closed:
 * a value at its `min` or `max` is within, as Hesselberth & Roy's "0.25-0.40"
 * reads. The checks (checks.js pastLimits) and the table (limitRows) both use
 * this, so they agree.
 */
function pastSide(value: number, r: UnityRange): Past {
  const v = asShown(value);
  if (r.min !== undefined && v < r.min) return 'below';
  if (r.max !== undefined && v > r.max) return 'above';
  return null;
}

/**
 * Whether a value past a range is past its figure for a likely fault too: at
 * or beyond `minLikely` or `maxLikely` (`maxLikelyThin` for a thin glaze). A
 * range with no such figure (Hesselberth & Roy give one figure per edge) has
 * no likely fault, only a caution.
 */
function isLikely(value: number, r: UnityRange, past: Past, thin?: boolean): boolean {
  const v = asShown(value);
  if (past === 'below') return r.minLikely !== undefined && v <= r.minLikely;
  if (past === 'above') {
    const maxLikely = (thin ? r.maxLikelyThin : undefined) ?? r.maxLikely;
    return maxLikely !== undefined && v >= maxLikely;
  }
  return false;
}

/**
 * A thin glaze, for boron's likely figure: alumina or silica under CHECK_LIMITS.thin, at the two decimals shown
 * (asShown), so alumina shown as 0.15 is not thin.
 */
const isThin = (host: Host, unity: Record<string, number>): boolean =>
  asShown(unity['Al2O3'] ?? 0) < host.limits.checks.thin.alumina ||
  asShown(unity['SiO2'] ?? 0) < host.limits.checks.thin.silica;

/**
 * A row per limit a set has for a band: the oxide or sum, the recipe's value,
 * the range, and which side of it the value is past (null within it), and
 * whether it is past the set's figure for a likely fault too, where it has one. Null where
 * the set does not apply to the band.
 */
function limitRows(host: Host, unity: Record<string, number>, set: LimitSet, band: FiringBand): LimitRow[] | null {
  const ranges = unityFor(set, band);
  if (!ranges) return null;
  // The same comparisons as the checks (checks.js pastLimits): pastSide and isLikely.
  const thin = isThin(host, unity);
  return Object.entries(ranges).map(([oxide, r]) => {
    const value = unityValue(unity, oxide);
    const past = pastSide(value, r);
    return { oxide, value, min: r.min, max: r.max, past, likely: isLikely(value, r, past, thin) };
  });
}

export { FIRING_BANDS, bandOf, bandIn, unityFor, asShown, pastSide, isLikely, isThin, limitRows };
