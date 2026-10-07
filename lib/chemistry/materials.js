'use strict';

const { formatFormula } = require('./formula');
const oxides = require('./oxides');

// Stoichiometric (theoretical) materials, defined by molar formula so their
// analyses are exact. Mined materials such as Custer feldspar, EPK or
// nepheline syenite vary by supplier and lot, so users should enter those
// from their supplier's data sheet as an analysis instead.
const FORMULA_MATERIALS = [
  { name: 'Silica', aliases: ['flint', 'quartz'], formula: { SiO2: 1 } },
  { name: 'Whiting', aliases: ['calcium carbonate'], formula: { CaO: 1, CO2: 1 } },
  { name: 'Kaolin', formula: { Al2O3: 1, SiO2: 2, H2O: 2 } },
  { name: 'Calcined Kaolin', formula: { Al2O3: 1, SiO2: 2 } },
  { name: 'Potash Feldspar', formula: { K2O: 1, Al2O3: 1, SiO2: 6 } },
  { name: 'Soda Feldspar', formula: { Na2O: 1, Al2O3: 1, SiO2: 6 } },
  { name: 'Talc', formula: { MgO: 3, SiO2: 4, H2O: 1 } },
  { name: 'Dolomite', formula: { CaO: 1, MgO: 1, CO2: 2 } },
  { name: 'Wollastonite', formula: { CaO: 1, SiO2: 1 } },
  { name: 'Alumina', formula: { Al2O3: 1 } },
  { name: 'Alumina Hydrate', formula: { Al2O3: 1, H2O: 3 } },
  { name: 'Zinc Oxide', formula: { ZnO: 1 } },
  { name: 'Lithium Carbonate', formula: { Li2O: 1, CO2: 1 } },
  { name: 'Strontium Carbonate', formula: { SrO: 1, CO2: 1 } },
  { name: 'Barium Carbonate', formula: { BaO: 1, CO2: 1 } },
  { name: 'Bone Ash', aliases: ['tricalcium phosphate'], formula: { CaO: 3, P2O5: 1 } },
  { name: 'Zircon', aliases: ['zirconium silicate'], formula: { ZrO2: 1, SiO2: 1 } },
  { name: 'Tin Oxide', formula: { SnO2: 1 } },
  { name: 'Titanium Dioxide', formula: { TiO2: 1 } },
  { name: 'Red Iron Oxide', aliases: ['rio', 'ferric oxide'], formula: { Fe2O3: 1 } },
  { name: 'Cobalt Carbonate', formula: { CoO: 1, CO2: 1 } },
  { name: 'Copper Carbonate', formula: { CuO: 2, H2O: 1, CO2: 1 } }
];

const normalizeName = (name) =>
  String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

// Converts a molar formula into a weight-percent analysis plus LOI.
const formulaToAnalysis = function (formula) {
  let formulaWeight = 0;
  Object.keys(formula).forEach((compound) => {
    if (!oxides.isOxide(compound) && !oxides.isVolatile(compound)) {
      throw new Error('Unknown compound ' + compound + ' in formula');
    }
    formulaWeight += formula[compound] * oxides.MOLAR_MASS[compound];
  });

  const analysis = {};
  let loi = 0;
  Object.keys(formula).forEach((compound) => {
    const percent = ((formula[compound] * oxides.MOLAR_MASS[compound]) / formulaWeight) * 100;
    if (oxides.isVolatile(compound)) loi += percent;
    else analysis[compound] = percent;
  });
  return { analysis, loi, formulaWeight };
};

// Returns the number, or null when the value is blank or not a number.
const optionalNumber = function (value) {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const number = Number(value);
  return isFinite(number) ? number : null;
};

// Reads [{ name: 'SiO2', amount: '68.5' }] into { SiO2: 68.5 }.
const readAmounts = function (entries, materialName) {
  const amounts = {};
  Object.keys(entries).forEach((oxide) => {
    const amount = Number(entries[oxide]);
    if (!oxides.isOxide(oxide)) {
      throw new Error('Unknown oxide ' + formatFormula(oxide) + ' in material ' + materialName);
    }
    if (!isFinite(amount) || amount < 0) {
      throw new Error('Invalid amount for ' + formatFormula(oxide) + ' in material ' + materialName);
    }
    if (amount > 0) amounts[oxide] = (amounts[oxide] || 0) + amount;
  });
  return amounts;
};

// Converts the app's stored material shape, { fields: [{ name, amount }],
// percentmole, loi, molecularweight }, into an analysis. In 'percent' mode the
// fields are weight percents of the raw material. Otherwise they are moles of
// each fired oxide per formula, and the raw formula weight comes from the LOI,
// or from molecularweight when no LOI is given.
const fieldsToAnalysis = function (material) {
  const entries = {};
  material.fields.forEach((field) => {
    entries[field.name] = (entries[field.name] ? Number(entries[field.name]) : 0) + Number(field.amount);
  });
  const amounts = readAmounts(entries, material.name);
  let loi = optionalNumber(material.loi);
  if (loi !== null && (loi < 0 || loi >= 100)) {
    throw new Error('LOI of ' + material.name + ' must be at least 0 and less than 100');
  }

  if (material.percentmole === 'percent') {
    return { analysis: amounts, loi: loi || 0, formulaWeight: 100 };
  }

  let firedWeight = 0;
  Object.keys(amounts).forEach((oxide) => (firedWeight += amounts[oxide] * oxides.MOLAR_MASS[oxide]));
  if (firedWeight === 0) throw new Error('Material ' + material.name + ' has no oxides');
  if (loi === null) {
    const molecularWeight = optionalNumber(material.molecularweight);
    loi = molecularWeight > firedWeight ? (1 - firedWeight / molecularWeight) * 100 : 0;
  }

  const analysis = {};
  Object.keys(amounts).forEach((oxide) => {
    analysis[oxide] = ((amounts[oxide] * oxides.MOLAR_MASS[oxide]) / firedWeight) * (100 - loi);
  });
  return { analysis, loi, formulaWeight: firedWeight / (1 - loi / 100) };
};

