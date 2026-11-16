'use strict';

// Glazecalc's standard materials by name, for their dry SG (lib/core/recipe/density.js reads them as the
// trait `density`, lib/recipe/traits.js): a mineral, or null with why there is no estimate. Only a standard
// record is known by its name: a potter's own "Whiting", or one given with its own analysis, may be
// anything, so it goes by its kind or, for a frit, its oxides.
const { WHY_NOT } = require('../core/recipe/density');

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

/** The density trait of a standard record known by its name; undefined for any other. */
const densityOf = (material) => {
  const name = material && typeof material.name === 'string' ? material.name.trim() : '';
  const standard = material?.ownedBy === 'Standard';
  if (!standard || !Object.prototype.hasOwnProperty.call(BY_NAME, name)) return undefined;
  return { mineral: BY_NAME[name], reason: REASON_OF_NAME[name] };
};

module.exports = { BY_NAME, REASON_OF_NAME, densityOf };
