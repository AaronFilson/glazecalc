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
  '/advice',
  '/about',
  '/privacy',
  '/terms',
  '/signup'
];

/**
 * Where a prerendered page is kept, under dist/glazecalc/prerendered, with
 * slashes: / in German is de/index.html, and /guides/firing is de/guides/firing.html.
 * @param {string} code
 * @param {string} page
 * @returns {string}
 */
const prerenderedFile = (code, page) => code + (page === '/' ? '/index' : page) + '.html';

module.exports = { PUBLIC_PAGES, prerenderedFile };
