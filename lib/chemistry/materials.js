'use strict';

// Glazecalc's side of the materials (docs/adr/0030-nameless-chemistry-core.md): the built-in formula
// materials, finding a material by its name, and the core's preparation (lib/core/chemistry/materials.js)
// with its words.
const { problem, inWords, wordedWarnings } = require('./messages');
const core = require('../core/chemistry/materials');

// Stoichiometric (theoretical) materials, defined by molar formula so their
// analyses are exact. Mined materials such as Custer feldspar, EPK or
// nepheline syenite vary by supplier and lot, so users should enter those
// from their supplier's data sheet as an analysis instead. Where the standard
// library (data/) gives a name to a real product, or "Kaolin" offers a choice of
// products, the formula material here is "(theoretical)": one name, one material.
const FORMULA_MATERIALS = [
  { name: 'Silica', aliases: ['flint', 'quartz'], formula: { SiO2: 1 } },
  { name: 'Whiting', aliases: ['calcium carbonate'], formula: { CaO: 1, CO2: 1 } },
  { name: 'Kaolin (theoretical)', formula: { Al2O3: 1, SiO2: 2, H2O: 2 } },
  { name: 'Calcined Kaolin', formula: { Al2O3: 1, SiO2: 2 } },
  { name: 'Potash Feldspar (theoretical)', formula: { K2O: 1, Al2O3: 1, SiO2: 6 } },
  { name: 'Soda Feldspar (theoretical)', formula: { Na2O: 1, Al2O3: 1, SiO2: 6 } },
  { name: 'Talc', formula: { MgO: 3, SiO2: 4, H2O: 1 } },
  { name: 'Dolomite', formula: { CaO: 1, MgO: 1, CO2: 2 } },
  { name: 'Wollastonite (theoretical)', formula: { CaO: 1, SiO2: 1 } },
  { name: 'Alumina (theoretical)', formula: { Al2O3: 1 } },
  { name: 'Alumina Hydrate', formula: { Al2O3: 1, H2O: 3 } },
  { name: 'Zinc Oxide', formula: { ZnO: 1 } },
  { name: 'Lithium Carbonate', formula: { Li2O: 1, CO2: 1 } },
  { name: 'Strontium Carbonate', formula: { SrO: 1, CO2: 1 } },
  { name: 'Barium Carbonate', formula: { BaO: 1, CO2: 1 } },
  { name: 'Bone Ash', aliases: ['tricalcium phosphate'], formula: { CaO: 3, P2O5: 1 } },
  { name: 'Zircon', aliases: ['zirconium silicate'], formula: { ZrO2: 1, SiO2: 1 } },
  { name: 'Tin Oxide (theoretical)', formula: { SnO2: 1 } },
  { name: 'Titanium Dioxide', formula: { TiO2: 1 } },
  { name: 'Red Iron Oxide (theoretical)', formula: { Fe2O3: 1 } },
  { name: 'Cobalt Carbonate (theoretical)', formula: { CoO: 1, CO2: 1 } },
  { name: 'Copper Carbonate (theoretical)', formula: { CuO: 2, H2O: 1, CO2: 1 } }
];

// A name as the library looks it up: lower case, with accents and other marks taken off (NFKD), and
// only the letters and digits of any script kept. 'Silica', 'SILICA' and 'silica.' are one name, as
// are 'Feldspath' and 'Feldspáth'; '釜戸長石' and 'Улексит' keep their letters, which once all came to ''.
const normalizeName = (name) =>
  String(name)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}]/gu, '');

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
const prepareMaterial = inWords((material) => asPrepared(core.prepareMaterial(material)));

// The weights the material page stores (lib/core/chemistry/materials.js), with the warnings in English.
const materialWeights = inWords((material) => {
  const { warningCodes, ...weights } = core.materialWeights(material);
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

const formulaToAnalysis = inWords(core.formulaToAnalysis);

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
