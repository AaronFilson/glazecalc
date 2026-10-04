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
}

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
