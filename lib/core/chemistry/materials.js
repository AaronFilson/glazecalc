'use strict';

const { problem, warning } = require('../problem');
const { idOf, labelOf } = require('../identity');
const oxides = require('./oxides');

// Converts a molar formula into a weight-percent analysis plus LOI. Each count
// must be a number, at least 0, and some oxide must be left after firing.
const formulaToAnalysis = function (formula, materialLabel) {
  let formulaWeight = 0;
  let firedWeight = 0;
  Object.keys(formula).forEach((compound) => {
    if (!oxides.isOxide(compound) && !oxides.isVolatile(compound)) {
      throw problem('unknown-compound', { compound });
    }
    const count = Number(formula[compound]);
    if (!isFinite(count) || count < 0) {
      throw problem('invalid-oxide-amount', { oxide: compound, material: materialLabel });
    }
    formulaWeight += count * oxides.MOLAR_MASS[compound];
    if (oxides.isOxide(compound)) firedWeight += count * oxides.MOLAR_MASS[compound];
  });
  if (!(firedWeight > 0)) throw problem('no-oxides', { material: materialLabel });

  const analysis = {};
  let loi = 0;
  Object.keys(formula).forEach((compound) => {
    const percent = ((Number(formula[compound]) * oxides.MOLAR_MASS[compound]) / formulaWeight) * 100;
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

// A value that may be left out (absent, null or blank: null) but, when given, is a number: a finite
// number, or a plain decimal as typed and saved ("43.97"). Anything else, such as '43,97', Infinity,
// NaN or true, is the `code` problem, not a value left out.
const givenNumber = function (value, code, material) {
  if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) return null;
  const plain = typeof value === 'string' && /^-?\d*\.?\d+$/.test(value.trim());
  const number = typeof value === 'number' ? value : plain ? Number(value) : NaN;
  if (!isFinite(number)) throw problem(code, { material: labelOf(material) });
  return number;
};

// An LOI and the one a molecular weight gives agree to within this many points.
const LOI_AGREES = 0.5;

// Reads [['SiO2', '68.5']] into { SiO2: 68.5 }, checking each amount before
// adding up an oxide given twice.
const readAmounts = function (entries, materialLabel) {
  const amounts = {};
  entries.forEach(([oxide, value]) => {
    const amount = Number(value);
    if (!oxides.isOxide(oxide)) {
      throw problem('unknown-oxide', { oxide: oxide, material: materialLabel });
    }
    if (!isFinite(amount) || amount < 0) {
      throw problem('invalid-oxide-amount', { oxide: oxide, material: materialLabel });
    }
    if (amount > 0) amounts[oxide] = (amounts[oxide] || 0) + amount;
  });
  return amounts;
};

// The LOI, or null when none is given; at least 0 and less than 100.
const readLoi = function (material) {
  const loi = givenNumber(material.loi, 'invalid-loi', material);
  if (loi !== null && (loi < 0 || loi >= 100)) {
    throw problem('loi-range', { material: labelOf(material) });
  }
  return loi;
};

// How a material gives its oxides, as prepareMaterial reads them: 'percent', weight percent of the
// raw material (an analysis, or the stored fields with percentmole 'percent'), or 'molecular', moles
// in the formula (a formula, or the stored fields with 'molecular' or none, as an additive saved
// before it had one). percentmole is read in any case and with spaces around: the server keeps it in
// lower case, but a record kept before it did may say 'Percent' (Mongoose lower-cases what it saves,
// not what it reads). Null for any other percentmole, which fieldsToAnalysis refuses. The pages and
// the MCP tools say percent or moles by this, so they say what the chemistry does.
const oxidesGivenIn = function (material) {
  if (material.formula) return 'molecular';
  if (material.analysis) return 'percent';
  const percentmole = String(material.percentmole ?? '')
    .trim()
    .toLowerCase();
  if (percentmole === 'percent') return 'percent';
  return percentmole === '' || percentmole === 'molecular' ? 'molecular' : null;
};

// Converts the app's stored material shape, { fields: [{ name, amount }],
// percentmole, loi, molecularweight }, into an analysis. In 'percent' mode the
// fields are weight percents of the raw material. Otherwise they are moles of
// each fired oxide per formula, and the raw formula weight comes from the LOI,
// or from molecularweight when no LOI is given; given both, the LOI is used, with
// a warning when the two disagree by more than LOI_AGREES.
const fieldsToAnalysis = function (material) {
  const amounts = readAmounts(
    material.fields.map((field) => [field.name, field.amount]),
    labelOf(material)
  );
  let loi = readLoi(material);
  // 'percent' or 'molecular', in any case, as the server keeps them; none (an additive saved before
  // it had one: absent, null or blank, as the app reads it) is read as moles, as ever.
  const given = oxidesGivenIn(material);
  if (given === null) throw problem('unknown-percentmole', { material: labelOf(material) });

  if (given === 'percent') {
    return { analysis: amounts, loi: loi || 0, formulaWeight: 100 };
  }

  let firedWeight = 0;
  Object.keys(amounts).forEach((oxide) => (firedWeight += amounts[oxide] * oxides.MOLAR_MASS[oxide]));
  if (firedWeight === 0) throw problem('no-oxides', { material: labelOf(material) });
  const molecularWeight = givenNumber(material.molecularweight, 'invalid-molecular-weight', material);
  // The LOI the molecular weight gives: what the raw formula loses to the fired one.
  const implied = molecularWeight > firedWeight ? (1 - firedWeight / molecularWeight) * 100 : 0;
  const warningCodes = [];
  // A raw formula cannot weigh less than its fired oxides: such a molecular weight is a slip (the fired weight
  // typed, or a wrong formula), so it gives no LOI, and says so rather than reading as none.
  const impossible = molecularWeight !== null && molecularWeight < firedWeight * (1 - LOI_AGREES / 100);
  if (impossible) {
    warningCodes.push(warning('molecular-weight-low', { material: labelOf(material), molecularWeight, firedWeight }));
  }
  if (loi === null) {
    loi = implied;
  } else if (!impossible && molecularWeight !== null && Math.abs(loi - implied) > LOI_AGREES) {
    warningCodes.push(warning('loi-molecular-weight', { material: labelOf(material), loi, implied }));
  }

  const analysis = {};
  Object.keys(amounts).forEach((oxide) => {
    analysis[oxide] = ((amounts[oxide] * oxides.MOLAR_MASS[oxide]) / firedWeight) * (100 - loi);
  });
  return { analysis, loi, formulaWeight: firedWeight / (1 - loi / 100), warningCodes };
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
  return mismatch ? warning('stored-equivalent', { material: labelOf(material) }) : null;
};

// Validates a material and returns { id, label, analysis, loi, formulaWeight, warningCodes }: warningCodes
// ({ code, params }) for the host to put in words.
// formulaWeight is the raw weight of the formula as written (100 for analyses).
// Accepts { formula }, { analysis: { SiO2: 68.5 }, loi }, or the
// app's stored { fields, percentmole, loi } shape; each with an identity (idOf).
const prepareMaterial = function (material) {
  // A material must have an identity (idOf).
  if (!material || !idOf(material)) throw problem('no-name');
  let prepared;
  if (material.formula) {
    prepared = formulaToAnalysis(material.formula, labelOf(material));
  } else if (material.analysis) {
    prepared = {
      analysis: readAmounts(Object.entries(material.analysis), labelOf(material)),
      loi: readLoi(material) || 0,
      formulaWeight: 100
    };
  } else if (Array.isArray(material.fields)) {
    prepared = fieldsToAnalysis(material);
  } else {
    throw problem('no-analysis', { material: labelOf(material) });
  }

  let total = prepared.loi;
  Object.keys(prepared.analysis).forEach((oxide) => (total += prepared.analysis[oxide]));
  const warningCodes = [...(prepared.warningCodes ?? [])];
  if (Math.abs(total - 100) > 2) {
    warningCodes.push(warning('analysis-total', { material: labelOf(material), total }));
  }
  const equivalentWarning = checkStoredEquivalent(material, prepared.analysis);
  if (equivalentWarning) warningCodes.push(equivalentWarning);

  return {
    id: idOf(material),
    label: labelOf(material),
    analysis: prepared.analysis,
    loi: prepared.loi,
    formulaWeight: prepared.formulaWeight,
    warningCodes
  };
};

/**
 * Derives the weights the material page stores, so they never need to be
 * entered by hand:
 *   unity           moles of each oxide per 1.0 mole of the material's flux
 *                   (with no flux: per formula as written, or per 100 g
 *                   for an analysis)
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
    warningCodes: prepared.warningCodes
  };
};

module.exports = exports = {
  formulaToAnalysis,
  materialWeights,
  oxidesGivenIn,
  prepareMaterial
};
