import { formatLocaleFor } from '../../../lib/regions';
import { IcuTranspiler } from '../i18n/icu-transpiler';
import { formatLocale } from './format';
import { keepsWesternDigits, textDigitsFor, withTextDigits } from './text-digits';

const message = (language: string, value: string, params: Record<string, unknown> = {}, key = 'x') => {
  const transpiler = new IcuTranspiler();
  transpiler.onLangChanged(language);
  return transpiler.transpile({ value, params, translation: {}, key });
};

describe("a Bengali page's figures", () => {
  afterEach(() => formatLocale.set('en'));

  it('are in the digits its numbers are formatted in: Bengali where usual, 0–9 where the reader chose them', () => {
    expect(textDigitsFor('bn', formatLocaleFor('bn', 'BD', 'auto', 'gregory', 'auto'))).toBe('beng');
    expect(textDigitsFor('bn', formatLocaleFor('bn', '', 'auto', 'gregory', 'auto'))).toBe('beng');
    expect(textDigitsFor('bn', formatLocaleFor('bn', 'BD', 'auto', 'gregory', 'western'))).toBeNull();
    // A number format written in 0–9, chosen in Settings, wins too.
    expect(textDigitsFor('bn', formatLocaleFor('bn', 'BD', 'en-US', 'gregory', 'auto'))).toBeNull();
    // Only Bengali: Arabic in Egypt and Hindi with its own digits chosen keep their text's 0–9.
    expect(textDigitsFor('ar', formatLocaleFor('ar', 'EG', 'auto', 'gregory', 'auto'))).toBeNull();
    expect(textDigitsFor('hi', formatLocaleFor('hi', 'IN', 'auto', 'gregory', 'native'))).toBeNull();
    expect(textDigitsFor('ur', formatLocaleFor('ur', 'PK', 'auto', 'gregory', 'native'))).toBeNull();
    expect(textDigitsFor('en', 'en-US')).toBeNull();
  });

  it("are written in Bengali digits, but for formulas, codes, a name's number and addresses", () => {
    const beng = (text: string) => withTextDigits(text, 'beng');
    expect(beng('1222 °C তাপমাত্রায় 3টি টাইল, 10–60%।')).toBe('১২২২ °C তাপমাত্রায় ৩টি টাইল, ১০–৬০%।');
    expect(beng('জরুরি নম্বর 999, সময় 20:00, 14 অক্টোবর 2026।')).toBe('জরুরি নম্বর ৯৯৯, সময় ২০:০০, ১৪ অক্টোবর ২০২৬।');
    expect(beng('Orton শঙ্কু 06, আপেক্ষিক গুরুত্ব 1.45 (1,234.5)')).toBe(
      'Orton শঙ্কু ০৬, আপেক্ষিক গুরুত্ব ১.৪৫ (১,২৩৪.৫)'
    );
    // Formulas and codes touching a Latin letter, and a name's or a standard's number after its Latin word.
    expect(beng('Al2O3, K2O ও 6SiO2; H361fd, FFP2, N95; SK 6a; 84/500/EEC।')).toBe(
      'Al2O3, K2O ও 6SiO2; H361fd, FFP2, N95; SK 6a; 84/500/EEC।'
    );
    expect(beng('Ferro 3134, ISO 6486-2 ও (EC) No 1272/2008 দেখুন, 5 বার।')).toBe(
      'Ferro 3134, ISO 6486-2 ও (EC) No 1272/2008 দেখুন, ৫ বার।'
    );
    // A unit is not a name: the figure after it is the text's.
    expect(beng('1222 °C 10 মিনিট')).toBe('১২২২ °C ১০ মিনিট');
    // Web and email addresses.
    expect(beng('https://example.com/a1 বা help2@example.com, 7 দিন')).toBe(
      'https://example.com/a1 বা help2@example.com, ৭ দিন'
    );
    expect(withTextDigits('1222 °C', null)).toBe('1222 °C');
  });

  it("are a message's own figures in Bengali digits; its values are left as typed, its numbers formatted", () => {
    formatLocale.set(formatLocaleFor('bn', 'BD', 'auto', 'gregory', 'auto'));
    expect(message('bn', 'চুল্লি 1222 °C পর্যন্ত গরম করুন।')).toBe('চুল্লি ১২২২ °C পর্যন্ত গরম করুন।');
    expect(
      message('bn', 'রেসিপি {name}: 3টি স্তর, {count, plural, one {#টি উপাদান} other {#টি উপাদান}}।', {
        name: 'Celadon 12',
        count: 15
      })
    ).toBe('রেসিপি Celadon 12: ৩টি স্তর, ১৫টি উপাদান।');
    expect(message('bn', '<b>10 g</b> সিলিকা, Al2O3।')).toContain('১০ g');
    // What shows how 0–9 are written keeps them.
    expect(keepsWesternDigits('account.settings.digits.western.label')).toBe(true);
    expect(keepsWesternDigits('settings.decimalMark.either.example')).toBe(true);
    expect(keepsWesternDigits('settings.digits.auto.label')).toBe(false);
    expect(keepsWesternDigits(undefined)).toBe(false);
    expect(message('bn', 'পশ্চিমা অঙ্ক, 0–9', {}, 'settings.digits.western.label')).toBe('পশ্চিমা অঙ্ক, 0–9');

    // The reader chose 0–9: every figure is 0–9.
    formatLocale.set(formatLocaleFor('bn', 'BD', 'auto', 'gregory', 'western'));
    expect(message('bn', 'চুল্লি 1222 °C পর্যন্ত, {count, number} বার।', { count: 15 })).toBe(
      'চুল্লি 1222 °C পর্যন্ত, 15 বার।'
    );
  });

  it('stay 0–9 on every other page, Arabic in Egypt and Urdu among them', () => {
    formatLocale.set(formatLocaleFor('ar', 'EG', 'auto', 'gregory', 'auto'));
    expect(message('ar', 'حتى 1222 °C')).toBe('حتى ' + '⁦' + '1222 °C' + '⁩');
    formatLocale.set(formatLocaleFor('ur', 'PK', 'auto', 'gregory', 'auto'));
    expect(message('ur', 'بھٹی 1222 °C تک۔')).toContain('1222 °C');
    formatLocale.set('en-US');
    expect(message('en', 'Fire to 1222 °C.')).toBe('Fire to 1222 °C.');
  });
});
