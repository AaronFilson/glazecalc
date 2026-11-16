import type { CoreMaterial, CorePrepared, CoreWarning } from './materials.js';

export interface CoreLine {
  material: CoreMaterial | string;
  amount: number | string | null | undefined;
}
export interface CoreUnity {
  umf: Record<string, number>;
  groups: { R2O: number; RO: number; R2O3: number; RO2: number };
  siAlRatio: number | null;
  analysis: Record<string, number>;
  loi: number;
  expansion: number;
  warningCodes: CoreWarning[];
}
export function calculateUMF(
  recipe: CoreLine[] | Record<string, number | string>,
  options?: { lookup?: (reference: string) => CorePrepared | undefined }
): CoreUnity;
export function readLine(
  line: CoreLine,
  lookup?: (reference: string) => CorePrepared | undefined
): { amount: number; id: unknown; label: unknown; material: CorePrepared } | null;
