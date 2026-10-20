import { RecipeError } from '../../../../lib/recipe/messages';
import * as shelfLib from '../../../../lib/recipe/shelf';
import { Additive, RecipeMaterial } from '../../core/models';
import { Report, TryMaterial, reportText } from './pool';
import { cautionText, recipeText } from './recipe-messages';

// Match with what I have (docs/adr/0012): a recipe made again from only the
// materials the potter has on hand. The match is shared with the server
// (lib/recipe/shelf.js); this puts what it says in the page's language.

export interface ShelfMatch {
  materials: RecipeMaterial[];
  /** What changed, for the new recipe's notes: "Whiting 20 → 18.1", "Minspar 200 31.2, new", "Niter 10 → 0". */
  changes: string[];
  report: Report;
  cautions: string[];
}

/**
 * The recipe made from the materials on the shelf only, on the old batch's
 * total, so colorants keep their share of it. Materials marked "must use"
 * stay in; names in `avoid` are left out; raw clays in `uncapped` may go past
 * the 20% the match holds raw clay to.
 */
export function matchFromShelf(
  lines: RecipeMaterial[],
  shelf: TryMaterial[],
  options: { avoid?: string[]; additives?: Additive[]; uncapped?: string[] } = {}
): ShelfMatch {
  let match: shelfLib.ShelfMatch<RecipeMaterial>;
  try {
    match = shelfLib.matchFromShelf<RecipeMaterial>(lines, shelf, options);
  } catch (error) {
    // The library says why in a code; the page's error says it in words.
    throw error instanceof RecipeError ? new Error(recipeText(error)) : error;
  }
  return {
    materials: match.materials,
    changes: match.changes.map(recipeText),
    report: reportText(match.report),
    cautions: match.cautions.map(cautionText)
  };
}
