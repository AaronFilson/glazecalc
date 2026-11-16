// The standard records as the nameless core sees them (docs/adr/0030-nameless-chemistry-core.md):
// lib/core/test/standard.json, which the core's own tests (npm run test:core) read instead of the
// app's data loader, MongoDB or Mongoose. Each record goes by its uuid as `id`, keeps only what the
// core reads, and names its substitutes by id. No names, aliases, notes, sources or hazards.
//
//   node scripts/core-fixture.mjs           writes the fixture
//   node scripts/core-fixture.mjs --check   fails when the fixture is not what data/ gives
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.join(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'lib', 'core', 'test', 'standard.json');

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

if (import.meta.main ?? process.argv[1] === import.meta.filename) {
  if (process.argv.includes('--check')) {
    if (readFileSync(OUT, 'utf8') !== text()) {
      console.error('lib/core/test/standard.json is out of date: node scripts/core-fixture.mjs');
      process.exit(1);
    }
  } else {
    writeFileSync(OUT, text());
  }
}
