// Types for lib/recipe/hazards.js (see index.d.ts).

export interface HazardRecord {
  name: string;
  /** The hazard statement, as the record gives it. */
  hazards?: string;
}

export interface RecipeHazard<R extends HazardRecord = HazardRecord> {
  /** The statement, as the record gives it. */
  text: string;
  /** The materials and additives it is for, each once, in the recipe's order. */
  names: string[];
  /** The first record with it: for its words in another language. */
  record: R;
}

export interface RecipeHazards<R extends HazardRecord = HazardRecord> {
  hazards: RecipeHazard<R>[];
  /** Materials and additives whose records give no hazards. */
  unknown: string[];
}

/** Each distinct hazard statement of the records once, with the names it is for; and the names with none. */
export function hazardsOf<R extends HazardRecord>(records: ReadonlyArray<R>): RecipeHazards<R>;
