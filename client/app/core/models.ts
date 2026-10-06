import type { MaterialField, UmfResult } from '../../../lib/chemistry';

/** Records the server stores per user; 'Standard' marks built-in records. */
export interface Owned {
  _id?: string;
  ownedBy?: string;
}

export interface Material extends Owned {
  name: string;
  rawformula?: string;
  relatedTo?: string[] | string;
  notes?: string[] | string;
  fields: MaterialField[];
  percentmole: 'molecular' | 'percent';
  loi: number | string | null;
  molecularweight?: number | string | null;
  equivalent?: number;
  formulaweight?: number;
}

/** A material placed in a recipe, with its batch amount. */
export interface RecipeMaterial extends Material {
  amount?: string;
}

export interface Additive extends Owned {
  name: string;
  rawformula?: string;
  relatedTo?: string[] | string;
  notes?: string[] | string;
  fields: Array<{ name: string; amount: string | number }>;
  amount?: string;
  /** On a recipe: what the amount is in (see AdditiveUnit). */
  unit?: AdditiveUnit;
}

/**
 * A colorant's or additive's amount on top of a recipe's base:
 *   percent  a percent of the base's total (2 = 2%), as most recipes give them
 *   parts    in the base's own unit
 *   grams    a weight, in the same batch as the base
 * Saved recipes from before units were chosen have none; they read as percent.
 */
export type AdditiveUnit = 'percent' | 'parts' | 'grams';

/** Saved analysis; recipes saved by older versions only have uList. */
export interface RecipeAnalysis extends Partial<UmfResult> {
  uList: Record<string, number>;
}

export interface Recipe extends Owned {
  title: string;
  date?: string;
  notes?: string[] | string;
  materials: RecipeMaterial[];
  additives?: Additive[];
  computed?: RecipeAnalysis[] | RecipeAnalysis;
}

export interface Advice extends Owned {
  title: string;
  content: string;
  tags: string[] | string;
}

export interface Note extends Owned {
  title?: string;
  content: string;
  relatedCollection: string;
  relatedId: string;
}

export interface Firing extends Owned {
  title: string;
  kiln?: string;
  date?: string;
  notes?: string[] | string;
  fieldsIncluded: string[];
  rows: string[][];
}
