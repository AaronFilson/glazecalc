// Every page of the app is the same index.html, and the app draws it in the
// browser. What search engines and link previews read before any script runs
// depends on the page's language and address, so it is written in here
// (docs/adr/0013-translations.md): <html lang dir>, the canonical address,
// the same page in each language offered (hreflang), the title and
// description in the language, and noindex for a language not offered yet.
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

const attribute = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** The address of a page in a language: https://glazecalcapp.com/de/guides. */
const addressIn = (site: string, code: string, page: string): string => site + languages.languagePrefix(code) + page;

/** The page's title and description in its language, where its messages have them. */
export interface PageText {
  title?: string;
  description?: string;
}

/**
 * index.html for a page: its language and direction, its canonical address,
 * its other languages, and its title and description where translated.
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
  const head = [`<link rel="canonical" href="${attribute(here)}" />`];
  if (!live.includes(code)) {
    head.push('<meta name="robots" content="noindex" />');
  } else if (live.length > 1) {
    for (const other of live) {
      head.push(`<link rel="alternate" hreflang="${other}" href="${attribute(addressIn(site, other, page))}" />`);
    }
    head.push(`<link rel="alternate" hreflang="x-default" href="${attribute(addressIn(site, 'en', page))}" />`);
  }
  let out = html
    .replace(/<html lang="[^"]*"[^>]*>/, `<html lang="${code}" dir="${language.dir}">`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${attribute(here)}$2`)
    .replace('</head>', head.map((line) => '    ' + line + '\n').join('') + '  </head>');
  if (text.title) {
    out = out
      .replace(/<title>[^<]*<\/title>/, `<title>${attribute(text.title)}</title>`)
      .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${attribute(text.title)}$2`);
  }
  if (text.description) {
    out = out.replace(/(<meta\s+name="description"\s+content=")[^"]*(")/, `$1${attribute(text.description)}$2`);
  }
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
