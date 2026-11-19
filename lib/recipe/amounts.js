'use strict';

// The core's amounts (lib/core/recipe/amounts.js), its problems in English (docs/adr/0030-nameless-chemistry-core.md).
const { inWords } = require('../chemistry/messages');
const core = require('../core/recipe/basics/index.ts');

const unitOf = inWords(core.unitOf);
const isAmount = inWords(core.isAmount);
const amountOf = inWords(core.amountOf);
const totalOf = inWords(core.totalOf);
const formatAmount = inWords(core.formatAmount);
const plainAmount = inWords(core.plainAmount);
const wholePartsFactor = inWords(core.wholePartsFactor);
const formatScaled = inWords(core.formatScaled);
const rebase = inWords(core.rebase);
const batchWeights = inWords(core.batchWeights);

module.exports = {
  unitOf,
  isAmount,
  amountOf,
  totalOf,
  formatAmount,
  plainAmount,
  wholePartsFactor,
  formatScaled,
  rebase,
  batchWeights
};
