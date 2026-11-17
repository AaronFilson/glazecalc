'use strict';

// The core's materials (lib/core/recipe/materials.js), its problems in English (docs/adr/0030-nameless-chemistry-core.md).
const { withHost } = require('../chemistry/host');
const { inWords } = require('../chemistry/messages');
const core = require('../core/recipe/materials.ts');

const oxidePercent = inWords(withHost(core.oxidePercent));
const oxidesPerGram = inWords(withHost(core.oxidesPerGram));
const gramsApart = inWords(withHost(core.gramsApart));
const likeForLike = inWords(withHost(core.likeForLike));
const roleOf = inWords(withHost(core.roleOf));
const fluxesOf = inWords(withHost(core.fluxesOf));
const unityOf = inWords(withHost(core.unityOf));
const molesOf = inWords(withHost(core.molesOf));
const expansionOf = inWords(withHost(core.expansionOf));

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
