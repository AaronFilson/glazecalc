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
  '/guides/teaching-glaze-calculation',
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
 * John Britt's course, whose videos are in English. Each language's address
 * names the English as canonical, is noindex, and has no hreflang
 * (server/lib/pages.ts). The guide has no other copy at all (scripts/i18n-check.mjs).
 * @type {ReadonlyArray<string>}
 */
const ENGLISH_ONLY_PAGES = ['/guides/learn-with-john-britt'];

/**
 * Guides written for some languages first, by page: the languages they are
 * translated into (English, the source, first). In any other language the page
 * shows the English with the usual notice (client/app/pages/guides/guide-text.ts
 * reads the English where there is no copy), and search engines are given the
 * translated addresses alone, as for REFERENCE_PAGES: the others name the
 * English as canonical and are noindex. A test keeps each list in step with the
 * guide's files. Add a language here when its copy is written.
 * @type {Readonly<Record<string, ReadonlyArray<string>>>}
 */
const PARTLY_TRANSLATED_PAGES = { '/guides/teaching-glaze-calculation': ['en', 'ja'] };

/**
 * The reference pages with a copy per language: the cone chart and the list of
 * materials. In a language that is not in REFERENCE_LANGUAGES
 * (lib/regions/languages.js) they show the English with a notice, and search
 * engines are given the English address alone, as for ENGLISH_ONLY_PAGES. A
 * material's own page (MATERIAL_PAGES) is the same, and more besides
 * (materialTranslatedIn).
 * @type {ReadonlyArray<string>}
 */
const REFERENCE_PAGES = ['/cones', '/materials'];

/** Whether a page has a copy in each of REFERENCE_LANGUAGES alone: the reference pages and each material's. */
const isReferencePage = (page) => REFERENCE_PAGES.includes(page) || MATERIAL_PAGES.includes(page);

const RECORDS = path.join(__dirname, '..', 'client', 'public', 'i18n', 'records');
/** Each standard material's words that a translation must have, by its page: its notes, hazards and "Theoretical formula". */
let materialTexts;
/** The keys each language's records/ has, by language; null where the file cannot be read. */
const recordKeys = new Map();

/**
 * Whether a material's page is translated for search in a language: every note and
 * hazard of the material (and "Theoretical formula") has a translation in
 * records/<code>.json, so no English stands in for any of them. English is. The
 * check needs records/, which the build has and the server's image does not: where
 * the file cannot be read the answer is yes, and the build's own list of the pages
 * it found in English (materialFallback) decides.
 * @param {string} page
 * @param {string} code
 * @returns {boolean}
 */
function materialTranslatedIn(page, code) {
  if (code === 'en' || !MATERIAL_PAGES.includes(page)) return true;
  if (!materialTexts) {
    const { textKey } = require('./regions/languages');
    materialTexts = new Map();
    for (const line of fs
      .readFileSync(path.join(__dirname, '..', 'data', 'materials.ndjson'), 'utf8')
      .split(/\r?\n/)
      .filter(Boolean)) {
      const material = JSON.parse(line);
      const notes = Array.isArray(material.notes) ? material.notes : material.notes ? [material.notes] : [];
      const texts = [...notes, material.hazards];
      if (material.source?.name === 'Theoretical formula') texts.push(material.source.name);
      materialTexts.set(
        '/materials/' + materialSlug(material.name),
        texts.filter((text) => typeof text === 'string' && text.trim()).map(textKey)
      );
    }
  }
  if (!recordKeys.has(code)) {
    try {
      recordKeys.set(
        code,
        new Set(Object.keys(JSON.parse(fs.readFileSync(path.join(RECORDS, code + '.json'), 'utf8'))))
      );
    } catch {
      recordKeys.set(code, null);
    }
  }
  const keys = recordKeys.get(code);
  return !keys || (materialTexts.get(page) ?? []).every((key) => keys.has(key));
}

/** The file the prerender writes the material pages it found in English into, beside the pages. */
const MATERIAL_FALLBACK_FILE = path.join(__dirname, '..', 'dist', 'glazecalc', 'prerendered', 'material-fallback.json');
let fallback;

/**
 * The material pages the build rendered with English standing in, by language
 * ({ de: ['/materials/silica'] }; scripts/prerender.mjs): empty without the file.
 * Read once; the pages are fixed for the life of the process.
 * @returns {Readonly<Record<string, ReadonlyArray<string>>>}
 */
function materialFallback() {
  if (fallback === undefined) {
    try {
      fallback = Object.freeze(JSON.parse(fs.readFileSync(MATERIAL_FALLBACK_FILE, 'utf8')));
    } catch {
      fallback = Object.freeze({});
    }
  }
  return fallback;
}

/**
 * Whether a public page has no copy in a language that search engines should
 * read: ENGLISH_ONLY_PAGES in every language; REFERENCE_PAGES and the material
 * pages in a language not yet translated; and a material's page in a language
 * that lacks a translation of any of its notes and hazards, or that the build
 * found English in (materialFallback). Such a page is still drawn for readers.
 * @param {string} page
 * @param {string} code
 * @param {ReadonlyArray<string>} [reference]
 * @param {Readonly<Record<string, ReadonlyArray<string>>>} [fallback]
 * @returns {boolean}
 */
const englishOnlyIn = (page, code, reference = REFERENCE_LANGUAGES, fallback = materialFallback()) =>
  ENGLISH_ONLY_PAGES.includes(page) ||
  (page in PARTLY_TRANSLATED_PAGES && !PARTLY_TRANSLATED_PAGES[page].includes(code)) ||
  (isReferencePage(page) && !reference.includes(code)) ||
  (MATERIAL_PAGES.includes(page) &&
    code !== 'en' &&
    (!materialTranslatedIn(page, code) || (fallback[code] ?? []).includes(page)));

/**
 * The languages a page is prerendered in, of those given: all of them, except
 * the reference pages and the materials' pages in a language not yet
 * translated (REFERENCE_LANGUAGES).
 * @param {string} page
 * @param {ReadonlyArray<string>} codes
 * @param {ReadonlyArray<string>} [reference]
 * @returns {string[]}
 */
const prerenderLanguages = (page, codes, reference = REFERENCE_LANGUAGES) =>
  isReferencePage(page) ? codes.filter((code) => reference.includes(code)) : [...codes];

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
  PARTLY_TRANSLATED_PAGES,
  REFERENCE_PAGES,
  MATERIAL_PAGES,
  MATERIAL_FALLBACK_FILE,
  englishOnlyIn,
  isReferencePage,
  materialFallback,
  materialTranslatedIn,
  prerenderedFile,
  prerenderLanguages
};
