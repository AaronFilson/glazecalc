// What the nameless core's own tests (npm run test:core) work from, as the core sees it, so that they read
// neither the app's data loader, MongoDB nor Mongoose, nor the catalog (docs/adr/0030, 0031):
// - lib/core/test/standard.json, the standard records. Each goes by its uuid as `id`, keeps only what the
//   core reads, and names its substitutes by id. No names, aliases, notes, sources or hazards.
// - lib/core/test/tables.json, the catalog's tables, which the tests' host passes (lib/catalog).
//
//   node scripts/core-fixture.mjs           writes the fixtures
//   node scripts/core-fixture.mjs --check   fails when a fixture is not what data/ and lib/catalog give
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { OXIDES } from '../lib/catalog/oxides.ts';

const ROOT = path.join(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'lib', 'core', 'test', 'standard.json');
const TABLES = path.join(ROOT, 'lib', 'core', 'test', 'tables.json');

// What the core reads of a record (beyond its id); anything else stays with the app.
const KEEP = [
  'percentmole',
  'molecularweight',
  'equivalent',
  'loi',
  'fields',
  'category',
  'traits',
  'fritRole',
  'fluorine',
  'soluble',
  'region',
  'status',
  'statusSince',
  'noChemistry'
];

const read = (collection) =>
  readFileSync(path.join(ROOT, 'data', collection + '.ndjson'), 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));

export function build() {
  const materials = read('materials');
  const additives = read('additives');
  const idByName = new Map([...materials, ...additives].map((record) => [record.name, record.uuid]));
  const strip = (record) => {
    const out = { id: record.uuid };
    for (const key of KEEP) if (record[key] !== undefined) out[key] = record[key];
    // The theoretical flag is the one thing the core reads of a source (lib/core/recipe/library.js).
    if (record.source?.kind) out.source = { kind: record.source.kind };
    if (record.substitutes?.length) {
      out.substitutes = record.substitutes.map((name) => {
        const id = idByName.get(name);
        if (!id) throw new Error(`${record.name}: no standard record for the substitute ${name}`);
        return id;
      });
    }
    // Plain fields: amounts as stored, no Mongo ids.
    if (out.fields) out.fields = out.fields.map(({ name, amount, amountUnity }) => ({ name, amount, amountUnity }));
    return out;
  };
  return { materials: materials.map(strip), additives: additives.map(strip) };
}

export const text = () => JSON.stringify(build(), null, 1) + '\n';

/** The catalog's tables, as the tests' host passes them. */
export const tablesText = () => JSON.stringify({ oxides: OXIDES }, null, 1) + '\n';

if (import.meta.main ?? process.argv[1] === import.meta.filename) {
  const fixtures = [
    [OUT, text()],
    [TABLES, tablesText()]
  ];
  if (process.argv.includes('--check')) {
    const stale = fixtures.filter(([file, wanted]) => readFileSync(file, 'utf8') !== wanted);
    for (const [file] of stale)
      console.error(`${path.relative(ROOT, file)} is out of date: node scripts/core-fixture.mjs`);
    if (stale.length) process.exit(1);
  } else {
    for (const [file, wanted] of fixtures) writeFileSync(file, wanted);
  }
}
