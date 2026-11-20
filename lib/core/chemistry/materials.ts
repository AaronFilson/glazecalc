import { problem, warning } from '../problem.ts';
import type { Warning } from '../problem.ts';
import { idOf, labelOf } from '../identity.ts';
import { givenNumber } from '../plain.ts';
import * as oxides from './oxides.ts';
import type { MaterialField, MaterialInput, Oxides, PreparedMaterial } from '../types.ts';
import type { Host } from '../host.ts';

// Converts a molar formula into a weight-percent analysis plus LOI. Each count
// must be a number, at least 0, and some oxide must be left after firing.
const formulaToAnalysis = function (
  host: Host,
  formula: Record<string, unknown>,
  materialLabel?: unknown
): { analysis: Oxides; loi: number; formulaWeight: number } {
  let formulaWeight = 0;
  let firedWeight = 0;
  Object.keys(formula).forEach((compound) => {
    if (!oxides.isOxide(host, compound) && !oxides.isVolatile(host, compound)) {
      throw problem('unknown-compound', { compound });
    }
    const count = Number(formula[compound]);
    if (!isFinite(count) || count < 0) {
      throw problem('invalid-oxide-amount', { oxide: compound, material: materialLabel });
    }
    formulaWeight += count * host.oxides.molarMass[compound];
    if (oxides.isOxide(host, compound)) firedWeight += count * host.oxides.molarMass[compound];
  });
  if (!(firedWeight > 0)) throw problem('no-oxides', { material: materialLabel });

  const analysis: Oxides = {};
  let loi = 0;
  Object.keys(formula).forEach((compound) => {
    const percent = ((Number(formula[compound]) * host.oxides.molarMass[compound]) / formulaWeight) * 100;
    if (oxides.isVolatile(host, compound)) loi += percent;
    else analysis[compound] = percent;
  });
  return { analysis, loi, formulaWeight };
};

// A stored figure checked only if it is there: the number, or null when it is left out or not a finite plain
// number (plain.ts: "1e1" or true is not one).
const optionalNumber = function (value: unknown): number | null {
  const number = givenNumber(value);
  return number !== null && isFinite(number) ? number : null;
};

// A value that may be left out (absent, null or blank: null) but, when given, is a number: a finite
// number, or a plain decimal as typed and saved ("43.97", plain.ts). Anything else, such as '43,97',
// Infinity, NaN or true, is the `code` problem, not a value left out.
const requiredIfGiven = function (host: Host, value: unknown, code: string, material: MaterialInput): number | null {
  const number = givenNumber(value);
  if (number !== null && !isFinite(number)) throw problem(code, { material: labelOf(host, material) });
  return number;
};

// An LOI and the one a molecular weight gives agree to within this many points.
const LOI_AGREES = 0.5;

