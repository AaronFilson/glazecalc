// Two unity formulas side by side (issue #6): the app's Compare, and the
// MCP blend_recipes tool's differences between two recipes. What the rows are
// is a key or a formula, never words: the app puts them in the page's language.

import { expansion } from '../chemistry/index.ts';
import type { Host } from '../host.ts';

/** The part of an analysis the comparison reads (a unity formula result, or a host's saved analysis). */
export interface ComparableAnalysis {
  uList: Record<string, number>;
  groups?: Record<string, number>;
  loi?: number;
  siAlRatio?: number | null;
  expansion?: number | null;
  /** The fired analysis, in weight percent, for an expansion worked out when there is no figure. */
  analysis?: Record<string, number> | null;
}

export interface CompareRow {
  /** An oxide's formula (with `formula`), or the row's key for a balance row. */
  label: string;
  formula?: true;
  /** An oxide's row: the oxide as the unity formula's keys write it. */
  oxide?: string;
  /** A balance row's key: silicaToAlumina, r2oFluxes, roFluxes, loi or expansion. */
  key?: string;
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

const STABILIZERS = ['Al2O3', 'B2O3'];
const GLASS_FORMERS = ['SiO2'];

/** The columns potters read a unity formula in, in order; an oxide goes under one of the first four. */
const UNITY_COLUMNS = ['fluxes', 'stabilizers', 'glassFormers', 'wildcards'] as const;

/** Which of the UNITY_COLUMNS an oxide goes under, as an index. */
function unityColumnOf(host: Host, oxide: string): number {
  const group = host.oxides.groups[oxide];
  if (group === 'R2O' || group === 'RO') return 0;
  return STABILIZERS.includes(oxide) ? 1 : GLASS_FORMERS.includes(oxide) ? 2 : 3;
}

/** The silica to alumina ratio, from the saved value or from the unity formula. */
function silicaAluminaRatio(analysis: ComparableAnalysis): number | null {
  if (typeof analysis.siAlRatio === 'number') return analysis.siAlRatio;
  const { SiO2, Al2O3 } = analysis.uList;
  return Al2O3! > 0 ? (SiO2 ?? 0) / Al2O3! : null;
}

const value = (n: unknown): number | null => (typeof n === 'number' && n > 0 ? n : null);

// A row. Its change counts an oxide one recipe lacks as 0, but only when both
// recipes have a unity formula: against a recipe that is not there, there is no change.
const row = (label: string, left: number | null, right: number | null, both: boolean, places = 3): CompareRow => ({
  label,
  left,
  right,
  change: both && (left !== null || right !== null) ? (right ?? 0) - (left ?? 0) : null,
  places
});

// A ratio or total: a change only when both recipes have one.
const fact = (key: string, left: number | null, right: number | null, places: number): CompareRow => ({
  key,
  ...row(key, left, right, left !== null && right !== null, places)
});

/**
 * Two unity formulas side by side: a row for every oxide in either, under the
 * columns potters read them in (fluxes, stabilizers, glass formers, others),
 * then a "balance" group: the silica to alumina ratio, the flux balance, the
 * loss on ignition and the calculated thermal expansion. Each group has a
 * `key` (UNITY_COLUMNS, or 'balance'); an oxide's row is labelled with its
 * formula and has `formula: true` and the oxide as the unity formula writes it
 * (`oxide`: K2O where the label is K₂O); a balance row has a `key` (silicaToAlumina,
 * r2oFluxes, roFluxes, loi, expansion) and its label is that key. The first
 * three columns are always there; the wildcards only with a row.
 */
function compareUnity(host: Host, left: ComparableAnalysis | null, right: ComparableAnalysis | null): CompareGroup[] {
  const groups: CompareGroup[] = UNITY_COLUMNS.map((key) => ({ key, rows: [] }));
  const both = !!left && !!right;
  const oxides = [...new Set([...Object.keys(left?.uList ?? {}), ...Object.keys(right?.uList ?? {})])];
  for (const oxide of oxides) {
    const a = value(left?.uList[oxide]);
    const b = value(right?.uList[oxide]);
    if (a === null && b === null) continue;
    groups[unityColumnOf(host, oxide)].rows.push({ ...row(oxide, a, b, both), formula: true, oxide });
  }
  const ratio = (analysis: ComparableAnalysis | null) => (analysis ? silicaAluminaRatio(analysis) : null);
  // Worked out from the fired analysis when a saved one has no figure of its own.
  const expands = (analysis: ComparableAnalysis | null): number | null =>
    analysis ? (analysis.expansion ?? expansion(host, analysis.analysis)) : null;
  const facts: CompareGroup = {
    key: 'balance',
    rows: [
      fact('silicaToAlumina', ratio(left), ratio(right), 2),
      fact('r2oFluxes', left?.groups?.['R2O'] ?? null, right?.groups?.['R2O'] ?? null, 2),
      fact('roFluxes', left?.groups?.['RO'] ?? null, right?.groups?.['RO'] ?? null, 2),
      fact('loi', left?.loi ?? null, right?.loi ?? null, 1),
      fact('expansion', expands(left), expands(right), 2)
    ]
  };
  return [...groups.filter((group, i) => i < 3 || group.rows.length), facts];
}

export { UNITY_COLUMNS, compareUnity, silicaAluminaRatio, unityColumnOf };
