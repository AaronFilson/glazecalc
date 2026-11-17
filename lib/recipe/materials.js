'use strict';

// The core's materials (lib/core/recipe/materials.js), its problems in English (docs/adr/0030-nameless-chemistry-core.md).
const { inWords } = require('../chemistry/messages');
const core = require('../core/recipe/materials.ts');

const oxidePercent = inWords(core.oxidePercent);
const oxidesPerGram = inWords(core.oxidesPerGram);
const gramsApart = inWords(core.gramsApart);
const likeForLike = inWords(core.likeForLike);
const roleOf = inWords(core.roleOf);
const fluxesOf = inWords(core.fluxesOf);
const unityOf = inWords(core.unityOf);
const molesOf = inWords(core.molesOf);
const expansionOf = inWords(core.expansionOf);

const LIKE_FOR_LIKE_GRAMS = core.LIKE_FOR_LIKE_GRAMS;

module.exports = {
  LIKE_FOR_LIKE_GRAMS,
  oxidePercent,
  oxidesPerGram,
  gramsApart,
  likeForLike,
  roleOf,
  fluxesOf,
  unityOf,
  molesOf,
  expansionOf
};
