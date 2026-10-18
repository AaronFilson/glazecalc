// Types for lib/recipe/suggest.js (see index.d.ts).

import type { AdditiveRecord, MaterialRecord, TryMaterial } from './library';
import type { Caution, RecipeMessage } from './messages';
import type { Report } from './pool';
import type { Swap } from './swaps';

/** A material that could bring a short oxide back, with its weight percent of the oxide. */
export interface Choice {
  name: string;
  percent: number;
}

/** An oxide the old materials gave that the swap leaves well short. */
export interface Shortfall {
  oxide: string;
  /** The old materials that gave it, and what replaces them. */
  from: string[];
  instead: string[];
  /** In the unity formula: in the old recipe, and with the swap. */
  was: number;
  now: number;
  choices: Choice[];
}

export interface Plan {
  swaps: Swap[];
  shortfalls: Shortfall[];
}

export interface Suggestion<M extends MaterialRecord = MaterialRecord> {
  materials: M[];
  /** What changed, for the new recipe's notes. */
  changes: RecipeMessage[];
  /** Replacements the fit had no use for. */
  unused: string[];
  /** Oxides (formulas) still well short after all. */
  stillShort: string[];
  report: Report;
  /** What to watch for: limits newly crossed, many materials, small amounts. */
  cautions: Caution[];
}

export function planSuggestion<M extends MaterialRecord>(
  lines: M[],
  find: (name: string) => M | undefined,
  standard: M[],
  region: string,
  options?: { allowLead?: boolean }
): Plan;

export function suggestAmounts<M extends MaterialRecord>(
  lines: M[],
  find: (name: string) => M | undefined,
  bringIn: M[],
  region: string,
  options?: { allowLead?: boolean; tries?: TryMaterial<M>[]; avoid?: string[]; additives?: AdditiveRecord[] }
): Suggestion<M>;
