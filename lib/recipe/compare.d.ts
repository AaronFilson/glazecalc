// Types for lib/recipe/compare.js (see index.d.ts).

/** The part of an analysis the comparison reads (the app's RecipeAnalysis, the chemistry's UMF result). */
export interface ComparableAnalysis {
  uList: Record<string, number>;
  groups?: Record<string, number>;
  loi?: number;
  siAlRatio?: number | null;
  expansion?: number | null;
  /** The fired analysis, in weight percent, for an expansion worked out when there is no figure. */
  analysis?: Record<string, number> | null;
}

export const UNITY_COLUMNS: readonly ['fluxes', 'stabilizers', 'glassFormers', 'wildcards'];

export interface CompareRow {
  /** An oxide's formula (with `formula`), or the row's key for a balance row. */
  label: string;
  formula?: true;
  /** A balance row's key: silicaToAlumina, r2oFluxes, roFluxes, loi or expansion. */
  key?: string;
  /** The value in each recipe; null where it has none. */
  left: number | null;
  right: number | null;
  /** Right minus left, counting a recipe without it as 0; null when neither can say. */
  change: number | null;
  /** Decimal places to show. */
  places: number;
}

export interface CompareGroup {
  /** One of the UNITY_COLUMNS, or 'balance'. */
  key: string;
  rows: CompareRow[];
}

export function compareUnity(left: ComparableAnalysis | null, right: ComparableAnalysis | null): CompareGroup[];
export function unityColumnOf(oxide: string): number;
export function silicaAluminaRatio(analysis: ComparableAnalysis): number | null;
