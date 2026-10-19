import { translate } from '@jsverse/transloco';
import { marker } from '@jsverse/transloco-keys-manager/marker';
import * as sharedCompare from '../../../../lib/recipe/compare';
import * as swapsLib from '../../../../lib/recipe/swaps';
import { LibraryInfo, Material, RecipeAnalysis, RecipeMaterial } from '../../core/models';
import { statusText } from '../../shared/library-info';
import { fixed } from '../../shared/format';

// Comparing two recipes (issue #6), and trying an old recipe with the
// materials that replace its discontinued ones.

export type { CompareRow } from '../../../../lib/recipe/compare';

/** A comparison's group as the page shows it: the shared one (lib/recipe/compare.js) with its words. */
export interface CompareGroup {
  title: string;
  rows: Array<Omit<sharedCompare.CompareRow, 'key' | 'label'> & { label: string }>;
}

const TITLES: Record<string, string> = {
  fluxes: marker('unity.fluxes'),
  stabilizers: marker('unity.stabilizers'),
  glassFormers: marker('unity.glassFormers'),
  wildcards: marker('unity.wildcards'),
  balance: marker('recipe.compare.balance')
};
const LABELS: Record<string, string> = {
  silicaToAlumina: marker('recipe.compare.silicaToAlumina'),
  r2oFluxes: marker('recipe.compare.r2oFluxes'),
  roFluxes: marker('recipe.compare.roFluxes'),
  loi: marker('recipe.compare.loi'),
  expansion: marker('recipe.compare.expansion')
};

/**
 * Two unity formulas side by side (lib/recipe/compare.js, which the MCP blend
 * tool shares), in the page's language: a row for every oxide in either,
 * under the columns potters read them in, then the balance.
 */
export function compareUnity(left: RecipeAnalysis | null, right: RecipeAnalysis | null): CompareGroup[] {
  return sharedCompare.compareUnity(left, right).map(({ key, rows }) => ({
    title: translate(TITLES[key]),
    rows: rows.map(({ key: rowKey, ...rest }) => ({ ...rest, label: rowKey ? translate(LABELS[rowKey]) : rest.label }))
  }));
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

// Whether one material can stand in for another gram for gram (lib/recipe/materials.js).
export { likeForLike } from '../../../../lib/recipe/materials';

export type LibraryMaterial = Material & LibraryInfo;

/** An old colorant among the materials whose substitute is an additive (Potassium Bichromate's Chromium Oxide). */
export interface ColorantSwap {
  from: string;
  status: string;
  to: string;
}

/** A shared swap (lib/recipe/swaps.js) with its status in the page's language. */
export function swapText(swap: swapsLib.Swap): Swap;
export function swapText(swap: swapsLib.ColorantSwap): ColorantSwap;
export function swapText({ statusSince, ...swap }: swapsLib.Swap | swapsLib.ColorantSwap): Swap | ColorantSwap {
  return { ...swap, status: statusText({ status: swap.status, statusSince }) };
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
  options: { allowLead?: boolean; findAdditive?: (name: string) => (LibraryInfo & { name: string }) | undefined } = {}
): { materials: RecipeMaterial[]; swaps: Swap[]; colorants: ColorantSwap[] } {
  const modern = swapsLib.modernMaterials<RecipeMaterial>(materials, find, region, options);
  return {
    ...modern,
    swaps: modern.swaps.map((swap) => swapText(swap)),
    colorants: modern.colorants.map((swap) => swapText(swap))
  };
}
