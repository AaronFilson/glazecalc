// npm run test:e2e:both [-- playwright args]
//
// Runs the browser tests on this machine (npm run test:e2e) and on Linux in
// Docker (npm run test:e2e:linux) at the same time, and fails if either does.
// They do not share anything: the Linux run has its own MongoDB and network in
// Docker, and this machine's run its own port and database. Each line of
// output says which run it came from; the times come at the end.
//
// E2E_WORKERS sets each run's workers (by default a quarter of the cores each,
// so the two together use half, as one run alone does); E2E_PORT and
// E2E_MONGO_URI pick this machine's port and database, as for test:e2e.
import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { createInterface } from 'node:readline';

const root = path.resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const workers = process.env.E2E_WORKERS || String(Math.max(1, Math.floor(os.availableParallelism() / 4)));
const node = process.execPath;
const playwright = path.join(root, 'node_modules', '@playwright', 'test', 'cli.js');

const runs = [
  { name: 'here ', args: [playwright, 'test', ...args] },
  { name: 'linux', args: [path.join(root, 'scripts', 'test-e2e-linux.mjs'), ...args] }
];

const results = await Promise.all(
  runs.map(
    (run) =>
      new Promise((resolve) => {
        const started = Date.now();
        const child = spawn(node, run.args, {
          cwd: root,
          env: { ...process.env, E2E_WORKERS: workers },
          stdio: ['ignore', 'pipe', 'pipe']
        });
        for (const stream of [child.stdout, child.stderr]) {
          createInterface({ input: stream }).on('line', (line) => console.log('[' + run.name + '] ' + line));
        }
        child.on('error', (err) => {
          console.error('[' + run.name + '] could not start: ' + err.message);
          resolve({ ...run, code: 1, seconds: 0 });
        });
        child.on('close', (code) => resolve({ ...run, code: code ?? 1, seconds: (Date.now() - started) / 1000 }));
      })
  )
);

for (const { name, code, seconds } of results) {
  console.log(name.trim() + ': ' + (code === 0 ? 'passed' : 'FAILED') + ' in ' + Math.round(seconds) + ' s');
}
process.exit(results.every((result) => result.code === 0) ? 0 : 1);
