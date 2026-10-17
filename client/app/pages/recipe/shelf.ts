import * as recipe from '../../../../lib/recipe';
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
 * stay in; names in `avoid` are left out.
 */
export function matchFromShelf(
  lines: RecipeMaterial[],
  shelf: TryMaterial[],
  options: { avoid?: string[]; additives?: Additive[] } = {}
): ShelfMatch {
  const match = recipe.matchFromShelf<RecipeMaterial>(lines, shelf, options);
  return {
    materials: match.materials,
    changes: match.changes.map(recipeText),
    report: reportText(match.report),
    cautions: match.cautions.map(cautionText)
  };
}
