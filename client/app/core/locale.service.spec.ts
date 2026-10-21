import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { REGIONS } from '../../../lib/regions';
import { PAGE_LANGUAGE } from '../i18n/language';
import { fixed, formatDate, formatLocale, listLocale, listOf, typedDecimalMark } from '../shared/format';
import { chosenRegion } from '../shared/library-info';
import { testProviders } from '../testing/test-providers';
import { FIRST_RENDER, prerenderRegion } from './first-render';
import { LocaleService, browserRegion } from './locale.service';
import { PreferencesService } from './preferences.service';

describe('LocaleService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: testProviders() });
  });
  afterEach(() => {
    formatLocale.set('en');
    listLocale.set('en');
    typedDecimalMark.set('either');
  });

  it('joins lists in the page’s language, whatever the format of numbers', () => {
    TestBed.overrideProvider(PAGE_LANGUAGE, { useValue: 'de' });
    TestBed.inject(PreferencesService).remember('format', 'en-US');
    TestBed.inject(LocaleService);
    TestBed.tick();
    expect(formatLocale()).toBe('en-US-u-ca-gregory-nu-latn');
    expect(listOf(['USA', 'Vereinigtes Königreich', 'EU'])).toBe('USA, Vereinigtes Königreich und EU');
  });

  it('shows dates in the Gregorian calendar by default, a Thai page too', () => {
    TestBed.overrideProvider(PAGE_LANGUAGE, { useValue: 'th' });
    TestBed.inject(PreferencesService).remember('region', 'TH');
    TestBed.inject(LocaleService);
    TestBed.tick();
    expect(formatLocale()).toBe('th-TH-u-ca-gregory-nu-latn');
    expect(formatDate('2026-10-17', { dateStyle: 'long' })).toContain('2026');
  });

  it('shows dates in the Thai Buddhist era when chosen, numbers as before', () => {
    TestBed.overrideProvider(PAGE_LANGUAGE, { useValue: 'th' });
    const preferences = TestBed.inject(PreferencesService);
    preferences.remember('region', 'TH');
    preferences.remember('calendar', 'buddhist');
    TestBed.inject(LocaleService);
    TestBed.tick();
    expect(formatLocale()).toBe('th-TH-u-ca-buddhist-nu-latn');
    expect(formatDate('2026-10-17', { dateStyle: 'long' })).toBe('17 ตุลาคม 2569');
    expect(formatDate('2026-10-17', { dateStyle: 'medium' })).toContain('2569');
    expect(fixed(12345.6, 1)).toBe('12,345.6');
  });

  it('shows dates in Japanese eras when chosen, in Japanese or in English', () => {
    TestBed.overrideProvider(PAGE_LANGUAGE, { useValue: 'ja' });
    const preferences = TestBed.inject(PreferencesService);
    preferences.remember('region', 'JP');
    preferences.remember('calendar', 'japanese');
    TestBed.inject(LocaleService);
    TestBed.tick();
    expect(formatDate('2026-10-17', { dateStyle: 'long' })).toBe('令和8年10月17日');
    preferences.remember('format', 'en-US');
    TestBed.tick();
    expect(formatDate('2026-10-17', { dateStyle: 'long' })).toBe('October 17, 8 Reiwa');
    preferences.remember('calendar', 'gregory');
    TestBed.tick();
    expect(formatDate('2026-10-17', { dateStyle: 'long' })).toBe('October 17, 2026');
  });

  it('shows numbers in the digits usual where the potter is, 0–9 or the language’s own when chosen', () => {
    const preferences = TestBed.inject(PreferencesService);
    preferences.remember('format', 'ar-EG');
    TestBed.inject(LocaleService);
    TestBed.tick();
    // Arabic in Egypt writes Arabic-Indic digits, and names them, whatever the browser's own data says.
    expect(formatLocale()).toBe('ar-EG-u-ca-gregory-nu-arab');
    expect(fixed(12345.5, 1)).toBe('١٢٬٣٤٥٫٥');
    preferences.remember('digits', 'western');
    TestBed.tick();
    expect([formatLocale(), fixed(12345.5, 1)]).toEqual(['ar-EG-u-ca-gregory-nu-latn', '12,345.5']);
    // Hindi in India writes 0–9 as usual, in Indian groups; Devanagari when the language's own are chosen.
    preferences.remember('format', 'hi-IN');
    preferences.remember('digits', 'native');
    TestBed.tick();
    expect([formatLocale(), fixed(1234567.5, 1)]).toEqual(['hi-IN-u-ca-gregory-nu-deva', '१२,३४,५६७.५']);
    preferences.remember('digits', 'auto');
    TestBed.tick();
    expect(fixed(1234567.5, 1)).toBe('12,34,567.5');
    // Marathi writes Devanagari as usual; Tamil and Kannada 0–9, and their own digits when chosen. Kannada's
    // groups are CLDR's, in threes, unlike the other Indian languages' (pinned, so a change of data is seen).
    preferences.remember('digits', 'auto');
    preferences.remember('format', 'mr-IN');
    TestBed.tick();
    expect([formatLocale(), fixed(1234567.5, 1)]).toEqual(['mr-IN-u-ca-gregory-nu-deva', '१२,३४,५६७.५']);
    preferences.remember('format', 'ta-IN');
    TestBed.tick();
    expect([formatLocale(), fixed(1234567.5, 1)]).toEqual(['ta-IN-u-ca-gregory-nu-latn', '12,34,567.5']);
    preferences.remember('format', 'kn-IN');
    TestBed.tick();
    expect([formatLocale(), fixed(1234567.5, 1)]).toEqual(['kn-IN-u-ca-gregory-nu-latn', '1,234,567.5']);
    preferences.remember('digits', 'native');
    TestBed.tick();
    expect(fixed(1234567.5, 1)).toBe('೧,೨೩೪,೫೬೭.೫');
    preferences.remember('format', 'ta-IN');
    TestBed.tick();
    expect(fixed(1234567.5, 1)).toBe('௧௨,௩௪,௫௬௭.௫');
    // A language with no digits of its own keeps 0–9.
    preferences.remember('format', 'en-IN');
    preferences.remember('digits', 'native');
    TestBed.tick();
    expect(formatLocale()).toBe('en-IN-u-ca-gregory-nu-latn');
  });

  it("takes a region from the browser's language, for defaults only", () => {
    expect(browserRegion(['de-AT', 'en'])).toBe('AT');
    expect(browserRegion(['en', 'fr-FR'])).toBe('FR');
    expect(browserRegion(['en', 'ja-JP'])).toBe('JP');
    expect(browserRegion(['en', 'ko-KR'])).toBe('KR');
    expect(browserRegion(['en', 'th-TH'])).toBe('TH');
    expect(browserRegion(['en', 'ar-EG'])).toBe('EG');
    // Saudi Arabia is not a region (the owner's decision, 2026-10-20).
    expect(browserRegion(['en', 'ar-SA'])).toBe('');
    expect(browserRegion(['tr-TR', 'en'])).toBe('TR');
    expect(browserRegion(['not a tag'])).toBe('');
  });

  it('sets the format, the temperature scale and the cone system from the region, until chosen', () => {
    // The choice is on this browser from an earlier visit.
    localStorage.setItem('preferredRegion', 'US');
    const preferences = TestBed.inject(PreferencesService);
    const locale = TestBed.inject(LocaleService);
    TestBed.tick();
    expect([locale.locale(), locale.temperature(), locale.cones(), formatLocale()]).toEqual([
      'en-US-u-ca-gregory-nu-latn',
      'F',
      'orton',
      'en-US-u-ca-gregory-nu-latn'
    ]);
    expect(chosenRegion()).toBe('US');
    // Followed for the visit, not written as the library's own choice.
    expect(localStorage.getItem('region')).toBeNull();
    preferences.remember('region', 'DE');
    TestBed.tick();
    expect([locale.locale(), locale.temperature(), locale.cones(), formatLocale()]).toEqual([
      'en-DE-u-ca-gregory-nu-latn',
      'C',
      'temperature',
      'en-DE-u-ca-gregory-nu-latn'
    ]);
    // The library lists what is sold in the EU.
    expect(chosenRegion()).toBe('EU');
    // Chosen, they hold whatever the region.
    preferences.remember('temperature', 'F');
    preferences.remember('cones', 'orton');
    preferences.remember('format', 'en-GB');
    preferences.remember('decimalMark', 'point');
    TestBed.tick();
    expect([locale.locale(), locale.temperature(), locale.cones(), typedDecimalMark()]).toEqual([
      'en-GB-u-ca-gregory-nu-latn',
      'F',
      'orton',
      'point'
    ]);
    // SK cones (JIS R 8101) are a third choice, and hold like the others.
    preferences.remember('cones', 'sk');
    TestBed.tick();
    expect(locale.cones()).toBe('sk');
    expect(preferences.cones()).toBe('sk');
  });

  it('fires by SK cones and reads density in Baumé in Japan, until chosen, and lists the US library', () => {
    const preferences = TestBed.inject(PreferencesService);
    const locale = TestBed.inject(LocaleService);
    preferences.remember('region', 'JP');
    TestBed.tick();
    expect([locale.locale(), locale.temperature(), locale.cones(), locale.density()]).toEqual([
      'en-JP-u-ca-gregory-nu-latn',
      'C',
      'sk',
      'baume'
    ]);
    expect(chosenRegion()).toBe('US');
    // Orton cones and temperature are a setting away.
    preferences.remember('cones', 'orton');
    TestBed.tick();
    expect(locale.cones()).toBe('orton');
    preferences.remember('cones', 'temperature');
    preferences.remember('density', 'sg');
    TestBed.tick();
    expect([locale.cones(), locale.density()]).toEqual(['temperature', 'sg']);
  });

  it('fires by temperature and reads specific gravity in Türkiye, until chosen, and lists the EU library', () => {
    const preferences = TestBed.inject(PreferencesService);
    const locale = TestBed.inject(LocaleService);
    preferences.remember('region', 'TR');
    TestBed.tick();
    expect([locale.locale(), locale.temperature(), locale.cones(), locale.density()]).toEqual([
      'en-TR-u-ca-gregory-nu-latn',
      'C',
      'temperature',
      'sg'
    ]);
    expect(chosenRegion()).toBe('EU');
    // Orton cones and Baumé are a setting away.
    preferences.remember('cones', 'orton');
    preferences.remember('density', 'baume');
    TestBed.tick();
    expect([locale.cones(), locale.density()]).toEqual(['orton', 'baume']);
  });
});

