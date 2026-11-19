'use strict';

// The core's closeness (lib/core/chemistry/closeness.js), its problems in English.
const { withHost } = require('./host');
const { inWords } = require('./messages');
const core = require('../core/chemistry/index.ts');

const closeness = inWords(withHost(core.closeness));

module.exports = {
  closeness
};
