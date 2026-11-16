'use strict';

// The core's cost (lib/core/recipe/cost.js), its problems in English (docs/adr/0030-nameless-chemistry-core.md).
const { inWords } = require('../chemistry/messages');
const core = require('../core/recipe/cost');

const isPrice = inWords(core.isPrice);
const batchCost = inWords(core.batchCost);
const recipeCost = inWords(core.recipeCost);

const GRAMS_PER_KG = core.GRAMS_PER_KG;

module.exports = {
  GRAMS_PER_KG,
  isPrice,
  batchCost,
  recipeCost
};
