'use strict';

// The core's lead (lib/core/chemistry/lead.js), its problems in English.
const { inWords } = require('./messages');
const core = require('../core/chemistry/lead.ts');

const boronFor = inWords(core.boronFor);
const leadFreeTarget = inWords(core.leadFreeTarget);

const CONES = core.CONES;

module.exports = {
  CONES,
  boronFor,
  leadFreeTarget
};
