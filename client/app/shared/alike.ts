import { MOLAR_MASS, MaterialInput, materialWeights } from '../../../lib/chemistry';

// How alike two materials are, by what they bring to a glaze: used to swap one
// for another (pages/recipe/compare.ts) and to find what is sold nearby
// (pages/guides/local-equivalents.ts).

/** Fired oxides per gram of the raw material, or null when it has no chemistry the app can read. */
function oxidesPerGram(material: MaterialInput): Record<string, number> | null {
  try {
    const { unity, equivalent } = materialWeights(material);
    return Object.fromEntries(
      Object.entries(unity).map(([oxide, moles]) => [oxide, (moles * MOLAR_MASS[oxide]) / equivalent])
    );
  } catch {
    return null;
  }
}

/** Grams of oxides two materials may differ by, per 100 g, and still swap one for one. */
export const LIKE_FOR_LIKE_GRAMS = 15;

/**
 * How far apart two materials are: the grams by which their fired oxides per
 * 100 g of raw material differ, in all; null where either has no oxides to
 * compare.
 */
export function gramsApart(a: MaterialInput, b: MaterialInput): number | null {
  const [x, y] = [oxidesPerGram(a), oxidesPerGram(b)];
  if (!x || !y || !Object.keys(x).length || !Object.keys(y).length) return null;
  const oxides = new Set([...Object.keys(x), ...Object.keys(y)]);
  return [...oxides].reduce((sum, oxide) => sum + Math.abs((x[oxide] ?? 0) - (y[oxide] ?? 0)), 0) * 100;
}
