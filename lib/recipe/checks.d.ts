// Types for lib/recipe/checks.js (see index.d.ts).

import type { AdditiveRecord, MaterialRecord } from './library';
import type { LimitSet } from './limits';
import type { Caution } from './messages';

export interface CheckInput {
  /** The new recipe's base materials and amounts. */
  lines: Array<{ material: MaterialRecord; amount: string | number | undefined }>;
  /** Its unity formula, base materials only. */
  unity: Record<string, number>;
  /** The old recipe's unity formula, to warn only of what is new or worse. */
  old?: Record<string, number>;
  /** The firing temperature, when it is known. */
  celsius?: number;
  additives?: AdditiveRecord[];
  /** The old recipe's raw clay, as a percent of its batch. */
  oldClay?: number;
  /** Calculated expansion, before and after. */
  expansion?: { was: number | null; now: number | null };
  /** The limits on the unity formula to check against: the app's own (GLAZECALC_LIMITS) by default. */
  limitSet?: LimitSet;
}

/** Cautions for what is past a recommended limit. */
export function pastLimits(input: CheckInput): Caution[];
/** Notes on many materials, and amounts too small to weigh in a test batch. */
export function sizeNotes(
  lines: Array<{ material: MaterialRecord; amount: string | number | undefined }>,
  low?: boolean
): Caution[];
/** Raw (not calcined) clay as a percent of the batch. */
export function rawClayPercent(lines: Array<{ category?: string; name: string; amount?: string | number }>): number;
