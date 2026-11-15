'use strict';

// The core's lsq (lib/core/chemistry/lsq.js), its problems in English.
const { inWords } = require('./messages');
const core = require('../core/chemistry/lsq');

const boundedLeastSquares = inWords(core.boundedLeastSquares);
const normalEquations = inWords(core.normalEquations);

module.exports = {
  boundedLeastSquares,
  normalEquations
};
