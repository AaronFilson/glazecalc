import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PAGE_LANGUAGE } from '../i18n/language';
import { formatLocale, listLocale, listOf, typedDecimalMark } from '../shared/format';
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
    expect(formatLocale()).toBe('en-US');
    expect(listOf(['USA', 'Vereinigtes Königreich', 'EU'])).toBe('USA, Vereinigtes Königreich und EU');
  });

  it("takes a region from the browser's language, for defaults only", () => {
    expect(browserRegion(['de-AT', 'en'])).toBe('AT');
    expect(browserRegion(['en', 'fr-FR'])).toBe('FR');
    expect(browserRegion(['en', 'ja-JP'])).toBe('JP');
    expect(browserRegion(['en', 'ko-KR'])).toBe('KR');
    expect(browserRegion(['en', 'th-TH'])).toBe('');
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
      'en-US',
      'F',
      'orton',
      'en-US'
    ]);
    expect(chosenRegion()).toBe('US');
    // Followed for the visit, not written as the library's own choice.
    expect(localStorage.getItem('region')).toBeNull();
    preferences.remember('region', 'DE');
    TestBed.tick();
    expect([locale.locale(), locale.temperature(), locale.cones(), formatLocale()]).toEqual([
      'en-DE',
      'C',
      'temperature',
      'en-DE'
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
      'en-GB',
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
      'en-JP',
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
      'en-TR',
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
      'de-DE',
      'C',
      'temperature'
    ]);
  });

  it('shows English in °C and Orton cones, with no region', () => {
    const { locale } = firstRender('en');
    expect([locale.region(), locale.locale(), locale.temperature(), locale.cones()]).toEqual(['', 'en', 'C', 'orton']);
  });

  it('switches to the browser’s own settings afterwards', () => {
    const { state, locale } = firstRender('de');
    state.set(false);
    TestBed.tick();
    expect([locale.region(), locale.locale(), locale.temperature(), formatLocale()]).toEqual([
      'US',
      'de-US',
      'F',
      'de-US'
    ]);
  });

  it('does not read the browser’s languages', () => {
    const { locale } = firstRender('fr');
    localStorage.clear();
    expect(locale.region()).toBe('FR');
  });
});

describe('prerenderRegion', () => {
  it('names the country a language is mainly written in', () => {
    expect(['de', 'fr', 'el', 'nl', 'pt-PT', 'ga', 'sv'].map(prerenderRegion)).toEqual([
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
    expect(['zh-Hant', 'zh-Hans', 'ko', 'ja', 'ja-XC'].map(prerenderRegion)).toEqual(['TW', 'CN', 'KR', 'JP', 'JP']);
  });

  it('names none for English, a pseudo-locale, or a language no region lists', () => {
    expect(['en', 'en-XA', 'ar', 'ar-XB'].map(prerenderRegion)).toEqual(['', '', '', '']);
  });
});
