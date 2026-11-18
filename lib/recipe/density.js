'use strict';

// The core's dry SG (lib/core/recipe/density.js), with each part of a recipe by its name
// (docs/adr/0030-nameless-chemistry-core.md).
const { HOST, withHost } = require('../chemistry/host');
const { inWords } = require('../chemistry/messages');
const core = require('../core/recipe/density.ts');
const catalog = require('../catalog/densities.ts');

const MINERALS = catalog.MINERALS;
const KINDS = catalog.KINDS;
const GLASS_VOLUMES = catalog.GLASS_VOLUMES;
const MOST_UNKNOWN_SHARE = core.MOST_UNKNOWN_SHARE;
const glassDensity = inWords(withHost(core.glassDensity));
const materialSg = inWords(withHost(core.materialSg));

/** A recipe's dry SG (lib/core/recipe/density.js), each part named. */
const recipeDrySg = inWords((lines) => {
  const result = /** @type {any} */ (core.recipeDrySg(HOST, lines));
  return { ...result, parts: result.parts.map(({ label, ...part }) => ({ name: label, ...part })) };
});

module.exports = {
  MINERALS,
  KINDS,
  GLASS_VOLUMES,
  MOST_UNKNOWN_SHARE,
  glassDensity,
  materialSg,
  recipeDrySg
};
