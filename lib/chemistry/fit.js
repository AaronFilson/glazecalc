'use strict';

// The core's fit (lib/core/chemistry/fit.js), its problems in English.
const { withHost } = require('./host');
const { inWords } = require('./messages');
const core = require('../core/chemistry/index.ts');

const fitAmounts = inWords(withHost(core.fitAmounts));
const bestFit = inWords(withHost(core.bestFit));
const prepare = inWords(withHost(core.prepare));
const molesPerGram = inWords(withHost(core.molesPerGram));
const oxideMoles = inWords(withHost(core.oxideMoles));
const newMeter = inWords(core.newMeter);
const spent = inWords(core.spent);

const CLOSE = core.CLOSE;
const CLOSE_SHARE = core.CLOSE_SHARE;
const CLOSE_APART = core.CLOSE_APART;
const ALKALIS = core.ALKALIS;
const WORK = core.WORK;
const WORK_CEILING = core.WORK_CEILING;

module.exports = {
  fitAmounts,
  bestFit,
  prepare,
  molesPerGram,
  oxideMoles,
  newMeter,
  spent,
  CLOSE,
  CLOSE_SHARE,
  CLOSE_APART,
  ALKALIS,
  WORK,
  WORK_CEILING
};
