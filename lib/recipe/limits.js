'use strict';

// The figures the recipe checks warn at (checks.js; docs/adr/0012 and the
// research report "Extra materials in glaze substitution"), kept together so
// they can be read and tested as data. Unity formula values are moles; shares
// are percents of the batch. Where a check has two figures, past `caution` a
// glaze "tends to" show the fault and past `likely` it "will probably".
//
// Published limit sets (Hesselberth & Roy's, and others a potter may choose)
// are to sit beside these as LIMIT_SETS: see docs/adr/0019-shared-recipe-tools.md.

/** Firing bands, in °C. */
const FIRING = Object.freeze({
  /** Below this the firing is low fire (cone 06-02); above it, mid fire (cone 4-6). */
  lowFireBelow: 1150,
  /** Zinc hardly melts below cone 03. */
  zincMeltsFrom: 1101
});

const CHECK_LIMITS = Object.freeze({
  /** B2O3 at low fire (or an unknown firing); `thinLikely` when alumina or silica is thin. */
  boronLowFire: { caution: 0.8, likely: 1.0, thinLikely: 0.8 },
  /** B2O3 at mid fire. */
  boronMidFire: { caution: 0.33, likely: 0.4 },
  /** A thin glaze, for the boron check: Al2O3 or SiO2 under these. */
  thin: { alumina: 0.15, silica: 2 },
  /** Too little boron at low fire: under this share of Katz's rule (boronFor). */
  boronShortShare: 0.8,
  /** Al2O3 too low: under `caution` it tends to run, under `likely` it will. */
  aluminaLowFire: { caution: 0.15, likely: 0.1 },
  aluminaMidFire: { caution: 0.25, likely: 0.2 },
  /** SiO2:Al2O3 under this is matte or dry. */
  silicaAluminaBelow: 5,
  /** Boron blue: B2O3 and CaO over these, Al2O3 under. */
  boronBlue: { boron: 0.5, calcia: 0.5, alumina: 0.2 },
  /** K2O + Na2O. */
  alkaliLowFire: { caution: 0.35, likely: 0.5 },
  alkaliMidFire: { caution: 0.3, likely: 0.4 },
  /** MgO at low fire. */
  magnesiaLowFire: { caution: 0.1, likely: 0.3 },
  /** ZnO from which colorants and low fire matter. */
  zinc: 0.02,
  /** Raw whiting and dolomite at low fire, percent of the batch. */
  rawCalcium: { caution: 5, likely: 10 },
  /** Raw clay, percent of the batch: under `least` it settles; over `caution` it shrinks and crawls. */
  clay: { least: 5, caution: 20, likely: 25 },
  /** Calculated expansion, x10^-6 per °C, against the old recipe. */
  expansionRises: { caution: 0.2, likely: 0.5 },
  expansionFalls: { caution: 0.5, likely: 1 },
  /** Not news: the old recipe had it, and the new one is no more than this factor worse. */
  alreadyFactor: 1.1,
  /** Materials to buy and weigh: this many or more (one fewer at low fire). */
  manyMaterials: 8,
  manyMaterialsLowFire: 7,
  /** An amount under this percent of the batch is hard to weigh in a test batch. */
  smallPercent: 1,
  /** What a test-batch scale reads to, in grams. */
  scaleReads: 0.1
});

module.exports = { FIRING, CHECK_LIMITS };
