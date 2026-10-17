// Types for lib/recipe/paste.js (see index.d.ts).

import type { DecimalMark } from './numbers';

/** A pasted line's unit, as kept: weights are in grams. */
export type PastedUnit = '%' | 'g' | 'parts' | null;

/** A line read as a material and its amount. */
export interface PastedLine {
  /** Its line in the paste, from 1. */
  line: number;
  /** The line as pasted. */
  text: string;
  /** The material's name as pasted. */
  name: string;
  /** Its amount (in grams for a weight); null for a name pasted alone. */
  amount: number | null;
  unit: PastedUnit;
  /** Marked "+", or under a heading such as "Additions". */
  addition: boolean;
}

/** A line set aside: a total, or a row of column headings. */
export interface SetAside {
  line: number;
  text: string;
  why: 'total' | 'columns';
}

export interface PastedRecipe {
  title: string | null;
  /** Lines of text that are not materials: the firing, notes, links. */
  notes: string[];
  lines: PastedLine[];
  skipped: SetAside[];
}

export interface PasteOptions {
  mark?: DecimalMark;
  locale?: string;
  /** Whether text is a material's whole name ("Frit 3134"), so it is not read as "Frit" at 3134. */
  isName?: (text: string) => boolean;
}

export function parsePaste(text: string, options?: PasteOptions): PastedRecipe[];

/** Each line's amount as saved ("20.5"; '' for none), and an addition's unit. */
export function importAmounts(recipe: PastedRecipe): Array<{ amount: string; unit?: 'percent' | 'parts' | 'grams' }>;

export type MatchHow = 'name' | 'alias' | 'close' | 'choose' | 'none';

export interface NameMatch<T> {
  how: MatchHow;
  /** The record taken: for name, alias and close. */
  record: T | null;
  /** The closest records, best first. */
  candidates: T[];
}

export function matchName<T extends { name: string; aliases?: string[] }>(
  name: string,
  records: readonly T[],
  limit?: number
): NameMatch<T>;
/** How close a pasted name is to a record's name, 0 to about 1. */
export function likeness(pasted: string, recordName: string): number;
/** A name as compared exactly: NFKC, lower case, spaces as one. */
export function foldedName(text: string): string;
/** A name as compared loosely: letters and digits only, without accents. */
export function compactName(text: string): string;
