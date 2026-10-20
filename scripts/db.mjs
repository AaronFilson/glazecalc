// Development: runs MongoDB for this project, on ./db, listening only on this
// computer, with its cache capped. mongod's own default cache is half of the
// computer's memory, which it keeps once filled; the app's data here is a few
// megabytes, so 1 GB is plenty and leaves room for the browser tests.
//
//   npm run db                        (or: npm run db -- --logpath mongod.log --logappend)
//
// MONGOD names the mongod program when it is not on the PATH (in .env, as
// .env.example shows); MONGOD_DBPATH, MONGOD_PORT and MONGOD_CACHE_GB change
// the folder, the port and the cache. Anything after -- goes to mongod as is.
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const mongod = process.env.MONGOD || 'mongod';
const dbpath = process.env.MONGOD_DBPATH || fileURLToPath(new URL('../db', import.meta.url));
const port = process.env.MONGOD_PORT || '27017';
const cacheGB = process.env.MONGOD_CACHE_GB || '1';

mkdirSync(dbpath, { recursive: true });
const args = [
  '--dbpath',
  dbpath,
  '--bind_ip',
  '127.0.0.1',
  '--port',
  port,
  '--wiredTigerCacheSizeGB',
  cacheGB,
  ...process.argv.slice(2)
];
console.log(`${mongod} ${args.join(' ')}`);

const child = spawn(mongod, args, { cwd: root, stdio: 'inherit' });
child.on('error', (error) => {
  console.error(
    error.code === 'ENOENT'
      ? `Could not find ${mongod}. Install MongoDB, or set MONGOD to the mongod program in .env.`
      : error.message
  );
  process.exit(1);
});
// Ctrl+C reaches mongod from the terminal too, and it shuts down cleanly by
// itself, so this waits for it (on Windows, killing it would not be clean).
process.on('SIGINT', () => {});
process.on('SIGTERM', () => child.kill('SIGTERM'));
child.on('exit', (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
