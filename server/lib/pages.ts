// Every page of the app is the same index.html, and the app draws it in the
// browser. What search engines and link previews read before any script runs
// depends on the page's language and address, so it is written in here
// (docs/adr/0013-translations.md): <html lang dir>, the canonical address,
// the same page in each language offered (hreflang), the title, description
// and preview text in the language with its og:locale, and noindex for a
// language not offered yet or a page with nothing to find in a search
// (isAppOnlyPage). hreflang is the code in the address, script and
// all (zh-Hans), which Google reads. A page in English only (ENGLISH_ONLY_PAGES) has one
// address for search engines, the English: every language's copy names it as
// canonical, the others are noindex, and none has hreflang. So has a reference
// page (the cone chart, the materials) in a language not yet translated
// (REFERENCE_LANGUAGES); in the others it has hreflang among those alone.
import languages from '../../lib/regions/languages.js';
import type { Language } from '../../lib/regions/languages.js';
import {
  ENGLISH_ONLY_PAGES,
  MATERIAL_PAGES,
  PUBLIC_PAGES,
  REFERENCE_PAGES,
  englishOnlyIn,
  prerenderLanguages,
  prerenderedFile
} from '../../lib/pages.js';
import { labelShown } from './site.ts';

export { ENGLISH_ONLY_PAGES, MATERIAL_PAGES, PUBLIC_PAGES, REFERENCE_PAGES, prerenderLanguages };

/**
 * Pages that anyone can open but no search engine may index, nor any Referer
 * name: a recipe opened by its share link (docs/adr/0020-share-links.md).
 * Never in the sitemap or prerendered; X-Robots-Tag and Referrer-Policy are
 * set on the reply (server/app.ts), and pageHtml adds the same as <meta>.
 */
export const PRIVATE_PAGES = ['/shared'];

/**
 * Pages whose address carries an id, as the client's routes write them: the
 * consent page an AI app sends the person to (/connect/<uid>,
 * docs/adr/0024-authorization-server.md), with the id oidc-provider gives an
 * interaction. Each is private as well (PRIVATE_PAGES' headers): never
 * indexed, cached or named in a Referer.
 */
export const ID_PAGES: Record<string, RegExp> = {
  '/connect/:uid': /^\/connect\/[A-Za-z0-9_-]{16,64}$/,
  // A change waiting for the person's approval (docs/adr/0025): 128 random bits, base64url.
  '/confirm/:id': /^\/confirm\/[A-Za-z0-9_-]{22}$/
};

/** Whether a page, without its language, is one of ID_PAGES. */
const isIdPage = (page: string): boolean => Object.values(ID_PAGES).some((pattern) => pattern.test(page));

/**
 * Whether an address is a public page that search engines have in English only
 * (ENGLISH_ONLY_PAGES; a reference page in a language not yet translated):
 * /de/guides/learn-with-john-britt is. Its one address for search engines is
 * the English; the other languages' copies are noindex, with no hreflang, and
 * only the English is in the sitemap.
 */
export const isEnglishOnlyPage = (
  pathname: string,
  reference: readonly string[] = languages.REFERENCE_LANGUAGES
): boolean => englishOnlyIn(languages.pagePath(pathname), languages.languageOfPath(pathname), reference);

/** The languages a page is offered in, of the live ones: a reference page only in those translated. */
const offeredIn = (page: string, live: readonly string[], reference: readonly string[]): readonly string[] =>
  REFERENCE_PAGES.includes(page) ? live.filter((code) => reference.includes(code)) : live;

/** Whether an address is one of PRIVATE_PAGES or ID_PAGES, in any language: /de/shared is. */
export const isPrivatePage = (pathname: string): boolean => {
  const page = languages.pagePath(pathname);
  return PRIVATE_PAGES.includes(page) || isIdPage(page);
};

/**
 * Every page of the app (client/app/app.routes.ts): the public ones, and those
 * for signing in and once signed in. Any other address is the app's
 * not-found page. ID_PAGES are pages too (isPage).
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
  '/solve',
  '/material',
  '/additive',
  '/firing',
  '/notes',
  '/trash',
  '/account',
  '/account/apps',
  ...PRIVATE_PAGES
];

/** Whether an address is one of the app's pages, in a language it knows: /de/recipe is, /xx/recipe is not. */
export const isPage = (pathname: string): boolean => {
  const page = languages.pagePath(pathname);
  return APP_PAGES.includes(page) || isIdPage(page);
};

/** Pages that make no sense to come back to once signed in: those go to the home page. */
const NOT_AFTER = ['/', '/signin', '/signup', '/forgot', '/reset', '/confirm-email'];

/**
 * The page to go to once signed in, with its language (/de/recipe): one of the
 * app's own pages (isPage), never another site; /home when it is none. Its
 * query and section are left off.
 */
