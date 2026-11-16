'use strict';

// The core's oxides (lib/core/chemistry/oxides.js), its problems in English.
const { inWords } = require('./messages');
const core = require('../core/chemistry/oxides');

const isFlux = inWords(core.isFlux);
const isOxide = inWords(core.isOxide);
const isVolatile = inWords(core.isVolatile);
const molarMass = inWords(core.molarMass);

const ATOMIC_WEIGHTS = core.ATOMIC_WEIGHTS;
const FLUX_GROUPS = core.FLUX_GROUPS;
const MOLAR_MASS = core.MOLAR_MASS;
const OXIDE_GROUPS = core.OXIDE_GROUPS;
const VOLATILES = core.VOLATILES;

module.exports = {
  ATOMIC_WEIGHTS,
  FLUX_GROUPS,
  MOLAR_MASS,
  OXIDE_GROUPS,
  VOLATILES,
  isFlux,
  isOxide,
  isVolatile,
  molarMass
};
