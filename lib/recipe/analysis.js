'use strict';

// The core's analysis (lib/core/recipe/analysis.js), its problems in English (docs/adr/0030-nameless-chemistry-core.md).
const { inWords } = require('../chemistry/messages');
const core = require('../core/recipe/analysis.ts');

const molePercent = inWords(core.molePercent);
const stullPoint = inWords(core.stullPoint);

const STULL = core.STULL;

module.exports = {
  molePercent,
  STULL,
  stullPoint
};
