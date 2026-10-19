// Types for lib/cones/results.js: a recipe's results by cone and atmosphere (docs/adr/0021-recipe-firing.md).
import type { Atmosphere, FiringBlock, ReadOptions } from './firing';

/** The potter's summary of a recipe at one cone and, optionally, one atmosphere. Saved on a recipe as `coneResults`. */
export interface ConeResult {
  /** The cone as the firing block writes it ('6', '06', '5.5', SK '6a', '1240' °C), read in the recipe's scale. */
  cone: string;
  atmosphere?: Atmosphere;
  summary: string;
}

export const CONE_RESULTS: Readonly<{ summary: number; most: number; cone: number }>;

/** A cone in one of the scales, as a firing block would write it. */
export function isAnyCone(cone: unknown): cone is string;
export function coneResultsProblem(list: unknown): string | null;
export function cleanConeResults(list: unknown): ConeResult[] | null;
/** The key a result is kept under: its cone and atmosphere. */
export function resultKey(cone: string, atmosphere?: Atmosphere | null): string;
/** The atmosphere a firing log's Atmosphere columns name, when every cell naming one names the same one. */
export function atmosphereFromLog(
  log: { fieldsIncluded?: string[]; rows?: unknown[][] } | null | undefined
): Atmosphere | null;
/** Where a newly linked log puts the recipe: its one cone within the stated range, its clear atmosphere. */
export function linkPlace(
  log: { fieldsIncluded?: string[]; rows?: unknown[][] } | null | undefined,
  block: FiringBlock | null | undefined,
  options?: ReadOptions
): { cone?: string; atmosphere?: Atmosphere };