// Reads [['SiO2', '68.5']] into { SiO2: 68.5 }, checking each amount before
// adding up an oxide given twice.
const readAmounts = function (host: Host, entries: Array<[string, unknown]>, materialLabel: unknown): Oxides {
  const amounts: Oxides = {};
  entries.forEach(([oxide, value]) => {
    const amount = Number(value);
    if (!oxides.isOxide(host, oxide)) {
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
const readLoi = function (host: Host, material: MaterialInput): number | null {
  const loi = requiredIfGiven(host, material.loi, 'invalid-loi', material);
  if (loi !== null && (loi < 0 || loi >= 100)) {
    throw problem('loi-range', { material: labelOf(host, material) });
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
const oxidesGivenIn = function (material: {
  formula?: unknown;
  analysis?: unknown;
  percentmole?: unknown;
}): 'percent' | 'molecular' | null {
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
const fieldsToAnalysis = function (
  host: Host,
  material: MaterialInput & { fields: MaterialField[] }
): {
  analysis: Oxides;
  loi: number;
  formulaWeight: number;
  warningCodes?: Warning[];
} {
  const amounts = readAmounts(
    host,
    material.fields.map((field) => [field.name, field.amount]),
    labelOf(host, material)
  );
  let loi = readLoi(host, material);
  // 'percent' or 'molecular', in any case, as the server keeps them; none (an additive saved before
  // it had one: absent, null or blank, as the app reads it) is read as moles, as ever.
  const given = oxidesGivenIn(material);
  if (given === null) throw problem('unknown-percentmole', { material: labelOf(host, material) });

  if (given === 'percent') {
    return { analysis: amounts, loi: loi || 0, formulaWeight: 100 };
  }

  let firedWeight = 0;
  Object.keys(amounts).forEach((oxide) => (firedWeight += amounts[oxide] * host.oxides.molarMass[oxide]));
  if (firedWeight === 0) throw problem('no-oxides', { material: labelOf(host, material) });
  const molecularWeight = requiredIfGiven(host, material.molecularweight, 'invalid-molecular-weight', material);
  // The LOI the molecular weight gives: what the raw formula loses to the fired one.
  const implied =
    molecularWeight !== null && molecularWeight > firedWeight ? (1 - firedWeight / molecularWeight) * 100 : 0;
  const warningCodes: Warning[] = [];
  // A raw formula cannot weigh less than its fired oxides: such a molecular weight is a slip (the fired weight
  // typed, or a wrong formula), so it gives no LOI, and says so rather than reading as none.
  const impossible = molecularWeight !== null && molecularWeight < firedWeight * (1 - LOI_AGREES / 100);
  if (impossible) {
    warningCodes.push(
      warning('molecular-weight-low', { material: labelOf(host, material), molecularWeight, firedWeight })
    );
  }
  if (loi === null) {
    loi = implied;
  } else if (!impossible && molecularWeight !== null && Math.abs(loi - implied) > LOI_AGREES) {
    warningCodes.push(warning('loi-molecular-weight', { material: labelOf(host, material), loi, implied }));
  }

  const analysis: Oxides = {};
  Object.keys(amounts).forEach((oxide) => {
    analysis[oxide] = ((amounts[oxide] * host.oxides.molarMass[oxide]) / firedWeight) * (100 - loi);
  });
  return { analysis, loi, formulaWeight: firedWeight / (1 - loi / 100), warningCodes };
};

// Warns when a stored unity formula and equivalent weight (entered by hand in
// older versions of the app) disagree with the formula and LOI by over 3%.
const checkStoredEquivalent = function (host: Host, material: MaterialInput, analysis: Oxides): Warning | null {
  const equivalent = optionalNumber(material.equivalent);
  if (!material.fields || !equivalent) return null;
  const mismatch = material.fields.some((field) => {
    const stored = optionalNumber(field.amountUnity);
    if (stored === null || !analysis[field.name]) return false;
    const derived = (analysis[field.name] / 100 / host.oxides.molarMass[field.name]) * equivalent;
    // Stored amounts are rounded to 4 places, which puts a trace oxide (0.04% Fe2O3) well over 3% off.
    return Math.abs(stored - derived) > Math.max(0.03 * derived, 0.0001);
  });
  return mismatch ? warning('stored-equivalent', { material: labelOf(host, material) }) : null;
};

// Validates a material and returns { id, label, analysis, loi, formulaWeight, warningCodes }: warningCodes
// ({ code, params }) for the host to put in words.
// formulaWeight is the raw weight of the formula as written (100 for analyses).
// Accepts { formula }, { analysis: { SiO2: 68.5 }, loi }, or the
// app's stored { fields, percentmole, loi } shape; each with an identity (idOf).
const prepareMaterial = function (host: Host, material: MaterialInput | null | undefined): PreparedMaterial {
  // A material must have an identity (idOf).
  if (!material) throw problem('no-name');
  const id = idOf(host, material);
  const label = labelOf(host, material);
  if (id === undefined || id === null || id === '' || label === undefined || label === null || label === '') {
    throw problem('no-name');
  }
  let prepared: { analysis: Oxides; loi: number; formulaWeight: number; warningCodes?: Warning[] };
  if (material.formula) {
    prepared = formulaToAnalysis(host, material.formula, labelOf(host, material));
  } else if (material.analysis) {
    prepared = {
      analysis: readAmounts(host, Object.entries(material.analysis), labelOf(host, material)),
      loi: readLoi(host, material) || 0,
      formulaWeight: 100
    };
  } else if (Array.isArray(material.fields)) {
    prepared = fieldsToAnalysis(host, material as MaterialInput & { fields: MaterialField[] });
  } else {
    throw problem('no-analysis', { material: labelOf(host, material) });
  }

  let total = prepared.loi;
  Object.keys(prepared.analysis).forEach((oxide) => (total += prepared.analysis[oxide]));
  const warningCodes = [...(prepared.warningCodes ?? [])];
  if (Math.abs(total - 100) > 2) {
    warningCodes.push(warning('analysis-total', { material: labelOf(host, material), total }));
  }
  const equivalentWarning = checkStoredEquivalent(host, material, prepared.analysis);
  if (equivalentWarning) warningCodes.push(equivalentWarning);

  return {
    id: idOf(host, material),
    label: labelOf(host, material),
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
const materialWeights = function (host: Host, material: MaterialInput) {
  const prepared = prepareMaterial(host, material);
  const molesPerGram: Oxides = {};
  let fluxPerGram = 0;
  Object.keys(prepared.analysis).forEach((oxide) => {
    molesPerGram[oxide] = prepared.analysis[oxide] / 100 / host.oxides.molarMass[oxide];
    if (oxides.isFlux(host, oxide)) fluxPerGram += molesPerGram[oxide];
  });

  const equivalent = fluxPerGram > 0 ? 1 / fluxPerGram : prepared.formulaWeight;
  const unity: Oxides = {};
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

export { formulaToAnalysis, materialWeights, oxidesGivenIn, prepareMaterial };
