'use strict';

const { MOLAR_MASS } = require('../chemistry');
const { amountOf } = require('./amounts');
const { oxidesPerGram } = require('./materials');

// The dry specific gravity (true particle density, g/cm³) of a glaze material
// and of a recipe, for Brongniart's formula (slurry.js). Every value, with the
// sources it was checked against (Handbook of Mineralogy, webmineral, PubChem,
// Wikipedia, manufacturer pages), is in docs/sources/dry-sg-sources.md.
//
// Chemistry alone does not fix a density: the crystal does (silica is 2.65 as
// quartz, 2.33 as cristobalite, 2.20 as fused silica). So:
// - a crystalline standard material takes its mineral's measured density
//   (Handbook of Mineralogy, or the CRC Handbook for made compounds);
// - commercial feldspars, nepheline syenite and Cornwall stones (alkali
//   feldspars, quartz, a little mica: all 2.55 to 2.8) take 2.6, as do clays
//   (kaolinite 2.61 to 2.68, quartz 2.65, mica and illite near 2.8);
// - a frit, being a glass, is worked out from its oxides with Appen's
//   additive partial molar volumes: density = Σ moles × molar mass ÷ Σ moles ×
//   volume (Appen 1949, as tabled in Volf, Mathematical Approach to Glass, 1988);
// - anything else (a material of the potter's own, a blend of minerals whose
//   shares are unknown, a pigment of unknown crystal form) has no estimate.

/** Measured densities, g/cm³, by mineral or compound. */
const MINERALS = Object.freeze({
  quartz: 2.65,
  calcite: 2.71,
  dolomite: 2.86,
  magnesite: 3.0,
  hydromagnesite: 2.24,
  witherite: 4.29,
  strontianite: 3.76,
  fluorite: 3.18,
  cryolite: 2.97,
  talc: 2.78,
  wollastonite: 2.9,
  orthoclase: 2.56,
  spodumene: 3.15,
  petalite: 2.42,
  lepidolite: 2.84,
  'lithium carbonate': 2.11,
  niter: 2.1,
  // The crystal gives 2.435 (Idemoto et al. 1998, J. Phys. Chem. Solids 59:363, COD 9009644:
  // 4 × 138.21 g/mol in 377.04 Å³) and Wikipedia 2.43; the 2.29 of CRC 91st, ICSC 1588 and PAC
  // cannot be the solid's true density.
  'potassium carbonate': 2.43,
  'sodium carbonate': 2.54,
  nitratine: 2.26,
  borax: 1.71,
  sassolite: 1.48,
  colemanite: 2.42,
  ulexite: 1.96,
  gibbsite: 2.4,
  corundum: 3.98,
  zincite: 5.66,
  // Handbook of Mineralogy 3.14-3.21 (calc. 3.16), Wikipedia 3.14-3.21, Hawley 3.1-3.2.
  hydroxylapatite: 3.16,
  rutile: 4.23,
  eskolaite: 5.22,
  // Co3O4: CRC 87th 6.07 (via Wikipedia); the crystal 6.06 (Liu and Prewitt 1990, COD 9005887,
  // 8 × 240.80 g/mol in 527.93 Å³ at 301 K). Only ChemicalBook's 6.11 is higher.
  'cobalt oxide': 6.07,
  // CeO2: the crystal 7.22 (Artini et al. 2015, COD 4343161, 4 × 172.11 g/mol in 158.32 Å³),
  // Wikipedia 7.215, webmineral cerianite 7.216. PubChem's 7.65 (PAC) does not fit the cell.
  // Copper oxide as sold is made, not mined: Handbook of Mineralogy 6.45 (synthetic), PubChem 6.315-6.4.
  tenorite: 6.4,
  malachite: 4.0,
  ilmenite: 4.72,
  magnetite: 5.18,
  hematite: 5.26,
  bunsenite: 6.67,
  'vanadium pentoxide': 3.36,
  cassiterite: 6.99,
  baddeleyite: 5.75,
  zircon: 4.65,
  epsomite: 1.68,
  rhodochrosite: 3.7,
  chromite: 4.79,
  'cerium oxide': 7.22,
  'silicon carbide': 3.21,
  'potassium dichromate': 2.68,
  minium: 8.9,
  hydrocerussite: 6.8,
  // Handbook of Mineralogy 9.14 measured, 9.35 calculated; webmineral 9.14-9.355; CRC/Kirk-Othmer 9.53-9.64.
  litharge: 9.35
});

