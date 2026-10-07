// Adds gathered materials and additives to the standard library
// (data/materials.ndjson and data/additives.ndjson) without changing the
// records already there, so their ids, and recipes' copies of them, stay put.
//
//   node scripts/add-library-records.js research/eu-feldspars.json [more.json]          shows what it would do
//   node scripts/add-library-records.js research/eu-feldspars.json [more.json] --write  adds them
//
// Each file is a JSON array of gathered records, as docs/adr/0009 describes:
//   { name, aliases, kind: 'material' | 'additive', category, region, status,
//     discontinuedSince, replaces, substitutes, manufacturer,
//     source: { name, url, date, type }, analysis: { SiO2: 68.5, ... },
//     loi, otherComponents: { F: 1.5 }, rawformula, notes, hazards }
// The analysis is fired oxides by weight; with the LOI and other components it
// must come to 100% within 2%. The chemistry is worked out as the materials
// page does. A record whose name, or one of its other names, is already in the
// library is left out; other names already taken are dropped; cross-references
// (replaces, substitutes) that name no record are dropped, with a note.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { MOLAR_MASS, formatFormula, materialWeights } = require('../lib/chemistry');

const FILES = { material: 'data/materials.ndjson', additive: 'data/additives.ndjson' };
const CATEGORIES = [
  'feldspar',
  'clay',
  'frit',
  'boron',
  'flux',
  'silica',
  'alumina',
  'opacifier',
  'colorant',
  'suspender',
  'other'
];
const REGIONS = ['US', 'UK', 'EU', 'CA', 'AU'];
const STATUSES = ['current', 'scarce', 'discontinued', 'historical'];
const SOURCE_KINDS = ['manufacturer', 'supplier', 'sds', 'digitalfire', 'glazy', 'book', 'theoretical'];
// The order of a record's fields, as in the data files.
const ORDER = [
  '_id',
  'rawformula',
  'equivalent',
  'percentmole',
  'molecularweight',
  'loi',
  'formulaweight',
  'name',
  'ownedBy',
  'notes',
  'fields',
  'aliases',
  'category',
  'region',
  'status',
  'statusSince',
  'substitutes',
  'replaces',
  'manufacturer',
  'hazards',
  'source'
];

const round = (n, places) => Number(Number(n).toFixed(places));
const readNdjson = (file) =>
  fs
    .readFileSync(file, 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));
const key = (name) => String(name).trim().toLowerCase();

/** The record as the data files keep it: chemistry worked out, empty fields left out, in ORDER. */
function toRecord(entry, problems) {
  const analysis = entry.analysis ?? {};
  for (const oxide of Object.keys(analysis)) {
    if (!MOLAR_MASS[oxide]) problems.push(`unknown oxide ${oxide}`);
  }
  const other = Object.values(entry.otherComponents ?? {}).reduce((sum, v) => sum + (Number(v) || 0), 0);
  const loi = round((Number(entry.loi) || 0) + other, 2);
  const total = Object.values(analysis).reduce((sum, v) => sum + (Number(v) || 0), 0) + loi;
  if (Math.abs(total - 100) > 2) problems.push(`analysis and LOI come to ${round(total, 2)}%, not 100%`);
  if (!CATEGORIES.includes(entry.category)) problems.push(`unknown category ${entry.category}`);
  for (const region of entry.region ?? []) if (!REGIONS.includes(region)) problems.push(`unknown region ${region}`);
  if (entry.status && !STATUSES.includes(entry.status)) problems.push(`unknown status ${entry.status}`);
  if (!entry.source?.name || !SOURCE_KINDS.includes(entry.source.type)) problems.push('no source, or an unknown kind');
  if (problems.length) return null;

  // Oxides published as 0 add nothing.
  const fields = Object.entries(analysis)
    .filter(([, amount]) => Number(amount) > 0)
    .map(([name, amount]) => ({ name, amount: String(amount) }));
  const weights = materialWeights({ name: entry.name, percentmole: 'percent', loi: String(loi), fields });
  if (weights.warnings.length) {
    problems.push(...weights.warnings);
    return null;
  }
  const analysisText =
    fields.map((f) => `${formatFormula(f.name)} ${f.amount}%`).join(', ') + (loi ? `, LOI ${loi}%` : '');
  const doc = {
    _id: { $oid: crypto.randomBytes(12).toString('hex') },
    rawformula: entry.rawformula ? formatFormula(entry.rawformula).replace(/·/g, '•') : analysisText,
    equivalent: round(weights.equivalent, 2),
    percentmole: 'percent',
    molecularweight: round(weights.molecularWeight, 2),
    loi: round(weights.loi, 2),
    formulaweight: round(weights.firedWeight, 2),
    name: entry.name.trim(),
    ownedBy: 'Standard',
    notes: entry.notes ? [entry.notes.trim()] : [],
    fields: fields.map((f) => ({ amountUnity: round(weights.unity[f.name] ?? 0, 4), amount: f.amount, name: f.name })),
    aliases: entry.aliases ?? [],
    category: entry.category,
    region: entry.region ?? [],
    status: entry.status ?? 'current',
    statusSince: entry.discontinuedSince ? String(entry.discontinuedSince) : undefined,
    substitutes: entry.substitutes ?? [],
    replaces: entry.replaces ?? [],
    manufacturer:
      entry.manufacturer && !/^(unknown|not stated)/i.test(entry.manufacturer) ? entry.manufacturer : undefined,
    hazards: entry.hazards || undefined,
    source: {
      name: entry.source.name,
      ...(entry.source.url ? { url: entry.source.url } : {}),
      ...(entry.source.date ? { date: String(entry.source.date) } : {}),
      kind: entry.source.type
    }
  };
  return Object.fromEntries(
    ORDER.filter((field) => {
      const v = doc[field];
      return v !== undefined && v !== '' && !(Array.isArray(v) && !v.length && field !== 'fields' && field !== 'notes');
    }).map((field) => [field, doc[field]])
  );
}

