import { signal } from '@angular/core';
import { translate } from '@jsverse/transloco';
import * as numbers from '../../../lib/recipe/numbers';
import { dateTimeFormat, formatList, numberFormat as intlNumberFormat } from '../../../lib/regions/locale-fallback';
import { temperatureText } from '../../../lib/recipe/temperature';
import type { DecimalMark } from '../core/preferences.service';
import { ltr } from './bidi';

// Numbers, dates and temperatures as the reader writes them (docs/i18n-plan.md):
// 1234,5 in German, 1 234,5 in French, 1,234.5 in US English. The locale and
// the decimal mark follow Settings; core/locale.service.ts keeps them current.
// What is saved stays plain ("12.5"), so a recipe reads the same everywhere:
// these functions only turn numbers into text for the reader and the reader's
// typing back into numbers. In a language the browser has no Intl data for
// (Nepali, Sinhala, Odia, Punjabi's dates), they write from data taken from
// Node's (lib/regions/locale-fallback.js), as the prerendered page does.

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
    format = intlNumberFormat(locale, {
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

/** An amount of money in a currency (ISO 4217), as the locale writes it: $2.50, 2,50 €, ¥250. */
export const money = (value: number, currency: string): string => {
  try {
    return intlNumberFormat(formatLocale(), { style: 'currency', currency }).format(value);
  } catch {
    return upTo(value, 2) + ' ' + currency;
  }
};

/** A whole percent: 7%, 7 % or 7 %, as the locale writes it. */
export const percent = (value: number, places = 0): string =>
  intlNumberFormat(formatLocale(), {
    style: 'percent',
    minimumFractionDigits: places,
    maximumFractionDigits: places
  }).format(value / 100);

/**
 * A typed number, read by the decimal-mark setting: "12,5" and "12.5" are both
 * 12.5 with either mark; digit groups in threes, any script's digits
 * (lib/recipe/numbers.js). Anything else, such as "1e3", is not a number: null.
 */
export const parseNumber = (text: string, mark: DecimalMark = typedDecimalMark(), locale = formatLocale()) =>
  numbers.parseNumber(text, mark, locale);

/** A plain saved number ("12.5") written for the reader's typing, keeping its decimals: "12,5" for a comma. */
export const forTyping = (plain: string, mark: DecimalMark = typedDecimalMark(), locale = formatLocale()) =>
  numbers.forTyping(plain, mark, locale);

/**
 * Typed text as it is saved: a plain number ("12.5") when it reads as one;
 * otherwise the text as typed, so a check can say it is not a number.
 */
export const toPlain = (typed: string, mark: DecimalMark = typedDecimalMark(), locale = formatLocale()) =>
  numbers.toPlain(typed, mark, locale);

/** A number saved plainly ("12.5", "-3"), as toPlain writes one; null for anything else, such as "12,5" or "1e3". */
export { plainNumber } from '../../../lib/recipe/numbers';

/** What to say when typed text is not a number: with the decimal mark Settings allow. */
export function notANumber(mark: DecimalMark = typedDecimalMark()): string {
  const example = forTyping('12.5', mark);
  if (mark === 'comma') return translate('numbers.notANumberComma', { example });
  if (mark === 'point') return translate('numbers.notANumberPoint', { example });
  return translate('numbers.notANumber', { example });
}

/**
 * The locale lists are joined in: the page's language, as the reader's region
 * writes it ("A, B and C" in the UK), whatever format of numbers is chosen, so
 * a German sentence joins its list with "und".
 */
export const listLocale = signal('en');

/** A list in prose, as the page's language joins one: "potash, soda and alumina"; "DS2 or RS2"; with 'unit', "A, B, C". */
export function listOf(items: readonly string[], type: 'conjunction' | 'disjunction' | 'unit' = 'conjunction'): string {
  return formatList(listLocale(), items, { style: type === 'unit' ? 'short' : 'long', type });
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
  return date ? dateTimeFormat(formatLocale(), options).format(date) : '';
}

/** A time of day as the reader writes it: 3:05 PM, 15:05. */
export const formatTime = (date: Date): string =>
  dateTimeFormat(formatLocale(), { hour: 'numeric', minute: '2-digit' }).format(date);

/**
 * A temperature in the reader's scale, from °C: "1240 °C" or "2264 °F", with a no-break space; left to
 * right as a whole on a right-to-left page (shared/bidi.ts).
 */
export function formatTemperature(celsius: number, scale: 'C' | 'F'): string {
  return ltr(temperatureText(celsius, scale, (value) => upTo(value, 0)));
}
