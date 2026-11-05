// Writes the published famous glazes (lib/famous-glazes.js, docs/famous-glazes.md) for their pages:
//
//   dist/i18n-generated/famous-glazes/published.json   served as /i18n/famous-glazes/published.json
//
//   node scripts/famous-glazes.mjs     (npm run build, npm run watch and npm run dev run it first)
//
// Only the glazes marked published that meet the publish bar are written, each with its materials'
// full records, so a page needs no other request; the build's prerender reads the same file. A glaze
// marked published that fails the bar stops the build, naming why.
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(import.meta.dirname, '..');
export const OUT = path.join(ROOT, 'dist', 'i18n-generated', 'famous-glazes');

const require = createRequire(import.meta.url);
const famous = require('../lib/famous-glazes.js');

/** The file's text: the published glazes, resolved. Throws for one marked published that fails the bar. */
export function publishedFile(glazes = famous.loadGlazes()) {
  const failing = glazes.filter((glaze) => glaze.published === true).flatMap((glaze) => famous.publishProblems(glaze));
  if (failing.length) throw new Error('A glaze marked published fails the bar:\n  ' + failing.join('\n  '));
  return JSON.stringify(famous.publishedGlazes(glazes).map(famous.resolveGlaze)) + '\n';
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const text = publishedFile();
  mkdirSync(OUT, { recursive: true });
  writeFileSync(path.join(OUT, 'published.json'), text);
  console.log(`Wrote ${JSON.parse(text).length} published famous glaze(s).`);
}
