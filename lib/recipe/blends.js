'use strict';

// The core's blends (lib/core/recipe/blends.js), its problems in English (docs/adr/0030-nameless-chemistry-core.md).
const { withHost } = require('../chemistry/host');
const { inWords } = require('../chemistry/messages');
const core = require('../core/recipe/blends.ts');
const { sameKey } = require('./same-key');

/**
 * A material varied in a base recipe (lib/core/recipe/blends.js): the lines are { name, amount }, matched
 * by name, as the core matches { id, amount } by id.
 */
function varyMaterial(base, material, amounts, mode, instead) {
  const varied = /** @type {any} */ (core.varyMaterial)(
    base.map((line) => ({ id: line.name, amount: line.amount })),
    material,
    amounts,
    mode,
    instead
  );
  if (!varied.tiles) return varied;
  return {
    tiles: varied.tiles.map((tile) => ({
      amount: tile.amount,
      lines: tile.lines.map((line) => ({ name: line.id, amount: line.amount }))
    }))
  };
}

const blendTiles = inWords(core.blendTiles);
const mixRecipes = inWords(withHost(core.mixRecipes));

const BLEND_CORNERS = core.BLEND_CORNERS;
const BLEND_STEPS = core.BLEND_STEPS;

module.exports = {
  BLEND_CORNERS,
  BLEND_STEPS,
  blendTiles,
  mixRecipes,
  sameKey,
  varyMaterial
};
