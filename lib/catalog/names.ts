// Glazecalc's names: the built-in formula materials, the generic recipe words and the products to offer for
// each, and the key a name is looked up by. Data and the one reader of it, which the app builds its library
// and paste-in import from (lib/chemistry/materials.js, lib/recipe/paste.js).

/** A table frozen through: its rows, and each row's lists and records. */
function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const inner of Object.values(value)) deepFreeze(inner);
    Object.freeze(value);
  }
  return value;
}

/** A material defined by its molar formula, with the other names it goes by. */
export interface FormulaMaterial {
  readonly name: string;
  readonly aliases?: ReadonlyArray<string>;
  readonly formula: Readonly<Record<string, number>>;
}

/** A generic recipe word (or several) and the library materials to offer for it, most common first. */
export interface GenericName {
  readonly words: ReadonlyArray<string>;
  readonly offer: ReadonlyArray<string>;
}

// Stoichiometric (theoretical) materials, defined by molar formula so their
// analyses are exact. Mined materials such as Custer feldspar, EPK or
// nepheline syenite vary by supplier and lot, so users should enter those
// from their supplier's data sheet as an analysis instead. Where the standard
// library (data/) gives a name to a real product, or "Kaolin" offers a choice of
// products, the formula material here is "(theoretical)": one name, one material.
const FORMULA_MATERIALS: ReadonlyArray<FormulaMaterial> = deepFreeze<FormulaMaterial[]>([
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
]);

// Common recipe words that name a kind of material, not one product: "Kaolin",
// "Ball clay", "Feldspar", "Zircopax". A recipe written with one of them does
// not say which product the potter used, so paste-in import (paste.js
// matchName) offers the library's products of that kind as a choice, most
// common first, and never picks one for the person.
//
// A name or alias the library has exactly still wins, before this table is
// read: "Silica", "Flint", "Whiting" and "Talc" are products of the library,
// so they are taken as they stand, and "Potash Feldspar" is another name of
// the one product that has it. Only words the library does not have as a name
// or another name are here, so each offers its choice (a test checks it).
//
// `words` are the generic words as people write them (compared without case,
// accents, punctuation or spaces: "fire clay" is "fireclay", so one is enough), and `offer` are the names of library materials or
// additives, exactly as the standard library writes them, in the order to
// offer them. Nothing here is a material of its own: data/materials.ndjson
// and data/additives.ndjson are the library, and a test checks that every
// name offered is in them. A name the person's records do not have is skipped.

const GENERIC_NAMES: ReadonlyArray<GenericName> = deepFreeze<GenericName[]>([
  {
    // Kaolin and china clay: the one clay of the recipe's whiteness and plasticity differs by product.
    words: ['kaolin', 'kaolinite', 'kaolin clay', 'white clay', 'porcelain kaolin'],
    offer: [
      'EPK Kaolin',
      'Grolleg China Clay',
      'Tile #6 Kaolin',
      'China Clay',
      'Standard Porcelain China Clay',
      'Wilco UPF Kaolin'
    ]
  },
  {
    words: ['calcined clay', 'calcined china clay', 'calcined kaolinite'],
    offer: ['Calcined Kaolin (theoretical)', 'Glomax LL Calcined Kaolin']
  },
  {
    words: ['ball clay', 'plastic clay', 'ball clays'],
    offer: [
      'OM-4 Ball Clay',
      'Hyplas 71 Ball Clay',
      'Hymod AT Ball Clay',
      'HVAR Ball Clay',
      'TWVA Ball Clay',
      'Sibelco V161 Ball Clay'
    ]
  },
  {
    words: ['fireclay', 'stoneware clay'],
    offer: ['Hawthorn Bond Fireclay', 'Goldart']
  },
  {
    // Any feldspar, a potash one first: the potter's usual one is the one most recipes mean.
    words: ['feldspar', 'feldspars', 'felspar', 'spar', 'feldspath', 'feldspat', 'feldespato', 'fältspat'],
    offer: [
      'Custer Spar',
      'G-200 Feldspar',
      'Minspar 200',
      'Nepheline Syenite (typical)',
      'Potash Feldspar (Potterycrafts P3296)',
      'Soda Feldspar (Bath Potters / CTM)'
    ]
  },
  {
    words: ['potash spar', 'potassium feldspar', 'k feldspar', 'k spar', 'orthoclase feldspar', 'microcline'],
    offer: [
      'Custer Spar',
      'G-200 Feldspar',
      'Mahavir Potash Feldspar',
      'Potash Feldspar (Potterycrafts P3296)',
      'Orthoclase'
    ]
  },
  {
    words: ['soda spar', 'sodium feldspar', 'na feldspar', 'albite', 'albite feldspar'],
    offer: [
      'Minspar 200',
      'Kona F-4 Feldspar',
      'Soda Feldspar (Bath Potters / CTM)',
      'Soda Feldspar (Potclays 3427M / Potterycrafts P3317)'
    ]
  },
  {
    // "Nepheline Syenite 270" and "A270" are not here: they name Covia's A270, the record that has them.
    words: ['nepheline', 'nepheline syenite', 'neph', 'neph syenite'],
    offer: ['Nepheline Syenite (typical)', 'Nepheline Syenite A270', 'Nepheline Syenite (Norwegian, UK)']
  },
  {
    words: ['frit', 'frits', 'fritte', 'fritta', 'ferro frit', 'vibrantz frit', 'fusion frit', 'borosilicate frit'],
    offer: ['Ferro Frit 3134', 'Ferro Frit 3124', 'Ferro Frit 3110', 'Ferro Frit 3195', 'Ferro Frit 3249']
  },
  {
    // Zircopax, Superpax, Ultrox and Zircosil are makers' names for ground zirconium silicate (zircon).
    words: [
      'zircopax',
      'zircopax plus',
      'superpax',
      'ultrox',
      'zircosil',
      'zirconium silicate',
      'zircon opacifier',
      'zirconium opacifier',
      'zirconium',
      'zirconia'
    ],
    offer: ['Zircon', 'Zirconium oxide']
  },
  {
    words: [
      'silica flour',
      'silica sand',
      'quartz flour',
      'quartz powder',
      'silex',
      'sand',
      'potters flint',
      'flint flour'
    ],
    offer: ['Silica', 'Flint', 'Silica 200 Mesh (Sibelco Australia, Lang Lang)', 'Flint (UK calcined)']
  },
  {
    words: ['titanium', 'titania', 'titanium white'],
    offer: ['Titanium dioxide', 'Titanium Oxide', 'Rutile']
  }
]);

// A name as the library looks it up: lower case, with accents and other marks taken off (NFKD), and
// only the letters and digits of any script kept. 'Silica', 'SILICA' and 'silica.' are one name, as
// are 'Feldspath' and 'Feldspáth'; '釜戸長石' and 'Улексит' keep their letters, which once all came to ''.
const nameKey = (name: unknown): string =>
  String(name)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}]/gu, '');

export { FORMULA_MATERIALS, GENERIC_NAMES, nameKey };
