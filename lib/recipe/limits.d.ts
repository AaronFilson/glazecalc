// Types for lib/recipe/limits.js (see index.d.ts).

interface TwoLevels {
  caution: number;
  likely: number;
}

/** Firing bands, in °C. */
export const FIRING: Readonly<{ lowFireBelow: number; zincMeltsFrom: number }>;

/** The figures the checks warn at (limits.js). */
export const CHECK_LIMITS: Readonly<{
  boronLowFire: TwoLevels & { thinLikely: number };
  boronMidFire: TwoLevels;
  thin: { alumina: number; silica: number };
  boronShortShare: number;
  aluminaLowFire: TwoLevels;
  aluminaMidFire: TwoLevels;
  silicaAluminaBelow: number;
  boronBlue: { boron: number; calcia: number; alumina: number };
  alkaliLowFire: TwoLevels;
  alkaliMidFire: TwoLevels;
  magnesiaLowFire: TwoLevels;
  zinc: number;
  rawCalcium: TwoLevels;
  clay: TwoLevels & { least: number };
  expansionRises: TwoLevels;
  expansionFalls: TwoLevels;
  alreadyFactor: number;
  manyMaterials: number;
  manyMaterialsLowFire: number;
  smallPercent: number;
  scaleReads: number;
}>;

/** A firing band: cone 06-02, cone 4-6, or cone 9-11. */
export type FiringBand = 'low' | 'mid' | 'high';

export const FIRING_BANDS: ReadonlyArray<FiringBand>;

/**
 * A range for an oxide or sum in the unity formula, in moles. Under `min` or
 * over `max` a caution starts (the range is closed: see `pastSide`); at or
 * past `minLikely` or `maxLikely` the fault is likely (never, when not
 * given), and `maxLikelyThin` is boron's when alumina or silica is thin.
 */
export interface UnityRange {
  min?: number;
  max?: number;
  minLikely?: number;
  maxLikely?: number;
  maxLikelyThin?: number;
}

/**
 * A set of limits on the unity formula: where it is from, its firing bands
 * (coolest first: each up to `belowC`, the last with none, so a set with no
 * high band checks cone 10 as its hottest band), the band whose figures apply
 * when the firing is not known, and per band a range per oxide or sum
 * ('B2O3', 'Al2O3', 'K2O+Na2O', 'SiO2', ...).
 */
export interface LimitSet {
  id: string;
  name: string;
  source: { title: string; url?: string };
  bands: ReadonlyArray<{ band: FiringBand; belowC?: number }>;
  whenUnknown: FiringBand;
  /** The cone each band's figures are for, as the source names it ('6', '10'), where it names one. */
  cones?: Readonly<Partial<Record<FiringBand, string>>>;
  /** A band the set names but has no figures for is one it does not apply to. */
  unity: Readonly<Partial<Record<FiringBand, Readonly<Record<string, UnityRange>>>>>;
}

/** The app's own limits (low fire, and mid fire from 1150 °C up), what the swaps check against. */
export const GLAZECALC_LIMITS: LimitSet;
/** Hesselberth & Roy's stable glaze limits, cone 6 and cone 10 (Ceramics Monthly, September 2000). */
export const HESSELBERTH_ROY_LIMITS: LimitSet;
/** The limit sets to choose from, by id. */
export const LIMIT_SETS: Readonly<Record<string, LimitSet>>;
/** The id of the set the recipe page shows until another is chosen. */
export const DEFAULT_LIMIT_SET: string;
/** The band of a set a firing falls in; undefined when the firing is not known. */
export function bandOf(set: LimitSet, celsius: number | undefined): FiringBand | undefined;
/** A set's ranges for a band (its nearest, if it does not name it), or null where it does not apply. */
export function unityFor(set: LimitSet, band: FiringBand): Readonly<Record<string, UnityRange>> | null;

/**
 * Which side of a range a value is past, or null within it, compared at the two
 * decimals it is shown with: a value at a bound is within. The checks and the
 * table both use it.
 */
export function pastSide(value: number, range: UnityRange): 'below' | 'above' | null;
/** Whether a value past a range is at or past its figure for a likely fault; false where it has none. */
export function isLikely(value: number, range: UnityRange, past: 'below' | 'above' | null, thin?: boolean): boolean;
/** A thin glaze, for boron's likely figure: alumina or silica under CHECK_LIMITS.thin. */
export function isThin(unity: Record<string, number>): boolean;

/** A recipe's value against one of a set's ranges. */
export interface LimitRow {
  /** The oxide or sum: 'B2O3', 'K2O+Na2O'. */
  oxide: string;
  value: number;
  min?: number;
  max?: number;
  /** Which side of the range the value is past; null within it. */
  past: 'below' | 'above' | null;
  /** Past the set's figure for a likely fault as well, where it has one. */
  likely: boolean;
}

/** A row per limit a set has for a band, or null where the set does not apply to it. */
export function limitRows(unity: Record<string, number>, set: LimitSet, band: FiringBand): LimitRow[] | null;
