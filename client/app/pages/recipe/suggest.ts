import * as recipe from '../../../../lib/recipe';
import { Additive, Material, RecipeMaterial } from '../../core/models';
import { LibraryMaterial, Swap, swapText } from './compare';
import { Report, TryMaterial, oxideLabel, oxidePercent, reportText } from './pool';
import { cautionText, recipeText } from './recipe-messages';

export { oxideLabel, oxidePercent };

// Suggested amounts for swaps that are not like for like (docs/adr/0010 and
// 0012). The working out is shared with the server (lib/recipe/suggest.js);
// this puts what it says in the page's language.

export type { Choice, Shortfall } from '../../../../lib/recipe';

export interface Plan {
  swaps: Swap[];
  shortfalls: recipe.Shortfall[];
}

export interface Suggestion {
  materials: RecipeMaterial[];
  /** What changed, for the new recipe's notes: "China Clay 20 → 5.8", "G-200 EU Feldspar 33, new". */
  changes: string[];
  /** Replacements the fit had no use for: "Ferro Frit 3110". */
  unused: string[];
  /** Oxides still well short after all: "potash (K₂O)". */
  stillShort: string[];
  /** What each material does, and what else could have been. */
  report: Report;
  /** What to watch for: limits newly crossed, many materials, small amounts. */
  cautions: string[];
}

/** Whether materials with lead may be suggested: the account's lead setting. */
export interface LeadOption {
  allowLead?: boolean;
}

/** More to work with: materials the potter adds to try, and names to leave out. */
export interface Extras {
  tries?: TryMaterial[];
  avoid?: string[];
  additives?: Additive[];
}

/**
 * What a suggestion needs to ask first: for each oxide the old materials gave
 * that the modern ones leave well short, the current standard materials sold
 * in the region that could bring it back, best first. No shortfalls: nothing
 * to ask.
 */
export function planSuggestion(
  lines: RecipeMaterial[],
  find: (name: string) => LibraryMaterial | undefined,
  standard: LibraryMaterial[],
  region: string,
  options: LeadOption = {}
): Plan {
  const plan = recipe.planSuggestion<RecipeMaterial>(lines, find, standard, region, options);
  return { ...plan, swaps: plan.swaps.map((swap) => swapText(swap)) };
}

/**
 * The suggested recipe: the modern materials and the rest of the recipe (all
 * kept, at amounts changed as little as possible), any materials brought in
 * (used), and any the potter added to try (used if they help, fewest first).
 */
export function suggestAmounts(
  lines: RecipeMaterial[],
  find: (name: string) => LibraryMaterial | undefined,
  bringIn: Material[],
  region: string,
  options: LeadOption & Extras = {}
): Suggestion {
  const suggestion = recipe.suggestAmounts<RecipeMaterial>(lines, find, bringIn, region, options);
  return {
    ...suggestion,
    changes: suggestion.changes.map(recipeText),
    stillShort: suggestion.stillShort.map(oxideLabel),
    report: reportText(suggestion.report),
    cautions: suggestion.cautions.map(cautionText)
  };
}
