import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { REGION_CODES, formatLocaleFor, regionFor } from '../../../lib/regions';
import { PAGE_LANGUAGE } from '../i18n/language';
import { formatLocale, listLocale, typedDecimalMark } from '../shared/format';
import { saveRegion } from '../shared/library-info';
import { ConeSystem, Density, PreferencesService, TemperatureScale } from './preferences.service';

/** The region the browser's own language names (en-US is the US), for defaults until a region is chosen. */
export function browserRegion(languages: readonly string[] = navigator.languages ?? [navigator.language]): string {
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

  /** The language of the page, from its URL. */
  readonly language = signal(inject(PAGE_LANGUAGE));
  /** The region chosen in Settings, or else the browser's, for defaults only. */
  readonly region = computed(() => this.preferences.region() || browserRegion());
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
    // The library lists what is sold where the potter works, once a region is chosen.
    effect(() => {
      const library = regionFor(this.preferences.region())?.library;
      if (library) saveRegion(library);
    });
  }
}
