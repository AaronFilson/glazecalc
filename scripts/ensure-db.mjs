// Before the server tests (npm test, test:coverage), the MCP conformance run
// and the local browser tests (npm run test:e2e; npm scripts' pre hooks): if the test
// database is on this computer and nothing is listening there, start MongoDB
// the way `npm run db` does (scripts/db.mjs: ./db, 127.0.0.1, 1 GB cache) and
// wait until it answers. It is left running afterwards, like `npm run db`.
//
// Does nothing when MongoDB already answers, when the database is on another
// host, or on CI (which has its own MongoDB service). MONGOD names the mongod
// program when it is not on the PATH (in .env, as .env.example shows);
// MONGOD_DBPATH and MONGOD_CACHE_GB work as for `npm run db`.
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

// Same defaults as server/test/support/env.ts, scripts/mcp-conformance.mjs and playwright.config.js.
const uris = {
  mcp: process.env.MCP_MONGODB_URI || 'mongodb://127.0.0.1/glazecalc_mcp_conformance',
  e2e: process.env.E2E_MONGO_URI || 'mongodb://127.0.0.1/glazecalc_e2e'
};
const uri = uris[process.argv[2]] || process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1/glazecalc_test';

function hostAndPort(text) {
  const match = /^mongodb:\/\/(?:[^@/]*@)?([^/?,]+)/.exec(text);
  if (!match) return null;
  const hostPart = match[1];
  const colon = hostPart.lastIndexOf(':');
  return colon > 0 && !hostPart.endsWith(']')
    ? { host: hostPart.slice(0, colon), port: Number(hostPart.slice(colon + 1)) }
    : { host: hostPart, port: 27017 };
}

function answers(host, port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    socket.setTimeout(1000);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => resolve(false));
  });
}

const target = hostAndPort(uri);
const local = target && ['127.0.0.1', 'localhost', '[::1]'].includes(target.host);
if (process.env.CI || !local || (await answers(target.host, target.port))) process.exit(0);

const mongod = process.env.MONGOD || 'mongod';
const dbpath = process.env.MONGOD_DBPATH || fileURLToPath(new URL('../db', import.meta.url));
const cacheGB = process.env.MONGOD_CACHE_GB || '1';
mkdirSync(dbpath, { recursive: true });
const args = ['--dbpath', dbpath, '--bind_ip', '127.0.0.1', '--port', String(target.port)];
args.push('--wiredTigerCacheSizeGB', cacheGB);
console.log(`MongoDB was not running; starting it: ${mongod} ${args.join(' ')}`);

const child = spawn(mongod, args, { detached: true, stdio: 'ignore', windowsHide: true });
let failed = null;
child.on('error', (error) => {
  failed =
    error.code === 'ENOENT'
      ? `Could not find ${mongod}. Install MongoDB, or set MONGOD to the mongod program in .env.`
      : error.message;
});
child.on('exit', (code) => {
  failed ??= `mongod stopped at once (exit code ${code}); run npm run db to see why.`;
});
child.unref();

for (let waited = 0; waited < 30000; waited += 500) {
  if (failed) break;
  if (await answers(target.host, target.port)) process.exit(0);
  await new Promise((resolve) => setTimeout(resolve, 500));
}
console.error(failed || 'MongoDB did not answer within 30 seconds; run npm run db to see why.');
process.exit(1);
