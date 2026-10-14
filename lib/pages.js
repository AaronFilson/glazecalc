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
  '/signup'
];

module.exports = { PUBLIC_PAGES };
