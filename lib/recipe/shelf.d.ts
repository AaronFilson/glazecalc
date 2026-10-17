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

/** The recipe made from the materials on the shelf only; throws a RecipeError ('shelf.empty') if there are none. */
export function matchFromShelf<M extends MaterialRecord>(
  lines: M[],
  shelf: TryMaterial<M>[],
  options?: { avoid?: string[]; additives?: AdditiveRecord[] }
): ShelfMatch<M>;
