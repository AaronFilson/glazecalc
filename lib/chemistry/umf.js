'use strict';

const oxides = require('./oxides');
const materials = require('./materials');

// Accepts [{ material, amount }] or a { materialName: amount } map, which is
// the shape recipes are currently stored in.
const recipeLines = function (recipe) {
  if (Array.isArray(recipe)) return recipe;
  if (recipe && typeof recipe === 'object') {
    return Object.keys(recipe).map((name) => ({ material: name, amount: recipe[name] }));
  }
  throw new Error('Recipe must be an array of { material, amount } or a map of amounts');
};

/**
 * Calculates the Unity Molecular Formula of a glaze recipe.
 *
 * recipe: [{ material: 'Silica' | { name, analysis, loi }, amount: 30 }]
 *   or { Silica: 30, Whiting: 20 }. Amounts are batch weights in any unit.
 * options.materials: extra materials ({ name, analysis, loi } or
 *   { name, formula }) that extend or override the built-in library.
 *
 * Returns unrounded values:
 *   umf       moles of each oxide per 1.0 mole of flux (R2O + RO)
 *   groups    UMF totals per column: R2O, RO, R2O3, RO2
 *   siAlRatio SiO2 : Al2O3 molar ratio (null without alumina)
 *   analysis  fired oxide weight percent (volatiles excluded)
 *   loi       percent of the raw batch weight lost on firing
 *   warnings  non-fatal problems such as analyses that do not total 100%
 */
const calculateUMF = function (recipe, options) {
  options = options || {};
  const library = materials.buildLibrary(options.materials);
  const moles = {};
  let batchWeight = 0;
  let loiWeight = 0;
  const warnings = [];

  recipeLines(recipe).forEach((line) => {
    const amount = Number(line.amount);
    if (!isFinite(amount) || amount < 0) {
      throw new Error('Invalid amount for material ' + ((line.material && line.material.name) || line.material));
    }
    if (!line.material) throw new Error('Recipe line is missing a material');
    if (amount === 0) return;

    let material;
    if (typeof line.material === 'string') {
      material = library[materials.normalizeName(line.material)];
      if (!material) throw new Error('Unknown material ' + line.material);
    } else {
      material = materials.prepareMaterial(line.material);
    }
    material.warnings.forEach((warning) => {
      if (warnings.indexOf(warning) === -1) warnings.push(warning);
    });

    batchWeight += amount;
    loiWeight += (amount * material.loi) / 100;
    Object.keys(material.analysis).forEach((oxide) => {
      const oxideWeight = (amount * material.analysis[oxide]) / 100;
      moles[oxide] = (moles[oxide] || 0) + oxideWeight / oxides.MOLAR_MASS[oxide];
    });
  });

  let fluxMoles = 0;
  let firedWeight = 0;
  Object.keys(moles).forEach((oxide) => {
    if (oxides.isFlux(oxide)) fluxMoles += moles[oxide];
    firedWeight += moles[oxide] * oxides.MOLAR_MASS[oxide];
  });
  if (fluxMoles === 0) throw new Error('Recipe contains no flux oxides, so the UMF is undefined');

  const umf = {};
  const analysis = {};
  const groups = { R2O: 0, RO: 0, R2O3: 0, RO2: 0 };
  Object.keys(moles).forEach((oxide) => {
    umf[oxide] = moles[oxide] / fluxMoles;
    analysis[oxide] = ((moles[oxide] * oxides.MOLAR_MASS[oxide]) / firedWeight) * 100;
    groups[oxides.OXIDE_GROUPS[oxide]] += umf[oxide];
  });

  return {
    umf,
    groups,
    siAlRatio: umf.Al2O3 ? (umf.SiO2 || 0) / umf.Al2O3 : null,
    analysis,
    loi: (loiWeight / batchWeight) * 100,
    warnings
  };
};

module.exports = exports = { calculateUMF };
