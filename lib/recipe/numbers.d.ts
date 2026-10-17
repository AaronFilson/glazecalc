// Types for lib/recipe/numbers.js (see index.d.ts).

export type DecimalMark = 'either' | 'comma' | 'point';

export function separators(locale: string): { decimal: string; group: string };
export function parseNumber(text: string, mark?: DecimalMark, locale?: string): number | null;
export function forTyping(plain: string, mark?: DecimalMark, locale?: string): string;
export function toPlain(typed: string, mark?: DecimalMark, locale?: string): string;
