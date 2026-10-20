// Types for lib/recipe/shelf.js (see index.d.ts).

import type { AdditiveRecord, MaterialRecord, TryMaterial } from './library';
import type { Caution, RecipeMessage } from './messages';
import type { Report } from './pool';

export interface ShelfMatch<M extends MaterialRecord = MaterialRecord> {
  materials: M[];
  changes: RecipeMessage[];
  report: Report;
  cautions: Caution[];
}

/**
 * The recipe made from the materials on the shelf only, raw clay held within 20% of the batch (or the
 * recipe's own share) where the match allows, but for clays named in `uncapped`; throws a RecipeError
 * ('shelf.empty') if there are none.
 */
export function matchFromShelf<M extends MaterialRecord>(
  lines: M[],
  shelf: TryMaterial<M>[],
  options?: { avoid?: string[]; additives?: AdditiveRecord[]; uncapped?: string[] }
): ShelfMatch<M>;
