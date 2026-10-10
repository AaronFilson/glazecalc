/** A language of the page (lib/regions/languages.js). */
export interface Language {
  /** BCP 47, as it appears in the URL. */
  code: string;
  /** In the language itself. */
  name: string;
  english: string;
  dir: 'ltr' | 'rtl';
  /** Offered in Settings and to search engines. */
  live: boolean;
  /** The language whose plural rules and number formats apply, where not the code itself. */
  base?: string;
  /** Made in the browser from the English, for tests. */
  pseudo?: boolean;
  /** AI translates it less well than most: its notice says so plainly, and a line of it stays on every page. */
  plainNotice?: boolean;
}

export const LANGUAGES: ReadonlyArray<Language>;
export const LANGUAGE_CODES: ReadonlyArray<string>;
export const LIVE_LANGUAGES: ReadonlyArray<string>;
export function languageFor(code: string | undefined | null): Language | undefined;
/** The language whose plural rules and number formats apply: en for en-XA, pt for pt-PT. */
export function baseLanguage(code: string): string;
export function textLanguage(code: string): string;
/** The language a page is in, from the first part of its path: /de/recipe is German, /recipe English. */
export function languageOfPath(pathname: string): string;
/** A page's path without its language's part: /de/recipe and /recipe are both /recipe. */
export function pagePath(pathname: string): string;
/** The key a piece of the app's data is translated under: a few of its words and a hash of all of it. */
export function textKey(text: string): string;
/** Where a language's pages start, before the page's path: '' for English, /de for German. */
export function languagePrefix(code: string): string;
