// Every page of the app is the same index.html, and the app draws it in the
// browser. What search engines and link previews read before any script runs
// depends on the page's language and address, so it is written in here
// (docs/adr/0013-translations.md): <html lang dir>, the canonical address,
// the same page in each language offered (hreflang), the title, description
// and preview text in the language, and noindex for a language not offered yet.
import languages from '../../lib/regions/languages.js';
import type { Language } from '../../lib/regions/languages.js';

/** The public pages, for the sitemap: the ones worth finding in a search. */
export const PUBLIC_PAGES = [
  '/',
  '/guides',
  '/guides/glazing-basics',
  '/guides/making-a-glaze',
  '/guides/safe-mixing',
  '/guides/home-safety',
  '/guides/firing',
  '/advice',
  '/about',
  '/privacy',
  '/signup'
];

/**
 * Every page of the app (client/app/app.routes.ts): the public ones, and those
 * for signing in and once signed in. Any other address is the app's
 * not-found page.
 */
export const APP_PAGES = [
  ...PUBLIC_PAGES,
  '/signin',
  '/forgot',
  '/reset',
  '/home',
  '/recipe',
  '/material',
  '/additive',
  '/firing',
  '/notes',
  '/trash',
  '/account'
];

/** Whether an address is one of the app's pages, in a language it knows: /de/recipe is, /xx/recipe is not. */
export const isPage = (pathname: string): boolean => APP_PAGES.includes(languages.pagePath(pathname));

/**
 * Whether an address looks like a file's (main-ABC12345.js): a dot in its last
 * part. Read in one pass; a pattern for this tries every dot again on a long
 * path of dots, and holds up the server.
 */
export const looksLikeFile = (pathname: string): boolean => pathname.slice(pathname.lastIndexOf('/') + 1).includes('.');

/**
 * Where an address with a slash at the end goes: /guides/ to /guides, and
 * /de/guides/ to /de/guides. Null for any other address, and where the one
 * without the slash is no page either. A language's home page keeps its
 * slash: /de/ is its canonical address.
 */
export function withoutSlash(pathname: string): string | null {
  const page = languages.pagePath(pathname);
  if (page === '/' || !page.endsWith('/')) return null;
  const bare = page.replace(/\/+$/, '');
  return APP_PAGES.includes(bare) ? languages.languagePrefix(languages.languageOfPath(pathname)) + bare : null;
}

const attribute = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Puts text between the two parts `around` finds, written safely. A function
 * gives it to String.replace, so a $ in the text (an address can have one)
 * stays a $ instead of a replacement pattern.
 */
const put = (html: string, around: RegExp, text: string): string =>
  html.replace(around, (_match, before: string, after: string) => before + attribute(text) + after);

/** The address of a page in a language: https://glazecalcapp.com/de/guides. */
const addressIn = (site: string, code: string, page: string): string => site + languages.languagePrefix(code) + page;

/** The page's title, description and preview image's text in its language, where its messages have them. */
export interface PageText {
  title?: string;
  description?: string;
  imageAlt?: string;
}

/**
 * index.html for a page: its language and direction, its canonical address,
 * its other languages, and its title, description and preview text where
 * translated. An address that is no page gets neither a canonical address
 * nor other languages.
 */
export function pageHtml(
  html: string,
  pathname: string,
  site: string,
  text: PageText = {},
  live: readonly string[] = languages.LIVE_LANGUAGES
): string {
  const code = languages.languageOfPath(pathname);
  const language = languages.languageFor(code) as Language;
  const page = languages.pagePath(pathname);
  const here = addressIn(site, code, page);
  const head: string[] = [];
  if (isPage(pathname)) {
    head.push(`<link rel="canonical" href="${attribute(here)}" />`);
    if (!live.includes(code)) {
      head.push('<meta name="robots" content="noindex" />');
    } else if (live.length > 1) {
      for (const other of live) {
        head.push(`<link rel="alternate" hreflang="${other}" href="${attribute(addressIn(site, other, page))}" />`);
      }
      head.push(`<link rel="alternate" hreflang="x-default" href="${attribute(addressIn(site, 'en', page))}" />`);
    }
  }
  let out = html
    .replace(/<html lang="[^"]*"[^>]*>/, `<html lang="${code}" dir="${language.dir}">`)
    .replace('</head>', () => head.map((line) => '    ' + line + '\n').join('') + '  </head>');
  out = put(out, /(<meta\s+property="og:url"\s+content=")[^"]*(")/, here);
  if (text.title) {
    out = put(out, /(<title>)[^<]*(<\/title>)/, text.title);
    out = put(out, /(<meta\s+property="og:title"\s+content=")[^"]*(")/, text.title);
  }
  if (text.description) {
    out = put(out, /(<meta\s+name="description"\s+content=")[^"]*(")/, text.description);
    out = put(out, /(<meta\s+property="og:description"\s+content=")[^"]*(")/, text.description);
  }
  if (text.imageAlt) out = put(out, /(<meta\s+property="og:image:alt"\s+content=")[^"]*(")/, text.imageAlt);
  return out;
}

/** The sitemap: each public page in each language offered, with its other languages beside it. */
export function sitemap(site: string, live: readonly string[] = languages.LIVE_LANGUAGES): string {
  const entries = PUBLIC_PAGES.flatMap((page) =>
    live.map((code) => {
      const others =
        live.length > 1
          ? live
              .map(
                (other) =>
                  `<xhtml:link rel="alternate" hreflang="${other}" href="${attribute(addressIn(site, other, page))}"/>`
              )
              .join('')
          : '';
      return `  <url><loc>${attribute(addressIn(site, code, page))}</loc>${others}</url>`;
    })
  );
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...entries,
    '</urlset>',
    ''
  ].join('\n');
}
