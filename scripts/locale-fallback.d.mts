import type { LocaleFallbackData } from '../lib/regions/locale-fallback.js';

/** The file the data is written to: lib/regions/locale-fallback-data.json. */
export const OUT: string;
/** The languages whose data a browser may lack, each with the locale its data is taken from. */
export const FALLBACK_LOCALES: Record<string, string>;
/** The numbering systems whose digits are written. */
export const DIGIT_SYSTEMS: string[];
/** Each language's own digits, besides 0–9. */
export const NATIVE_SYSTEMS: Record<string, string[]>;
/** The date and time options the app formats with. */
export const DATE_OPTIONS: Intl.DateTimeFormatOptions[];
/** The list styles the app joins with. */
export const LIST_OPTIONS: Array<{ type: 'conjunction' | 'disjunction' | 'unit'; style: 'long' | 'short' }>;
/** The key of a set of options: its entries in a fixed order. */
export function optionsKey(options: object): string;
/** The data written for each language, from this Node's Intl. */
export function localeFallbackData(): LocaleFallbackData;
/** The file's text, formatted as Prettier formats the repository. */
export function localeFallbackFile(): Promise<string>;
