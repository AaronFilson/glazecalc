'use strict';

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
// are here.
//
// `words` are the generic words as people write them (compared without case,
// accents, punctuation or spaces: "fire clay" is "fireclay", so one is enough), and `offer` are the names of library materials or
// additives, exactly as the standard library writes them, in the order to
// offer them. Nothing here is a material of its own: data/materials.ndjson
// and data/additives.ndjson are the library, and a test checks that every
// name offered is in them. A name the person's records do not have is skipped.

/** @type {{ words: string[], offer: string[] }[]} */
const GENERIC_NAMES = [
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
      'Nepheline Syenite',
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
    words: [
      'nepheline',
      'nepheline syenite',
      'nepheline syenite 270',
      'neph',
      'neph syenite',
      'nepheline syenite a270'
    ],
    offer: ['Nepheline Syenite', 'Nepheline Syenite A270', 'Nepheline Syenite (Norwegian, UK)']
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
];

module.exports = { GENERIC_NAMES };