/** What a kind of material is taken to weigh, g/cm³, where its minerals all lie close to it. */
const KINDS = Object.freeze({ feldspar: 2.6, clay: 2.6 });

// Standard materials by name: a mineral, or null with why there is no estimate.
// A name not here takes its kind (feldspar, clay) or, for a frit, its oxides.
const BY_NAME = {
  'Barium Carbonate': 'witherite',
  'Bone Ash': 'hydroxylapatite',
  Borax: 'borax',
  'Boric Acid': 'sassolite',
  'Colemanite (theoretical)': 'colemanite',
  'Colemanite (commercial)': 'colemanite',
  'China Clay': 'clay',
  Cryolite: 'cryolite',
  Dolomite: 'dolomite',
  Orthoclase: 'orthoclase',
  Flint: 'quartz',
  Fluorspar: 'fluorite',
  'Lithium Carbonate': 'lithium carbonate',
  'Magnesium Carbonate (magnesite)': 'magnesite',
  'Light Magnesium Carbonate': 'hydromagnesite',
  Niter: 'niter',
  'Pearl Ash': 'potassium carbonate',
  Silica: 'quartz',
  'Silica 200 Mesh (Sibelco Australia, Lang Lang)': 'quartz',
  'Soda Ash': 'sodium carbonate',
  'Sodium Nitrate': 'nitratine',
  'Spodumene (theoretical)': 'spodumene',
  'Spodumene (Laguna)': 'spodumene',
  Petalite: 'petalite',
  Lepidolite: 'lepidolite',
  'Strontium Carbonate': 'strontianite',
  Talc: 'talc',
  Whiting: 'calcite',
  'Zinc Oxide': 'zincite',
  'Wollastonite (Vansil W)': 'wollastonite',
  'Wollastonite (NYAD 400)': 'wollastonite',
  'Potassium Bichromate': 'potassium dichromate',
  'Lead, Red': 'minium',
  'Lead, White': 'hydrocerussite',
  Litharge: 'litharge',
  'Ulexite (Etimine)': 'ulexite',
  'Alumina Hydrate': 'gibbsite',
  'Calcined Alumina': 'corundum',
  'Chromium Oxide': 'eskolaite',
  'Cobalt Oxide': 'cobalt oxide',
  'Copper oxide': 'tenorite',
  'Copper carbonate': 'malachite',
  Ilmenite: 'ilmenite',
  'Granular ilmenite': 'ilmenite',
  'Black iron oxide': 'magnetite',
  'Red iron oxide': 'hematite',
  'Nickel oxide, green': 'bunsenite',
  Rutile: 'rutile',
  'Vanadium oxide': 'vanadium pentoxide',
  'Tin oxide': 'cassiterite',
  'Zirconium oxide': 'baddeleyite',
  Zircon: 'zircon',
  'Epsom salts': 'epsomite',
  'Manganese carbonate': 'rhodochrosite',
  'Iron chromate': 'chromite',
  'Cerium oxide': 'cerium oxide',
  'Silicon carbide (fine)': 'silicon carbide',
  // No estimate, and why.
  'Titanium Oxide': null,
  'Titanium dioxide': null,
  'Lead, Yellow': null,
  'Flint (UK calcined)': null,
  'Calcined Kaolin (theoretical)': null,
  'Glomax LL Calcined Kaolin': null,
  Molochite: null,
  'Gerstley Borate': null,
  'Gillespie Borate': null,
  'Laguna Borate': null,
  Boraq: null,
  'Cobalt carbonate': null,
  'Yellow iron oxide': null,
  'Yellow ochre': null,
  'Manganese dioxide': null,
  'Nickel oxide, black': null,
  'Nickel carbonate': null,
  'Praseodymium Oxide': null,
  'Spanish red iron oxide': null,
  'Crocus martis': null,
  Bentonite: null,
  'Veegum T': null,
  Macaloid: null,
  'CMC gum': null,
  'Stain (proprietary)': null,
  'Bentonit 57 (Carl Jäger / Bodmer Ton 507)': null,
  'Bentonita (Prodesco)': null,
  'Bentonite Trubond (Miles, Queensland)': null
};

