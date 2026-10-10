import { plainNumber, upTo } from './format';

/** How batch weights are shown: grams, or pounds and ounces (the account's setting). */
export type WeightUnit = 'g' | 'lb';

/** Grams to a tenth (hundredths under 10 g), or in full: up to 5 decimal places (the account's setting). */
export type GramPrecision = 'single' | 'full';

export const GRAMS_PER_POUND = 453.59237;
export const GRAMS_PER_OUNCE = GRAMS_PER_POUND / 16;

/** Up to `places` decimals, without trailing zeros, as the reader writes numbers. */
const trim = (value: number, places: number): string => upTo(value, places);

/**
 * A weight as a scale reads it: "4938.2 g" (2 decimals under 10 g, for small
 * colorant amounts), or in full, "4938.23517 g"; or "2 lb 3.5 oz", "3.5 oz",
 * "0.25 oz" (ounces to 0.1, or 0.01 under an ounce). Trailing zeros are dropped.
 */
export function formatWeight(grams: number, unit: WeightUnit, precision: GramPrecision = 'single'): string {
  if (!(grams > 0)) return unit === 'lb' ? '0 oz' : '0 g';
  if (unit === 'g') return trim(grams, precision === 'full' ? 5 : grams < 10 ? 2 : 1) + ' g';
  const ounces = grams / GRAMS_PER_OUNCE;
  if (ounces < 1) return trim(ounces, 2) + ' oz';
  // Round the ounces first, so 15.96 oz shows as 1 lb, not 0 lb 16 oz.
  const tenths = Math.round(ounces * 10);
  const pounds = Math.floor(tenths / 160);
  const rest = (tenths - pounds * 160) / 10;
  if (!pounds) return trim(rest, 1) + ' oz';
  return rest ? `${pounds} lb ${trim(rest, 1)} oz` : `${pounds} lb`;
}

/**
 * A batch size in the account's unit (grams, or decimal pounds), as a number
 * box saves it ("2.5", shared/number-input.ts), in grams; 0 if not a weight.
 */
export function toGrams(amount: string | number, unit: WeightUnit): number {
  const n = plainNumber(amount) ?? 0;
  if (!(n > 0)) return 0;
  return unit === 'lb' ? n * GRAMS_PER_POUND : n;
}

/** Grams as a plain number in the unit: 1000 g is 2.2046 lb. */
export function fromGrams(grams: number, unit: WeightUnit): number {
  return unit === 'lb' ? grams / GRAMS_PER_POUND : grams;
}

/** The unit's name for a label: "g" or "lb". */
export const unitLabel = (unit: WeightUnit): string => (unit === 'lb' ? 'lb' : 'g');
