import { EnvironmentProviders, Injectable, Provider, inject, provideAppInitializer } from '@angular/core';
import {
  Translation,
  TranslocoLoader,
  TranslocoService,
  provideTransloco,
  provideTranslocoMissingHandler,
  provideTranslocoTranspiler
} from '@jsverse/transloco';
import { of } from 'rxjs';
import { LANGUAGE_CODES } from '../../../lib/regions/languages';
import { IcuTranspiler } from '../i18n/icu-transpiler';
import { MissingKey } from '../i18n/missing';
import en from '../../public/i18n/en.json';
import site from '../../public/i18n/site/en.json';
import account from '../../public/i18n/account/en.json';
import library from '../../public/i18n/library/en.json';
import notebook from '../../public/i18n/notebook/en.json';
import recipe from '../../public/i18n/recipe/en.json';
import guides from '../../public/i18n/guides/en.json';
import safety from '../../public/i18n/safety/en.json';
import regions from '../../public/i18n/regions/en.json';
import records from '../../public/i18n/records/en.json';

/** The English files the app loads (client/public/i18n), by the path Transloco asks for. */
export const ENGLISH: Record<string, Translation> = {
  en,
  'site/en': site,
  'account/en': account,
  'library/en': library,
  'notebook/en': notebook,
  'recipe/en': recipe,
  'guides/en': guides,
  'safety/en': safety,
  'regions/en': regions,
  'records/en': records
};

@Injectable()
class EnglishLoader implements TranslocoLoader {
  getTranslation(path: string) {
    return of(ENGLISH[path] ?? {});
  }
}

/**
 * The app's messages as the app has them, every part loaded before a test
 * starts: a key with no English stops the test (i18n/missing.ts).
 */
export function provideEnglish(): Array<Provider | EnvironmentProviders> {
  return [
    provideTransloco({
      config: {
        availableLangs: [...LANGUAGE_CODES],
        defaultLang: 'en',
        fallbackLang: 'en',
        missingHandler: { useFallbackTranslation: true },
        reRenderOnLangChange: false
      },
      loader: EnglishLoader
    }),
    provideTranslocoTranspiler(IcuTranspiler),
    provideTranslocoMissingHandler(MissingKey),
    provideAppInitializer(() => {
      const transloco = inject(TranslocoService);
      transloco.setActiveLang('en');
      for (const path of Object.keys(ENGLISH)) transloco.load(path).subscribe();
    })
  ];
}
