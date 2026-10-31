/** A part of a date pattern: a literal, or a field and how it is written (scripts/locale-fallback.mjs). */
export type DatePart = string | [type: string, spec: string];

/** A list's literals: before, between and after the items of a list of 2, and of a list of 4. */
export interface ListPattern {
  two: string[];
  many: string[];
}

/** How a language writes numbers in one numbering system. */
export interface FallbackNumbers {
  /** Whether each style's digits group as 12,34,567 (else 1,234,567). */
  indian: { decimal: boolean; percent: boolean; currency: boolean };
  decimal: string;
  group: string;
  /** The text around a percent: "#%". */
  percent: string;
  /** The text around an amount in each currency: "US$ #". */
  currency: Record<string, string>;
}

/** What is written for one language a browser may lack (lib/regions/locale-fallback-data.json). */
export interface FallbackLanguage {
  /** The locale the data was taken from. */
  locale: string;
  /** Its numbers in 0–9 (latn), and in each of its own digits whose numbers CLDR writes otherwise. */
  numbers: { latn: FallbackNumbers } & Record<string, FallbackNumbers>;
  /** Each set of date options' pattern, by optionsKey. */
  dates: Record<string, DatePart[]>;
  /** The names of months, weekdays and day periods the patterns name (n0, n1 …). */
  names: string[][];
  lists: Record<string, ListPattern>;
}

export interface LocaleFallbackData {
  /** The digits 0 to 9 of each numbering system the languages may be written in. */
  digits: Record<string, string>;
  languages: Record<string, FallbackLanguage>;
}

export type IntlKind = 'numbers' | 'dates' | 'lists';

export const LOCALE_FALLBACK_DATA: LocaleFallbackData;
/** The key of a set of options: its entries in a fixed order. */
export function optionsKey(options: object): string;
/** Whether this browser's Intl has a language's numbers, dates or lists. */
export function browserHas(language: string, kind: IntlKind): boolean;
/** For tests: what the browser is taken to have (null: ask its Intl again). */
export function setBrowserSupport(has: ((language: string, kind: IntlKind) => boolean) | null): void;
/** The data a locale's numbers, dates or lists are written from, or null where Intl writes them. */
export function fallbackFor(
  locale: string,
  kind: IntlKind
): { data: FallbackLanguage; digits: string | null; system: string; calendar: string; locale: string } | null;
/** An Intl.NumberFormat, written from the fallback data where the browser lacks the language. */
export function numberFormat(locale: string, options?: Intl.NumberFormatOptions): Intl.NumberFormat;
/** An Intl.DateTimeFormat, written from the fallback data where the browser lacks the language. */
export function dateTimeFormat(locale: string, options?: Intl.DateTimeFormatOptions): Intl.DateTimeFormat;
/** A list joined as Intl.ListFormat joins it, from the fallback data where the browser lacks the language. */
export function formatList(
  locale: string,
  items: readonly string[],
  options: { type: 'conjunction' | 'disjunction' | 'unit'; style: 'long' | 'short' | 'narrow' }
): string;
