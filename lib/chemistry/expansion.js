'use strict';

// The core's expansion (lib/core/chemistry/expansion.js), its problems in English.
const { withHost } = require('./host');
const { inWords } = require('./messages');
const catalog = require('../catalog/host/index.ts');
const core = require('../core/chemistry/index.ts');

const expansion = inWords(withHost(core.expansion));

const EXPANSION = catalog.EXPANSION;

module.exports = {
  EXPANSION,
  expansion
};
