/**
 * Changing the scale of a recipe without changing its proportions, so the unity
 * formula stays the same. The base materials set the scale; colorants and
 * additives (amounts on top of the base) are scaled by the same factor.
 *
 *   percent  the base materials add up to 100
 *   parts    small whole numbers where they fit (3 flint, 2 dolomite), and
 *            exact values for the rest (1.477 soda feldspar)
 *   batch    grams to weigh out for a batch of the given weight
 */
export type Rebase = { to: 'percent' } | { to: 'parts' } | { to: 'batch'; grams: number };

export interface Rebased {
  materials: string[];
  additives: string[];
}

/** An amount as a number; blank or not a positive number counts as 0. */
export function amountOf(value: string | number | undefined | null): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** The sum of the amounts. */
export function totalOf(values: Array<string | number | undefined | null>): number {
  return values.reduce<number>((sum, value) => sum + amountOf(value), 0);
}

/** Up to `decimals` places, without trailing zeros: 12.5, not 12.500. */
export function formatAmount(value: number, decimals: number): string {
  return String(Number(value.toFixed(decimals)));
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
export function wholePartsFactor(amounts: number[]): number {
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

const formatPart = (value: number): string => (isWhole(value) ? String(Math.round(value)) : formatAmount(value, 3));

/**
 * The recipe's amounts at the new scale, or null when the base materials have
 * no amounts to scale from. Blank or unreadable amounts are left as they are.
 */
export function rebase(
  materials: Array<string | undefined>,
  additives: Array<string | undefined>,
  how: Rebase
): Rebased | null {
  const base = materials.map(amountOf);
  const total = totalOf(base);
  if (!total) return null;
  if (how.to === 'batch' && !(how.grams > 0)) return null;

  const factor = how.to === 'percent' ? 100 / total : how.to === 'batch' ? how.grams / total : wholePartsFactor(base);
  const show = (n: number): string =>
    how.to === 'percent' ? formatAmount(n, 2) : how.to === 'batch' ? formatAmount(n, 1) : formatPart(n);
  const scale = (value: string | undefined): string => {
    const amount = amountOf(value);
    return amount ? show(amount * factor) : (value ?? '');
  };
  return { materials: materials.map(scale), additives: additives.map(scale) };
}
