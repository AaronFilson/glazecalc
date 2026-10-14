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
/** What is wrong with a rendered page; empty when it is fine. */
export function problemsWith(html: string, start: string, code?: string, minText?: number): string[];
export function prerender(options?: {
  build?: boolean;
  codes?: readonly string[];
  only?: readonly string[];
}): Promise<Map<string, number>>;