describe('LocaleService during the first render', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: testProviders() });
  });
  afterEach(() => {
    formatLocale.set('en');
    listLocale.set('en');
    typedDecimalMark.set('either');
  });

  /** The prerender's page for a language, with this browser holding settings the prerender must not see. */
  const firstRender = (language: string) => {
    const state = signal(true);
    TestBed.overrideProvider(FIRST_RENDER, { useValue: state });
    TestBed.overrideProvider(PAGE_LANGUAGE, { useValue: language });
    localStorage.setItem('preferredRegion', 'US');
    localStorage.setItem('temperature', 'F');
    return { state, locale: TestBed.inject(LocaleService) };
  };

  it('uses the language’s own region and ignores what this browser holds', () => {
    const { locale } = firstRender('de');
    expect([locale.region(), locale.locale(), locale.temperature(), locale.cones()]).toEqual([
      'DE',
      'de-DE-u-ca-gregory-nu-latn',
      'C',
      'temperature'
    ]);
  });

  it('shows English in °C and Orton cones, with no region', () => {
    const { locale } = firstRender('en');
    expect([locale.region(), locale.locale(), locale.temperature(), locale.cones()]).toEqual([
      '',
      'en-u-ca-gregory-nu-latn',
      'C',
      'orton'
    ]);
  });

  it('switches to the browser’s own settings afterwards', () => {
    const { state, locale } = firstRender('de');
    state.set(false);
    TestBed.tick();
    expect([locale.region(), locale.locale(), locale.temperature(), formatLocale()]).toEqual([
      'US',
      'de-US-u-ca-gregory-nu-latn',
      'F',
      'de-US-u-ca-gregory-nu-latn'
    ]);
  });

  it('writes the usual digits until the first render is done, then the ones chosen on this browser', () => {
    localStorage.setItem('digits', 'native');
    const { state, locale } = firstRender('th');
    expect(locale.locale()).toBe('th-TH-u-ca-gregory-nu-latn');
    state.set(false);
    TestBed.tick();
    expect([locale.locale(), fixed(12.5, 1)]).toEqual(['th-US-u-ca-gregory-nu-thai', '๑๒.๕']);
  });

  it('does not read the browser’s languages', () => {
    const { locale } = firstRender('fr');
    localStorage.clear();
    expect(locale.region()).toBe('FR');
  });
});

