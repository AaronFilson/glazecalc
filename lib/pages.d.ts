/** The pages worth finding in a search, for the sitemap and the prerender (lib/pages.js). */
export const PUBLIC_PAGES: ReadonlyArray<string>;
/** Public pages in English only, never translated (lib/pages.js). */
export const ENGLISH_ONLY_PAGES: ReadonlyArray<string>;
/** A public page for each standard material, /materials/<slug> (lib/pages.js). */
export const MATERIAL_PAGES: ReadonlyArray<string>;
/** Where a prerendered page is kept under dist/glazecalc/prerendered: de/guides/firing.html. */
export function prerenderedFile(code: string, page: string): string;
/** The languages a public page is prerendered in, of those given: English alone for the reference pages. */
export function prerenderLanguages(page: string, codes: ReadonlyArray<string>): string[];
