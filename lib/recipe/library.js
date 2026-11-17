'use strict';

// The core's library (lib/core/recipe/library.js), its problems in English (docs/adr/0030-nameless-chemistry-core.md).
const { inWords } = require('../chemistry/messages');
const core = require('../core/recipe/library.ts');

const hasLead = inWords(core.hasLead);
const inRegion = inWords(core.inRegion);
const isIdealMineral = inWords(core.isIdealMineral);
const suggestable = inWords(core.suggestable);

module.exports = {
  hasLead,
  inRegion,
  isIdealMineral,
  suggestable
};
