import {
  fixed,
  forTyping,
  formatDate,
  formatLocale,
  formatTemperature,
  parseNumber,
  percent,
  toPlain,
  upTo
} from './format';

describe('numbers, dates and temperatures as the reader writes them', () => {
  afterEach(() => formatLocale.set('en'));

  it('writes numbers in the locale, keeping 4-digit numbers together and never "-0"', () => {
    formatLocale.set('en-US');
    expect([fixed(1234.5, 1), fixed(12345.25, 2), upTo(12.5, 3), fixed(-0.0001, 2)]).toEqual([
      '1234.5',
      '12,345.25',
      '12.5',
      '0.00'
    ]);
    formatLocale.set('de-DE');
    expect([fixed(1234.5, 1), fixed(12345.25, 2), upTo(0.125, 3)]).toEqual(['1234,5', '12.345,25', '0,125']);
    formatLocale.set('fr-FR');
    // A narrow no-break space groups digits in French; a no-break space comes before %.
    expect(fixed(12345.25, 2)).toBe('12 345,25');
    expect(percent(7)).toBe('7 %');
  });

  it('reads typed numbers with either decimal mark, in groups of three, and in any script', () => {
    const read = (text: string, mark: 'either' | 'comma' | 'point' = 'either', locale = 'en-US') =>
      parseNumber(text, mark, locale);
    expect(['12,5', '12.5', ' 12.50 ', '0,125', ',5', '20'].map((t) => read(t))).toEqual([
      12.5, 12.5, 12.5, 0.125, 0.5, 20
    ]);
    // Groups of three, with a mark on the right, or spaces of any kind.
    expect(['1,234.5', '1.234,5', '1 234,5', '1 234,5', '12.345.678', '1,234,567'].map((t) => read(t))).toEqual([
      1234.5, 1234.5, 1234.5, 1234.5, 12345678, 1234567
    ]);
    // "1,250" is a thousand to an English reader and a decimal to a German one.
    expect([
      read('1,250', 'either', 'en-US'),
      read('1,250', 'either', 'de-DE'),
      read('1.250', 'either', 'de-DE')
    ]).toEqual([1250, 1.25, 1250]);
    // Arabic-Indic, Devanagari and Bengali digits, and the Arabic decimal mark.
    expect([read('١٢٫٥'), read('१२.५'), read('১২,৫')]).toEqual([12.5, 12.5, 12.5]);
    // Full-width digits and marks, as a Japanese or Chinese keyboard types them,
    // and the ideographic full stop between digits.
    expect([read('１２．５'), read('１２，５'), read('12。5'), read('１，２３４．５'), read('－３')]).toEqual([
      12.5, 12.5, 12.5, 1234.5, -3
    ]);
    expect([read('12。'), read('。5'), read('1。2。3')]).toEqual([null, null, null]);
    // Not numbers.
    for (const text of ['', 'abc', '1e3', '0x10', '12,5,3', '1.2.3,4,5', '12,', '1 23', '12.5.', 'Infinity', '--3']) {
      expect(read(text), text).toBeNull();
    }
    expect(read('-3,5')).toBe(-3.5);
  });

  it('reads Indian digit groups, and numbers as Intl writes them in Arabic, Bengali and Hindi', () => {
    const read = (text: string, locale = 'en-US') => parseNumber(text, 'either', locale);
    expect([read('1,00,000'), read('12,34,567.5'), read('१,००,०००')]).toEqual([100000, 1234567.5, 100000]);
    // What the app writes, read back as typed: Arabic-Indic in Egypt, Bengali in Bangladesh, 0–9 in India.
    for (const locale of ['ar-EG-u-nu-arab', 'bn-BD-u-nu-beng', 'hi-IN-u-nu-latn', 'hi-IN-u-nu-deva']) {
      formatLocale.set(locale);
      expect(read(fixed(1234567.5, 1), locale), locale).toBe(1234567.5);
      expect(read(fixed(-3, 0), locale), locale).toBe(-3);
      expect(read(percent(5), locale), locale).toBe(5);
    }
    formatLocale.set('ar-EG-u-nu-arab');
    expect([fixed(12345.5, 1), percent(5).startsWith('٥٪')]).toEqual(['١٢٬٣٤٥٫٥', true]);
    expect(toPlain('١٢٫٥', 'either', 'ar-EG-u-nu-arab')).toBe('12.5');
  });

  it('follows the decimal-mark setting when it is not "either"', () => {
    expect([parseNumber('12,5', 'comma', 'en-US'), parseNumber('12.5', 'comma', 'en-US')]).toEqual([12.5, null]);
    expect([parseNumber('12.5', 'point', 'de-DE'), parseNumber('12,5', 'point', 'de-DE')]).toEqual([12.5, null]);
    // A grouping mark of the other kind is still a group.
    expect([parseNumber('1.234,5', 'comma'), parseNumber('1,234.5', 'point')]).toEqual([1234.5, 1234.5]);
  });

  it("saves typed numbers plainly, and shows saved ones the reader's way", () => {
    expect([
      toPlain('12,5', 'either', 'de-DE'),
      toPlain('1.234,5', 'either', 'de-DE'),
      toPlain('20', 'either', 'de-DE')
    ]).toEqual(['12.5', '1234.5', '20']);
    // Not a number: kept as typed, for the field's check.
    expect(toPlain('12,5,3', 'either', 'de-DE')).toBe('12,5,3');
    // Digits even for a tiny number, never "1e-7".
    expect([toPlain('0,0000001', 'either', 'de-DE'), toPlain('0.00000000001', 'point', 'en')]).toEqual([
      '0.0000001',
      '0'
    ]);
    expect([
      forTyping('12.5', 'either', 'de-DE'),
      forTyping('12.5', 'either', 'en-US'),
      forTyping('12.5', 'point', 'de-DE')
    ]).toEqual(['12,5', '12.5', '12.5']);
    expect(forTyping('12.5', 'comma', 'en-US')).toBe('12,5');
    expect(forTyping('abc', 'either', 'de-DE')).toBe('abc');
  });

  it('writes dates saved as YYYY-MM-DD as that day, wherever the reader is', () => {
    formatLocale.set('en-US');
    expect(formatDate('2026-10-08')).toBe('Thursday, October 8, 2026');
    formatLocale.set('de-DE');
    expect(formatDate('2026-10-08', { dateStyle: 'medium' })).toBe('08.10.2026');
    expect([formatDate(''), formatDate(undefined), formatDate('not a date')]).toEqual(['', '', '']);
  });

  it("writes temperatures in the reader's scale, with a no-break space", () => {
    formatLocale.set('de-DE');
    expect(formatTemperature(1240, 'C')).toBe('1240 °C');
    formatLocale.set('en-US');
    expect(formatTemperature(1222, 'F')).toBe('2232 °F');
  });
});
