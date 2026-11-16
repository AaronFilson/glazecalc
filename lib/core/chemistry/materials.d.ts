/** A coded warning: its code and its values (numbers, oxides and record ids). */
export interface CoreWarning {
  code: string;
  params: Record<string, unknown>;
}
/** A material prepared by the core: its identity, fired analysis, LOI and formula weight. */
export interface CorePrepared {
  id: unknown;
  label: unknown;
  analysis: Record<string, number>;
  loi: number;
  formulaWeight: number;
  warningCodes: CoreWarning[];
}
/** A record the core reads: a formula, an analysis or the stored fields, with an identity. */
export type CoreMaterial = Record<string, unknown>;
export function prepareMaterial(material: CoreMaterial): CorePrepared;
export function materialWeights(material: CoreMaterial): {
  unity: Record<string, number>;
  equivalent: number;
  firedWeight: number;
  molecularWeight: number;
  loi: number;
  warningCodes: CoreWarning[];
};
export function formulaToAnalysis(
  formula: Record<string, number>,
  materialId?: unknown
): { analysis: Record<string, number>; loi: number; formulaWeight: number };
export function oxidesGivenIn(material: CoreMaterial): 'percent' | 'molecular' | null;
