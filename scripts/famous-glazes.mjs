// Writes the published famous glazes (lib/famous-glazes.js, docs/famous-glazes.md) for their pages, one
// file per language:
//
//   dist/i18n-generated/famous-glazes/<language>.json   served as /i18n/famous-glazes/<language>.json
//
//   node scripts/famous-glazes.mjs     (npm run build, npm run watch and npm run dev run it first)
//
// Only the glazes marked published that meet the publish bar are written, each with its materials'
// full records, so a page needs no other request; the build's prerender reads the same files. Each glaze
// carries its versions too (lib/famous-versions.js): the glaze made from each region's materials, and a
// lead glaze from its lead-free version's own, worked out here once for all the languages, with no bound
// on the search's work, so the page solves nothing. Each file holds the glazes' prose in English and its
// own language only (lib/famous-glazes.js glazeIn): every prerendered page carries the file it loads, and
// all the languages at once made the pages too big (scripts/prerender.mjs MAX_GZIPPED). A glaze marked
// published that fails the bar, or has a version that cannot be made or would be cut short, stops the
// build, naming why.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(import.meta.dirname, '..');
export const OUT = path.join(ROOT, 'dist', 'i18n-generated', 'famous-glazes');

const require = createRequire(import.meta.url);
const famous = require('../lib/famous-glazes.js');
const { glazeVersions } = require('../lib/famous-versions.js');
const { LANGUAGE_CODES } = require('../lib/regions/languages.js');

/**
 * The published glazes, resolved, each with its versions (by region, '' for a lead-free version's own
 * materials). Throws for a glaze marked published that fails the bar, then for one with a version that
 * cannot be made or would be cut short. `work` bounds each version's search; none does unless a test gives one.
 */
export function publishedGlazes(glazes = famous.loadGlazes(), { work } = {}) {
  const failing = glazes.filter((glaze) => glaze.published === true).flatMap((glaze) => famous.publishProblems(glaze));
  if (failing.length) throw new Error('A glaze marked published fails the bar:\n  ' + failing.join('\n  '));
  const made = famous.publishedGlazes(glazes).map((glaze) => {
    const resolved = famous.resolveGlaze(glaze);
    return { glaze: resolved, ...glazeVersions(resolved, { work }) };
  });
  const problems = made.flatMap((glaze) => glaze.problems);
  if (problems.length) throw new Error('A glaze marked published has a version to fix:\n  ' + problems.join('\n  '));
  return made.map(({ glaze, versions }) => ({ ...glaze, versions }));
}

/** Published glazes (publishedGlazes) as one language's file: the prose in that language and English, the versions as they are. */
const fileIn = (published, code) =>
  JSON.stringify(published.map(({ versions, ...glaze }) => ({ ...famous.glazeIn(glaze, code), versions }))) + '\n';

/** The published glazes in one language, as a file's text. Throws as publishedGlazes does. */
export function publishedFile(glazes = famous.loadGlazes(), code = 'en', options = {}) {
  return fileIn(publishedGlazes(glazes, options), code);
}

/** Each language's file, by its name ('de.json'); the versions are worked out once for all of them. */
export function publishedFiles(glazes = famous.loadGlazes(), options = {}) {
  const published = publishedGlazes(glazes, options);
  return Object.fromEntries(LANGUAGE_CODES.map((code) => [code + '.json', fileIn(published, code)]));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const files = publishedFiles();
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  for (const [name, text] of Object.entries(files)) writeFileSync(path.join(OUT, name), text);
  const glazes = JSON.parse(files['en.json']);
  const versions = glazes.reduce((sum, glaze) => sum + Object.keys(glaze.versions).length, 0);
  console.log(
    `Wrote ${glazes.length} published famous glaze(s), with ${versions} versions, in ${Object.keys(files).length} languages.`
  );
}
