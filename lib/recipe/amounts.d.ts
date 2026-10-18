// Types for lib/recipe/amounts.js (see index.d.ts).

import type { AdditiveUnit } from './library';

export type Rebase = { to: 'percent' } | { to: 'parts' } | { to: 'batch'; weight: number };

export interface Rebased {
  materials: string[];
  additives: string[];
}

export interface BatchWeights {
  /** Grams of each material, in the recipe's order. */
  materials: number[];
  /** Grams of each colorant or additive, in the recipe's order. */
  additives: number[];
  /** The base (the materials) in grams: the batch size. */
  base: number;
  /** Everything to weigh, base and additives. */
  total: number;
}

type Amount = string | number | undefined | null;

export function unitOf(additive: { unit?: AdditiveUnit }): AdditiveUnit;
export function isAmount(value: Amount): boolean;
export function amountOf(value: Amount): number;
export function totalOf(values: Amount[]): number;
export function formatAmount(value: number, decimals: number): string;
export function wholePartsFactor(amounts: number[]): number;
export function formatScaled(value: number): string;
export function rebase(
  materials: Array<string | undefined>,
  additives: Array<{ amount?: string; unit?: AdditiveUnit }>,
  how: Rebase
): Rebased | null;
export function batchWeights(
  materials: Array<string | undefined>,
  additives: Array<{ amount?: string; unit?: AdditiveUnit }>,
  baseGrams: number
): BatchWeights | null;
