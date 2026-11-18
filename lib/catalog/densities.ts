// The densities a glaze's dry specific gravity is worked out from: data, which the core is given in its host
// (host.densities) and never holds (docs/adr/0031-functional-core.md). Every value, with the sources it was
// checked against, is in docs/sources/dry-sg-sources.md; how they are used is the core's
// (lib/core/recipe/density.ts).

import type { DensityTable } from '../core/recipe/density.ts';

/** Measured densities, g/cm³, by mineral or compound. */
const MINERALS: Readonly<Record<string, number>> = Object.freeze({
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
const KINDS: Readonly<Record<string, number>> = Object.freeze({ feldspar: 2.6, clay: 2.6 });

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
const GLASS_VOLUMES: Readonly<Record<string, number>> = Object.freeze({
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

/** The densities as the core's host takes them (host.densities). */
const DENSITIES: DensityTable = Object.freeze({ minerals: MINERALS, kinds: KINDS, glassVolumes: GLASS_VOLUMES });

export { DENSITIES, GLASS_VOLUMES, KINDS, MINERALS };
