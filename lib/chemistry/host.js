'use strict';

const { traitsOf } = require('../recipe/traits');
const { sameKey } = require('../recipe/same-key');
const { OXIDES } = require('../catalog/oxides.ts');
const { CONES } = require('../catalog/cones.ts');
const { LIMITS, STULL } = require('../catalog/limits.ts');
const { DENSITIES } = require('../catalog/densities.ts');
const { EXPANSION } = require('../catalog/expansion.ts');
const { POLICY } = require('../catalog/policy.ts');

// Glazecalc's host for the core: how the core reads Glazecalc's records, and the tables it works from
// (docs/adr/0031-functional-core.md). The core keeps no readers or tables of its own, so every call into it
// from lib/chemistry, lib/recipe and lib/cones passes this. The tables are the catalog's (lib/catalog). It tells Glazecalc's records apart by their UUIDs, and a record without one (a line given
// only as an analysis, or saved before UUIDs and not yet given one) by its name, as it always was. Results
// call a record by its name, lines of the same material add up by sameKey, and the core reads what it
// needs to know of a record from its traits (lib/recipe/traits.js) (docs/adr/0030-nameless-chemistry-core.md).
const HOST = Object.freeze({
  idOf: (record) => (typeof record?.uuid === 'string' && record.uuid ? 'uuid:' + record.uuid : record.name),
  labelOf: (record) => record.name,
  keyOf: sameKey,
  traitsOf,
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
