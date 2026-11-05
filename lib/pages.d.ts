/** The pages worth finding in a search, for the sitemap and the prerender (lib/pages.js). */
export const PUBLIC_PAGES: ReadonlyArray<string>;
/** Public pages that search engines are given in English alone (lib/pages.js). */
export const ENGLISH_ONLY_PAGES: ReadonlyArray<string>;
/** Guides translated into some languages so far, by page: those languages, English first (lib/pages.js). */
export const PARTLY_TRANSLATED_PAGES: Readonly<Record<string, ReadonlyArray<string>>>;
/** The cone chart and the list of materials: a copy per language in REFERENCE_LANGUAGES (lib/pages.js). */
export const REFERENCE_PAGES: ReadonlyArray<string>;
/** A public page for each standard material, /materials/<slug> (lib/pages.js). */
export const MATERIAL_PAGES: ReadonlyArray<string>;
/** Where the prerender lists the material pages it found English in, by language. */
export const MATERIAL_FALLBACK_FILE: string;
/** Whether a page has a copy in each of REFERENCE_LANGUAGES alone: REFERENCE_PAGES and MATERIAL_PAGES. */
export function isReferencePage(page: string): boolean;
/** Whether every note and hazard of a material's page has a translation in records/<code>.json (yes without the file). */
export function materialTranslatedIn(page: string, code: string): boolean;
/** The material pages the build rendered with English standing in, by language. */
export function materialFallback(): Readonly<Record<string, ReadonlyArray<string>>>;
/**
 * Whether search engines get a page in English alone in this language: ENGLISH_ONLY_PAGES, a reference or
 * material page not yet translated, or a material page whose notes and hazards are not all translated.
 */
export function englishOnlyIn(
  page: string,
  code: string,
  reference?: ReadonlyArray<string>,
  fallback?: Readonly<Record<string, ReadonlyArray<string>>>
): boolean;
/** Where a prerendered page is kept under dist/glazecalc/prerendered: de/guides/firing.html. */
export function prerenderedFile(code: string, page: string): string;
/** The languages a public page is prerendered in, of those given: the translated ones for a reference or material page. */
export function prerenderLanguages(
  page: string,
  codes: ReadonlyArray<string>,
  reference?: ReadonlyArray<string>
): string[];
