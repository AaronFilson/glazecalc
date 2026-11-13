// Types for lib/recipe/pool.js (see index.d.ts).

import type { Closeness, FitOptions, SelectLine, Selection } from '../chemistry';
import type { MaterialRecord } from './library';
import type { Figure, RecipeMessage } from './messages';

/** What one chosen material does. */
export interface Use {
  name: string;
  amount: Figure;
  /** The oxides it supplies, and its share of each, largest first. */
  supplies: Array<{ oxide: string; share: number }>;
  /** Whether the match gets noticeably worse without it. */
  needed: boolean;
  /** Whether the app requires it (the base frit in place of lead, the clay that keeps a glaze suspended). */
  fixed: boolean;
}

/** A substitution's explanation: what each material does, and what else could have been. */
export interface Report {
  uses: Use[];
  /** Materials offered but not used that would bring the match closer, and by how much. */
  couldHelp: Array<{ name: string; helps: number }>;
  /** Near-identical pairs: the one used, and another that could stand in for it. */
  alike: Array<{ used: string; other: string }>;
  /** Caps that cost match, as percents of the batch; a shared cap names its group and all its members. */
  capped: Array<{
    name: string;
    most: number;
    wouldBe: number;
    group?: string;
    members: string[];
    why?: RecipeMessage;
  }>;
  /** Oxides the old recipe has that nothing offered supplies. */
  unreachable: string[];
  /** How much worse the match is for the limit on new materials, if it cost anything. */
  countCost: number;
  /** How near the result comes: the miss, and the best the materials could do. */
  miss: number;
  best: number;
  /** And oxide by oxide, in the unity formula, when the target was given. */
  closeness?: Closeness;
  /**
   * Present when the work allowed ran out before every choice was tried
   * (lib/chemistry/fit.js WORK): the best found by then.
   */
  cutShort?: true;
}

export function placesFor(total: number): number;

// The notes a new recipe's changes are written in, and a selection moved to
// another batch total: the recipe tools' own (lead.js, shelf.js, solve.js);
// index.js does not export them.

/** A change to the recipe, for its notes: "China Clay 20 → 5.8", "Niter 10 → 0". */
export function changed(name: string, from: Figure | string, to: Figure | string): RecipeMessage;
/** A material new to the recipe, for its notes: "G-200 EU Feldspar 33, new". */
export function added(name: string, amount: Figure | string): RecipeMessage;
/** A material taken out of the recipe: "Niter 10 → 0". */
export function removed(name: string, amount: number, places: number): RecipeMessage;
/** A selection on another batch total: amounts and caps scaled by `scale`. */
export function scaled(selection: Selection, scale: number): Selection;

/**
 * selectMaterials, raw clay held to 20% of the batch (or the old recipe's share) where that keeps the
 * match about as near: the selection, and the lines it chose from (a held clay's naming the cap and why).
 */
export function selectHoldingClay<L extends SelectLine & { material: { name: string; category?: string } }>(
  lines: L[],
  target: Record<string, number>,
  options?: FitOptions & { closer?: boolean; extras?: number; keepOwn?: boolean } & {
    oldClay?: number;
    batch?: number;
    uncapped?: string[];
  }
): { selection: Selection; lines: Array<L & { group?: string; why?: RecipeMessage }> };
export function explain(
  selection: Selection,
  lines: Array<{ material: { name: string }; fixed?: boolean; why?: RecipeMessage }>,
  places: number,
  target?: Record<string, number>
): Report;
export function recipeFrom<M extends MaterialRecord>(
  selection: Selection,
  lines: Array<{ material: M; start: number; added?: boolean }>,
  replacements: Set<string>,
  places: number
): { materials: M[]; changes: RecipeMessage[]; unused: string[] };
