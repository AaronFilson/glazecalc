// npm run og-images [-- language codes]
//
// Makes the link preview images (scripts/og-images.mjs) on Linux in Docker, in the
// browser tests' image, whose fonts cover every live language's script, from the
// working tree as it is now (as scripts/test-e2e-linux.mjs takes it). On Windows it
// goes through WSL (GLAZECALC_WSL_DISTRO picks a distribution other than the default).
// The images and lib/og-images.json are written back into this checkout.
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'glazecalc-og-'));
const git = (gitArgs) =>
  execFileSync('git', gitArgs, {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, GIT_INDEX_FILE: path.join(work, 'index') }
  }).trim();
git(['read-tree', 'HEAD']);
git(['add', '--all']);
const tar = path.join(work, 'source.tar');
git(['archive', '--format=tar', '-o', tar, git(['write-tree'])]);

const script = path.join(root, 'scripts', 'og-images-linux.sh');
const inWsl = (file) => '/mnt/' + file[0].toLowerCase() + file.slice(2).replace(/\\/g, '/');
const distro = process.env.GLAZECALC_WSL_DISTRO;
const args = process.argv.slice(2);
const [command, commandArgs] =
  process.platform === 'win32'
    ? ['wsl', [...(distro ? ['-d', distro] : []), '--', 'bash', inWsl(script), inWsl(tar), inWsl(root), ...args]]
    : ['bash', [script, tar, root, ...args]];
const run = spawnSync(command, commandArgs, { stdio: 'inherit' });
fs.rmSync(work, { recursive: true, force: true });
if (run.error) {
  console.error(`Could not start ${command}: ${run.error.message}`);
  process.exit(1);
}
process.exit(run.status ?? 1);
