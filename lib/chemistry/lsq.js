'use strict';

// The core's lsq (lib/core/chemistry/lsq.js), its problems in English.
const { inWords } = require('./messages');
const core = require('../core/chemistry/lsq');

module.exports = exports = {
  boundedLeastSquares: inWords(core.boundedLeastSquares),
  normalEquations: inWords(core.normalEquations)
};
