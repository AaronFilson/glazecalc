// The server tests (npm test). The files run in parallel, one per worker
// process at a time (each with a database of its own, see
// server/test/support/env.ts), largest first: the long files then start at
// once instead of last, and the short ones fill in around them.
const fs = require('node:fs');
const path = require('node:path');

const dir = path.join(__dirname, 'server', 'test');
const size = (name) => fs.statSync(path.join(dir, name)).size;
const spec = fs
  .readdirSync(dir)
  .filter((name) => name.endsWith('_tests.ts'))
  .sort((a, b) => size(b) - size(a) || a.localeCompare(b))
  .map((name) => 'server/test/' + name);

module.exports = {
  spec,
  require: ['server/test/support/env.ts', 'server/test/support/app.ts'],
  parallel: true,
  exit: true,
  timeout: 5000
};
