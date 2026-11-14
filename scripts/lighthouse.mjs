// Lighthouse on a production build (npm run lighthouse, and CI's Lighthouse job):
// the pages below on Lighthouse's desktop setting, three runs each, each page's
// median run kept. It fails when a page scores below scripts/lighthouse/lighthouserc.json:
// performance under 90, accessibility, best practices or SEO under 100, or layout
// shift over 0.01. README.md quotes the scores, and scripts/readme-numbers.mjs
// checks them against each CI run.
//
//   npm run lighthouse   builds when dist/ is out of date (scripts/e2e-build.mjs),
//                        loads the standard library into a database of its own
//                        (LIGHTHOUSE_MONGODB_URI, glazecalc_lighthouse), runs the
//                        app as production on LIGHTHOUSE_PORT (3200), runs
//                        Lighthouse, and stops the app. The reports go to
//                        lighthouse-results/: each run's HTML, and manifest.json.
//
// MongoDB and Chrome must be installed. Lighthouse CI is not the app's dependency:
// it is installed apart, at the exact version and with the lockfile in
// scripts/lighthouse/, by npm ci there with no install scripts, which this does
// when it is missing. CI runs that step itself. Its package.json overrides
// basic-ftp with 6.2.4, past get-uri's ^5: every 5.x has a high advisory (a CPU
// denial of service in its listing parser, GHSA-c475-qrg2-pj4r) and 6.2.3 a
// moderate one (its MLSD parser, GHSA-5pm8-86m8-9m6r). get-uri takes it only
// for ftp:// addresses, which nothing here fetches. Drop the override once
// get-uri asks for 6.2.4 or later.
import { spawn } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const tools = path.join(root, 'scripts', 'lighthouse');
const windows = process.platform === 'win32';
const lhci = path.join(tools, 'node_modules', '.bin', windows ? 'lhci.cmd' : 'lhci');
const config = path.join(tools, 'lighthouserc.json');
const port = process.env.LIGHTHOUSE_PORT || '3200';
const mongoUri = process.env.LIGHTHOUSE_MONGODB_URI || 'mongodb://127.0.0.1/glazecalc_lighthouse';
const site = `http://localhost:${port}`;

/** The pages measured: the intro, a long guide, the library's index and one material's page. */
export const PAGES = ['/', '/guides/glazing-basics', '/materials', '/materials/ferro-frit-3134'];

/** The app as production, as on the live site, with the stand-ins CI's Docker job uses. */
const appEnv = {
  ...process.env,
  NODE_ENV: 'production',
  PORT: port,
  MONGODB_URI: mongoUri,
  SITE_URL: site,
  APP_SECRET: 'lighthouse-only-secret',
  // compose.yaml's fixed test key, public and not secret (the base64 of
  // "glazecalc-compose-test-key-32byt"), as in CI's Docker job.
  MFA_KEY: 'Z2xhemVjYWxjLWNvbXBvc2UtdGVzdC1rZXktMzJieXQ=',
  MAIL_TRANSPORT: 'log'
};

const quote = (arg) => (/^[\w@./:=,-]+$/.test(arg) ? arg : JSON.stringify(arg));

/** Runs a command through the shell (for npm's .cmd shims on Windows); resolves with its exit code. */
const run = (command, args, { cwd = root, env = process.env } = {}) =>
  new Promise((resolve) => {
    const child = spawn([command, ...args].map(quote).join(' '), { cwd, env, shell: true, stdio: 'inherit' });
    child.on('close', (code) => resolve(code ?? 1));
  });

/** Starts the app and waits until it answers. */
const startServer = async () => {
  const server = spawn(process.execPath, ['server/main.ts'], {
    cwd: root,
    env: appEnv,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let log = '';
  server.stdout.on('data', (chunk) => (log += chunk));
  server.stderr.on('data', (chunk) => (log += chunk));
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error('The app stopped:\n' + log);
    try {
      if ((await fetch(`${site}/api/health`)).ok) return server;
    } catch {
      // Not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  server.kill();
  throw new Error('The app did not answer within a minute:\n' + log);
};

const step = async (what, command, args, options) => {
  const code = await run(command, args, options);
  if (code !== 0) {
    console.error(`${what} failed (exit ${code})`);
    process.exit(code);
  }
};

if (!existsSync(lhci)) {
  await step('Installing Lighthouse CI', 'npm', ['ci', '--ignore-scripts', '--no-audit', '--no-fund'], {
    cwd: tools
  });
}
await step('The build', process.execPath, ['scripts/e2e-build.mjs']);
await step('Loading the standard library', process.execPath, ['scripts/seed-standard.js'], {
  env: { ...process.env, MONGODB_URI: mongoUri }
});

rmSync(path.join(root, '.lighthouseci'), { recursive: true, force: true });
rmSync(path.join(root, 'lighthouse-results'), { recursive: true, force: true });
const server = await startServer();
let code;
try {
  const pages = PAGES.map((page) => '--url=' + site + page);
  // CI's runners keep Chrome out of the sandbox it would need a user namespace for.
  const sandbox = process.env.CI ? ['--settings.chromeFlags=--no-sandbox'] : [];
  code = await run(lhci, ['collect', '--config=' + config, ...pages, ...sandbox]);
  if (code === 0) {
    // The reports are kept before the scores are judged, so a run that fails still has them.
    code = await run(lhci, ['upload', '--config=' + config]);
    code = (await run(lhci, ['assert', '--config=' + config])) || code;
  }
} finally {
  server.kill();
}
process.exit(code);
