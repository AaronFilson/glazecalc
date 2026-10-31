export const MIN_TEXT: number;
export const NONCE_PLACEHOLDER: string;
/** The address a page is rendered at. */
export function urlFor(code: string, page: string): string;
/** The document each render starts from. */
export function startDocument(indexHtml: string): string;
/** The inline scripts that run, as written. */
export function inlineScripts(html: string): string[];
/** The words on the page. */
export function textOf(html: string): string;
export const TEXT_FONTS: string[];
export const PRELOAD_OPENING: number;
/** An upright face of the text's fonts: its file and the code points it has. */
export interface FontFace {
  family: string;
  url: string;
  ranges: Array<[number, number]>;
}
/** The upright faces of the text's fonts in a stylesheet. */
export function fontFaces(css: string): FontFace[];
/** The preload links for the font files the opening of a page is set in. */
export function fontPreloads(html: string, faces: FontFace[]): string;
/** A rendered page with its font preloads ahead of the stylesheet. */
export function withFontPreloads(html: string, faces: FontFace[]): string;
/** What is wrong with a rendered page; empty when it is fine. */
export function problemsWith(html: string, start: string, code?: string, minText?: number): string[];
/** A page larger than this, gzipped, fails the build. */
export const MAX_GZIPPED: number;
/** What is wrong with one page in particular (its size; the advice page's standard advice). */
export function pageProblems(html: string, page: string, code?: string): string[];
export function prerender(options?: {
  build?: boolean;
  codes?: readonly string[];
  only?: readonly string[];
}): Promise<Map<string, number>>;
