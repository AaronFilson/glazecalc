'use strict';

// The core's fit (lib/core/chemistry/fit.js), its problems in English.
const { inWords } = require('./messages');
const core = require('../core/chemistry/fit');

module.exports = exports = {
  fitAmounts: inWords(core.fitAmounts),
  bestFit: inWords(core.bestFit),
  prepare: inWords(core.prepare),
  molesPerGram: inWords(core.molesPerGram),
  oxideMoles: inWords(core.oxideMoles),
  newMeter: inWords(core.newMeter),
  spent: inWords(core.spent),
  CLOSE: core.CLOSE,
  CLOSE_SHARE: core.CLOSE_SHARE,
  CLOSE_APART: core.CLOSE_APART,
  ALKALIS: core.ALKALIS,
  WORK: core.WORK
};
