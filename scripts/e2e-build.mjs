// Builds the client for the browser tests only when the build in dist/ is
// missing or older than its sources, so a run straight after another, or after
// npm run build, starts its server at once (playwright.config.js runs this
// before the server). E2E_BUILD=always builds anyway; E2E_BUILD=never uses
// dist/ as it is.
//
//   node scripts/e2e-build.mjs
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const INDEX = path.join(ROOT, 'dist', 'glazecalc', 'browser', 'index.html');
const PRERENDERED = path.join(ROOT, 'dist', 'glazecalc', 'prerendered');
// What the client build and the prerendering read.
const SOURCES = [
  'client',
  'lib',
  'angular.json',
  'tsconfig.json',
  'tsconfig.app.json',
  'package.json',
  'package-lock.json',
  'scripts/prerender.mjs'
];

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

/** Why the build must run again, or '' when dist/ is up to date. */
export const staleReason = () => {
  if (!fs.existsSync(INDEX)) return 'no build in dist/';
  // ng build empties dist/glazecalc first, so a build whose prerendering failed has none.
  if (!fs.existsSync(PRERENDERED) || fs.readdirSync(PRERENDERED).length === 0) return 'no prerendered pages';
  const built = fs.statSync(INDEX).mtimeMs;
  const changed = SOURCES.find((source) => newest(path.join(ROOT, source)) > built);
  return changed ? changed + ' changed since the last build' : '';
};

const mode = process.env.E2E_BUILD || 'auto';
const reason = mode === 'always' ? 'E2E_BUILD=always' : mode === 'never' ? '' : staleReason();
if (reason) {
  console.log('Building the client for the browser tests (' + reason + ')...');
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const build = spawnSync(npm, ['run', 'build'], { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' });
  process.exit(build.status ?? 1);
}
console.log('Using the client build in dist/ (up to date).');
