'use strict';

// The core's shelf (lib/core/recipe/shelf.js), its problems in English (docs/adr/0030-nameless-chemistry-core.md).
const { HOST } = require('../chemistry/host');
const { inWords } = require('../chemistry/messages');
const { idsNamed } = require('./ids');
const core = require('../core/recipe/shelf.ts');

// The materials to avoid and the clays not to cap, given by name.
const matchFromShelf = inWords((lines, shelf, options = {}) => {
  const records = [...lines, ...shelf.map((tried) => tried.material)];
  return core.matchFromShelf(HOST, lines, shelf, {
    ...options,
    avoid: idsNamed(options.avoid, records),
    uncapped: idsNamed(options.uncapped, records)
  });
});

module.exports = { matchFromShelf };
