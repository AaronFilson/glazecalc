'use strict';

// The core's shelf (lib/core/recipe/shelf.js), its problems in English (docs/adr/0030-nameless-chemistry-core.md).
const { inWords } = require('../chemistry/messages');
const { idsNamed } = require('./ids');
const core = require('../core/recipe/shelf');

// The materials to avoid and the clays not to cap, given by name.
const matchFromShelf = inWords((lines, shelf, options = {}) => {
  const records = [...lines, ...shelf.map((tried) => tried.material)];
  return core.matchFromShelf(lines, shelf, {
    ...options,
    avoid: idsNamed(options.avoid, records),
    uncapped: idsNamed(options.uncapped, records)
  });
});

module.exports = { matchFromShelf };
