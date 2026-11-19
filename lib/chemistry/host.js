'use strict';

const { READERS, OXIDES, CONES, LIMITS, STULL, DENSITIES, EXPANSION, POLICY } = require('../catalog/host/index.ts');

// Glazecalc's host for the core (docs/adr/0031-functional-core.md): how the core reads Glazecalc's records
// (the catalog's readers, lib/catalog/readers.ts) and the tables it works from (lib/catalog). The core keeps
// no readers or tables of its own, so every call into it from lib/chemistry, lib/recipe and lib/cones passes
// this.
const HOST = Object.freeze({
  ...READERS,
  oxides: OXIDES,
  cones: CONES,
  limits: LIMITS,
  stull: STULL,
  densities: DENSITIES,
  expansion: EXPANSION,
  policy: POLICY
});

/** A core function with Glazecalc's host given, taking the rest of its arguments as before. */
const withHost =
  (work) =>
  (...args) =>
    work(HOST, ...args);

module.exports = { HOST, withHost };
