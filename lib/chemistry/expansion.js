'use strict';

// The core's expansion (lib/core/chemistry/expansion.js), its problems in English.
const { inWords } = require('./messages');
const core = require('../core/chemistry/expansion');

const expansion = inWords(core.expansion);

const EXPANSION = core.EXPANSION;

module.exports = {
  EXPANSION,
  expansion
};
