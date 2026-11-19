'use strict';

// The core's analysis (lib/core/recipe/analysis.js), its problems in English (docs/adr/0030-nameless-chemistry-core.md).
const { withHost } = require('../chemistry/host');
const { inWords } = require('../chemistry/messages');
const catalog = require('../catalog/host/index.ts');
const core = require('../core/recipe/index.ts');

const molePercent = inWords(core.molePercent);
const stullPoint = inWords(withHost(core.stullPoint));

const STULL = catalog.STULL;

module.exports = {
  molePercent,
  STULL,
  stullPoint
};
