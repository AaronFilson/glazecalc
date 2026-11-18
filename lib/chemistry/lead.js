'use strict';

// The core's lead (lib/core/chemistry/lead.ts), its problems in English.
const { withHost } = require('./host');
const { inWords } = require('./messages');
const core = require('../core/chemistry/lead.ts');
const { ORTON_CHART_CONES } = require('../catalog/cones.ts');

const boronFor = inWords(core.boronFor);
const leadFreeTarget = inWords(withHost(core.leadFreeTarget));

// The cones a lead glaze is replaced for, 06 to 6, and the temperature each bends at: Orton's older chart
// for large cones heated at 150 °C an hour (the catalog's, lib/catalog/cones.ts), as the page offers them.
const from = ORTON_CHART_CONES.findIndex((c) => c.cone === '06');
const to = ORTON_CHART_CONES.findIndex((c) => c.cone === '6');
const CONES = Object.freeze(ORTON_CHART_CONES.slice(from, to + 1));

module.exports = {
  CONES,
  boronFor,
  leadFreeTarget
};
