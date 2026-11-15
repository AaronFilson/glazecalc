'use strict';

// The core's caps (lib/core/chemistry/caps.js), its problems in English.
const { inWords } = require('./messages');
const core = require('../core/chemistry/caps');

module.exports = exports = {
  cappedLeastSquares: inWords(core.cappedLeastSquares)
};
