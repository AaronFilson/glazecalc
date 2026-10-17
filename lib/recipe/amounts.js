'use strict';

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

/**
 * A number saved plainly ("12.5", "-3"); null for anything else, such as
 * "12,5", "1e3" or "0x10" (which Number() would read).
 */
function plainNumber(text) {
  const plain = String(text ?? '').trim();
  return /^-?\d*\.?\d+$/.test(plain) ? Number(plain) : null;
}

/** What a colorant's amount is in; saved recipes from before units read as percent. */
const unitOf = (additive) => additive.unit ?? 'percent';

/** True for a blank amount or a number of 0 or more, as saved; false for "12,5", "1o", "-3", "1e3" or "0x10". */
function isAmount(value) {
  return String(value ?? '').trim() === '' || (plainNumber(value) ?? -1) >= 0;
}

/** An amount as a number; blank or not a positive number counts as 0. */
function amountOf(value) {
  const n = plainNumber(value);
  return n !== null && n > 0 ? n : 0;
}

/** The sum of the amounts. */
function totalOf(values) {
  return values.reduce((sum, value) => sum + amountOf(value), 0);
}

/** Up to `decimals` places, without trailing zeros: 12.5, not 12.500. */
function formatAmount(value, decimals) {
  return String(Number(value.toFixed(decimals)));
}

// Close enough to a whole number to call it one: an amount typed as a rounded
// percent (33.33) can be a hair off once scaled.
const isWhole = (value) =>
  Math.round(value) >= 1 && Math.abs(value - Math.round(value)) <= Math.max(0.005, value * 0.001);

// Potters write parts as small numbers.
const LARGEST_WHOLE_PART = 10;

/**
 * The factor that turns the most amounts into small whole numbers: each amount
 * tried as 1 to 10 parts. Ties go to the smallest numbers.
 */
function wholePartsFactor(amounts) {
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
function formatScaled(value) {
  const shown = formatAmount(value, SCALED_DECIMALS);
  return shown === '0' && value > 0 ? String(Number(value.toPrecision(3))) : shown;
}

const formatPart = (value) => (isWhole(value) ? String(Math.round(value)) : formatScaled(value));

/**
 * The recipe's amounts at the new scale, or null when the base materials have
 * no amounts to scale from. Blank or unreadable amounts are left as they are;
 * the page checks for unreadable ones first.
 */
function rebase(materials, additives, how) {
  const base = materials.map(amountOf);
  const total = totalOf(base);
  if (!total) return null;
  if (how.to === 'batch' && !(how.weight > 0)) return null;

  const factor = how.to === 'percent' ? 100 / total : how.to === 'batch' ? how.weight / total : wholePartsFactor(base);
  const show = (n) => (how.to === 'parts' ? formatPart(n) : formatScaled(n));
  const scale = (value) => {
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
function batchWeights(materials, additives, baseGrams) {
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

module.exports = {
  plainNumber,
  unitOf,
  isAmount,
  amountOf,
  totalOf,
  formatAmount,
  wholePartsFactor,
  formatScaled,
  rebase,
  batchWeights
};
