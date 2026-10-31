import { readFileSync } from 'node:fs';
import { expect } from 'chai';
import fallback from '../../lib/regions/locale-fallback.js';
import {
  DATE_OPTIONS,
  FALLBACK_LOCALES,
  LIST_OPTIONS,
  NATIVE_SYSTEMS,
  OUT,
  localeFallbackFile
} from '../../scripts/locale-fallback.mjs';

// The data a browser without Nepali, Sinhala, Odia or Punjabi Intl data writes those
// languages from (lib/regions/locale-fallback.js, made by scripts/locale-fallback.mjs) is
// what Node's Intl writes now, so a Node or ICU upgrade cannot leave the client writing
// otherwise than the prerendered page without a test failing.
describe('the locale data for languages a browser lacks (scripts/locale-fallback.mjs)', () => {
  before(() => fallback.setBrowserSupport(() => false));
  after(() => fallback.setBrowserSupport(null));

  it('is the file the script writes from this Node', async () => {
    expect(readFileSync(OUT, 'utf8')).to.equal(await localeFallbackFile());
  });

  // Every month and weekday, single and double figures, morning, noon, afternoon and midnight.
  const dates: Date[] = [];
  for (let month = 0; month < 12; month++)
    dates.push(new Date(2026, month, 1 + ((month * 3) % 28), month * 2, month * 5));
  for (let day = 1; day <= 7; day++) dates.push(new Date(2027, 1, day, 12, 0));
  dates.push(new Date(2009, 0, 5, 0, 7), new Date(2031, 11, 31, 23, 59));
  const numbers = [0, 7, 12.5, -12.25, 999, 1234, 12345.6, 1234567.5, 123456789.125, 0.005];

  for (const [language, base] of Object.entries(FALLBACK_LOCALES)) {
    for (const system of ['latn', ...NATIVE_SYSTEMS[language]!]) {
      const locale = new Intl.Locale(base, { calendar: 'gregory', numberingSystem: system }).toString();

      it('writes ' + locale + "'s dates as Intl does", () => {
        for (const options of DATE_OPTIONS) {
          const intl = new Intl.DateTimeFormat(locale, options);
          const ours = fallback.dateTimeFormat(locale, options);
          expect(ours, JSON.stringify(options)).not.to.be.instanceOf(Intl.DateTimeFormat);
          for (const date of dates) expect(ours.format(date), JSON.stringify(options)).to.equal(intl.format(date));
        }
      });

      it('writes ' + locale + "'s numbers, percents and prices as Intl does", () => {
        const sets: Intl.NumberFormatOptions[] = [
          { maximumFractionDigits: 3 },
          { minimumFractionDigits: 2, maximumFractionDigits: 2 },
          { useGrouping: 'min2', maximumFractionDigits: 2, signDisplay: 'negative' } as Intl.NumberFormatOptions,
          { style: 'percent' }
        ];
        for (const options of sets) {
          const intl = new Intl.NumberFormat(locale, options);
          const ours = fallback.numberFormat(locale, options);
          expect(ours).not.to.be.instanceOf(Intl.NumberFormat);
          for (const value of numbers) expect(ours.format(value), JSON.stringify(options)).to.equal(intl.format(value));
        }
        for (const currency of Object.keys(fallback.LOCALE_FALLBACK_DATA.languages[language]!.numbers.latn.currency)) {
          const options = { style: 'currency', currency } as const;
          const intl = new Intl.NumberFormat(locale, options);
          const ours = fallback.numberFormat(locale, options);
          for (const value of [0, 2.5, 1234.5, 1234567])
            expect(ours.format(value), currency).to.equal(intl.format(value));
        }
      });
    }

    it('joins ' + base + "'s lists as Intl does", () => {
      for (const options of LIST_OPTIONS) {
        const intl = new Intl.ListFormat(base, options as Intl.ListFormatOptions);
        for (const items of [[], ['a'], ['a', 'b'], ['a', 'b', 'c'], ['a', 'b', 'c', 'd', 'e']]) {
          expect(fallback.formatList(base, items, options as never), JSON.stringify(options)).to.equal(
            intl.format(items)
          );
        }
      }
    });
  }
});
