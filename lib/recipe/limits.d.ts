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
 * over `max` a caution starts (at `max` for boron); past `minLikely` or
 * `maxLikely` the fault is likely (the same figure when not given), and
 * `maxLikelyThin` is boron's when alumina or silica is thin.
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
  unity: Readonly<Partial<Record<FiringBand, Readonly<Record<string, UnityRange>>>>>;
}

/** The app's own limits (low fire, and mid fire from 1150 °C up), the default. */
export const GLAZECALC_LIMITS: LimitSet;
/** The limit sets to choose from, by id. */
export const LIMIT_SETS: Readonly<Record<string, LimitSet>>;
/** The band of a set a firing falls in; undefined when the firing is not known. */
export function bandOf(set: LimitSet, celsius: number | undefined): FiringBand | undefined;
