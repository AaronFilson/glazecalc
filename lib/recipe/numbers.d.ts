// Types for lib/recipe/numbers.js (see index.d.ts).

export type DecimalMark = 'either' | 'comma' | 'point';

/** A number saved plainly ("12.5"); null for anything else, such as "12,5" or "1e3". */
export function plainNumber(text: string | number | null | undefined): number | null;
/** Text with any script's digits written 0–9, and without the marks that keep a number's direction in Arabic text. */
export function plainDigits(text: string | null | undefined): string;
export function separators(locale: string): { decimal: string; group: string };
export function parseNumber(text: string, mark?: DecimalMark, locale?: string): number | null;
export function forTyping(plain: string, mark?: DecimalMark, locale?: string): string;
export function toPlain(typed: string, mark?: DecimalMark, locale?: string): string;
