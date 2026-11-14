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
  /**
   * The amount as pasted when its thousands may be set apart by a space ("1 500" of "Silica 1 500": 1500, or
   * "Silica 1" at 500), in any language: read as `PasteOptions.spaced` says for the line, so the page asks.
   * Absent otherwise, and for a known name that ends in the groups before the last ("Minspar 200 300 g").
   */
  spaced?: string;
  /**
   * The last two cells of a comma-separated row as pasted, with the comma between them ("30,5" of "Silica,30,5"),
   * when they can be one number with a decimal comma or two columns, the reader writing decimal commas: read as
   * `PasteOptions.joined` says, so the page asks. Absent otherwise.
   */
  joined?: string;
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
  /** Whether a name is like any material, even only closely: such a line is never read as a title ("Leach 4321"). */
  known?: (text: string) => boolean;
  /** How to read a number that could be a decimal or digit groups ("1,500" as 1.5 or 1500), when the paste does not decide it; the locale reads it by default. */
  reading?: 'decimal' | 'group';
  /**
   * How to read an amount with its thousands set apart by a space ("Silica 1 500"): one number ('group'), or
   * the first group as the end of the name ('apart'); for the whole paste, or line by line (by `PastedLine.line`).
   * A line not chosen is read as `spacedReading(locale)` says, and each such line is marked `spaced`.
   */
  spaced?: 'group' | 'apart' | Readonly<Record<number, 'group' | 'apart'>>;
  /**
   * How to read a comma-separated row whose last two cells are whole numbers with only a comma between them
   * ("Silica,30,5"), for a reader who writes decimal commas and with no heading row naming the columns: one number
   * with a decimal comma ('decimal', 30.5), or two columns, the first the amount ('columns', 30). By default
   * 'decimal', and each such line is marked `joined`.
   */
  joined?: 'decimal' | 'columns';
}

/** The most a paste can be: characters, lines, and characters in a line that can be a material. */
export const PASTE_LIMITS: { readonly chars: number; readonly lines: number; readonly line: number };
/** Which limit a paste is over, or null. parsePaste reads nothing from one that is over. */
export function pasteTooLong(text: string): 'chars' | 'lines' | null;

/**
 * The numbers of a paste that can be read two ways even given all its numbers ("1,500" beside decimal
 * commas), as pasted, each once. None when the reader's mark is chosen.
 */
export function ambiguousNumbers(text: string, mark?: DecimalMark): string[];

export function parsePaste(text: string, options?: PasteOptions): PastedRecipe[];

/**
 * How a line whose amount may have its thousands set apart by a space is read until the reader chooses: one
 * number ('group') where the locale writes thousands so (French "1 500", Russian, Swedish), else 'apart'.
 */
export function spacedReading(locale?: string): 'group' | 'apart';

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