function main(args) {
  const write = args.includes('--write');
  const files = args.filter((arg) => !arg.startsWith('--'));
  if (!files.length) {
    console.error('Usage: node scripts/add-library-records.js <records.json>... [--write]');
    process.exit(2);
  }
  const library = { material: readNdjson(FILES.material), additive: readNdjson(FILES.additive) };
  // Every name and other name in the library, to the record's name.
  const names = new Map();
  for (const record of [...library.material, ...library.additive]) {
    for (const name of [record.name, ...(record.aliases ?? [])]) names.set(key(name), record.name);
  }

  const added = { material: [], additive: [] };
  let failed = 0;
  for (const file of files) {
    for (const entry of JSON.parse(fs.readFileSync(file, 'utf8'))) {
      const label = `${path.basename(file)}: ${entry.name}`;
      // Its name, or another name that is a record's own name: most likely that record again.
      const same = [entry.name, ...(entry.aliases ?? [])].find(
        (name) => names.has(key(name)) && (key(name) === key(entry.name) || key(names.get(key(name))) === key(name))
      );
      if (same) {
        console.log(`skip  ${label} (already in the library as ${names.get(key(same))})`);
        continue;
      }
      const kind = entry.kind === 'additive' ? 'additive' : 'material';
      const problems = [];
      const record = toRecord(entry, problems);
      if (!record) {
        failed++;
        console.log(`FAIL  ${label}: ${problems.join('; ')}`);
        continue;
      }
      const dropped = (record.aliases ?? []).filter(
        (alias) => names.has(key(alias)) || key(alias) === key(record.name)
      );
      if (dropped.length) {
        record.aliases = record.aliases.filter((alias) => !dropped.includes(alias));
        if (!record.aliases.length) delete record.aliases;
        console.log(`note  ${label}: other names already taken, left off: ${dropped.join(', ')}`);
      }
      for (const name of [record.name, ...(record.aliases ?? [])]) names.set(key(name), record.name);
      added[kind].push(record);
      console.log(`add   ${label} (${kind}, ${record.category}, ${record.fields.length} oxides)`);
    }
  }

  // Cross-references name records by their own names; ones that name nothing are dropped.
  for (const record of [...added.material, ...added.additive]) {
    for (const field of ['substitutes', 'replaces']) {
      if (!record[field]) continue;
      const resolved = [];
      for (const name of record[field]) {
        const target = names.get(key(name));
        if (target && target !== record.name) resolved.push(target);
        else console.log(`note  ${record.name}: ${field} "${name}" is not in the library, left off`);
      }
      if (resolved.length) record[field] = [...new Set(resolved)];
      else delete record[field];
    }
  }

  const count = added.material.length + added.additive.length;
  console.log(
    `\n${count} to add (${added.material.length} materials, ${added.additive.length} additives), ${failed} failed.`
  );
  if (!write) {
    console.log('Nothing written. Add --write to add them.');
    return;
  }
  for (const kind of ['material', 'additive']) {
    if (!added[kind].length) continue;
    const lines = added[kind].map((record) => JSON.stringify(record)).join('\n') + '\n';
    fs.appendFileSync(FILES[kind], lines);
  }
  console.log('Written. Run npm test to check the library.');
}

main(process.argv.slice(2));
