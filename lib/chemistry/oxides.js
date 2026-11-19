'use strict';

// The elements and oxides: the catalog's tables (lib/catalog/oxides.ts), and the core's readers of them
// (lib/core/chemistry/oxides.ts) with Glazecalc's host, their problems in English.
const { inWords } = require('./messages');
const { withHost } = require('./host');
const core = require('../core/chemistry/index.ts');
const catalog = require('../catalog/host/index.ts');

const isFlux = inWords(withHost(core.isFlux));
const isOxide = inWords(withHost(core.isOxide));
const isVolatile = inWords(withHost(core.isVolatile));
const molarMass = inWords(withHost(core.molarMass));

const ATOMIC_WEIGHTS = catalog.ATOMIC_WEIGHTS;
const FLUX_GROUPS = core.FLUX_GROUPS;
const MOLAR_MASS = catalog.MOLAR_MASS;
const OXIDE_GROUPS = catalog.OXIDE_GROUPS;
const VOLATILES = catalog.VOLATILES;

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
