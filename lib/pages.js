'use strict';

// The pages worth finding in a search. The sitemap, the server and the build's
// prerender (scripts/prerender.mjs) all read this one list.
const fs = require('node:fs');
const path = require('node:path');
const { materialSlug } = require('./material-slug');

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
 * Public pages written in English only, never translated: the companion to
 * John Britt's course, whose videos are in English, and (English first, for a
 * later translation wave) the cone chart and the page of each standard
 * material. Each language's address shows the English, with the notice that it
 * is not translated; search engines are given the English address alone
 * (server/lib/pages.ts), and the translation checks expect no copy in another
 * language (scripts/i18n-check.mjs).
 * @type {ReadonlyArray<string>}
 */
const ENGLISH_ONLY_PAGES = ['/guides/learn-with-john-britt', '/cones', '/materials', ...MATERIAL_PAGES];

/**
 * Whether a page is a reference page, which the build prerenders in English
 * alone: the other languages' addresses show the same English, so a copy of each
 * of the 170 materials in each language would only fill the disk.
 * @param {string} page
 * @returns {boolean}
 */
const isReferencePage = (page) => page === '/cones' || page === '/materials' || page.startsWith('/materials/');

/**
 * The languages a page is prerendered in, of those given.
 * @param {string} page
 * @param {ReadonlyArray<string>} codes
 * @returns {string[]}
 */
const prerenderLanguages = (page, codes) =>
  isReferencePage(page) ? codes.filter((code) => code === 'en') : [...codes];

/**
 * Where a prerendered page is kept, under dist/glazecalc/prerendered, with
 * slashes: / in German is de/index.html, and /guides/firing is de/guides/firing.html.
 * @param {string} code
 * @param {string} page
 * @returns {string}
 */
const prerenderedFile = (code, page) => code + (page === '/' ? '/index' : page) + '.html';

module.exports = { PUBLIC_PAGES, ENGLISH_ONLY_PAGES, MATERIAL_PAGES, prerenderedFile, prerenderLanguages };
