'use strict';

// The core's caps (lib/core/chemistry/caps.js), its problems in English.
const { inWords } = require('./messages');
const core = require('../core/chemistry/index.ts');

const cappedLeastSquares = inWords(core.cappedLeastSquares);

module.exports = {
  cappedLeastSquares
};
