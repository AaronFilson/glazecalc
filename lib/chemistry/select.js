'use strict';

// The core's select (lib/core/chemistry/select.js), its problems in English.
const { inWords } = require('./messages');
const core = require('../core/chemistry/select');

module.exports = exports = {
  selectMaterials: inWords(core.selectMaterials),
  unityOf: inWords(core.unityOf),
  GOOD_ENOUGH: core.GOOD_ENOUGH,
  WORTH_ADDING: core.WORTH_ADDING
};
