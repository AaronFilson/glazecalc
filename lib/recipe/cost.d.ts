// Types for lib/recipe/cost.js (see index.d.ts).

import type { AdditiveUnit } from './library';

/** A material's price per kilogram, by its key (the client's libraryKey), in the account's currency. */
export interface Price {
  key: string;
  perKg: number;
}

export interface CostLine {
  key: string;
  grams: number;
  /** Its price per kilogram, or null when it has none. */
  perKg: number | null;
  /** What it costs, or null when it has no price and weighs something. */
  cost: number | null;
}

export interface BatchCost {
  /** What the priced lines cost together. */
  cost: number;
  /** Everything weighed, in grams. */
  grams: number;
  /** The whole batch's cost per kilogram; null unless every line that weighs something has a price. */
  perKg: number | null;
  /** Every line that weighs something has a price. */
  complete: boolean;
  /** The keys of lines with no price that weigh something, each once, in order. */
  missing: string[];
  lines: CostLine[];
}

export const GRAMS_PER_KG: 1000;
export function isPrice(value: unknown): value is number;
export function batchCost(
  lines: ReadonlyArray<{ key: string; grams: number }>,
  prices: ReadonlyArray<Price> | ReadonlyMap<string, number>
): BatchCost;
export function recipeCost(
  recipe: {
    materials?: ReadonlyArray<{ key: string; amount?: string }>;
    additives?: ReadonlyArray<{ key: string; amount?: string; unit?: AdditiveUnit }>;
  },
  baseGrams: number,
  prices: ReadonlyArray<Price> | ReadonlyMap<string, number>
): BatchCost | null;
