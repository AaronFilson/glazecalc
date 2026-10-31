// Numbers, dates and lists in a language the browser has no Intl data for. Google Chrome 156 and
// Playwright's Chromium (measured 2026-10-30) write Nepali, Sinhala and Odia as en-US
// ("1,234,567.5", "October 14, 2026"), and Punjabi's dates without month names ("2026 M10 14"),
// while Node, which writes the prerendered page, has them all. For those languages
// scripts/locale-fallback.mjs writes what the app formats from Node's Intl into
// locale-fallback-data.json, and the formatters here write from it when the browser lacks the
// language, so the page reads as the server wrote it and hydrating it changes nothing
// (client/app/shared/format.ts uses them; docs/i18n-plan.md, Digits).
//
// The rule: a browser lacks a language's numbers (or lists) when Intl resolves the language to
// another one, and its dates when it does that or writes a month as "M10" or a figure where its
// name belongs. Only the languages in the data are ever written from it; any other language, and
// any option the data does not cover (a unit, a calendar other than the Gregorian), is Intl's.
const DATA = require('./locale-fallback-data.json');

/** The key of a set of options: its entries in a fixed order (scripts/locale-fallback.mjs writes the same). */
const optionsKey = (options) =>
  Object.keys(options)
    .sort()
    .map((name) => name + '=' + options[name])
    .join(',');

const sameLanguage = (resolved, language) => {
  try {
    return new Intl.Locale(resolved).language === language;
  } catch {
    return false;
  }
};

/** Whether this browser's Intl has a language's 'numbers', 'dates' or 'lists' (the rule above). */
function browserHas(language, kind) {
  try {
    if (kind === 'numbers') return sameLanguage(new Intl.NumberFormat(language).resolvedOptions().locale, language);
    if (kind === 'lists') return sameLanguage(new Intl.ListFormat(language).resolvedOptions().locale, language);
    const format = new Intl.DateTimeFormat(language, { year: 'numeric', month: 'long', day: 'numeric' });
    if (!sameLanguage(format.resolvedOptions().locale, language)) return false;
    const month = format.formatToParts(new Date(2026, 9, 14)).find((part) => part.type === 'month')?.value ?? '';
    return month !== '' && !/^M?\p{Nd}+$/u.test(month);
  } catch {
    return false;
  }
}

let support = browserHas;
const supported = new Map();

/** For tests: what the browser is taken to have (null: ask its Intl again). */
function setBrowserSupport(has) {
  support = has ?? browserHas;
  supported.clear();
}

/** The data to write a locale's numbers, dates or lists from, or null where Intl writes them. */
function fallbackFor(locale, kind) {
  let tag;
  try {
    tag = new Intl.Locale(locale);
  } catch {
    return null;
  }
  const data = DATA.languages[tag.language];
  if (!data) return null;
  const key = tag.language + '|' + kind;
  let has = supported.get(key);
  if (has === undefined) {
    has = support(tag.language, kind);
    supported.set(key, has);
  }
  if (has) return null;
  const system = tag.numberingSystem ?? 'latn';
  return {
    data,
    digits: system === 'latn' ? null : (DATA.digits[system] ?? null),
    system,
    calendar: tag.calendar ?? 'gregory',
    locale
  };
}

const withDigits = (text, digits) => (digits ? text.replace(/[0-9]/g, (digit) => digits[Number(digit)]) : text);

/** How the locale's numbering system writes numbers: its own where CLDR differs from 0–9's, else 0–9's. */
const numbersOf = (fallback) => fallback.data.numbers[fallback.system] ?? fallback.data.numbers.latn;

const NUMBER_PARTS = new Set(['integer', 'group', 'decimal', 'fraction']);
const SIGN_PARTS = new Set(['minusSign', 'plusSign']);

class FallbackNumberFormat {
  constructor(fallback, options) {
    this.fallback = fallback;
    this.numbers = numbersOf(fallback);
    // English (India's, for 12,34,567) writes the number itself; the language's data the rest.
    const indian = this.numbers.indian[options.style ?? 'decimal'];
    this.proxy = new Intl.NumberFormat(indian ? 'en-IN-u-nu-latn' : 'en-u-nu-latn', options);
    const pattern =
      options.style === 'percent'
        ? this.numbers.percent
        : options.style === 'currency'
          ? this.numbers.currency[options.currency]
          : null;
    this.around = pattern ? pattern.split('#') : null;
  }

