// Writes the translations the standard materials' pages and the cone chart need,
// and nothing more, picked out of each language's records/<language>.json:
//
//   dist/i18n-generated/materials/<language>.json   the materials' notes and hazards
//   dist/i18n-generated/materials/<language>/<slug>.json   one material's, for its own page
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

/** The keys of one material's words in records/ (lib/regions/languages.js textKey), as its page looks them up. */
export function keysOf(material) {
  const { textKey } = require('../lib/regions/languages.js');
  const notes = Array.isArray(material.notes) ? material.notes : material.notes ? [material.notes] : [];
  const texts = [...notes, material.hazards];
  if (material.source?.name === 'Theoretical formula') texts.push(material.source.name);
  return new Set(texts.filter((text) => typeof text === 'string' && text.trim()).map(textKey));
}

/** The keys of the materials' words in records/, as the pages look them up. */
export function materialKeys() {
  const keys = new Set();
  for (const material of standardMaterials()) for (const key of keysOf(material)) keys.add(key);
  return keys;
}

/**
 * Each language's words for each material's page alone, by language and the page's slug
 * ({ de: { silica: '{…}' } }), from records/: a material's page loads only its own
 * (/i18n/materials/de/silica.json, pages/materials/material-route.ts), so the page
 * prerendered in each language carries a few hundred bytes of them, not every material's.
 */
export function perMaterialFiles() {
  const { materialSlug } = require('../lib/material-slug.js');
  const materials = standardMaterials().map((material) => [materialSlug(material.name), keysOf(material)]);
  const out = {};
  for (const name of readdirSync(RECORDS)
    .filter((file) => file.endsWith('.json') && file !== 'en.json')
    .sort()) {
    const records = JSON.parse(readFileSync(path.join(RECORDS, name), 'utf8'));
    const files = (out[name.slice(0, -'.json'.length)] = {});
    for (const [slug, keys] of materials) {
      files[slug] = JSON.stringify(
        Object.fromEntries([...keys].filter((key) => key in records).map((key) => [key, records[key]]))
      );
    }
  }
  return out;
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
  for (const [language, files] of Object.entries(perMaterialFiles())) {
    const dir = path.join(OUT, 'materials', language);
    mkdirSync(dir, { recursive: true });
    for (const [slug, text] of Object.entries(files)) writeFileSync(path.join(dir, slug + '.json'), text + '\n');
  }
  console.log(`Wrote the standard materials' and the cone charts' words for ${count} languages.`);
}
