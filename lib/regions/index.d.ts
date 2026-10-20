/** A region Glazecalc knows, and what it sets by default (lib/regions/index.js). */
export interface Region {
  /** ISO 3166-1 alpha-2. */
  code: string;
  /** In English, for now. */
  name: string;
  /** Official languages there, BCP 47, the most used first. */
  languages: string[];
  eu: boolean;
  temperature: 'C' | 'F';
  cones: 'orton' | 'temperature' | 'sk';
  /** How glaze density is read: specific gravity, or degrees Baumé. */
  density: 'sg' | 'baume';
  /** The standard library's region filter. */
  library: 'US' | 'UK' | 'EU' | 'AU';
  /** The money materials are priced in there, ISO 4217: the default for an account's currency. */
  currency: string;
}

export const REGIONS: ReadonlyArray<Region>;
export const REGION_CODES: ReadonlyArray<string>;
export const FORMAT_LOCALES: ReadonlyArray<string>;
/** The currencies an account may price materials in: each region's, once. */
export const CURRENCIES: ReadonlyArray<string>;
/** The currency to price in when none is chosen: the region's, else the format locale's region's, else USD. */
export function currencyFor(regionCode: string | undefined | null, locale?: string | null): string;
export function regionFor(code: string | undefined | null): Region | undefined;
/** The calendars dates may be shown in, as Intl names them; the first, the Gregorian, is the default. */
export const CALENDARS: ReadonlyArray<'gregory' | 'buddhist' | 'japanese'>;
/**
 * The digits numbers may be shown in: as usual where the reader is (the default), 0–9, or the language's own
 * script's digits where it has them.
 */
export const DIGIT_CHOICES: ReadonlyArray<'auto' | 'western' | 'native'>;
/**
 * The locale for numbers and dates, from the page's language, the region, the format chosen ('auto' or a
 * locale), the calendar chosen (Gregorian when not given) and the digits chosen ('auto' when not given). It
 * always names its calendar and digits: en-US-u-ca-gregory-nu-latn.
 */
export function formatLocaleFor(
  language: string,
  regionCode: string | undefined | null,
  format?: string | null,
  calendar?: string | null,
  digits?: string | null
): string;
/** The numbering system a locale's numbers are shown in by the digits chosen, as Intl names it: latn, arab, deva. */
export function numberingSystemFor(locale: string | Intl.Locale, digits?: string | null): string;
