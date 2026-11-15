'use strict';

// The core's oxides (lib/core/chemistry/oxides.js), its problems in English.
const { inWords } = require('./messages');
const core = require('../core/chemistry/oxides');

module.exports = exports = {
  ATOMIC_WEIGHTS: core.ATOMIC_WEIGHTS,
  FLUX_GROUPS: core.FLUX_GROUPS,
  MOLAR_MASS: core.MOLAR_MASS,
  OXIDE_GROUPS: core.OXIDE_GROUPS,
  VOLATILES: core.VOLATILES,
  isFlux: inWords(core.isFlux),
  isOxide: inWords(core.isOxide),
  isVolatile: inWords(core.isVolatile),
  molarMass: inWords(core.molarMass)
};
