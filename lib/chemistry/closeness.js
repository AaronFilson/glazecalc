'use strict';

// The core's closeness (lib/core/chemistry/closeness.js), its problems in English.
const { inWords } = require('./messages');
const core = require('../core/chemistry/closeness');

const closeness = inWords(core.closeness);

module.exports = {
  closeness
};
