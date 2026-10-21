// Types for lib/recipe/solve.js (see index.d.ts).

import type { FiringBand, LimitSet } from './limits';
import type { MaterialRecord, TryMaterial } from './library';
import type { Caution } from './messages';
import type { Report } from './pool';

/** A target as typed: a unity formula (moles, per mole of fluxes) or an oxide analysis (weight percent). */
export interface SolveTarget {
  kind: 'unity' | 'analysis';
  oxides: Record<string, number | string>;
}

export interface Solved<M extends MaterialRecord = MaterialRecord> {
  /** The recipe, its amounts in percent as text. */
  materials: M[];
  /** The target's unity formula, and the recipe's. */
  target: Record<string, number>;
  unity: Record<string, number>;
  /** What a unity formula's fluxes added up to as given (1 for an analysis). */
  fluxes: number;
  report: Report;
  cautions: Caution[];
}

/** The firing and limit set the cautions are for. */
export interface SolveFiring {
  celsius?: number;
  band?: FiringBand;
  limitSet?: LimitSet;
}

/** The recipe batch, in percent. */
export const SOLVE_BATCH: number;

/**
 * The target as oxide moles on 100 g of fired glaze, with its unity formula; throws a RecipeError
 * ('solve.unknownOxide', 'solve.together', 'solve.badAmount', 'solve.noFlux').
 */
export function targetOf(target: SolveTarget): {
  moles: Record<string, number>;
  unity: Record<string, number>;
  fluxes: number;
};

/** The cautions for a solved recipe, as the recipe page's checks give them. */
export function solveCautions(
  materials: MaterialRecord[],
  unity: Record<string, number>,
  firing?: SolveFiring
): Caution[];

/**
 * A recipe in percent from the materials offered whose unity formula comes as near the target as they
 * allow; throws a RecipeError as targetOf does, 'solve.noMaterials' or 'solve.noMatch'.
 */
export function solveTarget<M extends MaterialRecord>(
  target: SolveTarget,
  offered: TryMaterial<M>[],
  options?: SolveFiring & { avoid?: string[]; uncapped?: string[] }
): Solved<M>;

/** The oxides in text pasted from another app, the formula-like names not known, and whether KNaO was given. */
export function parseTarget(text: string): { oxides: Record<string, number>; unknown: string[]; together: boolean };
