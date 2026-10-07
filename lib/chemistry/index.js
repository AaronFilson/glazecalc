'use strict';

const formula = require('./formula');
const oxides = require('./oxides');
const materials = require('./materials');
const umf = require('./umf');

module.exports = exports = {
  ATOMIC_WEIGHTS: oxides.ATOMIC_WEIGHTS,
  MOLAR_MASS: oxides.MOLAR_MASS,
  OXIDE_GROUPS: oxides.OXIDE_GROUPS,
  FORMULA_MATERIALS: materials.FORMULA_MATERIALS,
  calculateUMF: umf.calculateUMF,
  formatFormula: formula.formatFormula,
  formulaToAnalysis: materials.formulaToAnalysis,
  materialWeights: materials.materialWeights
};
