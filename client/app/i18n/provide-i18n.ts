import { APP_BASE_HREF } from '@angular/common';
import { EnvironmentProviders, Provider, inject, isDevMode, provideAppInitializer } from '@angular/core';
import { ResolveFn, TitleStrategy } from '@angular/router';
import {
  TRANSLOCO_SCOPE,
  TranslocoScope,
  TranslocoService,
  provideTransloco,
  translate,
  provideTranslocoMissingHandler,
  provideTranslocoTranspiler
} from '@jsverse/transloco';
import { firstValueFrom, forkJoin, map, of } from 'rxjs';
import { LANGUAGE_CODES, languageFor } from '../../../lib/regions/languages';
import { useCodedMessages } from './coded';
import { IcuTranspiler } from './icu-transpiler';
import { PAGE_LANGUAGE, baseHrefFor, languageOfPath } from './language';
import { FileLoader } from './loader';
import { MissingKey } from './missing';
import { TranslatedTitles } from './titles';

/**
 * The page's language, from its URL, and its messages (docs/adr/0013-translations.md).
 * The language is fixed for the life of the page: changing it opens the same
 * page under the other language's path, so the router's base is that path and
 * every link in the app stays as it is written (/recipe is /de/recipe in German).
 */
export function provideI18n(language = languageOfPath(location.pathname)): Array<Provider | EnvironmentProviders> {
  return [
    provideTransloco({
      config: {
        availableLangs: [...LANGUAGE_CODES],
        defaultLang: language,
        // A message not yet translated shows the English.
        fallbackLang: 'en',
        missingHandler: { useFallbackTranslation: true, logMissingKey: false },
        reRenderOnLangChange: false,
        prodMode: !isDevMode()
      },
      loader: FileLoader
    }),
    // After provideTransloco, which provides its own defaults.
    provideTranslocoTranspiler(IcuTranspiler),
    provideTranslocoMissingHandler(MissingKey),
    { provide: PAGE_LANGUAGE, useValue: language },
    { provide: APP_BASE_HREF, useValue: baseHrefFor(language) },
    { provide: TitleStrategy, useExisting: TranslatedTitles },
    // The app's own messages (the menu, the shared parts) before the first page is drawn.
    provideAppInitializer(() => {
      const transloco = inject(TranslocoService);
      transloco.setActiveLang(language);
      const root = document.documentElement;
      root.lang = language;
      root.dir = languageFor(language)?.dir ?? 'ltr';
      // In another language, the server's and the chemistry's messages too, which come with their English.
      const coded =
        language === 'en' ? [] : ['server', 'chemistry'].map((scope) => transloco.load(`${scope}/${language}`));
      return firstValueFrom(forkJoin([transloco.load(language), ...coded])).then(() => {
        useCodedMessages(transloco);
        // The description search results show, as the server writes it too (server/lib/pages.ts).
        document.querySelector('meta[name="description"]')?.setAttribute('content', translate('meta.description'));
      });
    })
  ];
}

/**
 * Translations of words whose English is in the app's data (the standard
 * records, who to call): an English page shows the data as it is, so these
 * load only for other languages.
 */
const TRANSLATIONS_OF_DATA = ['records', 'safety'];

const scopeName = (scope: TranslocoScope): string => (typeof scope === 'string' ? scope : (scope?.scope ?? ''));

/**
 * A route's own messages (provideTranslocoScope('recipe') in its providers),
 * loaded before it opens, so every message on the page, and in its code, is
 * there from the first draw.
 */
export const scopeTranslations: ResolveFn<boolean> = () => {
  const transloco = inject(TranslocoService);
  const scopes = ([inject(TRANSLOCO_SCOPE, { optional: true }) ?? []].flat() as TranslocoScope[])
    .map(scopeName)
    .filter(Boolean);
  const language = transloco.getActiveLang();
  const needed = scopes.filter((scope) => language !== 'en' || !TRANSLATIONS_OF_DATA.includes(scope));
  if (!needed.length) return of(true);
  return forkJoin(needed.map((scope) => transloco.load(`${scope}/${language}`))).pipe(map(() => true));
};
