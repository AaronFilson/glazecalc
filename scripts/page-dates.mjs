// Works out when each public page in each language last changed what it says (lib/page-dates.js), from one
// pass over git's history, and writes lib/page-dates.json for the sitemap's <lastmod>:
//
//   node scripts/page-dates.mjs
//
// Run where the whole history is checked out (fetch-depth: 0), before the image is built
// (.github/workflows/publish.yml). A page whose files have no commit gets no date.
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { PUBLIC_PAGES, prerenderLanguages } = require('../lib/pages.js');
const languages = require('../lib/regions/languages.js');
const { pageSources, dateKey } = require('../lib/page-dates.js');

/**
 * The newest commit date (YYYY-MM-DD) of each file, from git log's output, newest commit first:
 * a line "@2026-11-04" before the files each commit touched.
 * @param {string} log
 * @returns {Map<string, string>}
 */
export function newestDates(log) {
  const dates = new Map();
  let date = '';
  for (const line of log.split('\n')) {
    if (line.startsWith('@')) date = line.slice(1).trim();
    else if (line && date && !dates.has(line)) dates.set(line, date);
  }
  return dates;
}

/**
 * The newest date among a page's sources: a file's own, or for a folder (ending /) any file in it.
 * @param {string[]} sources
 * @param {Map<string, string>} dates
 * @returns {string | undefined}
 */
export function newestOf(sources, dates) {
  const found = sources.flatMap((source) =>
    source.endsWith('/')
      ? [...dates].filter(([file]) => file.startsWith(source)).map(([, date]) => date)
      : [dates.get(source)]
  );
  return found.filter(Boolean).sort().at(-1);
}

/**
 * Every page's date, keyed as lib/page-dates.js keeps them.
 * @param {Map<string, string>} dates
 * @returns {Record<string, string>}
 */
export function allPageDates(dates) {
  const out = {};
  for (const page of PUBLIC_PAGES) {
    for (const code of prerenderLanguages(page, languages.LIVE_LANGUAGES)) {
      const date = newestOf(pageSources(page, code), dates);
      if (date) out[dateKey(code, page)] = date;
    }
  }
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const log = execFileSync(
    'git',
    ['log', '--format=@%cs', '--name-only', '--', 'client/public/i18n', 'data', 'lib/cones'],
    { encoding: 'utf8', maxBuffer: 1 << 28 }
  );
  const out = allPageDates(newestDates(log));
  writeFileSync(fileURLToPath(new URL('../lib/page-dates.json', import.meta.url)), JSON.stringify(out) + '\n');
  console.log(`Wrote the dates of ${Object.keys(out).length} pages to lib/page-dates.json.`);
}
