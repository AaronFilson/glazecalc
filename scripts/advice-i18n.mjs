// Writes the translations the advice page needs, and nothing more: the words of
// the standard advice (data/advice.ndjson) picked out of each language's
// records/<language>.json, into dist/i18n-generated/advice/<language>.json,
// which the build serves as /i18n/advice/<language>.json (angular.json, assets).
//
//   node scripts/advice-i18n.mjs     (npm run build, npm run watch and npm run dev run it first)
//
// records/ holds every standard record's words, about 90 kB in English and up
// to 180 kB in other languages, almost all of them the materials' notes; the
// advice page shows 8 pieces of advice, and the prerendered page carries the
// files it loads (docs/adr/0016). The translations stay in records/, where the
// translators keep them (scripts/i18n-sources.mjs); this file is made from them
// at each build and never edited.
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(import.meta.dirname, '..');
const RECORDS = path.join(ROOT, 'client', 'public', 'i18n', 'records');
export const OUT = path.join(ROOT, 'dist', 'i18n-generated', 'advice');

/** The standard advice, as data/advice.ndjson has it. */
export const standardAdvice = () =>
  readFileSync(path.join(ROOT, 'data', 'advice.ndjson'), 'utf8')
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));

/** The keys of the advice's words in records/ (lib/regions/languages.js textKey), as the page looks them up. */
export function adviceKeys() {
  const { textKey } = createRequire(import.meta.url)('../lib/regions/languages.js');
  const keys = new Set();
  for (const advice of standardAdvice()) {
    for (const text of [advice.title, advice.content, ...(advice.tags ?? [])]) {
      if (typeof text === 'string' && text.trim()) keys.add(textKey(text));
    }
  }
  return keys;
}

/** Each language's advice file, by its name ('de.json'), from records/. */
export function adviceFiles() {
  const keys = adviceKeys();
  const files = {};
  for (const name of readdirSync(RECORDS)
    .filter((file) => file.endsWith('.json'))
    .sort()) {
    const records = JSON.parse(readFileSync(path.join(RECORDS, name), 'utf8'));
    files[name] = JSON.stringify(Object.fromEntries(Object.entries(records).filter(([key]) => keys.has(key))));
  }
  return files;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  const files = adviceFiles();
  for (const [name, text] of Object.entries(files)) writeFileSync(path.join(OUT, name), text + '\n');
  console.log(`Wrote the standard advice's words for ${Object.keys(files).length} languages.`);
}