export const nextPage = (value: unknown): string => {
  if (typeof value !== 'string' || value.length > 200 || !value.startsWith('/') || /^[/\\]{2}/.test(value)) {
    return '/home';
  }
  const path = value.split(/[?#]/)[0]!;
  if (!isPage(path)) return '/home';
  const prefix = languages.languagePrefix(languages.languageOfPath(path));
  return NOT_AFTER.includes(languages.pagePath(path)) ? prefix + '/home' : path;
};

/**
 * The page a new account's confirmation link goes on to once the address is
 * confirmed (lib/email_links.ts): a page of the app, as nextPage takes it,
 * without its language (/connect/abc for /de/connect/abc), as the app's
 * router writes it; null for none, or for the home page, where the app goes anyway.
 */
export const returnPage = (value: unknown): string | null => {
  const page = languages.pagePath(nextPage(value));
  return page === '/home' ? null : page;
};

/**
 * Whether an address is a page of the app that is neither public nor private:
 * signing in and the pages once signed in (/recipe, /de/account). Anyone may
 * open them, but they hold nothing to find in a search and most send a visitor
 * to sign in, so search engines are told not to index them (noindex, links
 * still followed), with no canonical address or other languages. Never put
 * them in robots.txt: a crawler kept out never reads the noindex.
 */
export const isAppOnlyPage = (pathname: string): boolean =>
  isPage(pathname) && !PUBLIC_PAGES.includes(languages.pagePath(pathname)) && !isPrivatePage(pathname);

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
 * or null for an address that has none: not a public page, in a language not
 * offered yet, a material's page in a language other than English, or a
 * reference page (the cone chart, the materials) in a language not translated
 * yet, which the build does not render.
 */
export function prerenderedKey(
  pathname: string,
  live: readonly string[] = languages.LIVE_LANGUAGES,
  reference: readonly string[] = languages.REFERENCE_LANGUAGES
): string | null {
  const code = languages.languageOfPath(pathname);
  const page = languages.pagePath(pathname);
  return isPage(pathname) && PUBLIC_PAGES.includes(page) && prerenderLanguages(page, live, reference).includes(code)
    ? prerenderedFile(code, page)
    : null;
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
 * banner; empty, as in production, the page is exactly as before. `reference`
 * (REFERENCE_LANGUAGES) are the languages the cone chart and the materials are
 * translated into.
 */
export function pageHtml(
  html: string,
  pathname: string,
  site: string,
  text: PageText = {},
  live: readonly string[] = languages.LIVE_LANGUAGES,
  prerendered = false,
  label: string = labelShown(),
  reference: readonly string[] = languages.REFERENCE_LANGUAGES
): string {
  const code = languages.languageOfPath(pathname);
  const language = languages.languageFor(code) as Language;
  const page = languages.pagePath(pathname);
  const here = addressIn(site, code, page);
  const head: string[] = [];
  // Only the public pages are offered to search engines (isAppOnlyPage).
  const listed = isPage(pathname) && PUBLIC_PAGES.includes(page);
  if (isAppOnlyPage(pathname)) head.push('<meta name="robots" content="noindex" />');
  if (isPrivatePage(pathname)) {
    // nginx sends its own Referrer-Policy after the app's, which a browser would follow; this <meta> comes last.
    head.push('<meta name="robots" content="noindex, nofollow" />');
    head.push('<meta name="referrer" content="no-referrer" />');
  }
  const englishOnly = listed && isEnglishOnlyPage(pathname, reference);
  // The languages this page is offered in: the live ones, or for a reference page those translated.
  const offered = offeredIn(page, live, reference);
  if (englishOnly) {
    // One page, in English, at one address: each language's copy points to it and stays out of the index.
    head.push(`<link rel="canonical" href="${attribute(addressIn(site, 'en', page))}" />`);
    if (code !== 'en' || !live.includes(code)) head.push('<meta name="robots" content="noindex" />');
  } else if (listed) {
    head.push(`<link rel="canonical" href="${attribute(here)}" />`);
    if (!live.includes(code)) {
      head.push('<meta name="robots" content="noindex" />');
    } else if (offered.length > 1) {
      for (const other of offered) {
        head.push(`<link rel="alternate" hreflang="${other}" href="${attribute(addressIn(site, other, page))}" />`);
      }
      head.push(`<link rel="alternate" hreflang="x-default" href="${attribute(addressIn(site, 'en', page))}" />`);
    }
  }
  // Link previews read these; og:locale:alternate lists the other languages offered.
  if (englishOnly && code === 'en' && live.includes(code)) {
    head.push(`<meta property="og:locale" content="${ogLocale(code)}" />`);
  } else if (listed && !englishOnly && live.includes(code)) {
    head.push(`<meta property="og:locale" content="${ogLocale(code)}" />`);
    for (const other of offered.filter((l) => l !== code)) {
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

/**
 * The sitemap: each public page in each language offered, with its other
 * languages beside it; a page in English only, at its English address alone.
 * A reference page is listed in the languages it is translated into
 * (`reference`) and no others.
 */
export function sitemap(
  site: string,
  live: readonly string[] = languages.LIVE_LANGUAGES,
  reference: readonly string[] = languages.REFERENCE_LANGUAGES
): string {
  const entries = PUBLIC_PAGES.flatMap((page) => {
    if (ENGLISH_ONLY_PAGES.includes(page)) return [`  <url><loc>${attribute(addressIn(site, 'en', page))}</loc></url>`];
    const offered = offeredIn(page, live, reference);
    return offered.map((code) => {
      const others =
        offered.length > 1
          ? offered
              .map(
                (other) =>
                  `<xhtml:link rel="alternate" hreflang="${other}" href="${attribute(addressIn(site, other, page))}"/>`
              )
              .join('')
          : '';
      return `  <url><loc>${attribute(addressIn(site, code, page))}</loc>${others}</url>`;
    });
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...entries,
    '</urlset>',
    ''
  ].join('\n');
}
