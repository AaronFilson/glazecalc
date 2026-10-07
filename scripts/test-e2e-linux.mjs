// npm run test:e2e:linux [-- playwright args]
//
// Runs the browser tests on Linux in Docker, as CI does, on the working tree as
// it is now, uncommitted changes and new files included (ignored files are left
// out). On Windows it goes through WSL (GLAZECALC_WSL_DISTRO picks a distribution
// other than the default one), which needs Docker running inside it; on Linux and
// macOS it runs Docker directly. What failed is copied to test-results-linux/.
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'glazecalc-linux-'));

// The working tree as a tar, through a temporary index so what is staged is left alone.
const git = (gitArgs) =>
  execFileSync('git', gitArgs, {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, GIT_INDEX_FILE: path.join(work, 'index') }
  }).trim();
git(['read-tree', 'HEAD']);
git(['add', '--all']);
const tree = git(['write-tree']);
const tar = path.join(work, 'source.tar');
git(['archive', '--format=tar', '-o', tar, tree]);

const script = path.join(root, 'scripts', 'test-e2e-linux.sh');
const results = path.join(root, 'test-results-linux');
// C:\Users\me\... is /mnt/c/Users/me/... inside WSL.
const inWsl = (file) => '/mnt/' + file[0].toLowerCase() + file.slice(2).replace(/\\/g, '/');
const distro = process.env.GLAZECALC_WSL_DISTRO;
const [command, commandArgs] =
  process.platform === 'win32'
    ? ['wsl', [...(distro ? ['-d', distro] : []), '--', 'bash', inWsl(script), inWsl(tar), inWsl(results), ...args]]
    : ['bash', [script, tar, results, ...args]];

const run = spawnSync(command, commandArgs, { stdio: 'inherit' });
fs.rmSync(work, { recursive: true, force: true });
if (run.error) {
  console.error(`Could not start ${command}: ${run.error.message}`);
  process.exit(1);
}
process.exit(run.status ?? 1);
