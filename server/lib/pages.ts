// Every page of the app is the same index.html, and the app draws it in the
// browser. What search engines and link previews read before any script runs
// depends on the page's language and address, so it is written in here
// (docs/adr/0013-translations.md): <html lang dir>, the canonical address,
// the same page in each language offered (hreflang), the title, description
// and preview text in the language with its og:locale, and noindex for a
// language not offered yet. hreflang is the code in the address, script and
// all (zh-Hans), which Google reads.
import languages from '../../lib/regions/languages.js';
import type { Language } from '../../lib/regions/languages.js';
import { PUBLIC_PAGES, prerenderedFile } from '../../lib/pages.js';
import { labelShown } from './site.ts';

export { PUBLIC_PAGES };

/**
 * Pages that anyone can open but no search engine may index, nor any Referer
 * name: a recipe opened by its share link (docs/adr/0020-share-links.md).
 * Never in the sitemap or prerendered; X-Robots-Tag and Referrer-Policy are
 * set on the reply (server/app.ts), and pageHtml adds the same as <meta>.
 */
export const PRIVATE_PAGES = ['/shared'];

/** Whether an address is one of PRIVATE_PAGES, in any language: /de/shared is. */
export const isPrivatePage = (pathname: string): boolean => PRIVATE_PAGES.includes(languages.pagePath(pathname));

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
  '/confirm-email',
  '/home',
  '/recipe',
  '/import',
  '/blends',
  '/material',
  '/additive',
  '/firing',
  '/notes',
  '/trash',
  '/account',
  ...PRIVATE_PAGES
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

/**
 * The file a page was prerendered to, from its address (de/guides/firing.html),
 * or null for an address that has none: not a public page, or in a language not
 * offered yet.
 */
export function prerenderedKey(pathname: string, live: readonly string[] = languages.LIVE_LANGUAGES): string | null {
  const code = languages.languageOfPath(pathname);
  const page = languages.pagePath(pathname);
  return isPage(pathname) && PUBLIC_PAGES.includes(page) && live.includes(code) ? prerenderedFile(code, page) : null;
}

/** A prerendered page with the reply's nonce where the render had its placeholder (client/app/app.config.server.ts). */
export const withNonce = (html: string, nonce: string): string => html.replaceAll('__GC_NONCE__', () => nonce);

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

/**
 * A language's og:locale, as Open Graph writes it, language_TERRITORY: the
 * region it is most read in, which for Chinese also says the script (zh_CN
 * for zh-Hans, zh_TW for zh-Hant); en_US for a pseudo-locale.
 */
export function ogLocale(code: string): string {
  try {
    const { language, region } = new Intl.Locale(languages.textLanguage(code)).maximize();
    return region ? language + '_' + region : language;
  } catch {
    return 'en_US';
  }
}

/** The page's title, description and preview image's text in its language, where its messages have them. */
export interface PageText {
  title?: string;
  description?: string;
  imageAlt?: string;
}

/**
 * The thin banner a copy that is not production (SITE_LABEL) shows on every
 * page, outside the app (<gc-root>), so hydration never sees it. Its style
 * carries the reply's nonce (withNonce). Nothing at all in production.
 */
const labelStyle = (): string =>
  '<style nonce="__GC_NONCE__">.gc-site-label{margin:0;padding:2px 8px;background:#ffd400;color:#000;' +
  'font:600 0.8125rem/1.4 system-ui,sans-serif;text-align:center}@media print{.gc-site-label{display:none}}</style>';
const labelBanner = (label: string): string =>
  `<aside class="gc-site-label" aria-label="${attribute(label)}">${attribute(label)}: a test copy of Glazecalc</aside>`;

/**
 * index.html for a page: its language and direction, its canonical address,
 * its other languages, and its title, description and preview text where
 * translated. An address that is no page gets neither a canonical address
 * nor other languages. A prerendered page has its own title and description,
 * which `text` does not replace. `label` (SITE_LABEL, "Staging") adds a thin
 * banner; empty, as in production, the page is exactly as before.
 */
export function pageHtml(
  html: string,
  pathname: string,
  site: string,
  text: PageText = {},
  live: readonly string[] = languages.LIVE_LANGUAGES,
  prerendered = false,
  label: string = labelShown()
): string {
  const code = languages.languageOfPath(pathname);
  const language = languages.languageFor(code) as Language;
  const page = languages.pagePath(pathname);
  const here = addressIn(site, code, page);
  const head: string[] = [];
  const listed = isPage(pathname) && !isPrivatePage(pathname);
  if (isPrivatePage(pathname)) {
    // nginx sends its own Referrer-Policy after the app's, which a browser would follow; this <meta> comes last.
    head.push('<meta name="robots" content="noindex, nofollow" />');
    head.push('<meta name="referrer" content="no-referrer" />');
  }
  if (listed) {
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
  // Link previews read these; og:locale:alternate lists the other languages offered.
  if (listed && live.includes(code)) {
    head.push(`<meta property="og:locale" content="${ogLocale(code)}" />`);
    for (const other of live.filter((l) => l !== code)) {
      head.push(`<meta property="og:locale:alternate" content="${ogLocale(other)}" />`);
    }
  }
  if (label) head.push(labelStyle());
  let out = html
    .replace(/<html lang="[^"]*"[^>]*>/, `<html lang="${code}" dir="${language.dir}">`)
    .replace('</head>', () => head.map((line) => '    ' + line + '\n').join('') + '  </head>');
  out = put(out, /(<meta\s+property="og:url"\s+content=")[^"]*(")/, here);
  if (text.title && !prerendered) {
    out = put(out, /(<title>)[^<]*(<\/title>)/, text.title);
    out = put(out, /(<meta\s+property="og:title"\s+content=")[^"]*(")/, text.title);
  }
  if (text.description && !prerendered) {
    out = put(out, /(<meta\s+name="description"\s+content=")[^"]*(")/, text.description);
    out = put(out, /(<meta\s+property="og:description"\s+content=")[^"]*(")/, text.description);
  }
  if (text.imageAlt) out = put(out, /(<meta\s+property="og:image:alt"\s+content=")[^"]*(")/, text.imageAlt);
  if (label) out = out.replace(/<body[^>]*>/, (body) => body + '\n    ' + labelBanner(label));
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
