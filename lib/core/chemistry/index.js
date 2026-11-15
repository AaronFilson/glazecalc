'use strict';

// The core's chemistry, nameless and without words (docs/adr/0030-nameless-chemistry-core.md).
const closeness = require('./closeness');
const expansionOf = require('./expansion');
const fit = require('./fit');
const lead = require('./lead');
const lsq = require('./lsq');
const select = require('./select');
const oxides = require('./oxides');
const materials = require('./materials');
const umf = require('./umf');

module.exports = exports = {
  WORK: fit.WORK,
  WORK_CEILING: fit.WORK_CEILING,
  ATOMIC_WEIGHTS: oxides.ATOMIC_WEIGHTS,
  CONES: lead.CONES,
  EXPANSION: expansionOf.EXPANSION,
  MOLAR_MASS: oxides.MOLAR_MASS,
  OXIDE_GROUPS: oxides.OXIDE_GROUPS,
  boronFor: lead.boronFor,
  boundedLeastSquares: lsq.boundedLeastSquares,
  calculateUMF: umf.calculateUMF,
  closeness: closeness.closeness,
  expansion: expansionOf.expansion,
  bestFit: fit.bestFit,
  fitAmounts: fit.fitAmounts,
  leadFreeTarget: lead.leadFreeTarget,
  materialWeights: materials.materialWeights,
  molesPerGram: fit.molesPerGram,
  newMeter: fit.newMeter,
  oxideMoles: fit.oxideMoles,
  oxidesGivenIn: materials.oxidesGivenIn,
  prepareMaterial: materials.prepareMaterial,
  selectMaterials: select.selectMaterials
};
