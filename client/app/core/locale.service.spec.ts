import { TestBed } from '@angular/core/testing';
import { formatLocale, typedDecimalMark } from '../shared/format';
import { chosenRegion } from '../shared/library-info';
import { testProviders } from '../testing/test-providers';
import { LocaleService, browserRegion } from './locale.service';
import { PreferencesService } from './preferences.service';

describe('LocaleService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: testProviders() });
  });
  afterEach(() => {
    formatLocale.set('en');
    typedDecimalMark.set('either');
  });

  it("takes a region from the browser's language, for defaults only", () => {
    expect(browserRegion(['de-AT', 'en'])).toBe('AT');
    expect(browserRegion(['en', 'fr-FR'])).toBe('FR');
    expect(browserRegion(['en', 'ja-JP'])).toBe('');
    expect(browserRegion(['not a tag'])).toBe('');
  });

  it('sets the format, the temperature scale and the cone system from the region, until chosen', () => {
    const preferences = TestBed.inject(PreferencesService);
    const locale = TestBed.inject(LocaleService);
    preferences.region.set('US');
    TestBed.tick();
    expect([locale.locale(), locale.temperature(), locale.cones(), formatLocale()]).toEqual([
      'en-US',
      'F',
      'orton',
      'en-US'
    ]);
    expect(chosenRegion()).toBe('US');
    preferences.region.set('DE');
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
    preferences.temperature.set('F');
    preferences.cones.set('orton');
    preferences.format.set('en-GB');
    preferences.decimalMark.set('point');
    TestBed.tick();
    expect([locale.locale(), locale.temperature(), locale.cones(), typedDecimalMark()]).toEqual([
      'en-GB',
      'F',
      'orton',
      'point'
    ]);
  });
});
