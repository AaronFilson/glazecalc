import { languageFor } from '../../../lib/regions/languages';
import { formatLocale } from './format';

// The figures of a page's text in the digits its numbers are shown in (lib/regions/languages.js,
// textDigits). Translations write 0–9 (scripts/i18n-check.mjs, checkDigits), and the app formats numbers
// in the digits usual where the reader is (lib/regions/index.js, DIGITS): Bengali ১২৩ in Bangladesh and
// India. On a Bengali page the text's own figures ("1222 °C", "999", "3টি") are shown in those digits too,
// so a page never mixes ১২২২ and 1222 (the owner's decision, 2026-10-21). Where the reader chose 0–9 in
// Settings, or a number format written in 0–9, the numbers are formatted in 0–9, and so is the text.
//
// What a reader copies or types keeps 0–9: a figure touching a Latin letter (a formula, Al2O3, K2O; a
// code, H361fd, FFP2, 84/500/EEC; a cone, SK 6a), the number of a name or a standard written straight
// after its Latin word (Ferro 3134, ISO 6486, (EC) No 1272/2008), a web or email address, and the
// messages that show how 0–9 are written (NOTATION_KEYS). What the reader typed is never in a message's
// own text: values ({name}) are left as they are, and inputs are not text.

/** Messages that show the digits 0–9 or the way numbers are typed, so they keep 0–9 on every page. */
const NOTATION_KEYS = [
  'settings.digits.western.label',
  'settings.digits.western.saved',
  'settings.decimalMark.either.example',
  'digits-choices'
];

/** Whether a message, by its key, shows how numbers are written: its figures stay 0–9. */
export const keepsWesternDigits = (key: string | undefined): boolean =>
  !!key && NOTATION_KEYS.some((notation) => key === notation || key.endsWith('.' + notation));

/**
 * The numbering system (Intl's: 'beng') a page's text writes its figures in, by the locale numbers are
 * formatted in: null where they stay 0–9, as on every page but a Bengali one, and on a Bengali page
 * whose reader chose 0–9.
 */
export function textDigitsFor(language: string, locale: string = formatLocale()): string | null {
  if (!languageFor(language)?.textDigits) return null;
  let system: string | undefined;
  try {
    system = new Intl.Locale(locale).numberingSystem ?? new Intl.NumberFormat(locale).resolvedOptions().numberingSystem;
  } catch {
    return null;
  }
  return system && system !== 'latn' ? system : null;
}

const digitTables = new Map<string, string[]>();

/** The ten digits of a numbering system, 0 to 9, as Intl writes them. */
function digitsOf(system: string): string[] {
  let table = digitTables.get(system);
  if (!table) {
    const format = new Intl.NumberFormat('en-u-nu-' + system, { useGrouping: false });
    table = Array.from({ length: 10 }, (_, digit) => format.format(digit));
    digitTables.set(system, table);
  }
  return table;
}

const LATIN = /\p{Script=Latin}/u;
/** A unit after a figure, which is not a name a number belongs to: "1222 °C 10" is two figures. */
const UNIT = /^(?:°[CF]|°Bé|k?g|mg|µg|m?L|ml|mm|cm|µm|lbs?|oz|ppm|kWh)[,;:.)]*$/u;

/** Whether a word's figures stay 0–9: it touches a Latin letter, is an address, or numbers the Latin word before it. */
function keepsLatin(word: string, before: string): boolean {
  if (LATIN.test(word) || word.includes('@')) return true;
  return /^[([]?\d/.test(word) && /\p{Script=Latin}[)\]]?$/u.test(before) && !UNIT.test(before);
}

/**
 * Text with its figures 0–9 written in a numbering system's digits ('beng': ০–৯), but for the figures that
 * keep 0–9 (above); the text as it is for none.
 */
export function withTextDigits(text: string, system: string | null): string {
  if (!system || !/[0-9]/.test(text)) return text;
  const digits = digitsOf(system);
  let before = '';
  return text
    .split(/(\s+)/)
    .map((part) => {
      if (!part || /^\s+$/.test(part)) return part;
      const shown = keepsLatin(part, before) ? part : part.replace(/[0-9]/g, (digit) => digits[Number(digit)]!);
      before = part;
      return shown;
    })
    .join('');
}
