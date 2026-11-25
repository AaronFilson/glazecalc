/** The pages to check: each live language's home, and every English public page. */
export function pagesToCheck(): string[];
/** What is wrong with the home page's headers, for production or staging (by its host name). */
export function headerProblems(headers: Headers | Record<string, string>, url: string): string[];
/** What is wrong with /robots.txt for production or staging. */
export function robotsProblems(status: number, text: string, base: string): string[];
/** What is wrong with /sitemap.xml (a 404 on staging, the sitemap index on production). */
export function sitemapIndexProblems(status: number, xml: string, base: string): string[];
/** What is wrong with a language's sitemap (/sitemaps/<code>.xml). */
export function sitemapProblems(status: number, xml: string, base: string, code: string): string[];
/** What is wrong with a prerendered public page's search metadata: canonical, hreflang, noindex, and JSON-LD. */
export function seoPageProblems(
  html: string,
  pagePath: string,
  base: string,
  options?: { englishOnly?: boolean; structured?: boolean }
): string[];
export const SEO_SAMPLE_PAGES: ReadonlySet<string>;
/** The videos a guide links (YouTube watch addresses): each title and address, in order, once. */
export function videosIn(markdown: string): Array<{ title: string; url: string }>;
/** Where YouTube says whether a video is there to watch (oEmbed). */
export function oembedFor(url: string): string;
