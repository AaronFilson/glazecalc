// Runs the cone check (lib/recipe/cone-fit.js, docs/adr/0022) over its test
// set and prints the false-note rate per band: of the recipes it judges, the
// share given a note ("looks cooler" or "looks hotter") although their cone
// is the one their author states. The owner's bar for shipping is 5%.
//
//   node scripts/cone-fit-check.mjs [--lines <file>] [--list]
//
// The set (scripts/cone-fit-test-set.json) keeps Glazy's recipes as their
// unity formulas, under Glazy's licence (CC BY-NC-SA 4.0, as that file says).
// Digitalfire's and Katz's recipes are not ours to keep: their rows have only
// a code, a name and a cone, and are measured only when --lines names a JSON
// file of their lines entered by hand, { "G1214M": [["Silica", 20], ...] },
// with names from the app's library. --list prints each row's result.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(import.meta.dirname, '..');
const { coneFit } = require('../lib/recipe/cone-fit.js');
const { firingBands } = require('../lib/cones/firing.js');
const chemistry = require('../lib/chemistry/index.js');

/** Glazy's atmospheres that are a process here (lib/cones/firing.js PROCESSES). */
const PROCESSES = { Wood: 'wood', Soda: 'soda', Salt: 'salt', Raku: 'raku', Pit: 'pit' };

/** A row's stated firing as a firing block: Glazy's "9 - 10" is cone 9 to 10. */
export function blockOf(row) {
  const [low, high] = String(row.cone).split(/\s*-\s*/);
  const processes = (row.atmospheres ?? []).map((a) => PROCESSES[a]).filter(Boolean);
  return {
    scale: 'orton',
    low,
    ...(high && high !== low && { high }),
    ...(processes.length && { processes })
  };
}

/** The app's standard materials, for rows entered by hand. */
const standardMaterials = () =>
  readFileSync(path.join(ROOT, 'data', 'materials.ndjson'), 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));

/**
 * Each row's result and the count per band: rows, those with a formula, those
 * skipped (can't judge), judged, notes, and the false-note rate. `lines` gives
 * the hand-entered rows' materials by code or name.
 */
export function measure(set, lines = {}) {
  const library = Object.keys(lines).length ? standardMaterials() : [];
  const results = set.rows.map((row) => {
    const key = row.code ?? row.name;
    let unity = row.unity;
    let materials = row.materials ?? [];
    if (!unity && lines[key]) {
      const recipe = lines[key].map(([material, amount]) => ({ material, amount }));
      unity = chemistry.calculateUMF(recipe, { materials: library }).umf;
      materials = lines[key].map(([material]) => material);
    }
    const block = blockOf(row);
    const bands = firingBands(block);
    const band = bands.length === 1 ? bands[0] : bands.join('+');
    const fit = unity ? coneFit(unity, block, { materials }) : null;
    return { row, band, fit };
  });
  const bands = {};
  for (const { band, fit } of results) {
    const count = (bands[band] ??= { rows: 0, computed: 0, skipped: 0, judged: 0, notes: 0, closer: 0 });
    count.rows++;
    if (!fit) continue;
    count.computed++;
    if (fit.verdict === 'skipped') count.skipped++;
    else count.judged++;
    if (fit.verdict === 'cooler' || fit.verdict === 'hotter') count.notes++;
    if (fit.verdict === 'closer') count.closer++;
  }
  const total = Object.values(bands).reduce(
    (sum, c) => ({ judged: sum.judged + c.judged, notes: sum.notes + c.notes }),
    { judged: 0, notes: 0 }
  );
  for (const count of [...Object.values(bands), total]) count.rate = count.judged ? count.notes / count.judged : 0;
  return { results, bands, total };
}

const percent = (x) => (100 * x).toFixed(1) + '%';
/** What the report proposed, as the verdicts here name it. */
const expected = (verdict) => ({ cooler: 'cooler', hotter: 'hotter', skipped: 'skip' })[verdict] ?? 'none';

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const args = process.argv.slice(2);
  const linesAt = args.indexOf('--lines');
  const lines = linesAt >= 0 ? JSON.parse(readFileSync(args[linesAt + 1], 'utf8')) : {};
  const set = JSON.parse(readFileSync(path.join(ROOT, 'scripts', 'cone-fit-test-set.json'), 'utf8'));
  const { results, bands, total } = measure(set, lines);
  for (const { row, band, fit } of results) {
    const label = `${row.row ? '#' + row.row : row.random ? 'random' : ''} ${row.source} ${row.code ?? row.id ?? ''} ${row.name} (cone ${row.cone}, ${band})`;
    const got = fit ? fit.verdict + (fit.skipped ? ' ' + fit.skipped : '') : 'no formula';
    const differs = fit && row.expect && expected(fit.verdict) !== row.expect;
    if (args.includes('--list') || (fit && (fit.verdict === 'cooler' || fit.verdict === 'hotter')) || differs) {
      console.log(`${label}: ${got}${differs ? ` (the report proposed ${row.expect})` : ''}`);
    }
  }
  console.log('');
  for (const [band, c] of Object.entries(bands)) {
    console.log(
      `${band}: ${c.rows} rows, ${c.computed} with a formula, ${c.skipped} can't judge, ${c.judged} judged, ` +
        `${c.notes} false notes (${percent(c.rate)}), ${c.closer} "closer to one end"`
    );
  }
  console.log(`All bands: ${total.notes} false notes in ${total.judged} judged (${percent(total.rate)}).`);
}
