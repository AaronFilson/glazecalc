'use strict';

const { expansion } = require('./expansion');
const { formatFormula } = require('./formula');
const oxides = require('./oxides');
const materials = require('./materials');
const { problem, warning } = require('./messages');

// Fluxes under this share of the batch's oxide moles are only traces, such as
// the impurities in a clay and silica slip: dividing by them gives a unity
// formula of hundreds of moles of silica, which means nothing.
const TRACE_FLUX = 0.02;

// Colorant oxides stay fluxes, in RO with the rest (docs/adr/0004-shared-chemistry.md, amended
// 2026-11-13), so a unity formula whose fluxes are more than this share of them is scaled to the
// colorants and says little about how the glaze melts.
const COLORANT_FLUXES = ['FeO', 'MnO', 'CuO', 'CoO', 'NiO'];
const MOSTLY_COLORANT = 0.5;
// More SiO2 than this in the unity formula is unusually high for a glaze: a very high firing, too
// little flux, or not a glaze. It is not more than a glaze can melt: traditional Shinos (Kamado
// feldspar with 10-30% kaolin, Tsushima feldspar, Cornwall stone) reach 10.1 to 12.8 and melt at a
// very high firing; Shino of Kamado feldspar alone has 9.7.
const MOST_SILICA = 10;

// Accepts [{ material, amount }] or a { materialName: amount } map, which is
// the shape recipes are currently stored in.
const recipeLines = function (recipe) {
  if (Array.isArray(recipe)) return recipe;
  if (recipe && typeof recipe === 'object') {
    return Object.keys(recipe).map((name) => ({ material: name, amount: recipe[name] }));
  }
  throw problem('recipe-shape');
};

// A line's amount: a number, or a plain decimal as saved ("12.5", lib/recipe/numbers.js
// plainNumber); blank or null is 0. Anything else, such as "1e1", "0x10" or true, which
// Number() would read, is NaN.
const readAmount = function (value) {
  if (typeof value === 'number') return value;
  if (value === null || (typeof value === 'string' && value.trim() === '')) return 0;
  return typeof value === 'string' && /^-?\d*\.?\d+$/.test(value.trim()) ? Number(value) : NaN;
};

/**
 * A recipe line as calculateUMF reads it: its amount, and its material, by name
 * from `library` (a buildLibrary) or prepared as given; null for an amount of 0.
 * Throws invalid-amount, missing-material or unknown-material, or the material's
 * own problem. The worked calculation (lib/recipe/worked.js) reads lines with it too.
 */
const readLine = function (line, library) {
  const amount = readAmount(line.amount);
  const name = (line.material && line.material.name) || line.material;
  if (!isFinite(amount) || amount < 0) {
    throw problem('invalid-amount', { material: name });
  }
  if (!line.material) throw problem('missing-material');
  if (amount === 0) return null;

  if (typeof line.material === 'string') {
    const material = library[materials.normalizeName(line.material)];
    if (!material) throw problem('unknown-material', { material: line.material });
    return { amount, name, material };
  }
  return { amount, name, material: materials.prepareMaterial(line.material) };
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
 *   expansion calculated thermal expansion, x10^-6 per °C (expansion.js)
 *   warnings  non-fatal problems such as analyses that do not total 100%, or
 *             fluxes that are only traces, in English; warningCodes has each
 *             one's code and values (messages.js)
 */
const calculateUMF = function (recipe, options) {
  options = options || {};
  const library = materials.buildLibrary(options.materials);
  const moles = {};
  let batchWeight = 0;
  let loiWeight = 0;
  let firedWeight = 0;
  const warningCodes = [];

  recipeLines(recipe).forEach((line) => {
    const read = readLine(line, library);
    if (!read) return;
    const { amount, name, material } = read;
    material.warningCodes.forEach((warning) => {
      if (!warningCodes.some((other) => other.message === warning.message)) warningCodes.push(warning);
    });

    batchWeight += amount;
    loiWeight += (amount * material.loi) / 100;
    Object.keys(material.analysis).forEach((oxide) => {
      const oxideWeight = (amount * material.analysis[oxide]) / 100;
      moles[oxide] = (moles[oxide] || 0) + oxideWeight / oxides.MOLAR_MASS[oxide];
      firedWeight += oxideWeight;
    });
    // So large an amount that the batch's sums overflow.
    if (!isFinite(batchWeight) || !isFinite(loiWeight) || !isFinite(firedWeight)) {
      throw problem('invalid-amount', { material: name });
    }
  });

  let fluxMoles = 0;
  let allMoles = 0;
  Object.keys(moles).forEach((oxide) => {
    if (oxides.isFlux(oxide)) fluxMoles += moles[oxide];
    allMoles += moles[oxide];
  });
  if (fluxMoles === 0) throw problem('no-flux');
  const trace = fluxMoles < TRACE_FLUX * allMoles;
  if (trace) warningCodes.push(warning('trace-flux'));

  const umf = {};
  const analysis = {};
  const groups = { R2O: 0, RO: 0, R2O3: 0, RO2: 0 };
  Object.keys(moles).forEach((oxide) => {
    umf[oxide] = moles[oxide] / fluxMoles;
    analysis[oxide] = ((moles[oxide] * oxides.MOLAR_MASS[oxide]) / firedWeight) * 100;
    groups[oxides.OXIDE_GROUPS[oxide]] += umf[oxide];
  });
  // Where the flux is only a trace, that says it already.
  if (!trace) {
    const colorants = COLORANT_FLUXES.filter((oxide) => umf[oxide] > 0);
    if (colorants.reduce((sum, oxide) => sum + umf[oxide], 0) > MOSTLY_COLORANT) {
      warningCodes.push(warning('colorant-flux', { oxides: colorants.map(formatFormula).join(', ') }));
    }
    if ((umf.SiO2 || 0) > MOST_SILICA) warningCodes.push(warning('silica-high', { silica: umf.SiO2 }));
  }

  return {
    umf,
    groups,
    siAlRatio: umf.Al2O3 ? (umf.SiO2 || 0) / umf.Al2O3 : null,
    analysis,
    loi: (loiWeight / batchWeight) * 100,
    expansion: expansion(analysis),
    warnings: warningCodes.map((w) => w.message),
    warningCodes
  };
};

module.exports = exports = { calculateUMF, readLine };
