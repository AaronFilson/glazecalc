'use strict';

// The core's swaps (lib/core/recipe/swaps.js), the library looked up by name (docs/adr/0030-nameless-chemistry-core.md).
const { inWords } = require('../chemistry/messages');
const { byName } = require('./ids');
const core = require('../core/recipe/swaps.ts');

const modernMaterials = inWords((materials, find, region, options) =>
  core.modernMaterials(materials, byName(find), region, options)
);

module.exports = { modernMaterials };
