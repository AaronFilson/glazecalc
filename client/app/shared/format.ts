import { signal } from '@angular/core';
import { translate } from '@jsverse/transloco';
import type { DecimalMark } from '../core/preferences.service';

// Numbers, dates and temperatures as the reader writes them (docs/i18n-plan.md):
// 1234,5 in German, 1 234,5 in French, 1,234.5 in US English. The locale and
// the decimal mark follow Settings; core/locale.service.ts keeps them current.
// What is saved stays plain ("12.5"), so a recipe reads the same everywhere:
// these functions only turn numbers into text for the reader and the reader's
// typing back into numbers.

/** The locale numbers and dates are written in (BCP 47). */
export const formatLocale = signal('en');
/** Which decimal mark a typed amount may use. */
export const typedDecimalMark = signal<DecimalMark>('either');

const numberFormats = new Map<string, Intl.NumberFormat>();

function numberFormat(minimum: number, maximum: number): Intl.NumberFormat {
  const locale = formatLocale();
  const key = locale + '|' + minimum + '|' + maximum;
  let format = numberFormats.get(key);
  if (!format) {
    format = new Intl.NumberFormat(locale, {
      minimumFractionDigits: minimum,
      maximumFractionDigits: maximum,
      // 1234 stays together and 12 345 is grouped, in every locale: a 4-digit
      // kiln temperature is never misread as a decimal.
      useGrouping: 'min2',
      // No "-0,00" for a value that rounds to nothing.
      signDisplay: 'negative'
    } as unknown as Intl.NumberFormatOptions);
    numberFormats.set(key, format);
  }
  return format;
}

/** Exactly `places` decimals, in place of toFixed for anything shown: 0,125 or 0.125. */
export const fixed = (value: number, places: number): string => numberFormat(places, places).format(value);

/** Up to `places` decimals, without trailing zeros: 12,5 rather than 12,500. */
export const upTo = (value: number, places: number): string => numberFormat(0, places).format(value);

/** A whole percent: 7%, 7 % or 7 %, as the locale writes it. */
export const percent = (value: number, places = 0): string =>
  new Intl.NumberFormat(formatLocale(), {
    style: 'percent',
    minimumFractionDigits: places,
    maximumFractionDigits: places
  }).format(value / 100);

/** The locale's decimal mark and digit-group separator, from how it writes 12345.6. */
function separators(locale: string): { decimal: string; group: string } {
  const parts = new Intl.NumberFormat(locale).formatToParts(12345.6);
  return {
    decimal: parts.find((part) => part.type === 'decimal')?.value ?? '.',
    group: parts.find((part) => part.type === 'group')?.value ?? ','
  };
}

// Any script's digits, as 0-9: the zero of each block of decimal digits Unicode knows.
const DIGIT_ZEROS = [
  0x30, 0x660, 0x6f0, 0x7c0, 0x966, 0x9e6, 0xa66, 0xae6, 0xb66, 0xbe6, 0xc66, 0xce6, 0xd66, 0xde6, 0xe50, 0xed0, 0xf20,
  0x1040, 0x1090, 0x17e0, 0x1810, 0x1946, 0x19d0, 0x1a80, 0x1a90, 0x1b50, 0x1bb0, 0x1c40, 0x1c50, 0xa620, 0xa8d0,
  0xa900, 0xa9d0, 0xa9f0, 0xaa50, 0xabf0, 0xff10
];
const asciiDigit = (char: string): string => {
  const code = char.codePointAt(0)!;
  const zero = DIGIT_ZEROS.find((start) => code >= start && code < start + 10);
  return zero === undefined ? char : String(code - zero);
};

