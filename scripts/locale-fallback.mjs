// Writes the number, date and list data of the languages a browser may lack into
// lib/regions/locale-fallback-data.json, from Node's own Intl (full ICU), so a page in one of
// them is written as the server writes it (lib/regions/locale-fallback.js). Never edit the
// JSON by hand.
//
//   node scripts/locale-fallback.mjs           (npm run build runs it first)
//   node scripts/locale-fallback.mjs --check   (exits 1 if the file is not what Node writes now)
//
// Measured 2026-10-30 (scratch/round9/i4/intl-check.mjs): Google Chrome 156 and Playwright's
// Chromium have no Intl data for Nepali, Sinhala and Odia (they write en-US), and Punjabi's
// dates have no month names ("2026 M10 14"). Only those languages are written here, and only
// what the app formats: the date styles of shared/format.ts and its callers, percent and
// currency patterns, digit grouping and separators, the digits of their numbering systems and
// list patterns. server/test/locale_fallback_tests.ts checks the file against Node's Intl.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
export const OUT = path.join(ROOT, 'lib', 'regions', 'locale-fallback-data.json');
const require = createRequire(import.meta.url);
const { CURRENCIES } = require('../lib/regions/index.js');

/** The languages whose data a browser may lack, each with the locale its data is taken from. */
export const FALLBACK_LOCALES = { ne: 'ne-NP', or: 'or-IN', pa: 'pa-IN', si: 'si-LK' };

/** The numbering systems those languages' numbers may be written in (lib/regions/index.js, DIGITS). */
export const DIGIT_SYSTEMS = ['deva', 'guru', 'orya', 'sinh'];

/** Each language's own digits, besides 0–9 (the Digits setting's native; lib/regions/index.js, DIGITS). */
export const NATIVE_SYSTEMS = { ne: ['deva'], or: ['orya'], pa: ['guru'], si: ['sinh'] };

/** The date and time options the app formats with (shared/format.ts, format-pipes.ts, settings-section.ts and their callers). */
export const DATE_OPTIONS = [
  { dateStyle: 'full' },
  { dateStyle: 'long' },
  { dateStyle: 'medium' },
  { dateStyle: 'short' },
  { weekday: 'long', month: 'long', day: 'numeric' },
  { dateStyle: 'medium', timeStyle: 'short' },
  { timeStyle: 'short' },
  { hour: 'numeric', minute: '2-digit' }
];

/** The list styles shared/format.ts listOf joins with. */
export const LIST_OPTIONS = [
  { type: 'conjunction', style: 'long' },
  { type: 'disjunction', style: 'long' },
  { type: 'unit', style: 'short' }
];

/** The key of a set of options: its entries in a fixed order. */
export const optionsKey = (options) =>
  Object.keys(options)
    .sort()
    .map((name) => name + '=' + options[name])
    .join(',');

const latn = (locale) => new Intl.Locale(locale, { calendar: 'gregory', numberingSystem: 'latn' }).toString();

/** A date pattern as parts: literals as they are, fields by kind, names by their table. */
function datePattern(locale, options, names) {
  const format = new Intl.DateTimeFormat(latn(locale), options);
  const at = (month, day, hour) => format.formatToParts(new Date(2026, month, day, hour, 5));
  const sample = at(2, 4, 9);
  const nameTable = (values) => {
    const key = JSON.stringify(values);
    let index = names.findIndex((table) => JSON.stringify(table) === key);
    if (index < 0) index = names.push(values) - 1;
    return 'n' + index;
  };
  const valuesOf = (type, dates) => dates.map((parts) => parts.find((part) => part.type === type)?.value ?? '');
  return sample.map((part, index) => {
    const { type, value } = part;
    if (type === 'literal') return value;
    let spec;
    if (type === 'month') {
      const months = valuesOf(
        type,
        Array.from({ length: 12 }, (_, month) => at(month, 4, 9))
      );
      spec = /^\d+$/.test(months[2]) ? 'm' + months[2].length : nameTable(months);
    } else if (type === 'weekday') {
      // 1–7 March 2026 are Sunday to Saturday.
      spec = nameTable(
        valuesOf(
          type,
          Array.from({ length: 7 }, (_, day) => at(2, 1 + day, 9))
        )
      );
    } else if (type === 'dayPeriod') {
      spec = nameTable(valuesOf(type, [at(2, 4, 9), at(2, 4, 15)]));
    } else if (type === 'day') spec = 'd' + value.length;
    else if (type === 'year') spec = 'y' + value.length;
    else if (type === 'minute') spec = 'i' + value.length;
    else if (type === 'hour') spec = (valuesOf(type, [at(2, 4, 15)])[0] === '15' ? 'H' : 'h') + value.length;
    else throw new Error(locale + ' ' + optionsKey(options) + ': no way to write a ' + type + ' part (' + index + ')');
    return [type, spec];
  });
}