/** Why a material has no estimate, as a code the app words. */
const WHY_NOT = Object.freeze({
  form: 'crystal-form-unknown',
  mixture: 'mixture-unknown',
  impure: 'impure',
  swelling: 'swelling-clay',
  noChemistry: 'no-chemistry',
  unknown: 'not-classified',
  glassOxides: 'oxides-not-in-factors'
});
const REASON_OF_NAME = {
  'Titanium Oxide': WHY_NOT.form,
  'Titanium dioxide': WHY_NOT.form,
  'Lead, Yellow': WHY_NOT.form,
  'Flint (UK calcined)': WHY_NOT.form,
  'Calcined Kaolin (theoretical)': WHY_NOT.form,
  'Glomax LL Calcined Kaolin': WHY_NOT.form,
  Molochite: WHY_NOT.form,
  'Gerstley Borate': WHY_NOT.mixture,
  'Gillespie Borate': WHY_NOT.mixture,
  'Laguna Borate': WHY_NOT.mixture,
  Boraq: WHY_NOT.mixture,
  'Yellow ochre': WHY_NOT.mixture,
  'Stain (proprietary)': WHY_NOT.mixture,
  'Cobalt carbonate': WHY_NOT.impure,
  'Yellow iron oxide': WHY_NOT.impure,
  'Manganese dioxide': WHY_NOT.impure,
  'Nickel oxide, black': WHY_NOT.impure,
  'Nickel carbonate': WHY_NOT.impure,
  'Praseodymium Oxide': WHY_NOT.impure,
  'Spanish red iron oxide': WHY_NOT.impure,
  'Crocus martis': WHY_NOT.impure,
  Bentonite: WHY_NOT.swelling,
  'Veegum T': WHY_NOT.swelling,
  Macaloid: WHY_NOT.swelling,
  'Bentonit 57 (Carl Jäger / Bodmer Ton 507)': WHY_NOT.swelling,
  'Bentonita (Prodesco)': WHY_NOT.swelling,
  'Bentonite Trubond (Miles, Queensland)': WHY_NOT.swelling,
  'CMC gum': WHY_NOT.noChemistry
};

/**
 * Appen's partial molar volumes of oxides in a silicate glass, cm³ per mole
 * (Appen 1949; Volf 1988), as tabled in US 6,268,304 B1 (Asahi Glass, 2001),
 * Table 2, and in Kaz'mina, Belomestnova and Ditts, Khimicheskaya tekhnologiya
 * stekla i sitallov (Tomsk Polytechnic University, 2011), Table 2.5 (which gives
 * SrO 18.0). Taken as constants: Appen gives SiO₂ 26.1-27.25, B₂O₃ 18.5-38,
 * PbO 21-23.5 and TiO₂ 19-22.5 depending on the glass, which this leaves out.
 * B₂O₃ at 38 fits borosilicates (Borofloat 2.26 against 2.23); Volf's single
 * "bound" value 24.87 overestimates them (Pyrex 2.37 against 2.22, SRNL).
 */
const GLASS_VOLUMES = Object.freeze({
  SiO2: 26.1,
  B2O3: 38.0,
  Al2O3: 40.4,
  Li2O: 11.0,
  Na2O: 20.2,
  K2O: 34.1,
  MgO: 12.5,
  CaO: 14.4,
  SrO: 17.5,
  BaO: 22.0,
  ZnO: 14.5,
  PbO: 23.5,
  TiO2: 20.5,
  ZrO2: 23.0
});

/** The weight share of a frit's oxides that may be outside Appen's table and still be passed over. */
const GLASS_IGNORED_SHARE = 0.01;

