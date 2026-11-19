'use strict';

// The core's swaps (lib/core/recipe/swaps.js), the library looked up by name (docs/adr/0030-nameless-chemistry-core.md).
const { HOST } = require('../chemistry/host');
const { inWords } = require('../chemistry/messages');
const { byName } = require('./ids');
const core = require('../core/recipe/index.ts');

const modernMaterials = inWords((materials, find, region, options) =>
  core.modernMaterials(HOST, materials, byName(find), region, options)
);

module.exports = { modernMaterials };
