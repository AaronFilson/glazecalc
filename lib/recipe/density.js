'use strict';

// The core's dry SG (lib/core/recipe/density.js), with each part of a recipe by its name
// (docs/adr/0030-nameless-chemistry-core.md).
const { inWords } = require('../chemistry/messages');
const core = require('../core/recipe/density');

const MINERALS = core.MINERALS;
const KINDS = core.KINDS;
const GLASS_VOLUMES = core.GLASS_VOLUMES;
const MOST_UNKNOWN_SHARE = core.MOST_UNKNOWN_SHARE;
const glassDensity = inWords(core.glassDensity);
const materialSg = inWords(core.materialSg);

/** A recipe's dry SG (lib/core/recipe/density.js), each part named. */
const recipeDrySg = inWords((lines) => {
  const result = /** @type {any} */ (core.recipeDrySg(lines));
  return { ...result, parts: result.parts.map(({ id, ...part }) => ({ name: id, ...part })) };
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
