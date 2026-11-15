'use strict';

// The core's closeness (lib/core/chemistry/closeness.js), its problems in English.
const { inWords } = require('./messages');
const core = require('../core/chemistry/closeness');

module.exports = exports = {
  closeness: inWords(core.closeness)
};
