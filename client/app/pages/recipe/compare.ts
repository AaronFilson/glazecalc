import { MOLAR_MASS, MaterialInput, formatFormula, materialWeights } from '../../../../lib/chemistry';
import { LibraryInfo, Material, RecipeAnalysis, RecipeMaterial } from '../../core/models';
import { inRegion, statusText } from '../../shared/library-info';
import { UNITY_TITLES, silicaAluminaRatio, unityColumnOf } from './unity-formula';

// Comparing two recipes (issue #6), and trying an old recipe with the
// materials that replace its discontinued ones.

export interface CompareRow {
  label: string;
  /** The value in each recipe; null where it has none. */
  left: number | null;
  right: number | null;
  /** Right minus left, counting a recipe without it as 0; null when neither can say. */
  change: number | null;
  /** Decimal places to show. */
  places: number;
}

export interface CompareGroup {
  title: string;
  rows: CompareRow[];
}

const value = (n: number | null | undefined): number | null => (typeof n === 'number' && n > 0 ? n : null);

/**
 * A row. Its change counts an oxide one recipe lacks as 0, but only when both
 * recipes have a unity formula: against a recipe that is not there, there is no change.
 */
const row = (label: string, left: number | null, right: number | null, both: boolean, places = 3): CompareRow => ({
  label,
  left,
  right,
  change: both && (left !== null || right !== null) ? (right ?? 0) - (left ?? 0) : null,
  places
});

// A ratio or total: a change only when both recipes have one.
const fact = (label: string, left: number | null, right: number | null, places: number): CompareRow =>
  row(label, left, right, left !== null && right !== null, places);

/**
 * Two unity formulas side by side: a row for every oxide in either, under the
 * columns potters read them in (fluxes, stabilizers, glass formers, others),
 * then the silica to alumina ratio, the flux balance and the loss on ignition.
 */
export function compareUnity(left: RecipeAnalysis | null, right: RecipeAnalysis | null): CompareGroup[] {
  const groups: CompareGroup[] = UNITY_TITLES.map((title) => ({ title, rows: [] }));
  const both = !!left && !!right;
  const oxides = [...new Set([...Object.keys(left?.uList ?? {}), ...Object.keys(right?.uList ?? {})])];
  for (const oxide of oxides) {
    const a = value(left?.uList[oxide]);
    const b = value(right?.uList[oxide]);
    if (a === null && b === null) continue;
    groups[unityColumnOf(oxide)].rows.push(row(formatFormula(oxide), a, b, both));
  }
  const ratio = (analysis: RecipeAnalysis | null) => (analysis ? silicaAluminaRatio(analysis) : null);
  const facts: CompareGroup = {
    title: 'Balance',
    rows: [
      fact('Silica to alumina', ratio(left), ratio(right), 2),
      fact('R₂O fluxes', left?.groups?.R2O ?? null, right?.groups?.R2O ?? null, 2),
      fact('RO fluxes', left?.groups?.RO ?? null, right?.groups?.RO ?? null, 2),
      fact('Loss on ignition, %', left?.loi ?? null, right?.loi ?? null, 1)
    ]
  };
  return [...groups.filter((group, i) => i < 3 || group.rows.length), facts];
}

/** A change for a table cell: +0.052, −0.120 (a true minus sign), or "same" when it rounds to nothing. */
export function formatChange(change: number | null, places: number): string {
  if (change === null) return '';
  const rounded = Number(change.toFixed(places));
  if (rounded === 0) return 'same';
  return (rounded > 0 ? '+' : '−') + Math.abs(rounded).toFixed(places);
}

export interface Swap {
  from: string;
  /** Why: "Discontinued 2023", "Historical", "Hard to get since 2025". */
  status: string;
  to: string;
  /** Whether the two give the glaze much the same oxides, gram for gram (see likeForLike). */
  like: boolean;
  /** Whether what takes its place still has lead in it. */
  lead: boolean;
}

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
const LIKE_FOR_LIKE_GRAMS = 15;

/**
 * Whether one material can stand in for another gram for gram: their fired
 * oxides per 100 g of raw material differ by 15 g or less in all. Custer Spar
 * and G-200 EU Feldspar do; niter (potash) and a soda frit, or red lead and a
 * lead frit, do not, so their amounts need working out again.
 */
export function likeForLike(a: MaterialInput, b: MaterialInput): boolean {
  const [x, y] = [oxidesPerGram(a), oxidesPerGram(b)];
  // Without oxides to compare, nothing says they are alike.
  if (!x || !y || !Object.keys(x).length || !Object.keys(y).length) return false;
  const oxides = new Set([...Object.keys(x), ...Object.keys(y)]);
  const grams = [...oxides].reduce((sum, oxide) => sum + Math.abs((x[oxide] ?? 0) - (y[oxide] ?? 0)), 0) * 100;
  return grams <= LIKE_FOR_LIKE_GRAMS;
}

export type LibraryMaterial = Material & LibraryInfo;

/**
 * The recipe's materials with each one that is no longer current (discontinued,
 * historical or hard to get) replaced, one for one at the same amount, by the
 * first substitute the library gives for it: one sold in `region` if there is
 * one. `find` looks a material up by name or other name. Swaps are a starting
 * point; amounts may need adjusting to bring the unity formula back.
 */
export function modernMaterials(
  materials: RecipeMaterial[],
  find: (name: string) => LibraryMaterial | undefined,
  region = ''
): { materials: RecipeMaterial[]; swaps: Swap[] } {
  const swaps: Swap[] = [];
  const modern = materials.map((material) => {
    const record = find(material.name);
    if (!record?.status || record.status === 'current' || !record.substitutes?.length) return material;
    const substitutes = record.substitutes
      .map((name) => find(name))
      .filter((sub): sub is LibraryMaterial => !!sub && (!sub.status || sub.status === 'current'));
    const substitute =
      substitutes.find((sub) => region && sub.region?.includes(region)) ??
      substitutes.find((sub) => inRegion(sub, region)) ??
      substitutes[0];
    if (!substitute) return material;
    swaps.push({
      from: material.name,
      status: statusText(record),
      to: substitute.name,
      like: likeForLike(record, substitute),
      lead: substitute.fields.some((field) => field.name === 'PbO')
    });
    return { ...structuredClone(substitute), amount: material.amount };
  });
  return { materials: mergeSameMaterials(modern), swaps };
}

/**
 * One line for each material: two old ones replaced by the same new one
 * (Custer and Oxford spar by G-200 EU), or one already in the recipe, become
 * one line with their amounts added, where both are numbers.
 */
function mergeSameMaterials(materials: RecipeMaterial[]): RecipeMaterial[] {
  const merged: RecipeMaterial[] = [];
  for (const material of materials) {
    const same = merged.find((m) => m.name === material.name);
    const [a, b] = [Number(same?.amount), Number(material.amount)];
    if (same && same.amount?.trim() && material.amount?.trim() && Number.isFinite(a) && Number.isFinite(b)) {
      same.amount = String(Number((a + b).toFixed(5)));
    } else {
      merged.push({ ...material });
    }
  }
  return merged;
}
