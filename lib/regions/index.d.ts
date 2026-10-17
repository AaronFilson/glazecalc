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
/** The locale for numbers and dates, from the page's language, the region and the format chosen ('auto' or a locale). */
export function formatLocaleFor(
  language: string,
  regionCode: string | undefined | null,
  format?: string | null
): string;