  formatToParts(value) {
    const data = this.numbers;
    const { digits } = this.fallback;
    const sign = [];
    const number = [];
    for (const part of this.proxy.formatToParts(value)) {
      if (SIGN_PARTS.has(part.type)) sign.push(part);
      else if (part.type === 'group') number.push({ type: 'group', value: data.group });
      else if (part.type === 'decimal') number.push({ type: 'decimal', value: data.decimal });
      else if (NUMBER_PARTS.has(part.type)) number.push({ type: part.type, value: withDigits(part.value, digits) });
      else if (!this.around) number.push(part);
    }
    if (!this.around) return [...sign, ...number];
    const [before, after] = this.around;
    const literal = (text) => (text ? [{ type: 'literal', value: text }] : []);
    return [...sign, ...literal(before), ...number, ...literal(after)];
  }

  format(value) {
    return this.formatToParts(value)
      .map((part) => part.value)
      .join('');
  }

  resolvedOptions() {
    return { ...this.proxy.resolvedOptions(), locale: this.fallback.locale, numberingSystem: this.fallback.system };
  }
}

/** An Intl.NumberFormat, written from the fallback data where the browser lacks the language. */
function numberFormat(locale, options = {}) {
  const fallback = fallbackFor(locale, 'numbers');
  const style = options.style ?? 'decimal';
  const covered =
    fallback &&
    (options.notation ?? 'standard') === 'standard' &&
    (style === 'decimal' ||
      style === 'percent' ||
      (style === 'currency' &&
        (options.currencyDisplay ?? 'symbol') === 'symbol' &&
        !!numbersOf(fallback).currency[options.currency ?? '']));
  return covered ? new FallbackNumberFormat(fallback, options) : new Intl.NumberFormat(locale, options);
}

const pad = (value, width) => String(value).padStart(width, '0');

class FallbackDateFormat {
  constructor(fallback, pattern, options) {
    this.fallback = fallback;
    this.pattern = pattern;
    this.options = options;
  }

  field(type, spec, date) {
    const width = Number(spec.slice(1));
    if (spec[0] === 'n') {
      const names = this.fallback.data.names[width];
      if (type === 'month') return names[date.getMonth()];
      if (type === 'weekday') return names[date.getDay()];
      return names[date.getHours() < 12 ? 0 : 1];
    }
    switch (spec[0]) {
      case 'm':
        return pad(date.getMonth() + 1, width);
      case 'd':
        return pad(date.getDate(), width);
      case 'y':
        return pad(width === 2 ? date.getFullYear() % 100 : date.getFullYear(), width);
      case 'H':
        return pad(date.getHours(), width);
      case 'h':
        return pad(date.getHours() % 12 || 12, width);
      default:
        return pad(date.getMinutes(), width);
    }
  }

  formatToParts(value) {
    const date = value === undefined ? new Date() : new Date(value);
    return this.pattern.map((part) => {
      if (typeof part === 'string') return { type: 'literal', value: part };
      const [type, spec] = part;
      const text = this.field(type, spec, date);
      return { type, value: spec[0] === 'n' ? text : withDigits(text, this.fallback.digits) };
    });
  }

  format(value) {
    return this.formatToParts(value)
      .map((part) => part.value)
      .join('');
  }

  resolvedOptions() {
    return {
      ...new Intl.DateTimeFormat('en', this.options).resolvedOptions(),
      locale: this.fallback.locale,
      calendar: 'gregory',
      numberingSystem: this.fallback.system
    };
  }
}

/** An Intl.DateTimeFormat, written from the fallback data where the browser lacks the language. */
function dateTimeFormat(locale, options = {}) {
  const fallback = fallbackFor(locale, 'dates');
  const pattern = fallback && fallback.calendar === 'gregory' ? fallback.data.dates[optionsKey(options)] : undefined;
  return pattern ? new FallbackDateFormat(fallback, pattern, options) : new Intl.DateTimeFormat(locale, options);
}

/** A list joined as Intl.ListFormat joins it, from the fallback data where the browser lacks the language. */
function formatList(locale, items, options) {
  const pattern = fallbackFor(locale, 'lists')?.data.lists[optionsKey(options)];
  if (!pattern) return new Intl.ListFormat(locale, options).format(items);
  const n = items.length;
  if (n === 0) return '';
  if (n === 1) return items[0];
  if (n === 2) return pattern.two[0] + items[0] + pattern.two[1] + items[1] + pattern.two[2];
  const [first, start, middle, end, last] = pattern.many;
  let text = first + items[0] + start + items[1];
  for (let i = 2; i < n - 1; i++) text += middle + items[i];
  return text + end + items[n - 1] + last;
}

module.exports = {
  LOCALE_FALLBACK_DATA: DATA,
  optionsKey,
  browserHas,
  setBrowserSupport,
  fallbackFor,
  numberFormat,
  dateTimeFormat,
  formatList
};
