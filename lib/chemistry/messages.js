'use strict';

const { formatFormula } = require('./formula');
const { setIdOf, setKeyOf, setLabelOf } = require('../core/identity');
const { setTraitsOf } = require('../core/traits');
const { traitsOf } = require('../recipe/traits');
const { sameKey } = require('../recipe/same-key');

// The core tells Glazecalc's records apart by their UUIDs: a record without one (a line given only as an
// analysis, or saved before UUIDs and not yet given one) by its name, as it always was. Results call a
// record by its name, lines of the same material add up by sameKey, and the core reads what it needs to
// know of a record from its traits (lib/recipe/traits.js) (docs/adr/0030-nameless-chemistry-core.md).
/** Sets the core's hooks to Glazecalc's. Every lib/chemistry and lib/recipe module loads this first. */
const useGlazecalcHosts = () => {
  setIdOf((record) => (typeof record?.uuid === 'string' && record.uuid ? 'uuid:' + record.uuid : record.name));
  setLabelOf((record) => record.name);
  setKeyOf(sameKey);
  setTraitsOf(traitsOf);
};
useGlazecalcHosts();

// What the chemistry tells a person: each problem and warning has a code and
// its English, with named values (docs/translating.md). The app shows it in
// the reader's language by its code (client/public/i18n/chemistry/<lang>.json,
// whose English npm run i18n:sources writes from here); elsewhere, and where
// there is no translation, the English is used. Messages are ICU
// MessageFormat, so a literal brace is quoted.

const MESSAGES = {
  // Problems that stop a calculation.
  'unknown-compound': 'Unknown compound {compound} in formula',
  'unknown-oxide': 'Unknown oxide {oxide} in material {material}',
  'invalid-oxide-amount': 'Invalid amount for {oxide} in material {material}',
  'loi-range': 'LOI of {material} must be at least 0 and less than 100',
  'invalid-loi': 'LOI of {material} must be a number',
  'invalid-molecular-weight': 'Molecular weight of {material} must be a number',
  'no-oxides': 'Material {material} has no oxides',
  'unknown-percentmole': 'Material {material} must give its oxides in percent or in moles',
  'no-name': 'Material must have a name',
  'no-analysis': 'Material {material} needs a formula or an analysis',
  'recipe-shape': "Recipe must be an array of '{ material, amount }' or a map of amounts",
  'invalid-amount': 'Invalid amount for material {material}',
  'missing-material': 'Recipe line is missing a material',
  'unknown-material': 'Unknown material {material}',
  'blank-name': 'The name {name} of material {material} has no letters or digits to find it by',
  'duplicate-name': 'Materials {other} and {material} both go by the name {name}',
  'no-flux': 'Recipe contains no flux oxides, so the UMF is undefined',
  'no-target': 'The target has no oxides to aim for',
  'no-materials': 'There are no materials to work out',
  'no-temperature': 'The firing temperature is needed to set the boron',
  'no-flux-to-rebuild': 'The glaze has no flux to rebuild',
  'unknown-element': 'Unknown element {element} in {formula}',
  'bad-formula': 'Could not parse formula {formula}',
  // Warnings: the calculation goes on.
  'analysis-total': 'Analysis of {material} totals {total}% including LOI; expected about 100%.',
  'stored-equivalent':
    'The stored equivalent weight of {material} does not match its formula and LOI; the formula and LOI were used instead.',
  'trace-flux': 'Recipe contains only traces of flux oxides, so the UMF is not meaningful.',
  'colorant-flux':
    'Colorant oxides ({oxides}) are most of the flux, so the unity formula is scaled to them; compare it only with other colorant-rich glazes, not with limits for ordinary glazes.',
  'silica-high':
    'The unity formula has {silica} SiO₂, unusually high for a glaze: the recipe is for a very high firing, has too little flux, or is not a glaze.',
  'loi-molecular-weight':
    'The LOI of {material} ({loi}%) does not match its molecular weight, which gives {implied}%; the LOI was used.',
  'molecular-weight-low':
    'The molecular weight of {material} ({molecularWeight}) is less than its fired oxides weigh ({firedWeight}), so it gives no LOI: check the formula and the molecular weight.'
};

/** The English of a message with its values in place. Numbers are written to two places. */
const english = function (code, params) {
  return MESSAGES[code]
    .replace(/\{(\w+)\}/g, (whole, name) => {
      const value = params && params[name];
      return typeof value === 'number' ? value.toFixed(2) : String(value);
    })
    .replace(/'(\{[^']*\})'/g, '$1');
};

/** An error that stops a calculation, with its code and values for the app to translate. */
const problem = function (code, params) {
  /** @type {import('./index').ChemistryError} */
  const error = new Error(english(code, params));
  error.code = code;
  error.params = params || {};
  return error;
};

/** A warning: its English, and its code and values. */
const warning = function (code, params) {
  return { code, params: params || {}, message: english(code, params) };
};

// The core's values as the words show them: oxides written with subscripts, the colorants as a list.
const shown = function (code, params) {
  if (!params) return params;
  if ((code === 'unknown-oxide' || code === 'invalid-oxide-amount') && params.oxide !== undefined) {
    params.oxide = formatFormula(params.oxide);
  }
  if (code === 'colorant-flux' && Array.isArray(params.oxides)) {
    params.oxides = params.oxides.map(formatFormula).join(', ');
  }
  return params;
};

/** A problem from the core, given its English (the same error, so its stack and identity stay). */
const worded = function (error) {
  if (error && typeof error.code === 'string' && Object.hasOwn(MESSAGES, error.code)) {
    error.params = shown(error.code, error.params || {});
    error.message = english(error.code, error.params);
  }
  return error;
};

/** A warning from the core, with its English. */
const wordedWarning = function (w) {
  w.params = shown(w.code, w.params);
  w.message = english(w.code, w.params);
  return w;
};

/** The core's warnings worded, as they were met (with `once`, each once by its English); and their English. */
const wordedWarnings = function (codes, { once }) {
  const kept = [];
  codes.forEach((w) => {
    wordedWarning(w);
    if (!once || !kept.some((other) => other.message === w.message)) kept.push(w);
  });
  return { warnings: kept.map((w) => w.message), warningCodes: kept };
};

/**
 * A function of the core, its problems worded.
 * @template {(...args: any[]) => any} T
 * @param {T} work
 * @returns {T}
 */
const inWords = (work) =>
  /** @type {T} */ (
    function (...args) {
      try {
        return work.apply(this, args);
      } catch (error) {
        throw worded(error);
      }
    }
  );

module.exports = { MESSAGES, english, problem, warning, worded, wordedWarnings, inWords, useGlazecalcHosts };
