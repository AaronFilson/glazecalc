'use strict';

// The files of one language that the app reads: its messages, one file for each part of the app
// (client/app/i18n/loader.ts), and its guides' Markdown (client/app/pages/guides/guide-text.ts). The phone keeps
// them for the language it reads in, and English, so the pages open without a network
// (client/app/core/offline-languages.ts, docs/adr/0028-service-worker.md).
const languages = require('./regions/languages');

/** The parts of the app a page loads messages for (provideTranslocoScope in client/app/app.routes.ts), '' for the app's own. */
const SCOPES = [
  '',
  'site',
  'advice',
  'guides',
  'regions',
  'safety',
  'reference',
  'account',
  'recipe',
  'records',
  'notebook',
  'library',
  'server',
  'chemistry'
];

/**
 * The parts whose English comes with the code or the data, which the app never fetches (CODED_SCOPES in
 * client/app/i18n/loader.ts), and the one part that has English only.
 */
const CODED_SCOPES = ['server', 'chemistry', 'records', 'safety', 'regions', 'advice'];
const ENGLISH_ONLY_SCOPES = ['reference'];

/** The guides, as /guides/<slug> (the public pages in lib/pages.js; a test keeps them in step). */
const GUIDES = ['glazing-basics', 'making-a-glaze', 'safe-mixing', 'home-safety', 'firing', 'learn-with-john-britt'];
/** The guides written in English only. */
const ENGLISH_ONLY_GUIDES = ['learn-with-john-britt'];

/**
 * The addresses of the files the app reads for a language. A pseudo-locale reads the English. Some may not exist
 * (a part or a guide not translated yet): the app reads those as empty, or in English.
 * @param {string} code
 * @returns {string[]}
 */
function filesFor(code) {
  if (languages.languageFor(code)?.pseudo) code = 'en';
  const english = code === 'en';
  const parts = SCOPES.filter(
    (scope) => (!english || !CODED_SCOPES.includes(scope)) && (english || !ENGLISH_ONLY_SCOPES.includes(scope))
  ).map((scope) => `/i18n/${scope ? scope + '/' : ''}${code}.json`);
  const guides = GUIDES.filter((guide) => english || !ENGLISH_ONLY_GUIDES.includes(guide)).map(
    (guide) => `/i18n/guides/${guide}/${code}.md`
  );
  return [...parts, ...guides];
}

/**
 * The language a file under /i18n/ is in ('de' for /i18n/guides/firing/de.md), or null for an address that is not one.
 * @param {string} address
 * @returns {string | null}
 */
const languageOfFile = (address) =>
  /^\/i18n\/(?:[a-z-]+\/)*([A-Za-z-]+)\.(?:json|md)$/.exec(address.split(/[?#]/)[0])?.[1] ?? null;

module.exports = { SCOPES, GUIDES, filesFor, languageOfFile };
