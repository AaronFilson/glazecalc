'use strict';

// The pages worth finding in a search. The sitemap, the server and the build's
// prerender (scripts/prerender.mjs) all read this one list.

/** @type {ReadonlyArray<string>} */
const PUBLIC_PAGES = [
  '/',
  '/guides',
  '/guides/glazing-basics',
  '/guides/making-a-glaze',
  '/guides/safe-mixing',
  '/guides/home-safety',
  '/guides/firing',
  '/guides/learn-with-john-britt',
  '/advice',
  '/about',
  '/privacy',
  '/terms',
  '/assistants',
  '/signup'
];

/**
 * Public pages written in English only, never translated: the companion to
 * John Britt's course, whose videos are in English. Each language's address
 * shows the English, with the notice that it is not translated; search engines
 * are given the English address alone (server/lib/pages.ts), and the
 * translation checks expect no copy in another language (scripts/i18n-check.mjs).
 * @type {ReadonlyArray<string>}
 */
const ENGLISH_ONLY_PAGES = ['/guides/learn-with-john-britt'];

/**
 * Where a prerendered page is kept, under dist/glazecalc/prerendered, with
 * slashes: / in German is de/index.html, and /guides/firing is de/guides/firing.html.
 * @param {string} code
 * @param {string} page
 * @returns {string}
 */
const prerenderedFile = (code, page) => code + (page === '/' ? '/index' : page) + '.html';

module.exports = { PUBLIC_PAGES, ENGLISH_ONLY_PAGES, prerenderedFile };
