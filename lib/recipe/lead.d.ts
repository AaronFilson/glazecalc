// Types for lib/recipe/lead.js (see index.d.ts).

import type { AdditiveRecord, MaterialRecord, TryMaterial } from './library';
import type { Caution, RecipeMessage } from './messages';
import type { Report } from './pool';

export type LeadMode = 'rebuild' | 'colour';

/** A lead-free frit to build on, with its weight percent of B₂O₃. */
export interface BaseChoice {
  name: string;
  boron: number;
}

export interface Replacement<M extends MaterialRecord = MaterialRecord> {
  materials: M[];
  changes: RecipeMessage[];
  /** What to expect, and what to watch for: colours, crazing, haze, limits passed. */
  cautions: Caution[];
  /** What each material does (a rebuild only). */
  report: Report | null;
}

/** More to work with, and limits the potter lifted. */
export interface LeadExtras<M extends MaterialRecord = MaterialRecord> {
  tries?: TryMaterial<M>[];
  avoid?: string[];
  /** Names of materials whose suggested cap the potter lifted. */
  uncapped?: string[];
}

export function recipeHasLead(lines: MaterialRecord[]): boolean;
export function leadFreeBases<M extends MaterialRecord>(
  lines: M[],
  additives: AdditiveRecord[],
  find: (name: string) => M | undefined,
  standard: M[],
  region: string,
  celsius: number,
  mode?: LeadMode
): BaseChoice[];
export function replaceLead<M extends MaterialRecord>(
  lines: M[],
  additives: AdditiveRecord[],
  find: (name: string) => M | undefined,
  standard: M[],
  region: string,
  options: { base: string; celsius: number; mode: LeadMode } & LeadExtras<M>
): Replacement<M>;
/**
 * The clay of the 85:15 base that keeps the colour: the recipe's raw clay still sold, a kaolin or a ball clay
 * first, else the standard China Clay; undefined without either.
 */
export function clayFor<L extends MaterialRecord, M extends MaterialRecord>(
  lines: readonly L[],
  standard: readonly M[]
): L | M | undefined;
export function leadIn(lines: MaterialRecord[]): { unity: number; percent: number };
/** BaO in the unity formula past the barium caution's figure (0.10 as shown; checks.js bariumSeverity); null to it. */
export function bariumIn(lines: MaterialRecord[]): { unity: number; likely: boolean } | null;
