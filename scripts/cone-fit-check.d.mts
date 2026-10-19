import type { FiringBlock } from '../lib/cones/firing';
import type { ConeFit } from '../lib/recipe/cone-fit';

/** A row of scripts/cone-fit-test-set.json. */
export interface ConeFitRow {
  source: 'glazy' | 'digitalfire' | 'katz';
  row?: number;
  id?: number;
  code?: string;
  name?: string;
  cone: string;
  atmospheres?: string[];
  materials?: string[];
  unity?: Record<string, number>;
  expect?: 'none' | 'cooler' | 'hotter' | 'skip';
  random?: 'low' | 'mid' | 'high';
}

/** The counts for one band (or 'low+mid' for a range across two). */
export interface ConeFitCount {
  rows: number;
  computed: number;
  skipped: number;
  judged: number;
  notes: number;
  closer: number;
  rate: number;
}

/** A row's stated firing as a firing block: Glazy's "9 - 10" is cone 9 to 10. */
export function blockOf(row: Pick<ConeFitRow, 'cone' | 'atmospheres'>): FiringBlock;
/** Each row's result and the counts per band; `lines` gives hand-entered rows' materials by code or name. */
export function measure(
  set: { rows: ConeFitRow[] },
  lines?: Record<string, Array<[string, number]>>
): {
  results: Array<{ row: ConeFitRow; band: string; fit: ConeFit | null }>;
  bands: Record<string, ConeFitCount>;
  total: { judged: number; notes: number; rate: number };
};
