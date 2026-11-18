'use strict';

// The core's slurry (lib/core/recipe/slurry.js), its problems in English (docs/adr/0030-nameless-chemistry-core.md).
const { inWords } = require('../chemistry/messages');
const core = require('../core/recipe/slurry.ts');

const dryPerLitre = inWords(core.dryPerLitre);
const slurryContents = inWords(core.slurryContents);
const waterToReach = inWords(core.waterToReach);
const reachedAlready = inWords(core.reachedAlready);
const waterForBatch = inWords(core.waterForBatch);
const batchForVolume = inWords(core.batchForVolume);
const sgFromBaume = inWords(core.sgFromBaume);
const baumeFromSg = inWords(core.baumeFromSg);
const sgFromPint = inWords(core.sgFromPint);
const pintFromSg = inWords(core.pintFromSg);

const SG_TARGET_RANGE = require('../catalog/policy.ts').SG_TARGET_RANGE;
const LITRES = core.LITRES;

module.exports = {
  SG_TARGET_RANGE,
  LITRES,
  dryPerLitre,
  slurryContents,
  waterToReach,
  reachedAlready,
  waterForBatch,
  batchForVolume,
  sgFromBaume,
  baumeFromSg,
  sgFromPint,
  pintFromSg
};
