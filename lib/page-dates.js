'use strict';

// When each public page in each language last changed what it says, for the
// sitemap's <lastmod> (server/lib/pages.ts). Search engines use lastmod only
// where it is honest, so a page's date is that of the newest commit to the
// files its words come from: its guide, its scope's messages in that
// language, the data it shows. A change to the app's code alone moves no date.
//
// The dates are worked out from git when the production image is built
// (scripts/page-dates.mjs, .github/workflows/publish.yml), into
// lib/page-dates.json, which is not committed. Without that file (a copy built
// anywhere else) the sitemap has no <lastmod>, as before.
const fs = require('node:fs');
const path = require('node:path');

const I18N = 'client/public/i18n/';

/**
 * The files and folders whose change changes what a page says in a language,
 * as paths from the repository's root (a folder ends with /).
 * @param {string} page
 * @param {string} code
 * @returns {string[]}
 */
function pageSources(page, code) {
  return [`${I18N}${code}.json`, ...ownSources(page, code)];
}

/** A page's sources beyond the language's own messages (<code>.json: every page's title and description). */
function ownSources(page, code) {
  const scope = (name, ext = 'json') => `${I18N}${name}/${code}.${ext}`;
  // A material's page in its language: its labels, its notes and hazards, and its line of the data.
  if (page.startsWith('/materials/')) return [scope('reference'), scope('records'), 'data/materials.ndjson'];
  if (page.startsWith('/guides/')) {
    const slug = page.slice('/guides/'.length);
    return [scope(`guides/${slug}`, 'md'), scope('guides')];
  }
  switch (page) {
    case '/guides':
      return [scope('guides')];
    case '/cones':
      // The charts' figures are in lib/cones/index.js; the other files there are code.
      return [scope('reference'), scope('records'), 'lib/cones/index.js'];
    case '/materials':
      return [scope('reference'), scope('records'), 'data/materials.ndjson'];
    case '/advice':
      return [scope('site'), scope('records'), 'data/advice.ndjson'];
    case '/signup':
      return [scope('account')];
    default:
      // The home page, about, privacy, terms and assistants: the site's messages.
      return [scope('site')];
  }
}

/**
 * The key a page's date is kept under: de/guides/firing.
 * @param {string} code
 * @param {string} page
 */
const dateKey = (code, page) => code + page;

let loaded;

/**
 * The dates worked out when the image was built, as { 'de/guides/firing': '2026-11-04' }; empty without them.
 * @returns {Readonly<Record<string, string>>}
 */
function pageDates() {
  if (loaded === undefined) {
    try {
      loaded = Object.freeze(JSON.parse(fs.readFileSync(path.join(__dirname, 'page-dates.json'), 'utf8')));
    } catch {
      loaded = Object.freeze({});
    }
  }
  return loaded;
}

module.exports = { pageSources, dateKey, pageDates };
