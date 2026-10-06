// Development: runs the Angular dev server (port 3000, live reload) and the
// API server (port 4000, restarting on changes) together, and stops both when
// either exits or on Ctrl+C. The dev server proxies /api to port 4000
// (client/proxy.conf.json), so the browser still sees one origin.
//
//   node scripts/run.mjs dev
//
// Production needs only one process: `npm start` runs server/main.ts, which serves
// the built client and the API together.
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { styleText } from 'node:util';

const root = fileURLToPath(new URL('..', import.meta.url));
const ng = fileURLToPath(new URL('../node_modules/@angular/cli/bin/ng.js', import.meta.url));
// Loads .env when present; real environment variables still win.
const envFile = '--env-file-if-exists=.env';
const API_PORT = process.env.API_PORT || '4000';

const MODES = {
  dev: [
    // PORT is set here, so it overrides any PORT in .env (that one is for production).
    { name: 'api', color: 'cyan', args: ['--watch', envFile, 'server/main.ts'], env: { PORT: API_PORT } },
    { name: 'client', color: 'magenta', args: [ng, 'serve'] }
  ]
};

const mode = process.argv[2];
if (!MODES[mode]) {
  console.error('Usage: node scripts/run.mjs <' + Object.keys(MODES).join('|') + '>');
  process.exit(2);
}

const children = [];
let stopping = false;

const stopAll = (code) => {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) if (child.exitCode === null) child.kill();
};

for (const { name, color, args, env } of MODES[mode]) {
  // Spawn node itself rather than a shell, so killing it stops the server on Windows too.
  const child = spawn(process.execPath, args, {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: ['inherit', 'pipe', 'pipe']
  });
  const label = styleText(color, name.padEnd(6) + '|');
  for (const stream of [child.stdout, child.stderr]) {
    createInterface({ input: stream }).on('line', (line) => console.log(label, line));
  }
  child.on('exit', (code, signal) => {
    console.log(label, styleText('dim', 'exited ' + (signal ?? 'with code ' + code)));
    stopAll(code ?? 1);
  });
  children.push(child);
}

for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => stopAll(0));