// Spaces that group digits: plain, no-break, narrow no-break and thin; and the apostrophes some locales use.
const GROUP_SPACES = /[\s   '’]/g;

/**
 * A typed number, read by the decimal-mark setting: "12,5" and "12.5" are both
 * 12.5 with either mark. Digit groups are allowed ("1 234,5", "1.234,5",
 * "1,234.5") when they are groups of three; a lone separator before exactly
 * three digits ("1,250") is read as the locale reads it. Any script's digits
 * count (١٢٫٥ is 12.5). Anything else, such as "1e3", "0x10" or "12,5,3",
 * is not a number: null.
 */
export function parseNumber(
  text: string,
  mark: DecimalMark = typedDecimalMark(),
  locale = formatLocale()
): number | null {
  let value = Array.from(text.trim(), asciiDigit)
    .join('')
    .replace(/٫/g, '.') // Arabic decimal mark
    .replace(/٬/g, ',') // Arabic thousands mark
    .replace(/^[−–]/, '-');
  if (!value) return null;
  const negative = value.startsWith('-');
  if (negative || value.startsWith('+')) value = value.slice(1);
  value = value.replace(GROUP_SPACES, ' ');
  // Spaces may only group digits in threes.
  if (value.includes(' ')) {
    if (!/^\d{1,3}( \d{3})+([.,]\d+)?$/.test(value)) return null;
    value = value.replace(/ /g, '');
  }
  if (!/^[\d.,]+$/.test(value) || !/\d/.test(value)) return null;

  const commas = (value.match(/,/g) ?? []).length;
  const points = (value.match(/\./g) ?? []).length;
  let decimal: string | null;
  if (commas && points) {
    // Both: the right-most is the decimal mark, and the other groups digits.
    decimal = value.lastIndexOf(',') > value.lastIndexOf('.') ? ',' : '.';
  } else if (!commas && !points) {
    decimal = null;
  } else {
    const only = commas ? ',' : '.';
    const count = commas || points;
    if (mark === 'comma') decimal = only === ',' && count === 1 ? ',' : null;
    else if (mark === 'point') decimal = only === '.' && count === 1 ? '.' : null;
    else if (count > 1) decimal = null;
    else if (/^[1-9]\d{0,2}[.,]\d{3}$/.test(value)) {
      // "1,250": a decimal or a thousand. The reader's locale decides.
      decimal = separators(locale).group === only ? null : only;
    } else decimal = only;
  }
  if (mark === 'comma' && decimal === '.') return null;
  if (mark === 'point' && decimal === ',') return null;

  // The other mark groups digits; with no decimal, whichever mark there is.
  const group = decimal === ',' ? '.' : decimal === '.' ? ',' : commas ? ',' : '.';
  const [whole, fraction, extra] = decimal ? value.split(decimal) : [value];
  if (extra !== undefined || fraction === '') return null;
  if (whole.includes(group) && !new RegExp('^\\d{1,3}(\\' + group + '\\d{3})+$').test(whole)) return null;
  if (fraction?.includes(group)) return null;
  const digits = whole.split(group).join('') || '0';
  const number = Number(digits + (fraction ? '.' + fraction : ''));
  if (!Number.isFinite(number)) return null;
  return negative ? -number : number;
}

/**
 * A plain saved number ("12.5") written for the reader's typing, keeping its
 * decimals: "12,5" for a comma, "12.5" for a point. Text that is not a plain
 * number is returned as it is.
 */
export function forTyping(plain: string, mark: DecimalMark = typedDecimalMark(), locale = formatLocale()): string {
  if (!/^-?\d+(\.\d+)?$/.test(plain.trim())) return plain;
  const comma = mark === 'comma' || (mark === 'either' && separators(locale).decimal === ',');
  return comma ? plain.trim().replace('.', ',') : plain.trim();
}

/**
 * Typed text as it is saved: a plain number ("12.5") when it reads as one;
 * otherwise the text as typed, so a check can say it is not a number.
 */
export function toPlain(typed: string, mark: DecimalMark = typedDecimalMark(), locale = formatLocale()): string {
  const number = parseNumber(typed, mark, locale);
  if (number === null) return typed;
  const plain = String(number);
  return plain.includes('e') ? String(Number(number.toFixed(10))) : plain;
}

/** What to say when typed text is not a number: with the decimal mark Settings allow. */
export function notANumber(mark: DecimalMark = typedDecimalMark()): string {
  const example = forTyping('12.5', mark);
  if (mark === 'comma') return translate('numbers.notANumberComma', { example });
  if (mark === 'point') return translate('numbers.notANumberPoint', { example });
  return translate('numbers.notANumber', { example });
}

/** A list in prose, as the reader's language joins one: "potash, soda and alumina"; with 'unit', "A, B, C". */
export function listOf(items: readonly string[], type: 'conjunction' | 'unit' = 'conjunction'): string {
  return new Intl.ListFormat(formatLocale(), { style: type === 'unit' ? 'short' : 'long', type }).format(items);
}

/** A saved plain number ("12.50") written for the reader, keeping its decimals ("12,50"); other text as it is. */
export function formatPlain(text: string | number | null | undefined): string {
  const plain = String(text ?? '').trim();
  const match = /^-?\d+(?:\.(\d+))?$/.exec(plain);
  return match ? fixed(Number(plain), match[1]?.length ?? 0) : String(text ?? '');
}

/** A date saved as YYYY-MM-DD is a day on the calendar, not midnight in London. */
function asDate(value: string | number | Date): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'string') {
    const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
    if (day) return new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3]));
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** A date as the reader writes it: "Thursday, 8 October 2026", "8.10.2026"; '' for none. */
export function formatDate(
  value: string | number | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'full' }
): string {
  if (value === null || value === undefined || value === '') return '';
  const date = asDate(value);
  return date ? new Intl.DateTimeFormat(formatLocale(), options).format(date) : '';
}

/** A time of day as the reader writes it: 3:05 PM, 15:05. */
export const formatTime = (date: Date): string =>
  new Intl.DateTimeFormat(formatLocale(), { hour: 'numeric', minute: '2-digit' }).format(date);

/** A temperature in the reader's scale, from °C: "1240 °C" or "2264 °F", with a no-break space. */
export function formatTemperature(celsius: number, scale: 'C' | 'F'): string {
  const value = scale === 'F' ? (celsius * 9) / 5 + 32 : celsius;
  return upTo(Math.round(value), 0) + ' °' + scale;
}
