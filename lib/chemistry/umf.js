'use strict';

// The unity formula as the app reads it (docs/adr/0030-nameless-chemistry-core.md): the core's
// (lib/core/chemistry/umf.js), its materials found by name in the library and its warnings in English.
const { HOST } = require('./host');
const { inWords, wordedWarnings } = require('./messages');
const materials = require('./materials');
const core = require('../core/chemistry/umf.ts');

const lookupIn = (library) => (reference) => library[materials.normalizeName(reference)];

/**
 * A recipe line as calculateUMF reads it: its amount, and its material, by name
 * from `library` (a buildLibrary) or prepared as given; null for an amount of 0.
 * Throws invalid-amount, missing-material or unknown-material, or the material's
 * own problem. The worked calculation (lib/recipe/worked.js) reads lines with it too.
 */
const readLine = inWords((line, library) => {
  const read = core.readLine(HOST, line, library ? lookupIn(library) : undefined);
  if (!read) return null;
  // A material found by name is the library's, already in the app's shape (buildLibrary).
  const material =
    typeof line.material === 'string' ? /** @type {any} */ (read.material) : materials.asPrepared(read.material);
  return { amount: read.amount, name: read.label, material };
});

/**
 * Calculates the Unity Molecular Formula of a glaze recipe.
 *
 * recipe: [{ material: 'Silica' | { name, analysis, loi }, amount: 30 }]
 *   or { Silica: 30, Whiting: 20 }. Amounts are batch weights in any unit.
 * options.materials: extra materials ({ name, analysis, loi } or
 *   { name, formula }) that extend or override the built-in library.
 *
 * Returns the core's figures (lib/core/chemistry/umf.js), and
 *   warnings  non-fatal problems such as analyses that do not total 100%, or
 *             fluxes that are only traces, in English, each once; warningCodes
 *             has each one's code and values (messages.js)
 */
const calculateUMF = function (recipe, options) {
  options = options || {};
  const library = materials.buildLibrary(options.materials);
  const { warningCodes, ...figures } = inWords(core.calculateUMF)(HOST, recipe, { lookup: lookupIn(library) });
  return { ...figures, ...wordedWarnings(warningCodes, { once: true }) };
};

module.exports = exports = { calculateUMF, readLine };
