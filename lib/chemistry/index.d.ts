// Types for the CommonJS chemistry module, used by the Angular client.

export type OxideGroup = 'R2O' | 'RO' | 'R2O3' | 'RO2';

/** An oxide amount in the app's stored material shape. */
export interface MaterialField {
  name: string;
  amount: string | number;
  amountUnity?: number;
}

/**
 * A material as a molar formula, a weight-percent analysis, or the app's
 * stored { fields, percentmole, loi } shape.
 */
export interface MaterialInput {
  name: string;
  formula?: Record<string, number>;
  analysis?: Record<string, number | string>;
  fields?: MaterialField[];
  percentmole?: 'percent' | 'molecular' | string;
  loi?: number | string | null;
  molecularweight?: number | string | null;
  equivalent?: number | string | null;
}

export interface RecipeLine {
  material: string | MaterialInput;
  amount: number | string | undefined;
}

export interface UmfResult {
  umf: Record<string, number>;
  groups: Record<OxideGroup, number>;
  siAlRatio: number | null;
  analysis: Record<string, number>;
  loi: number;
  warnings: string[];
}

export interface MaterialWeights {
  unity: Record<string, number>;
  equivalent: number;
  firedWeight: number;
  molecularWeight: number;
  loi: number;
  warnings: string[];
}

export const MOLAR_MASS: Record<string, number>;
export const OXIDE_GROUPS: Record<string, OxideGroup>;
export const FORMULA_MATERIALS: Array<{ name: string; aliases?: string[]; formula: Record<string, number> }>;

export function calculateUMF(
  recipe: RecipeLine[] | Record<string, number>,
  options?: { materials?: MaterialInput[] }
): UmfResult;

export function formulaToAnalysis(formula: Record<string, number>): {
  analysis: Record<string, number>;
  loi: number;
  formulaWeight: number;
};

export function materialWeights(material: MaterialInput): MaterialWeights;
