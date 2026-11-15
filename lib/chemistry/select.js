'use strict';

// The core's select (lib/core/chemistry/select.js), its problems in English.
const { inWords } = require('./messages');
const core = require('../core/chemistry/select');

const selectMaterials = inWords(core.selectMaterials);
const unityOf = inWords(core.unityOf);

const GOOD_ENOUGH = core.GOOD_ENOUGH;
const WORTH_ADDING = core.WORTH_ADDING;

module.exports = {
  selectMaterials,
  unityOf,
  GOOD_ENOUGH,
  WORTH_ADDING
};
