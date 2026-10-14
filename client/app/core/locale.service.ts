import { DestroyRef, Injectable, computed, effect, inject, signal } from '@angular/core';
import { REGION_CODES, formatLocaleFor, regionFor } from '../../../lib/regions';
import { PAGE_LANGUAGE } from '../i18n/language';
import { formatLocale, listLocale, typedDecimalMark } from '../shared/format';
import { followRegion, readRegion } from '../shared/library-info';
import { FIRST_RENDER, prerenderRegion } from './first-render';
import { ConeSystem, Density, PreferencesService, TemperatureScale } from './preferences.service';

/** The region the browser's own language names (en-US is the US), for defaults until a region is chosen. */
export function browserRegion(languages: readonly string[] = globalThis.navigator?.languages ?? []): string {
  for (const tag of languages) {
    try {
      const region = new Intl.Locale(tag).region;
      if (region && REGION_CODES.includes(region)) return region;
    } catch {
      // Not a language tag.
    }
  }
  return '';
}

/**
 * Where the potter works and how they read numbers, dates, temperatures and
 * firings (docs/i18n-plan.md), from Settings: the region chosen (or, until
 * then, the browser's), the number and date format, the decimal mark for
 * typing, the temperature scale and the cone system. Formatting functions in
 * shared/format.ts follow it.
 */
@Injectable({ providedIn: 'root' })
export class LocaleService {
  private readonly preferences = inject(PreferencesService);
  private readonly firstRender = inject(FIRST_RENDER);

  /** The language of the page, from its URL. */
  readonly language = signal(inject(PAGE_LANGUAGE));
  /**
   * The region chosen in Settings, or else the browser's, for defaults only. The first render, which
   * the prerendered page has to match, is in the page's language's own region (core/first-render.ts).
   */
  readonly region = computed(() =>
    this.firstRender() ? prerenderRegion(this.language()) : this.preferences.region() || browserRegion()
  );
  readonly regionInfo = computed(() => regionFor(this.region()));
  /** The locale numbers and dates are written in. */
  readonly locale = computed(() => formatLocaleFor(this.language(), this.region(), this.preferences.format()));
  /** The locale lists in a sentence are joined in: its language, as the region writes it, whatever the format chosen. */
  readonly listLocale = computed(() => formatLocaleFor(this.language(), this.region(), 'auto'));
  /** °C or °F: the one chosen, or the region's. */
  readonly temperature = computed<TemperatureScale>(
    () => this.preferences.temperature() || this.regionInfo()?.temperature || 'C'
  );
  /** Orton cones or temperature alone: the one chosen, or the region's. */
  readonly cones = computed<ConeSystem>(() => this.preferences.cones() || this.regionInfo()?.cones || 'orton');
  /** Glaze density as specific gravity, Baumé or pint weight: the one chosen, or the region's. */
  readonly density = computed<Density>(() => this.preferences.density() || this.regionInfo()?.density || 'sg');

  constructor() {
    // At once, so the first page is written right, and again on every change.
    formatLocale.set(this.locale());
    listLocale.set(this.listLocale());
    typedDecimalMark.set(this.preferences.decimalMark());
    effect(() => formatLocale.set(this.locale()));
    effect(() => listLocale.set(this.listLocale()));
    effect(() => typedDecimalMark.set(this.preferences.decimalMark()));
    // Back to the defaults when the app (or a test's injector) is torn down, so
    // the next one does not start in this one's locale.
    inject(DestroyRef).onDestroy(() => {
      formatLocale.set('en');
      listLocale.set('en');
      typedDecimalMark.set('either');
    });
    // The library lists what is sold where the potter works, once a region is chosen. This follows
    // the setting for the visit; only a choice made in the library itself is kept on the browser.
    effect(() => {
      if (this.firstRender()) return;
      const library = regionFor(this.preferences.region())?.library;
      followRegion(library ?? readRegion());
    });
  }
}
