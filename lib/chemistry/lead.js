'use strict';

// The core's lead (lib/core/chemistry/lead.js), its problems in English.
const { inWords } = require('./messages');
const core = require('../core/chemistry/lead');

module.exports = exports = {
  CONES: core.CONES,
  boronFor: inWords(core.boronFor),
  leadFreeTarget: inWords(core.leadFreeTarget)
};