// Warns when a stored unity formula and equivalent weight (entered by hand in
// older versions of the app) disagree with the formula and LOI by over 3%.
const checkStoredEquivalent = function (material, analysis) {
  const equivalent = optionalNumber(material.equivalent);
  if (!material.fields || !equivalent) return null;
  const mismatch = material.fields.some((field) => {
    const stored = optionalNumber(field.amountUnity);
    if (stored === null || !analysis[field.name]) return false;
    const derived = (analysis[field.name] / 100 / oxides.MOLAR_MASS[field.name]) * equivalent;
    // Stored amounts are rounded to 4 places, which puts a trace oxide (0.04% Fe2O3) well over 3% off.
    return Math.abs(stored - derived) > Math.max(0.03 * derived, 0.0001);
  });
  return mismatch
    ? 'The stored equivalent weight of ' +
        material.name +
        ' does not match its formula and LOI; the formula and LOI were used instead.'
    : null;
};

// Validates a material and returns { name, analysis, loi, formulaWeight, warnings }.
// formulaWeight is the raw weight of the formula as written (100 for analyses).
// Accepts { name, formula }, { name, analysis: { SiO2: 68.5 }, loi }, or the
// app's stored { name, fields, percentmole, loi } shape.
const prepareMaterial = function (material) {
  if (!material || !material.name) throw new Error('Material must have a name');
  let prepared;
  if (material.formula) {
    prepared = formulaToAnalysis(material.formula);
  } else if (material.analysis) {
    prepared = {
      analysis: readAmounts(material.analysis, material.name),
      loi: optionalNumber(material.loi) || 0,
      formulaWeight: 100
    };
  } else if (Array.isArray(material.fields)) {
    prepared = fieldsToAnalysis(material);
  } else {
    throw new Error('Material ' + material.name + ' needs a formula or an analysis');
  }

  let total = prepared.loi;
  Object.keys(prepared.analysis).forEach((oxide) => (total += prepared.analysis[oxide]));
  const warnings = [];
  if (Math.abs(total - 100) > 2) {
    warnings.push(
      'Analysis of ' + material.name + ' totals ' + total.toFixed(2) + '% including LOI; expected about 100%.'
    );
  }
  const equivalentWarning = checkStoredEquivalent(material, prepared.analysis);
  if (equivalentWarning) warnings.push(equivalentWarning);

  return {
    name: material.name,
    analysis: prepared.analysis,
    loi: prepared.loi,
    formulaWeight: prepared.formulaWeight,
    warnings
  };
};

/**
 * Derives the weights the material page stores, so they never need to be
 * entered by hand:
 *   unity           moles of each oxide per 1.0 mole of the material's flux
 *                   (per formula as written when it has no flux)
 *   equivalent      grams of raw material that contain that unity formula
 *   firedWeight     grams left after firing that equivalent weight
 *   molecularWeight raw weight of the formula as written (100 for analyses)
 *   loi             loss on ignition, percent
 */
const materialWeights = function (material) {
  const prepared = prepareMaterial(material);
  const molesPerGram = {};
  let fluxPerGram = 0;
  Object.keys(prepared.analysis).forEach((oxide) => {
    molesPerGram[oxide] = prepared.analysis[oxide] / 100 / oxides.MOLAR_MASS[oxide];
    if (oxides.isFlux(oxide)) fluxPerGram += molesPerGram[oxide];
  });

  const equivalent = fluxPerGram > 0 ? 1 / fluxPerGram : prepared.formulaWeight;
  const unity = {};
  Object.keys(molesPerGram).forEach((oxide) => (unity[oxide] = molesPerGram[oxide] * equivalent));

  return {
    unity,
    equivalent,
    firedWeight: equivalent * (1 - prepared.loi / 100),
    molecularWeight: prepared.formulaWeight,
    loi: prepared.loi,
    warnings: prepared.warnings
  };
};

// Builds a case- and punctuation-insensitive lookup of prepared materials.
// Later materials override earlier ones with the same name.
const buildLibrary = function (extraMaterials) {
  // No prototype, so names such as "constructor" are unknown materials, not Object's own properties.
  const library = Object.create(null);
  FORMULA_MATERIALS.concat(extraMaterials || []).forEach((material) => {
    const prepared = prepareMaterial(material);
    [material.name].concat(material.aliases || []).forEach((name) => {
      library[normalizeName(name)] = prepared;
    });
  });
  return library;
};

module.exports = exports = {
  FORMULA_MATERIALS,
  buildLibrary,
  formulaToAnalysis,
  materialWeights,
  normalizeName,
  prepareMaterial
};
