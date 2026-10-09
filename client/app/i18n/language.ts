import { InjectionToken } from '@angular/core';
import { LANGUAGES, LIVE_LANGUAGES, languagePrefix, languageOfPath, pagePath } from '../../../lib/regions/languages';

export { languageOfPath };

/** The language of this page, fixed for its life (i18n/provide-i18n.ts); English in tests. */
export const PAGE_LANGUAGE = new InjectionToken<string>('PAGE_LANGUAGE', { providedIn: 'root', factory: () => 'en' });

/** Where a language's pages start: / for English, /de/ for German. */
export const baseHrefFor = (code: string): string => (code === 'en' ? '/' : '/' + code + '/');

/** The same page in another language: /de/recipe?x=1 in French is /fr/recipe?x=1. */
export function pathIn(code: string, pathname: string, rest = ''): string {
  return languagePrefix(code) + pagePath(pathname) + rest;
}

/** The languages a potter may choose: those offered (lib/regions/languages.js). */
export const OFFERED_LANGUAGES = new InjectionToken<readonly string[]>('OFFERED_LANGUAGES', {
  providedIn: 'root',
  factory: () => LIVE_LANGUAGES
});

/** Opens an address, as a new page; tests watch it instead. */
export const OPEN_PAGE = new InjectionToken<(address: string) => void>('OPEN_PAGE', {
  providedIn: 'root',
  factory: () => (address: string) => location.assign(address)
});

/** A language's name in itself: Deutsch, Français. */
export const languageName = (code: string): string => LANGUAGES.find((l) => l.code === code)?.name ?? code;
