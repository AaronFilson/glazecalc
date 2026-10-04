'use strict';

const oxides = require('./oxides');
const materials = require('./materials');
const umf = require('./umf');

module.exports = exports = {
  MOLAR_MASS: oxides.MOLAR_MASS,
  OXIDE_GROUPS: oxides.OXIDE_GROUPS,
  FORMULA_MATERIALS: materials.FORMULA_MATERIALS,
  calculateUMF: umf.calculateUMF,
  formulaToAnalysis: materials.formulaToAnalysis,
  materialWeights: materials.materialWeights
};
