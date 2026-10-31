// Writes the translations the standard materials' pages and the cone chart need,
// and nothing more, picked out of each language's records/<language>.json:
//
//   dist/i18n-generated/materials/<language>.json   the materials' notes and hazards
//   dist/i18n-generated/cones/<language>.json       the cone charts' notes
//
// which the build serves as /i18n/materials/<language>.json and /i18n/cones/<language>.json
// (angular.json, assets).
//
//   node scripts/material-i18n.mjs     (npm run build, npm run watch and npm run dev run it first)
//
// records/ holds every standard record's words, about 90 kB in English and up
// to 180 kB in other languages. A material's page needs the materials' alone,
// and the cone chart, which is prerendered in each language and carries the
// files it loads (docs/adr/0016), three notes. The translations stay in records/,
// where the translators keep them (scripts/i18n-sources.mjs); these files are
// made from them at each build and never edited. As for the advice page's
// (scripts/advice-i18n.mjs).
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(import.meta.dirname, '..');
const RECORDS = path.join(ROOT, 'client', 'public', 'i18n', 'records');
export const OUT = path.join(ROOT, 'dist', 'i18n-generated');

const require = createRequire(import.meta.url);

/** The standard materials, as data/materials.ndjson has them. */
export const standardMaterials = () =>
  readFileSync(path.join(ROOT, 'data', 'materials.ndjson'), 'utf8')
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));

/** The keys of the materials' words in records/ (lib/regions/languages.js textKey), as the page looks them up. */
export function materialKeys() {
  const { textKey } = require('../lib/regions/languages.js');
  const keys = new Set();
  for (const material of standardMaterials()) {
    const texts = [...(material.notes ?? []), material.hazards];
    if (material.source?.name === 'Theoretical formula') texts.push(material.source.name);
    for (const text of texts) if (typeof text === 'string' && text.trim()) keys.add(textKey(text));
  }
  return keys;
}

/** The keys of the cone charts' notes in records/. */
export function coneKeys() {
  const { textKey } = require('../lib/regions/languages.js');
  return new Set(require('../lib/cones/index.js').texts().map(textKey));
}

/** Each language's file for the keys given, by its name ('de.json'), from records/. */
function filesFor(keys) {
  const files = {};
  for (const name of readdirSync(RECORDS)
    .filter((file) => file.endsWith('.json'))
    .sort()) {
    const records = JSON.parse(readFileSync(path.join(RECORDS, name), 'utf8'));
    files[name] = JSON.stringify(Object.fromEntries(Object.entries(records).filter(([key]) => keys.has(key))));
  }
  return files;
}

/** Each language's materials file, by its name ('de.json'). */
export const materialFiles = () => filesFor(materialKeys());

/** Each language's cone notes file, by its name ('de.json'). */
export const coneFiles = () => filesFor(coneKeys());

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  let count = 0;
  for (const [folder, files] of [
    ['materials', materialFiles()],
    ['cones', coneFiles()]
  ]) {
    const dir = path.join(OUT, folder);
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    for (const [name, text] of Object.entries(files)) writeFileSync(path.join(dir, name), text + '\n');
    count = Object.keys(files).length;
  }
  console.log(`Wrote the standard materials' and the cone charts' words for ${count} languages.`);
}