/** A glass's density from its fired oxides per gram, or null with the oxides it cannot take. */
function glassDensity(perGram) {
  let mass = 0;
  let volume = 0;
  let other = 0;
  let total = 0;
  const outside = [];
  for (const [oxide, grams] of Object.entries(perGram)) {
    if (!(grams > 0)) continue;
    total += grams;
    const v = GLASS_VOLUMES[oxide];
    if (v === undefined || !MOLAR_MASS[oxide]) {
      other += grams;
      outside.push(oxide);
      continue;
    }
    const moles = grams / MOLAR_MASS[oxide];
    mass += grams;
    volume += moles * v;
  }
  if (!(total > 0) || !(volume > 0) || other / total > GLASS_IGNORED_SHARE) return { sg: null, outside };
  return { sg: mass / volume, outside };
}

const round = (value) => Math.round(value * 100) / 100;

/**
 * A material's dry SG: { sg, basis, source } where basis is 'mineral' (its
 * mineral's measured density), 'kind' (feldspars or clays, 2.6), 'glass'
 * (a frit, from Appen's factors) or 'none' (sg null, with a reason code).
 */
function materialSg(material) {
  const name = material && typeof material.name === 'string' ? material.name.trim() : '';
  if (Object.prototype.hasOwnProperty.call(BY_NAME, name)) {
    const key = BY_NAME[name];
    if (key === null) return { sg: null, basis: 'none', reason: REASON_OF_NAME[name] ?? WHY_NOT.unknown };
    if (KINDS[key]) return { sg: KINDS[key], basis: 'kind', source: key };
    return { sg: MINERALS[key], basis: 'mineral', source: key };
  }
  if (material?.noChemistry) return { sg: null, basis: 'none', reason: WHY_NOT.noChemistry };
  const category = material?.category;
  if (category === 'frit') {
    const perGram = oxidesPerGram(material);
    const { sg, outside } = perGram ? glassDensity(perGram) : { sg: null, outside: [] };
    if (sg === null) return { sg: null, basis: 'none', reason: WHY_NOT.glassOxides, oxides: outside };
    return { sg: round(sg), basis: 'glass', source: 'appen' };
  }
  if (KINDS[category]) return { sg: KINDS[category], basis: 'kind', source: category };
  return { sg: null, basis: 'none', reason: WHY_NOT.unknown };
}

/** The share of a recipe's weight that may have no estimate and still let the rest give one. */
const MOST_UNKNOWN_SHARE = 0.05;

/**
 * A recipe's dry SG: its weight ÷ the sum of each material's weight ÷ its SG.
 * Lines are materials with their amounts as saved. Materials without an
 * estimate may make up at most 5% of the weight; they are then left out, and
 * `unknownShare` says how much was. Basis: 'mineral', 'kind', 'glass' when
 * every part has the one basis, 'mixed' otherwise, or 'none' (sg null).
 */
function recipeDrySg(lines) {
  const parts = (lines ?? []).map((line) => {
    const grams = amountOf(line.amount);
    return { name: line.name, grams: Number.isFinite(grams) && grams > 0 ? grams : 0, ...materialSg(line) };
  });
  const total = parts.reduce((sum, part) => sum + part.grams, 0);
  if (!(total > 0)) return { sg: null, basis: 'none', reason: 'no-amounts', parts, unknown: [], unknownShare: 0 };
  const known = parts.filter((part) => part.grams > 0 && part.sg !== null);
  const unknown = parts.filter((part) => part.grams > 0 && part.sg === null);
  const knownGrams = known.reduce((sum, part) => sum + part.grams, 0);
  const unknownShare = 1 - knownGrams / total;
  const unknownNames = unknown.map((part) => part.name);
  if (!known.length || unknownShare > MOST_UNKNOWN_SHARE) {
    return { sg: null, basis: 'none', reason: 'too-much-unknown', parts, unknown: unknownNames, unknownShare };
  }
  const volume = known.reduce((sum, part) => sum + part.grams / part.sg, 0);
  const bases = [...new Set(known.map((part) => part.basis))];
  return {
    sg: round(knownGrams / volume),
    basis: bases.length === 1 ? bases[0] : 'mixed',
    parts,
    unknown: unknownNames,
    unknownShare
  };
}

module.exports = {
  MINERALS,
  KINDS,
  GLASS_VOLUMES,
  MOST_UNKNOWN_SHARE,
  glassDensity,
  materialSg,
  recipeDrySg
};
