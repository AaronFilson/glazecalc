// Writes the published famous glazes (lib/famous-glazes.js, docs/famous-glazes.md) for their pages, one
// file per language:
//
//   dist/i18n-generated/famous-glazes/<language>.json   served as /i18n/famous-glazes/<language>.json
//
//   node scripts/famous-glazes.mjs     (npm run build, npm run watch and npm run dev run it first)
//
// Only the glazes marked published that meet the publish bar are written, each with its materials'
// full records, so a page needs no other request; the build's prerender reads the same files. Each file
// holds the glazes' prose in English and its own language only (lib/famous-glazes.js glazeIn): every
// prerendered page carries the file it loads, and all the languages at once made the pages too big
// (scripts/prerender.mjs MAX_GZIPPED). A glaze marked published that fails the bar stops the build,
// naming why.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(import.meta.dirname, '..');
export const OUT = path.join(ROOT, 'dist', 'i18n-generated', 'famous-glazes');

const require = createRequire(import.meta.url);
const famous = require('../lib/famous-glazes.js');
const { LANGUAGE_CODES } = require('../lib/regions/languages.js');

/** The published glazes, resolved, in one language, as a file's text. Throws for one marked published that fails the bar. */
export function publishedFile(glazes = famous.loadGlazes(), code = 'en') {
  const failing = glazes.filter((glaze) => glaze.published === true).flatMap((glaze) => famous.publishProblems(glaze));
  if (failing.length) throw new Error('A glaze marked published fails the bar:\n  ' + failing.join('\n  '));
  return (
    JSON.stringify(famous.publishedGlazes(glazes).map((glaze) => famous.glazeIn(famous.resolveGlaze(glaze), code))) +
    '\n'
  );
}

/** Each language's file, by its name ('de.json'). */
export function publishedFiles(glazes = famous.loadGlazes()) {
  return Object.fromEntries(LANGUAGE_CODES.map((code) => [code + '.json', publishedFile(glazes, code)]));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const files = publishedFiles();
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  for (const [name, text] of Object.entries(files)) writeFileSync(path.join(OUT, name), text);
  console.log(
    `Wrote ${JSON.parse(files['en.json']).length} published famous glaze(s) in ${Object.keys(files).length} languages.`
  );
}