describe('prerenderRegion', () => {
  it('names the country a language is mainly written in', () => {
    expect(['de', 'fr', 'el', 'nl', 'pt-PT', 'ga', 'sv'].map((language) => prerenderRegion(language))).toEqual([
      'DE',
      'FR',
      'GR',
      'NL',
      'PT',
      'IE',
      'SE'
    ]);
  });

  it('finds a language listed with its script, as the region data lists it', () => {
    // Taiwan comes before Hong Kong, the other region whose first language is Traditional Chinese; China is
    // the one whose first language is Simplified.
    expect(['zh-Hant', 'zh-Hans', 'ko', 'ja', 'ja-XC'].map((language) => prerenderRegion(language))).toEqual([
      'TW',
      'CN',
      'KR',
      'JP',
      'JP'
    ]);
    expect(['th', 'id', 'vi'].map((language) => prerenderRegion(language))).toEqual(['TH', 'ID', 'VN']);
  });

  it('names none for English, a pseudo-locale, or a language no region lists', () => {
    // Arabic is Egypt's now (below); its pseudo-locale is English.
    expect(['en', 'en-XA', 'ar-XB', 'xx'].map((language) => prerenderRegion(language))).toEqual(['', '', '', '']);
  });

  it('writes Arabic for Egypt, Hindi and Tamil for India, Urdu for Pakistan and Bengali for Bangladesh', () => {
    // The regions as they may be once South Asia and the Arabic-speaking countries are added: Singapore and Brunei
    // list Tamil and Bengali first, or before India and Bangladesh do.
    const planned = [
      ...REGIONS,
      { code: 'BN', languages: ['ms', 'bn'] },
      { code: 'AE', languages: ['ar', 'en'] },
      { code: 'IN', languages: ['hi', 'en', 'bn', 'ta', 'ur'] },
      { code: 'PK', languages: ['ur', 'en'] },
      { code: 'BD', languages: ['bn'] },
      { code: 'EG', languages: ['ar'] }
    ];
    expect(['ar', 'hi', 'ur', 'bn', 'ta'].map((language) => prerenderRegion(language, planned))).toEqual([
      'EG',
      'IN',
      'PK',
      'BD',
      'IN'
    ]);
    // Now that they are regions (docs/south-asia-mena-plan.md), Glazecalc's own regions give the same: not
    // Singapore for Tamil, nor Morocco or Algeria for French, which they list after Arabic.
    expect(['ar', 'hi', 'ur', 'bn', 'ta'].map((language) => prerenderRegion(language))).toEqual([
      'EG',
      'IN',
      'PK',
      'BD',
      'IN'
    ]);
    // India's other languages are written for India, Telugu and the rest of them with no region listing them
    // yet; Tamil stays India's though Sri Lanka lists it too. Nepali and Sinhala are written for Nepal and
    // Sri Lanka, regions since round 8 (docs/south-asia-mena-plan.md, C3).
    expect(['ta', 'mr', 'kn', 'te', 'gu', 'ml', 'pa', 'or'].map((language) => prerenderRegion(language))).toEqual(
      Array(8).fill('IN')
    );
    expect(['ne', 'si'].map((language) => prerenderRegion(language))).toEqual(['NP', 'LK']);
    // What the live languages are written for stays as it was.
    for (const regions of [planned, REGIONS]) {
      expect(
        ['de', 'el', 'zh-Hant', 'ja', 'th', 'fr', 'en'].map((language) => prerenderRegion(language, regions))
      ).toEqual(['DE', 'GR', 'TW', 'JP', 'TH', 'FR', '']);
    }
  });
});
