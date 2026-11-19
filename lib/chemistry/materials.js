'use strict';

// Glazecalc's side of the materials (docs/adr/0030-nameless-chemistry-core.md): finding a material by its
// name, and the core's preparation (lib/core/chemistry/materials.js)
// with its words.
const { HOST, withHost } = require('./host');
const { problem, inWords, wordedWarnings } = require('./messages');
const core = require('../core/chemistry/index.ts');
// The built-in formula materials and the name key are the catalog's (lib/catalog/names.ts).
const { FORMULA_MATERIALS, nameKey: normalizeName } = require('../catalog/text/index.ts');

/** A material the core prepared, as the app reads it: by its name, with its warnings in English. */
const asPrepared = (prepared) => ({
  name: prepared.label,
  analysis: prepared.analysis,
  loi: prepared.loi,
  formulaWeight: prepared.formulaWeight,
  ...wordedWarnings(prepared.warningCodes, { once: false })
});

// Validates a material and returns { name, analysis, loi, formulaWeight, warnings, warningCodes }:
// warnings in English, and warningCodes ({ code, params, message }) for the app
// to show in the reader's language (messages.js).
// formulaWeight is the raw weight of the formula as written (100 for analyses).
// Accepts { name, formula }, { name, analysis: { SiO2: 68.5 }, loi }, or the
// app's stored { name, fields, percentmole, loi } shape.
const prepareMaterial = inWords((material) => asPrepared(core.prepareMaterial(HOST, material)));

// The weights the material page stores (lib/core/chemistry/materials.js), with the warnings in English.
const materialWeights = inWords((material) => {
  const { warningCodes, ...weights } = core.materialWeights(HOST, material);
  return { ...weights, ...wordedWarnings(warningCodes, { once: false }) };
});

// Builds a case- and punctuation-insensitive lookup of prepared materials, by
// name and alias. An extra material overrides a built-in one with the same name;
// among the extra materials, a name or alias that leaves no letters or digits
// (blank-name), or one that two of them share (duplicate-name), is refused.
const buildLibrary = function (extraMaterials) {
  // No prototype, so names such as "constructor" are unknown materials, not Object's own properties.
  const library = Object.create(null);
  FORMULA_MATERIALS.forEach((material) => {
    const prepared = prepareMaterial(material);
    [material.name].concat(material.aliases || []).forEach((name) => (library[normalizeName(name)] = prepared));
  });
  const owners = new Map();
  (extraMaterials || []).forEach((material) => {
    const prepared = prepareMaterial(material);
    [material.name].concat(material.aliases || []).forEach((name) => {
      const key = normalizeName(name);
      if (!key) throw problem('blank-name', { name: String(name), material: material.name });
      const other = owners.get(key);
      if (other && other !== material) {
        throw problem('duplicate-name', { name: String(name), material: material.name, other: other.name });
      }
      owners.set(key, material);
      library[key] = prepared;
    });
  });
  return library;
};

const formulaToAnalysis = inWords(withHost(core.formulaToAnalysis));

const oxidesGivenIn = core.oxidesGivenIn;

module.exports = {
  FORMULA_MATERIALS,
  asPrepared,
  buildLibrary,
  formulaToAnalysis,
  materialWeights,
  normalizeName,
  oxidesGivenIn,
  prepareMaterial
};
