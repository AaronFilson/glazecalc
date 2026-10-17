'use strict';

// Typed numbers read and written as the reader writes them (docs/i18n-plan.md):
// 1234,5 in German, 1 234,5 in French, 1,234.5 in US English. What is saved
// stays plain ("12.5"), so a recipe reads the same everywhere. The decimal
// mark ('either', 'comma' or 'point') and the locale are the reader's: the app
// passes its Settings (client/app/shared/format.ts).

/** The locale's decimal mark and digit-group separator, from how it writes 12345.6. */
function separators(locale) {
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
const asciiDigit = (char) => {
  const code = char.codePointAt(0);
  const zero = DIGIT_ZEROS.find((start) => code >= start && code < start + 10);
  return zero === undefined ? char : String(code - zero);
};

// Spaces that group digits: plain, no-break, narrow no-break and thin; and the apostrophes some locales use.
// eslint-disable-next-line no-irregular-whitespace -- the spaces are what it matches
const GROUP_SPACES = /[\s   '’]/g;

/**
 * A typed number, read by the decimal-mark setting: "12,5" and "12.5" are both
 * 12.5 with either mark. Digit groups are allowed ("1 234,5", "1.234,5",
 * "1,234.5") when they are groups of three; a lone separator before exactly
 * three digits ("1,250") is read as the locale reads it. Any script's digits
 * count (١٢٫٥ is 12.5), as do full-width ones (１２．５), and an ideographic
 * full stop between digits is a point (12。5). Anything else, such as "1e3", "0x10" or "12,5,3",
 * is not a number: null.
 */
function parseNumber(text, mark = 'either', locale = 'en') {
  // NFKC first, so full-width marks (１２．５, －３) read as their plain ones.
  let value = Array.from(text.normalize('NFKC').trim(), asciiDigit)
    .join('')
    .replace(/(?<=\d)。(?=\d)/g, '.') // a Japanese or Chinese full stop, typed for a point
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
  let decimal;
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
function forTyping(plain, mark = 'either', locale = 'en') {
  if (!/^-?\d+(\.\d+)?$/.test(plain.trim())) return plain;
  const comma = mark === 'comma' || (mark === 'either' && separators(locale).decimal === ',');
  return comma ? plain.trim().replace('.', ',') : plain.trim();
}

/**
 * Typed text as it is saved: a plain number ("12.5") when it reads as one;
 * otherwise the text as typed, so a check can say it is not a number.
 */
function toPlain(typed, mark = 'either', locale = 'en') {
  const number = parseNumber(typed, mark, locale);
  if (number === null) return typed;
  const plain = String(number);
  // Digits, never "1e-7": a tiny number is kept to 10 places.
  return plain.includes('e') && Math.abs(number) < 1 ? number.toFixed(10).replace(/\.?0+$/, '') : plain;
}

module.exports = { separators, parseNumber, forTyping, toPlain };
