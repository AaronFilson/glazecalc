/** The one site whose pages are sent. */
export const PRODUCTION: string;
/** IndexNow's shared address, which passes a request on to every engine that takes part. */
export const ENDPOINT: string;
/** Whether a list of changed files (git diff --name-only) changes what a page shows. */
export function changesContent(files: string[]): boolean;
/** The addresses of a sitemap, each <loc> once. */
export function sitemapUrls(xml: string): string[];
/** The request IndexNow takes: the host, the key, where the key is, and the addresses on that host. */
export function payload(
  site: string,
  urls: string[]
): { host: string; key: string; keyLocation: string; urlList: string[] };
/** Sends the site's changed pages; resolves to a line saying what happened, and never rejects. */
export function ping(options: {
  site: string;
  to: string;
  from?: string;
  changedFiles?: (from: string, to: string) => string[];
  fetch?: typeof fetch;
}): Promise<string>;
