// Builds the client for the browser tests only when the build in dist/ is
// missing, unfinished or older than its sources, so a run straight after
// another starts its server at once (playwright.config.js runs this before the
// server). E2E_BUILD=always builds anyway; E2E_BUILD=never uses dist/ as it is.
//
// A build this script finishes, prerendering included, leaves a marker in
// dist/glazecalc with the time it started; the sources are compared with that
// time, so a file saved while the build ran makes the next run build again.
// npm run build alone leaves no marker, so the next test run builds once more.
// Two runs in one checkout take turns (a lock file in dist/), and the second
// uses the first one's build when it is up to date.
//
//   node scripts/e2e-build.mjs
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(import.meta.dirname, '..');
// What the client build and the prerendering read. node_modules/.package-lock.json
// is the installed tree, which npm rewrites on each install.
export const SOURCES = [
  'client',
  'lib',
  'angular.json',
  'tsconfig.json',
  'tsconfig.app.json',
  'package.json',
  'package-lock.json',
  'node_modules/.package-lock.json',
  'scripts/prerender.mjs',
  'scripts/advice-i18n.mjs',
  'scripts/material-i18n.mjs',
  'scripts/locale-fallback.mjs',
  'scripts/build-skills.mjs',
  'skills',
  'data/advice.ndjson',
  'data/materials.ndjson'
];

const paths = (root) => ({
  index: path.join(root, 'dist', 'glazecalc', 'browser', 'index.html'),
  prerendered: path.join(root, 'dist', 'glazecalc', 'prerendered'),
  marker: path.join(root, 'dist', 'glazecalc', '.build-complete'),
  lock: path.join(root, 'dist', '.e2e-build.lock')
});

/** The newest modification time (ms) of the files under a path, or 0. */
const newest = (file) => {
  let stat;
  try {
    stat = fs.statSync(file);
  } catch {
    return 0;
  }
  if (!stat.isDirectory()) return stat.mtimeMs;
  let latest = stat.mtimeMs;
  for (const name of fs.readdirSync(file)) latest = Math.max(latest, newest(path.join(file, name)));
  return latest;
};

/** When the finished build in dist/ started (ms), or null when there is none. */
const builtAt = (root) => {
  try {
    const { started } = JSON.parse(fs.readFileSync(paths(root).marker, 'utf8'));
    return typeof started === 'number' ? started : null;
  } catch {
    return null;
  }
};

/** Why the build must run again, or '' when dist/ is up to date. */
export const staleReason = (root = ROOT) => {
  const { index, prerendered } = paths(root);
  if (!fs.existsSync(index)) return 'no build in dist/';
  // ng build empties dist/glazecalc first, so a build stopped partway has no marker.
  const started = builtAt(root);
  if (started === null) return 'no finished build in dist/';
  if (!fs.existsSync(prerendered) || fs.readdirSync(prerendered).length === 0) return 'no prerendered pages';
  const changed = SOURCES.find((source) => newest(path.join(root, source)) > started);
  return changed ? changed + ' changed since the last build' : '';
};

/** Records that a build which started at `started` (ms) finished. */
export const markBuilt = (root, started) =>
  fs.writeFileSync(paths(root).marker, JSON.stringify({ started, finished: Date.now() }) + '\n');

const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

const alive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code === 'EPERM';
  }
};

/**
 * Runs `fn` holding this checkout's build lock, waiting while another living
 * process holds it; a lock left by a process that has ended is taken over.
 */
export const withLock = (root, fn, { waitMs = 30 * 60 * 1000, onWait = () => {} } = {}) => {
  const { lock } = paths(root);
  fs.mkdirSync(path.dirname(lock), { recursive: true });
  const until = Date.now() + waitMs;
  let waited = false;
  for (;;) {
    try {
      fs.writeFileSync(lock, String(process.pid), { flag: 'wx' });
      break;
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
    }
    let holder;
    try {
      holder = Number(fs.readFileSync(lock, 'utf8'));
    } catch (e) {
      if (e.code === 'ENOENT') continue; // let go just now
      throw e;
    }
    if (!holder || !alive(holder)) {
      // Ended without letting go (or only just made the file: then it is empty
      // for a moment, and taking it over is harmless as the two runs then both
      // check dist/ again before building).
      if (holder || fs.statSync(lock).mtimeMs < Date.now() - 5000) fs.rmSync(lock, { force: true });
      else sleep(200);
      continue;
    }
    if (Date.now() > until)
      throw new Error('Gave up waiting for process ' + holder + ' to finish building (' + lock + ')');
    if (!waited) onWait(holder);
    waited = true;
    sleep(1000);
  }
  try {
    return fn();
  } finally {
    fs.rmSync(lock, { force: true });
  }
};

const main = () => {
  const mode = process.env.E2E_BUILD || 'auto';
  if (mode === 'never') {
    console.log('Using the client build in dist/ as it is (E2E_BUILD=never).');
    return 0;
  }
  return withLock(
    ROOT,
    () => {
      const reason = mode === 'always' ? 'E2E_BUILD=always' : staleReason();
      if (!reason) {
        console.log('Using the client build in dist/ (up to date).');
        return 0;
      }
      console.log('Building the client for the browser tests (' + reason + ')...');
      const started = Date.now();
      fs.rmSync(paths(ROOT).marker, { force: true });
      const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
      const build = spawnSync(npm, ['run', 'build'], {
        cwd: ROOT,
        stdio: 'inherit',
        shell: process.platform === 'win32'
      });
      if (build.status !== 0) return build.status ?? 1;
      markBuilt(ROOT, started);
      return 0;
    },
    { onWait: (pid) => console.log('Waiting for the build in process ' + pid + ' to finish...') }
  );
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exit(main());
