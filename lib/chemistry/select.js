'use strict';

// The core's select (lib/core/chemistry/select.js), its problems in English.
const { withHost } = require('./host');
const { inWords } = require('./messages');
const core = require('../core/chemistry/index.ts');

const selectMaterials = inWords(withHost(core.selectMaterials));
const unityOf = inWords(withHost(core.unityOf));

const GOOD_ENOUGH = core.GOOD_ENOUGH;
const WORTH_ADDING = core.WORTH_ADDING;

module.exports = {
  selectMaterials,
  unityOf,
  GOOD_ENOUGH,
  WORTH_ADDING
};
