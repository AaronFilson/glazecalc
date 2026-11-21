// The three-engine check: each library's output check (lib/core/test/engine-outputs.js over the core's
// fixture, lib/catalog/test/engine-outputs.js over the catalog's data), bundled as one plain script and run in
// Node, JavaScriptCore (jsc) and SpiderMonkey (sm). Every output must give the same text in all three, so the
// libraries hold in Safari and Firefox as they do in Node and Chromium (V8). It compares the engines with each
// other, not with a kept copy: scripts/chemistry-outputs.mjs keeps what the answers are.
//
//   node scripts/engines.mjs                 both libraries, all three engines
//   node scripts/engines.mjs core            one library
//   node scripts/engines.mjs --keep <dir>    also writes each bundle and each engine's output there
//
// The engines: JSC and SM from the environment, else ~/.esvu/bin (npx esvu install jsc, then spidermonkey), else
// macOS's own jsc. One missing fails the check: a check that quietly ran in fewer engines would say nothing.
//
// A bare engine shell has no structuredClone, which the core takes from its host (lib/core/globals.d.ts). The
// bundle gives one there, as a JSON copy: what the core copies are records read from JSON, so it is the same.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { build } from 'esbuild';

const ROOT = path.resolve(import.meta.dirname, '..');

const LIBRARIES = {
  core: `import { outputs } from './lib/core/test/engine-outputs.js';
const rows = outputs();`,
  catalog: `import { outputs } from './lib/catalog/test/engine-outputs.js';
import materials from './lib/catalog/data/materials.ndjson';
import additives from './lib/catalog/data/additives.ndjson';
const rows = outputs({ materials, additives });`
};

const PRINT = `
const write = typeof print === 'function' ? print : console.log;
for (const [key, value] of rows) write(key + '\\t' + (JSON.stringify(value) ?? 'undefined'));`;

const STAND_IN = `if (typeof structuredClone !== 'function')
  globalThis.structuredClone = (value) => (value === undefined ? undefined : JSON.parse(JSON.stringify(value)));`;

/** Where an engine is: its variable, ~/.esvu/bin, or (for jsc) the one macOS has. */
function engineAt(name, variable, others = []) {
  const found = [process.env[variable], path.join(homedir(), '.esvu', 'bin', name), ...others].filter(Boolean);
  return found.find((file) => existsSync(file));
}

const ENGINES = {
  node: process.execPath,
  jsc: engineAt('jsc', 'JSC', ['/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc']),
  sm: engineAt('sm', 'SM')
};

/** One library's check as a single script for a bare engine. */
async function bundle(library) {
  const { outputFiles } = await build({
    stdin: { contents: LIBRARIES[library] + PRINT, resolveDir: ROOT, sourcefile: `${library}-engines.js` },
    bundle: true,
    write: false,
    format: 'iife',
    platform: 'neutral',
    target: 'esnext',
    loader: { '.ndjson': 'text' },
    banner: { js: STAND_IN },
    logLevel: 'silent'
  });
  return outputFiles[0].text;
}

/** An engine's run of a bundle: each output's key and the hash of its text, or why it failed. */
function runIn(engine, file) {
  const done = spawnSync(ENGINES[engine], [file], { encoding: 'utf8', maxBuffer: 1 << 30 });
  if (done.status !== 0 || done.error) {
    // jsc writes an uncaught exception to stdout, after the outputs: the lines that are not outputs.
    const said = (done.stdout ?? '').split('\n').filter((line) => line && !line.includes('\t'));
    const why = done.error?.message ?? [done.stderr.trim(), ...said].filter(Boolean).join('\n');
    return { failed: why || `exit ${done.status}`, stdout: done.stdout ?? '' };
  }
  const rows = new Map();
  for (const line of done.stdout.split('\n')) {
    if (!line) continue;
    const tab = line.indexOf('\t');
    rows.set(
      line.slice(0, tab),
      createHash('sha256')
        .update(line.slice(tab + 1))
        .digest('hex')
        .slice(0, 16)
    );
  }
  return { rows, stdout: done.stdout };
}

const args = process.argv.slice(2);
const keepAt = args.includes('--keep') ? path.resolve(args[args.indexOf('--keep') + 1]) : null;
const wanted = args.filter((a, i) => a in LIBRARIES && args[i - 1] !== '--keep');
const libraries = wanted.length ? wanted : Object.keys(LIBRARIES);

const missing = Object.entries(ENGINES).filter(([, file]) => !file);
if (missing.length) {
  console.error(
    `No ${missing.map(([name]) => name).join(' or ')} found. Install with: npx esvu install jsc and npx esvu install spidermonkey,\n` +
      'or name them with JSC=… SM=…'
  );
  process.exit(1);
}

const dir = keepAt ?? path.join(ROOT, 'node_modules', '.cache', 'engines');
mkdirSync(dir, { recursive: true });
let failed = false;
for (const library of libraries) {
  const file = path.join(dir, `${library}.js`);
  writeFileSync(file, await bundle(library));
  const runs = {};
  for (const engine of Object.keys(ENGINES)) {
    const started = Date.now();
    runs[engine] = runIn(engine, file);
    runs[engine].seconds = ((Date.now() - started) / 1000).toFixed(1);
    if (keepAt) writeFileSync(path.join(dir, `${library}.${engine}.txt`), runs[engine].stdout);
  }
  const broken = Object.entries(runs).filter(([, r]) => r.failed);
  for (const [engine, r] of broken)
    console.error(`${library} in ${engine} failed:\n  ${r.failed.split('\n').slice(0, 6).join('\n  ')}`);
  if (broken.length) {
    failed = true;
    continue;
  }
  const keys = [...new Set(Object.values(runs).flatMap((r) => [...r.rows.keys()]))];
  const differ = keys.filter((key) => new Set(Object.values(runs).map((r) => r.rows.get(key))).size > 1);
  const times = Object.entries(runs)
    .map(([engine, r]) => `${engine} ${r.seconds} s`)
    .join(', ');
  if (differ.length) {
    failed = true;
    console.error(`${library}: ${differ.length} of ${keys.length} outputs differ between the engines (${times}):`);
    for (const key of differ.slice(0, 40))
      console.error(
        `  ${key}  ${Object.entries(runs)
          .map(([e, r]) => `${e} ${r.rows.get(key) ?? '-'}`)
          .join('  ')}`
      );
    if (!keepAt) console.error('To see the outputs: node scripts/engines.mjs --keep <dir>, then diff two of them.');
  } else {
    console.log(`${library}: all ${keys.length} outputs the same in Node, JavaScriptCore and SpiderMonkey (${times}).`);
  }
}
if (failed) process.exit(1);
