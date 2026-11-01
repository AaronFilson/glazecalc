/** The pages worth finding in a search, for the sitemap and the prerender (lib/pages.js). */
export const PUBLIC_PAGES: ReadonlyArray<string>;
/** Public pages that search engines are given in English alone (lib/pages.js). */
export const ENGLISH_ONLY_PAGES: ReadonlyArray<string>;
/** The cone chart and the list of materials: a copy per language in REFERENCE_LANGUAGES (lib/pages.js). */
export const REFERENCE_PAGES: ReadonlyArray<string>;
/** A public page for each standard material, /materials/<slug> (lib/pages.js). */
export const MATERIAL_PAGES: ReadonlyArray<string>;
/** Whether search engines get a page in English alone in this language: ENGLISH_ONLY_PAGES, or a reference page not yet translated. */
export function englishOnlyIn(page: string, code: string, reference?: ReadonlyArray<string>): boolean;
/** Where a prerendered page is kept under dist/glazecalc/prerendered: de/guides/firing.html. */
export function prerenderedFile(code: string, page: string): string;
/** The languages a public page is prerendered in, of those given: English alone for a material's page. */
export function prerenderLanguages(
  page: string,
  codes: ReadonlyArray<string>,
  reference?: ReadonlyArray<string>
): string[];
