import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanMatchFn, ResolveFn } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { marker } from '@jsverse/transloco-keys-manager/marker';
import { firstValueFrom } from 'rxjs';
import type { Material } from '../../core/models';
import { REFERENCE_LANGUAGE_LIST } from './reference-text';

// What the route of a standard material's page needs before it opens. The materials come in with the
// page (standard-materials.ts is about 150 kB of text), so each reads them by import() and the first
// page, and every other route, never carry them.

/** A name this short fits the longer description in 155 characters (meta.materialInfoLong). */
export const SHORT_NAME = 24;

const atAddress = async (route: ActivatedRouteSnapshot): Promise<Material | undefined> =>
  (await import('./standard-materials')).materialBySlug(route.paramMap.get('slug'));

/** The route is a standard material's: any other address under /materials/ is the not-found page. */
export const knownMaterial: CanMatchFn = async (_route, segments) =>
  !!(await import('./standard-materials')).materialBySlug(segments[1]?.path);

/** The material at the address (the route only matches a known one). */
export const materialOf: ResolveFn<Material> = async (route) => (await atAddress(route))!;

/**
 * The material's own notes and hazards in the page's language (/i18n/materials/de/silica.json, made by
 * scripts/material-i18n.mjs from records/), added to the language's messages as materials.<key>, where
 * referenceText finds them. Only this material's: the page prerendered in each language carries the files it
 * loads, and all 170 materials' words would be most of every page (about 120 kB). None in English, or in a
 * language the reference pages are not translated into; a file that cannot be read leaves the English.
 */
export const materialWords: ResolveFn<boolean> = async (route) => {
  const transloco = inject(TranslocoService);
  const http = inject(HttpClient);
  const language = transloco.getActiveLang();
  if (language === 'en' || !inject(REFERENCE_LANGUAGE_LIST).includes(language)) return true;
  try {
    const words = await firstValueFrom(
      http.get<Record<string, string>>(`/i18n/materials/${language}/${route.paramMap.get('slug')}.json`)
    );
    transloco.setTranslation(
      Object.fromEntries(Object.entries(words).map(([key, text]) => ['materials.' + key, text])),
      language,
      { merge: true }
    );
  } catch {
    // Each note shows its English, marked lang="en".
  }
  return true;
};

/** The values the title and description have in them (i18n/titles.ts). */
export const materialTitleParams: ResolveFn<{ name: string }> = async (route) => ({
  name: (await atAddress(route))?.name ?? ''
});

/** The description's key: the longer text where the name leaves room, so it fills a result's line. */
export const materialDescriptionKey: ResolveFn<string> = async (route) =>
  ((await atAddress(route))?.name.length ?? 0) <= SHORT_NAME
    ? marker('meta.materialInfoLong')
    : marker('meta.materialInfo');
