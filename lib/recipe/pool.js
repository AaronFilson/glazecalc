'use strict';

// The core's pool (lib/core/recipe/pool.js), its problems in English (docs/adr/0030-nameless-chemistry-core.md).
const { HOST, withHost } = require('../chemistry/host');
const { inWords } = require('../chemistry/messages');
const { idsNamed } = require('./ids');
const core = require('../core/recipe/index.ts');

const placesFor = inWords(core.placesFor);
const changed = inWords(core.changed);
const added = inWords(core.added);
const removed = inWords(core.removed);
const lastResort = inWords(core.lastResort);
// The clays not to cap, given by name.
const selectHoldingClay = inWords((lines, target, options = {}) =>
  core.selectHoldingClay(HOST, lines, target, {
    ...options,
    uncapped: idsNamed(
      options.uncapped,
      lines.map((line) => line.material)
    )
  })
);
const explain = inWords(withHost(core.explain));
const recipeFrom = inWords(withHost(core.recipeFrom));
const scaled = inWords(core.scaled);
const addingUp = inWords(core.addingUp);

module.exports = {
  placesFor,
  changed,
  added,
  removed,
  lastResort,
  selectHoldingClay,
  explain,
  recipeFrom,
  scaled,
  addingUp
};