/** A number pattern: the text around the number, "#" for it ("US$ #", "#%"). */
function numberPattern(locale, options) {
  const parts = new Intl.NumberFormat(latn(locale), options).formatToParts(1234.5);
  const number = new Set(['integer', 'group', 'decimal', 'fraction']);
  let text = '';
  let inNumber = false;
  for (const part of parts) {
    if (number.has(part.type)) {
      if (!inNumber) text += '#';
      inNumber = true;
    } else {
      text += part.value;
      inNumber = false;
    }
  }
  return text;
}

/** A list pattern: the literals before, between and after 2 items, and before, between and after 4. */
function listPattern(locale, options) {
  const format = new Intl.ListFormat(locale, options);
  const literals = (items) => {
    const out = [''];
    for (const part of format.formatToParts(items)) {
      if (part.type === 'literal') out[out.length - 1] += part.value;
      else out.push('');
    }
    return out;
  };
  return { two: literals(['a', 'b']), many: literals(['a', 'b', 'c', 'd']) };
}

/** How a locale writes its numbers: grouping by style, separators, and the text around percents and prices. */
function numberData(locale) {
  const decimalParts = new Intl.NumberFormat(locale, { useGrouping: true }).formatToParts(1234567.5);
  const plain = new Intl.NumberFormat(locale, { useGrouping: false });
  const table = Array.from({ length: 10 }, (_, digit) => plain.format(digit));
  const digitsOf = (text) => text.replace(/\p{Nd}/gu, (digit) => String(table.indexOf(digit)));
  // Whether each style groups as 12,34,567 (a percent may not, where numbers do).
  const indianIn = (options, value) =>
    /^\D*12.34.567(?!\d)/.test(
      digitsOf(new Intl.NumberFormat(locale, { ...options, useGrouping: true }).format(value))
    );
  return {
    indian: {
      decimal: indianIn({}, 1234567),
      percent: indianIn({ style: 'percent' }, 12345.67),
      currency: indianIn({ style: 'currency', currency: 'USD' }, 1234567)
    },
    decimal: decimalParts.find((part) => part.type === 'decimal').value,
    group: decimalParts.find((part) => part.type === 'group').value,
    percent: numberPattern(locale, { style: 'percent' }),
    currency: Object.fromEntries(
      CURRENCIES.map((currency) => [currency, numberPattern(locale, { style: 'currency', currency })])
    )
  };
}

/** The data written for each language. */
export function localeFallbackData() {
  const digits = Object.fromEntries(
    DIGIT_SYSTEMS.map((system) => {
      const format = new Intl.NumberFormat('en-u-nu-' + system, { useGrouping: false });
      return [system, Array.from({ length: 10 }, (_, digit) => format.format(digit)).join('')];
    })
  );
  const languages = {};
  for (const [language, locale] of Object.entries(FALLBACK_LOCALES)) {
    const names = [];
    const dates = Object.fromEntries(
      DATE_OPTIONS.map((options) => [optionsKey(options), datePattern(locale, options, names)])
    );
    // CLDR may group a language's numbers otherwise in its own digits (Nepali's percent: 1,23,400% in
    // Devanagari, 123,400% in 0–9), so each numbering system whose numbers differ from 0–9's has its own.
    const numbers = { latn: numberData(latn(locale)) };
    for (const system of NATIVE_SYSTEMS[language]) {
      const own = numberData(new Intl.Locale(locale, { numberingSystem: system }).toString());
      if (JSON.stringify(own) !== JSON.stringify(numbers.latn)) numbers[system] = own;
    }
    languages[language] = {
      locale,
      numbers,
      dates,
      names,
      lists: Object.fromEntries(LIST_OPTIONS.map((options) => [optionsKey(options), listPattern(locale, options)]))
    };
  }
  return { digits, languages };
}

/** The file's text, formatted as Prettier formats the repository. */
export async function localeFallbackFile() {
  const prettier = await import('prettier');
  const text = JSON.stringify(localeFallbackData());
  const config = (await prettier.resolveConfig(OUT)) ?? {};
  return prettier.format(text, { ...config, filepath: OUT });
}

if (path.resolve(process.argv[1] ?? '') === import.meta.filename) {
  const text = await localeFallbackFile();
  let current = '';
  try {
    current = readFileSync(OUT, 'utf8');
  } catch {
    // None yet.
  }
  if (current === text) {
    // Left as it is, so its time does not make scripts/e2e-build.mjs build again.
  } else if (process.argv.includes('--check')) {
    console.error(path.relative(ROOT, OUT) + ' is not what Node writes now: run node scripts/locale-fallback.mjs');
    process.exit(1);
  } else {
    writeFileSync(OUT, text);
    console.log('Wrote ' + path.relative(ROOT, OUT));
  }
}
