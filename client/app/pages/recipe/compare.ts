import { translate } from '@jsverse/transloco';
import { MaterialInput, expansion, formatFormula } from '../../../../lib/chemistry';
import { LibraryInfo, Material, RecipeAnalysis, RecipeMaterial } from '../../core/models';
import { LIKE_FOR_LIKE_GRAMS, gramsApart } from '../../shared/alike';
import { hasLead, inRegion, statusText } from '../../shared/library-info';
import { UNITY_TITLES, silicaAluminaRatio, unityColumnOf } from './unity-formula';
import { fixed } from '../../shared/format';

// Comparing two recipes (issue #6), and trying an old recipe with the
// materials that replace its discontinued ones.

export interface CompareRow {
  /** An oxide's formula, or what the row is, in the page's language. */
  label: string;
  /** Whether the label is a formula, which is never translated. */
  formula?: boolean;
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
 * then the silica to alumina ratio, the flux balance, the loss on ignition and
 * the calculated thermal expansion.
 */
export function compareUnity(left: RecipeAnalysis | null, right: RecipeAnalysis | null): CompareGroup[] {
  const groups: CompareGroup[] = UNITY_TITLES.map((title) => ({ title, rows: [] }));
  const both = !!left && !!right;
  const oxides = [...new Set([...Object.keys(left?.uList ?? {}), ...Object.keys(right?.uList ?? {})])];
  for (const oxide of oxides) {
    const a = value(left?.uList[oxide]);
    const b = value(right?.uList[oxide]);
    if (a === null && b === null) continue;
    groups[unityColumnOf(oxide)].rows.push({ ...row(formatFormula(oxide), a, b, both), formula: true });
  }
  const ratio = (analysis: RecipeAnalysis | null) => (analysis ? silicaAluminaRatio(analysis) : null);
  // Worked out from the fired analysis when a saved one has no figure of its own.
  const expands = (analysis: RecipeAnalysis | null) =>
    analysis ? (analysis.expansion ?? expansion(analysis.analysis)) : null;
  const facts: CompareGroup = {
    title: translate('recipe.compare.balance'),
    rows: [
      fact(translate('recipe.compare.silicaToAlumina'), ratio(left), ratio(right), 2),
      fact(translate('recipe.compare.r2oFluxes'), left?.groups?.R2O ?? null, right?.groups?.R2O ?? null, 2),
      fact(translate('recipe.compare.roFluxes'), left?.groups?.RO ?? null, right?.groups?.RO ?? null, 2),
      fact(translate('recipe.compare.loi'), left?.loi ?? null, right?.loi ?? null, 1),
      fact(translate('recipe.compare.expansion'), expands(left), expands(right), 2)
    ]
  };
  return [...groups.filter((group, i) => i < 3 || group.rows.length), facts];
}

/** A change for a table cell: +0.052, −0.120 (a true minus sign), or "same" when it rounds to nothing. */
export function formatChange(change: number | null, places: number): string {
  if (change === null) return '';
  const rounded = Number(change.toFixed(places));
  if (rounded === 0) return translate('recipe.compare.same');
  return (rounded > 0 ? '+' : '−') + fixed(Math.abs(rounded), places);
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

/**
 * Whether one material can stand in for another gram for gram: their fired
 * oxides per 100 g of raw material differ by 15 g or less in all. Custer Spar
 * and G-200 EU Feldspar do; niter (potash) and a soda frit, or red lead and a
 * lead frit, do not, so their amounts need working out again.
 */
export function likeForLike(a: MaterialInput, b: MaterialInput): boolean {
  // Without oxides to compare, nothing says they are alike.
  const grams = gramsApart(a, b);
  return grams !== null && grams <= LIKE_FOR_LIKE_GRAMS;
}

export type LibraryMaterial = Material & LibraryInfo;

/** An old colorant among the materials whose substitute is an additive (Potassium Bichromate's Chromium Oxide). */
export interface ColorantSwap {
  from: string;
  status: string;
  to: string;
}

/**
 * The recipe's materials with each one that is no longer current (discontinued,
 * historical or hard to get) replaced, one for one at the same amount, by the
 * first substitute the library gives for it: one sold in `region` if there is
 * one. `find` looks a material up by name or other name. Swaps are a starting
 * point; amounts may need adjusting to bring the unity formula back.
 *
 * An old colorant whose substitute is among the additives (`findAdditive`)
 * stays as it is, and is listed in `colorants` for the potter to move.
 */
export function modernMaterials(
  materials: RecipeMaterial[],
  find: (name: string) => LibraryMaterial | undefined,
  region = '',
  {
    allowLead = true,
    findAdditive
  }: { allowLead?: boolean; findAdditive?: (name: string) => (LibraryInfo & { name: string }) | undefined } = {}
): { materials: RecipeMaterial[]; swaps: Swap[]; colorants: ColorantSwap[] } {
  const swaps: Swap[] = [];
  const colorants: ColorantSwap[] = [];
  const current = (record: LibraryInfo | undefined) => !!record && (!record.status || record.status === 'current');
  const modern = materials.map((material) => {
    const record = find(material.name);
    if (!record?.status || record.status === 'current' || !record.substitutes?.length) return material;
    const substitutes = record.substitutes
      .map((name) => find(name))
      .filter((sub): sub is LibraryMaterial => current(sub))
      // With lead off, only a substitute without lead.
      .filter((sub) => allowLead || !hasLead(sub));
    const substitute =
      substitutes.find((sub) => region && sub.region?.includes(region)) ??
      substitutes.find((sub) => inRegion(sub, region)) ??
      substitutes[0];
    if (!substitute) {
      const additive =
        record.category === 'colorant'
          ? record.substitutes.map((name) => findAdditive?.(name)).find(current)
          : undefined;
      if (additive) colorants.push({ from: material.name, status: statusText(record), to: additive.name });
      return material;
    }
    swaps.push({
      from: material.name,
      status: statusText(record),
      to: substitute.name,
      like: likeForLike(record, substitute),
      lead: hasLead(substitute)
    });
    return { ...structuredClone(substitute), amount: material.amount };
  });
  return { materials: mergeSameMaterials(modern), swaps, colorants };
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
