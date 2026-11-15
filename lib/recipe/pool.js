'use strict';

// The core's pool (lib/core/recipe/pool.js), its problems in English (docs/adr/0030-nameless-chemistry-core.md).
const { inWords } = require('../chemistry/messages');
const core = require('../core/recipe/pool');

const placesFor = inWords(core.placesFor);
const changed = inWords(core.changed);
const added = inWords(core.added);
const removed = inWords(core.removed);
const lastResort = inWords(core.lastResort);
const selectHoldingClay = inWords(core.selectHoldingClay);
const explain = inWords(core.explain);
const recipeFrom = inWords(core.recipeFrom);
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
