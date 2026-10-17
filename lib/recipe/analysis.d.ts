// Types for lib/recipe/analysis.js (see index.d.ts).

/** Each oxide's percent of all the moles in a unity formula; empty when it has none. */
export function molePercent(unity: Record<string, number> | null | undefined): Record<string, number>;

/** A point on Stull's chart: [SiO2, Al2O3] in moles. */
export type StullXY = readonly [number, number];
export type StullRegion = 'unfused' | 'matte' | 'semi-matte' | 'bright' | 'underfired';

/** Stull's chart (1912), as Glazy reads it: its extent, regions, crazed area and line of brightest glazes. */
export const STULL: Readonly<{
  silica: Readonly<{ min: number; max: number }>;
  alumina: Readonly<{ min: number; max: number }>;
  regions: Readonly<Record<Exclude<StullRegion, 'bright'>, ReadonlyArray<StullXY>>>;
  crazed: ReadonlyArray<StullXY>;
  bright: ReadonlyArray<StullXY>;
}>;

export interface StullPoint {
  silica: number;
  alumina: number;
  ratio: number;
  /** Null off the chart. */
  region: StullRegion | null;
  crazed: boolean;
}

/** Where a unity formula sits on Stull's chart; null without silica or alumina. */
export function stullPoint(unity: Record<string, number> | null | undefined): StullPoint | null;
