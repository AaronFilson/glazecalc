import {
  browserHas,
  dateTimeFormat,
  fallbackFor,
  numberFormat,
  setBrowserSupport
} from '../../../lib/regions/locale-fallback';
import { fixed, formatDate, formatLocale, formatTime, listLocale, listOf, money, percent, upTo } from './format';

// A browser without Nepali, Sinhala, Odia or Punjabi Intl data (Google Chrome 156, 2026-10-30)
// writes them from the data Node's Intl wrote (lib/regions/locale-fallback.js). The strings
// below are Node 24's (ICU 78); server/test/locale_fallback_tests.ts checks the data against
// Node's Intl over many more dates and numbers.
describe('numbers and dates in a language the browser lacks', () => {
  // 14 October 2026, a Wednesday, at 3:05 PM.
  const DAY = new Date(2026, 9, 14, 15, 5);

  beforeEach(() => setBrowserSupport(() => false));
  afterEach(() => {
    setBrowserSupport(null);
    formatLocale.set('en');
    listLocale.set('en');
  });

  it('writes Nepali in Devanagari digits, grouped as Nepal groups them, with its month names', () => {
    formatLocale.set('ne-NP-u-ca-gregory-nu-deva');
    expect(upTo(1234567.5, 2)).toBe('१२,३४,५६७.५');
    expect(fixed(1234.5, 1)).toBe('१२३४.५');
    expect(fixed(-12.25, 2)).toBe('-१२.२५');
    expect(percent(7)).toBe('७%');
    // A no-break space after the symbol.
    expect(money(1234.5, 'USD')).toBe('US$ १,२३४.५०');
    expect(money(1234.5, 'NPR')).toBe('नेरू १,२३४.५०');
    expect(formatDate(DAY)).toBe('२०२६ अक्टोबर १४, बुधबार');
    expect(formatDate(DAY, { dateStyle: 'long' })).toBe('२०२६ अक्टोबर १४');
    expect(formatDate(DAY, { dateStyle: 'short' })).toBe('२६/१०/१४');
    expect(formatTime(DAY)).toBe('१५:०५');
  });

  it('keeps 0–9 when the Digits setting chooses them', () => {
    formatLocale.set('ne-NP-u-ca-gregory-nu-latn');
    expect(upTo(1234567.5, 2)).toBe('12,34,567.5');
    expect(formatDate(DAY, { dateStyle: 'long' })).toBe('2026 अक्टोबर 14');
    formatLocale.set('or-IN-u-ca-gregory-nu-orya');
    expect(upTo(1234567.5, 2)).toBe('୧୨,୩୪,୫୬୭.୫');
    expect(formatDate(DAY, { dateStyle: 'long' })).toBe('ଅକ୍ଟୋବର ୧୪, ୨୦୨୬');
  });

  it('writes Sinhala, Odia and Punjabi dates with their own month names, and their numbers', () => {
    formatLocale.set('si-LK-u-ca-gregory-nu-latn');
    expect(upTo(1234567.5, 2)).toBe('1,234,567.5');
    expect(formatDate(DAY)).toBe('2026 වප් 14, බදාදා');
    expect(formatDate(DAY, { dateStyle: 'medium', timeStyle: 'short' })).toBe('2026 වප් 14, 15.05');
    formatLocale.set('or-IN-u-ca-gregory-nu-latn');
    expect(upTo(1234567.5, 2)).toBe('12,34,567.5');
    expect(formatDate(DAY)).toBe('ବୁଧବାର, ଅକ୍ଟୋବର 14, 2026');
    expect(formatTime(DAY)).toBe('3:05 PM');
    formatLocale.set('pa-IN-u-ca-gregory-nu-latn');
    expect(formatDate(DAY)).toBe('ਬੁੱਧਵਾਰ, 14 ਅਕਤੂਬਰ 2026');
    expect(formatDate(DAY, { dateStyle: 'medium' })).toBe('14 ਅਕਤੂ 2026');
    expect(formatDate(DAY, { weekday: 'long', month: 'long', day: 'numeric' })).toBe('ਬੁੱਧਵਾਰ, 14 ਅਕਤੂਬਰ');
  });

  it('joins lists as the language does', () => {
    listLocale.set('ne-NP');
    expect(listOf(['क', 'ख', 'ग'])).toBe(new Intl.ListFormat('ne-NP').format(['क', 'ख', 'ग']));
    expect(listOf(['क', 'ख'], 'disjunction')).toBe(
      new Intl.ListFormat('ne-NP', { type: 'disjunction' }).format(['क', 'ख'])
    );
  });

  it('leaves a calendar other than the Gregorian, and a language not in the data, to Intl', () => {
    expect(fallbackFor('ne-NP-u-ca-buddhist-nu-deva', 'dates')?.calendar).toBe('buddhist');
    for (const locale of ['mr-IN-u-ca-gregory-nu-deva', 'hi-IN-u-ca-gregory-nu-latn', 'en-US-u-ca-gregory-nu-latn']) {
      expect(fallbackFor(locale, 'numbers'), locale).toBeNull();
      expect(fallbackFor(locale, 'dates'), locale).toBeNull();
    }
  });
});

describe('whether the browser has a language', () => {
  afterEach(() => setBrowserSupport(null));

  it('never uses the data where the browser has the language', () => {
    setBrowserSupport(() => true);
    const locale = 'ne-NP-u-ca-gregory-nu-deva';
    expect(fallbackFor(locale, 'numbers')).toBeNull();
    expect(numberFormat(locale)).toBeInstanceOf(Intl.NumberFormat);
    expect(dateTimeFormat(locale, { dateStyle: 'long' })).toBeInstanceOf(Intl.DateTimeFormat);
  });

  it('finds that this Intl has English, Hindi and Marathi', () => {
    for (const language of ['en', 'hi', 'mr']) {
      for (const kind of ['numbers', 'dates', 'lists'] as const) {
        expect(browserHas(language, kind), language + ' ' + kind).toBe(true);
      }
    }
  });

  it('finds a language Intl resolves to another, and dates written "M10" where a month name belongs', () => {
    const real = Intl.DateTimeFormat;
    const realNumbers = Intl.NumberFormat;
    try {
      // Chrome 156's Punjabi: its own numbers, no month names.
      (Intl as { DateTimeFormat: unknown }).DateTimeFormat = function (locale: string) {
        return {
          resolvedOptions: () => ({ locale }),
          formatToParts: () => [
            { type: 'year', value: '2026' },
            { type: 'literal', value: ' ' },
            { type: 'month', value: 'M10' },
            { type: 'literal', value: ' ' },
            { type: 'day', value: '14' }
          ]
        };
      };
      expect(browserHas('pa', 'dates')).toBe(false);
      // Chrome 156's Nepali: en-US.
      (Intl as { NumberFormat: unknown }).NumberFormat = function () {
        return { resolvedOptions: () => ({ locale: 'en-US' }) };
      };
      expect(browserHas('ne', 'numbers')).toBe(false);
    } finally {
      (Intl as { DateTimeFormat: unknown }).DateTimeFormat = real;
      (Intl as { NumberFormat: unknown }).NumberFormat = realNumbers;
    }
    expect(browserHas('pa', 'dates')).toBe(true);
  });
});
