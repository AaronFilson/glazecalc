'use strict';

// The pages worth finding in a search. The sitemap, the server and the build's
// prerender (scripts/prerender.mjs) all read this one list.
const fs = require('node:fs');
const path = require('node:path');
const { materialSlug } = require('./material-slug');
const { REFERENCE_LANGUAGES } = require('./regions/languages');

/**
 * A page for each standard material (data/materials.ndjson), /materials/ferro-frit-3134,
 * in the order of the file. The client's page reads the same file, and the
 * tests check that every address is its own.
 * @type {ReadonlyArray<string>}
 */
const MATERIAL_PAGES = fs
  .readFileSync(path.join(__dirname, '..', 'data', 'materials.ndjson'), 'utf8')
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => '/materials/' + materialSlug(JSON.parse(line).name));

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
  '/cones',
  '/materials',
  ...MATERIAL_PAGES,
  '/advice',
  '/about',
  '/privacy',
  '/terms',
  '/assistants',
  '/signup'
];

/**
 * Public pages that search engines are given in English alone: the companion to
 * John Britt's course, whose videos are in English, and the page of each
 * standard material. A material's page is translated for the reader (its
 * notes and hazards come from records/) but drawn in the browser, so only the
 * English is prerendered and indexed. Each language's address names the
 * English as canonical, is noindex, and has no hreflang (server/lib/pages.ts).
 * The guide has no other copy at all (scripts/i18n-check.mjs).
 * @type {ReadonlyArray<string>}
 */
const ENGLISH_ONLY_PAGES = ['/guides/learn-with-john-britt', ...MATERIAL_PAGES];

/**
 * The reference pages with a copy per language: the cone chart and the list of
 * materials. In a language that is not in REFERENCE_LANGUAGES
 * (lib/regions/languages.js) they show the English with a notice, and search
 * engines are given the English address alone, as for ENGLISH_ONLY_PAGES.
 * @type {ReadonlyArray<string>}
 */
const REFERENCE_PAGES = ['/cones', '/materials'];

/**
 * Whether a public page has no copy in a language that search engines should
 * read: ENGLISH_ONLY_PAGES in every language, and REFERENCE_PAGES in those not
 * yet translated.
 * @param {string} page
 * @param {string} code
 * @param {ReadonlyArray<string>} [reference]
 * @returns {boolean}
 */
const englishOnlyIn = (page, code, reference = REFERENCE_LANGUAGES) =>
  ENGLISH_ONLY_PAGES.includes(page) || (REFERENCE_PAGES.includes(page) && !reference.includes(code));

/**
 * The languages a page is prerendered in, of those given: all of them, except
 * the pages of the materials (English alone: a copy of each of the 170 in each
 * language would fill the disk, and they draw in the browser) and the reference
 * pages in a language not yet translated.
 * @param {string} page
 * @param {ReadonlyArray<string>} codes
 * @param {ReadonlyArray<string>} [reference]
 * @returns {string[]}
 */
const prerenderLanguages = (page, codes, reference = REFERENCE_LANGUAGES) => {
  if (page.startsWith('/materials/')) return codes.filter((code) => code === 'en');
  return REFERENCE_PAGES.includes(page) ? codes.filter((code) => reference.includes(code)) : [...codes];
};

/**
 * Where a prerendered page is kept, under dist/glazecalc/prerendered, with
 * slashes: / in German is de/index.html, and /guides/firing is de/guides/firing.html.
 * @param {string} code
 * @param {string} page
 * @returns {string}
 */
const prerenderedFile = (code, page) => code + (page === '/' ? '/index' : page) + '.html';

module.exports = {
  PUBLIC_PAGES,
  ENGLISH_ONLY_PAGES,
  REFERENCE_PAGES,
  MATERIAL_PAGES,
  englishOnlyIn,
  prerenderedFile,
  prerenderLanguages
};
