// The elements and oxides the chemistry works with: data, which the core is given in its host
// (host.oxides) and never holds (docs/adr/0031-functional-core.md). Glazecalc's host passes OXIDES
// (lib/chemistry/host.js). Each table is frozen, so no caller can change what another one reads.

import { molarMass } from '../core/chemistry/oxides.ts';
import type { OxideGroup, OxideTable } from '../core/types.ts';

// Standard atomic weights, g/mol: CIAAW's abridged table of 2024
// (https://www.ciaaw.org/abridged-atomic-weights.htm), with Ba, Ce and Pr a
// place longer, as in its full table.
const ATOMIC_WEIGHTS: Readonly<Record<string, number>> = Object.freeze({
  H: 1.008,
  Li: 6.94,
  B: 10.81,
  C: 12.011,
  O: 15.999,
  Na: 22.99,
  Mg: 24.305,
  Al: 26.982,
  Si: 28.085,
  P: 30.974,
  S: 32.06,
  K: 39.098,
  Ca: 40.078,
  Ti: 47.867,
  V: 50.942,
  Cr: 51.996,
  Mn: 54.938,
  Fe: 55.845,
  Co: 58.933,
  Ni: 58.693,
  Cu: 63.546,
  Zn: 65.38,
  Sr: 87.62,
  Zr: 91.222,
  Sn: 118.71,
  Sb: 121.76,
  Ba: 137.327,
  Ce: 140.116,
  Pr: 140.908,
  Pb: 207.2
});

// Seger / UMF column for each oxide. R2O and RO together are the fluxes
// that the unity formula normalizes to 1.0.
const OXIDE_GROUPS: Readonly<Record<string, OxideGroup>> = Object.freeze({
  Li2O: 'R2O',
  Na2O: 'R2O',
  K2O: 'R2O',
  MgO: 'RO',
  CaO: 'RO',
  SrO: 'RO',
  BaO: 'RO',
  ZnO: 'RO',
  PbO: 'RO',
  FeO: 'RO',
  MnO: 'RO',
  CuO: 'RO',
  CoO: 'RO',
  NiO: 'RO',
  Al2O3: 'R2O3',
  B2O3: 'R2O3',
  Fe2O3: 'R2O3',
  Cr2O3: 'R2O3',
  // Colorants and opacifiers, counted when a recipe includes its additives.
  Sb2O3: 'R2O3',
  Pr2O3: 'R2O3',
  SiO2: 'RO2',
  TiO2: 'RO2',
  ZrO2: 'RO2',
  SnO2: 'RO2',
  P2O5: 'RO2',
  V2O5: 'RO2',
  CeO2: 'RO2'
});

// Compounds driven off during firing; they count toward loss on ignition.
const VOLATILES: readonly string[] = Object.freeze(['H2O', 'CO2', 'SO3']);

// Grams per mole of each oxide, then each volatile, worked out from the atomic weights by the core's own
// molarMass, so that the two cannot disagree.
const MOLAR_MASS: Readonly<Record<string, number>> = Object.freeze(
  Object.fromEntries(
    Object.keys(OXIDE_GROUPS)
      .concat(VOLATILES)
      .map((formula) => [formula, molarMass({ oxides: { atomicWeights: ATOMIC_WEIGHTS } }, formula)])
  )
);

/** The elements and oxides, as the core's host takes them (host.oxides). */
const OXIDES: OxideTable = Object.freeze({
  atomicWeights: ATOMIC_WEIGHTS,
  groups: OXIDE_GROUPS,
  volatiles: VOLATILES,
  molarMass: MOLAR_MASS
});

export { ATOMIC_WEIGHTS, MOLAR_MASS, OXIDE_GROUPS, OXIDES, VOLATILES };
