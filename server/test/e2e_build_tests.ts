import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { markBuilt, SOURCES, staleReason, withLock } from '../../scripts/e2e-build.mjs';
import { expect } from './support/app.ts';

// When the browser tests build the client again (scripts/e2e-build.mjs): a
// build counts once its marker says it finished, and only sources changed
// after it started make it stale.
describe('the browser tests’ build', () => {
  let root: string;
  const write = (file: string, text = 'x') => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), text);
  };
  const age = (file: string, ms: number) => {
    const when = new Date(Date.now() - ms);
    fs.utimesSync(path.join(root, file), when, when);
  };

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'glazecalc-e2e-build-'));
    for (const source of SOURCES) {
      write(source.includes('.') ? source : source + '/a.ts');
      age(source.includes('.') ? source : source + '/a.ts', 60000);
      if (!source.includes('.')) age(source, 60000);
    }
    write('dist/glazecalc/browser/index.html');
    write('dist/glazecalc/prerendered/en/index.html');
  });
  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  it('is stale with no build, and with a build that never finished', () => {
    fs.rmSync(path.join(root, 'dist'), { recursive: true });
    expect(staleReason(root)).to.equal('no build in dist/');
    write('dist/glazecalc/browser/index.html');
    expect(staleReason(root)).to.equal('no finished build in dist/');
  });

  it('is up to date after a finished build, and compares sources with when it started', () => {
    markBuilt(root, Date.now() - 10000);
    expect(staleReason(root)).to.equal('');
    // Saved while the build ran: after it started, before it finished.
    age('client/a.ts', 5000);
    expect(staleReason(root)).to.equal('client changed since the last build');
  });

  it('counts a new install of the packages as a change', () => {
    markBuilt(root, Date.now() - 10000);
    write('node_modules/.package-lock.json');
    expect(staleReason(root)).to.equal('node_modules/.package-lock.json changed since the last build');
  });

  it('lets one process build at a time and takes over a lock its holder left', async () => {
    const lock = path.join(root, 'dist', '.e2e-build.lock');
    // A process that has ended left its lock behind.
    const ended = spawn(process.execPath, ['-e', '']);
    await new Promise((resolve) => ended.on('exit', resolve));
    fs.writeFileSync(lock, String(ended.pid));
    expect(withLock(root, () => fs.readFileSync(lock, 'utf8'))).to.equal(String(process.pid));
    expect(fs.existsSync(lock)).to.equal(false);

    // A living one holds it: the wait gives up.
    const holder = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 10000)']);
    try {
      fs.writeFileSync(lock, String(holder.pid));
      let waitedFor = 0;
      expect(() => withLock(root, () => 1, { waitMs: 500, onWait: (pid) => (waitedFor = pid) })).to.throw(
        /Gave up waiting/
      );
      expect(waitedFor).to.equal(holder.pid);
    } finally {
      holder.kill();
    }
  });
});
