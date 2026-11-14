// Types for lib/recipe/checks.js (see index.d.ts).

import type { AdditiveRecord, MaterialRecord } from './library';
import type { FiringBand, LimitSet } from './limits';
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
  /** The firing's band, when it is known by its cone (coneBand): it wins over the band of `celsius`. */
  band?: FiringBand;
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
/** Whether a material is raw (not calcined) clay: by its category, or for one with none by its analysis. */
export function isRawClay(material: MaterialRecord): boolean;
/** Whether raw clay at this percent of the batch is past the caution, and news against the old recipe's. */
export function rawClayHigh(clay: number, clayWas?: number): boolean;
/** Raw (not calcined) clay as a percent of the batch. */
export function rawClayPercent(lines: Array<Omit<MaterialRecord, 'amount'> & { amount?: string | number }>): number;
/**
 * How serious BaO in the unity formula is, compared at the two decimals shown: null to 0.10, 'likely'
 * from 0.40, 'caution' between (CHECK_LIMITS.barium; Digitalfire, https://digitalfire.com/glossary/123).
 */
export function bariumSeverity(barium: number): 'caution' | 'likely' | null;
