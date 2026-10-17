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
