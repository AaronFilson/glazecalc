'use strict';

// The core's swaps (lib/core/recipe/swaps.js), its problems in English (docs/adr/0030-nameless-chemistry-core.md).
const { inWords } = require('../chemistry/messages');
const core = require('../core/recipe/swaps');

const modernMaterials = inWords(core.modernMaterials);

module.exports = {
  modernMaterials
};
