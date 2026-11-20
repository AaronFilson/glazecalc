import { plainNumber } from '../plain.ts';
import type { AdditiveUnit } from './library.ts';

/**
 * A recipe's amounts as saved ("12.5"), and changing the scale of a recipe
 * without changing its proportions, so the unity formula stays the same. The
 * base materials set the scale. Colorants and additives in parts or grams
 * change by the same factor; those given as a percent of the base stay as
 * they are.
 *
 *   percent  the base materials add up to 100
 *   parts    small whole numbers where they fit (3 flint, 2 dolomite), and
 *            exact values for the rest (1.477 soda feldspar)
 *   batch    what to weigh out for a batch of the given weight, in the
 *            batch's unit (grams, or pounds)
 *
 * New amounts keep up to 5 decimal places (7.00001), without trailing zeros.
 */

/** An amount as saved ("12.5"), or as a number; blank or missing counts as none. */
export type Amount = string | number | undefined | null;

/** The scale to rebase a recipe to. */
export type Rebase = { to: 'percent' } | { to: 'parts' } | { to: 'batch'; weight: number };

export interface Rebased {
  materials: Amount[];
  additives: Amount[];
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

/** What a colorant's amount is in; saved recipes from before units read as percent. */
const unitOf = (additive: { unit?: AdditiveUnit }): AdditiveUnit => additive.unit ?? 'percent';

/** True for a blank amount or a number of 0 or more, as saved; false for "12,5", "1o", "-3", "1e3" or "0x10". */
function isAmount(value: Amount): boolean {
  return String(value ?? '').trim() === '' || (plainNumber(value) ?? -1) >= 0;
}

/** An amount as a number; blank or not a positive number counts as 0. */
function amountOf(value: Amount): number {
  const n = plainNumber(value);
  return n !== null && n > 0 ? n : 0;
}

/** The sum of the amounts. */
function totalOf(values: Amount[]): number {
  return values.reduce<number>((sum, value) => sum + amountOf(value), 0);
}

/**
 * A number as an amount is saved: a plain decimal that reads back as the same
 * number, "0.0000001" where String() writes "1e-7", which isAmount and the
 * chemistry refuse.
 */
function plainAmount(value: number): string {
  const text = String(value);
  const exponent = /^(-?)(\d)(?:\.(\d+))?e([+-]\d+)$/.exec(text);
  if (!exponent) return text;
  const [, sign, first, rest = '', power] = exponent;
  const shift = Number(power);
  return shift < 0
    ? sign + '0.' + '0'.repeat(-shift - 1) + first + rest
    : sign + first + rest + '0'.repeat(shift - rest.length);
}

/** Up to `decimals` places, without trailing zeros (12.5, not 12.500), written plainly (plainAmount). */
function formatAmount(value: number, decimals: number): string {
  return plainAmount(Number(value.toFixed(decimals)));
}

// Close enough to a whole number to call it one: an amount typed as a rounded
// percent (33.33) can be a hair off once scaled.
const isWhole = (value: number): boolean =>
  Math.round(value) >= 1 && Math.abs(value - Math.round(value)) <= Math.max(0.005, value * 0.001);

// Potters write parts as small numbers.
const LARGEST_WHOLE_PART = 10;

/**
 * The factor that turns the most amounts into small whole numbers: each amount
 * tried as 1 to 10 parts. Ties go to the smallest numbers.
 */
function wholePartsFactor(amounts: number[]): number {
  const positive = amounts.filter((a) => a > 0);
  let best = { factor: 1, wholes: -1, largest: Infinity };
  for (const amount of positive) {
    for (let parts = 1; parts <= LARGEST_WHOLE_PART; parts++) {
      const factor = parts / amount;
      const scaled = positive.map((a) => a * factor);
      const wholes = scaled.filter(isWhole).length;
      const largest = Math.max(...scaled);
      if (wholes > best.wholes || (wholes === best.wholes && largest < best.largest - 1e-9)) {
        best = { factor, wholes, largest };
      }
    }
  }
  return best.factor;
}

const SCALED_DECIMALS = 5;

/** A scaled amount: up to 5 decimal places, and never 0 for something that is there. */
function formatScaled(value: number): string {
  const shown = formatAmount(value, SCALED_DECIMALS);
  return shown === '0' && value > 0 ? plainAmount(Number(value.toPrecision(3))) : shown;
}

const formatPart = (value: number): string => (isWhole(value) ? String(Math.round(value)) : formatScaled(value));

/**
 * The recipe's amounts at the new scale, or null when the base materials have
 * no amounts to scale from. Blank or unreadable amounts are left as they are;
 * the page checks for unreadable ones first.
 */
function rebase(
  materials: Amount[],
  additives: Array<{ amount?: Amount; unit?: AdditiveUnit }>,
  how: Rebase
): Rebased | null {
  const base = materials.map(amountOf);
  const total = totalOf(base);
  if (!total) return null;
  if (how.to === 'batch' && !(how.weight > 0)) return null;

  const factor = how.to === 'percent' ? 100 / total : how.to === 'batch' ? how.weight / total : wholePartsFactor(base);
  const show = (n: number) => (how.to === 'parts' ? formatPart(n) : formatScaled(n));
  const scale = (value: Amount) => {
    const amount = amountOf(value);
    return amount ? show(amount * factor) : (value ?? '');
  };
  return {
    materials: materials.map(scale),
    // A percent of the base is the same percent at any scale.
    additives: additives.map((a) => (unitOf(a) === 'percent' ? (a.amount ?? '') : scale(a.amount)))
  };
}

/**
 * The grams to weigh for a batch whose base (the materials) weighs `baseGrams`.
 * A colorant given as a percent of the base is that percent of the batch;
 * one in parts or grams scales with the base, as the materials do.
 */
function batchWeights(
  materials: Amount[],
  additives: Array<{ amount?: Amount; unit?: AdditiveUnit }>,
  baseGrams: number
): BatchWeights | null {
  const total = totalOf(materials);
  if (!total || !(baseGrams > 0)) return null;
  const factor = baseGrams / total;
  const materialGrams = materials.map((amount) => amountOf(amount) * factor);
  const additiveGrams = additives.map((additive) =>
    unitOf(additive) === 'percent' ? (amountOf(additive.amount) / 100) * baseGrams : amountOf(additive.amount) * factor
  );
  return {
    materials: materialGrams,
    additives: additiveGrams,
    base: baseGrams,
    total: baseGrams + additiveGrams.reduce((sum, grams) => sum + grams, 0)
  };
}

export {
  unitOf,
  isAmount,
  amountOf,
  totalOf,
  formatAmount,
  plainAmount,
  wholePartsFactor,
  formatScaled,
  rebase,
  batchWeights
};
