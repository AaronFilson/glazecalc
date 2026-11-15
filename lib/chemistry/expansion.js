'use strict';

// The core's expansion (lib/core/chemistry/expansion.js), its problems in English.
const { inWords } = require('./messages');
const core = require('../core/chemistry/expansion');

module.exports = exports = {
  EXPANSION: core.EXPANSION,
  expansion: inWords(core.expansion)
};
