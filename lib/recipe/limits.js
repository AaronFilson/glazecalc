'use strict';

// The figures the recipe checks warn at (checks.js; docs/adr/0012 and the
// research report "Extra materials in glaze substitution"), kept together so
// they can be read and tested as data. Unity formula values are moles; shares
// are percents of the batch. Where a check has two figures, past `caution` a
// glaze "tends to" show the fault and past `likely` it "will probably".
//
// The limits on the unity formula that depend on the firing come as a limit
// set (LIMIT_SETS): where it is from, its firing bands, and per band a range
// for each oxide or sum it limits. The checks in the swaps (pastLimits) use the
// app's own set; the recipe page shows the set the potter chooses, Hesselberth
// & Roy's by default (docs/adr/0019-shared-recipe-tools.md).

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

/** The firing bands a limit set may have, coolest first: cone 06-02, cone 4-6, cone 9-11. */
const FIRING_BANDS = Object.freeze(['low', 'mid', 'high']);

const L = CHECK_LIMITS;

/**
 * The app's own limits on the unity formula. It has two bands: below 1150 °C
 * low fire, and mid fire from there up, so cone 10 is checked as mid fire. A
 * range's `min` and `max` are where a caution starts; past `minLikely` or
 * `maxLikely` the fault is likely.
 */
const GLAZECALC_LIMITS = Object.freeze({
  id: 'glazecalc',
  name: 'Glazecalc',
  source: Object.freeze({
    title:
      'Glazecalc: docs/adr/0012-choosing-materials.md and the research report "Extra materials in glaze substitution"',
    url: 'https://github.com/AaronFilson/glazecalc/blob/master/docs/adr/0012-choosing-materials.md'
  }),
  bands: Object.freeze([Object.freeze({ band: 'low', belowC: FIRING.lowFireBelow }), Object.freeze({ band: 'mid' })]),
  whenUnknown: 'low',
  unity: Object.freeze({
    low: Object.freeze({
      B2O3: Object.freeze({
        max: L.boronLowFire.caution,
        maxLikely: L.boronLowFire.likely,
        maxLikelyThin: L.boronLowFire.thinLikely
      }),
      Al2O3: Object.freeze({ min: L.aluminaLowFire.caution, minLikely: L.aluminaLowFire.likely }),
      'K2O+Na2O': Object.freeze({ max: L.alkaliLowFire.caution, maxLikely: L.alkaliLowFire.likely }),
      MgO: Object.freeze({ max: L.magnesiaLowFire.caution, maxLikely: L.magnesiaLowFire.likely })
    }),
    mid: Object.freeze({
      B2O3: Object.freeze({ max: L.boronMidFire.caution, maxLikely: L.boronMidFire.likely }),
      Al2O3: Object.freeze({ min: L.aluminaMidFire.caution, minLikely: L.aluminaMidFire.likely }),
      'K2O+Na2O': Object.freeze({ max: L.alkaliMidFire.caution, maxLikely: L.alkaliMidFire.likely })
    })
  })
});

const range = (min, max) => Object.freeze({ min, max });

/**
 * John Hesselberth and Ron Roy's "Recommended Stable Glaze 'Limits'", for
 * functional stoneware and porcelain: their table in "Making Stable Glazes for
 * Functional Stoneware and Porcelain" (Ceramics Monthly, September 2000; the
 * authors' edited version, page 3), copied figure for figure. It has a cone 6
 * column and a cone 10 column; it gives no figure for zinc at cone 10, and none
 * for barium, lithium or lead at all (the article keeps to a short list of
 * materials). The authors call it "an amalgam of published sets and what we
 * have learned from leaching studies", which limits colors to whites, tans and
 * browns: guidance for a durable glaze, not a test of one. The figures are
 * read from the article (a copy of the authors' version is at
 * https://www.scribd.com/document/65634238/Stable-Glazes); their book,
 * Mastering Cone 6 Glazes (2002), has limits too, not checked here against
 * the article. A teaching handout and Glazy's table that
 * copy the set give K2O + Na2O at cone 6 as .01-.03; the article has 0.1-0.3.
 *
 * Below 1150 °C (low fire) the set does not apply, and says so rather than
 * stretching its cone 6 figures; cone 7 is read with the cone 6 figures, and
 * from about cone 8 (1250 °C) up with the cone 10 ones.
 */
const HESSELBERTH_ROY_LIMITS = Object.freeze({
  id: 'hesselberth-roy',
  name: 'Hesselberth & Roy',
  source: Object.freeze({
    title: `John Hesselberth and Ron Roy, the table "Recommended Stable Glaze 'Limits'" (Ceramics Monthly, September 2000); the link is their book, Mastering Cone 6 Glazes, on Google Books`,
    // The article is not online from its publisher; the link is the book's, on Google Books.
    url: 'https://books.google.com/books/about/Mastering_Cone_6_Glazes.html?id=umSwAAAACAAJ'
  }),
  bands: Object.freeze([
    Object.freeze({ band: 'low', belowC: FIRING.lowFireBelow }),
    Object.freeze({ band: 'mid', belowC: 1250 }),
    Object.freeze({ band: 'high' })
  ]),
  whenUnknown: 'mid',
  /** The cone each band's figures are for, as the source names it. */
  cones: Object.freeze({ mid: '6', high: '10' }),
  unity: Object.freeze({
    mid: Object.freeze({
      'K2O+Na2O': range(0.1, 0.3),
      CaO: range(0.2, 0.6),
      MgO: range(0, 0.3),
      ZnO: range(0, 0.2),
      SrO: range(0, 0.2),
      Al2O3: range(0.25, 0.4),
      B2O3: range(0.15, 0.35),
      SiO2: range(2.5, 4.0)
    }),
    high: Object.freeze({
      'K2O+Na2O': range(0.1, 0.3),
      CaO: range(0.3, 0.7),
      MgO: range(0, 0.4),
      SrO: range(0, 0.3),
      Al2O3: range(0.3, 0.6),
      B2O3: range(0, 0.3),
      SiO2: range(3.0, 5.0)
    })
  })
});

/** The limit sets to choose from, by id. */
const LIMIT_SETS = Object.freeze({ 'hesselberth-roy': HESSELBERTH_ROY_LIMITS, glazecalc: GLAZECALC_LIMITS });

/** The set the recipe page shows until the potter chooses another (the owner's choice, 2026-10). */
const DEFAULT_LIMIT_SET = 'hesselberth-roy';

/**
 * The band of a set a firing falls in: the first whose `belowC` it is under,
 * or the last band. Undefined when the firing is not known.
 */
function bandOf(set, celsius) {
  if (celsius === undefined) return undefined;
  const bands = set.bands;
  return (bands.find((band) => band.belowC !== undefined && celsius < band.belowC) ?? bands[bands.length - 1]).band;
}

/**
 * A set's ranges for a band, or null where the set does not apply: a band it
 * names but gives no figures for (Hesselberth & Roy's at low fire). A band it
 * does not name is read as its nearest: the app's own set, with no high band,
 * checks cone 10 by its mid fire figures.
 */
function unityFor(set, band) {
  const named = set.bands.map((b) => b.band);
  if (named.includes(band)) return set.unity[band] ?? null;
  const order = FIRING_BANDS.indexOf(band);
  const nearest = named.reduce((best, b) =>
    Math.abs(FIRING_BANDS.indexOf(b) - order) < Math.abs(FIRING_BANDS.indexOf(best) - order) ? b : best
  );
  return set.unity[nearest] ?? null;
}

/** A unity formula's value for an oxide or a sum of them ('K2O+Na2O'). */
const unityValue = (unity, key) => key.split('+').reduce((sum, oxide) => sum + (unity[oxide] ?? 0), 0);

/**
 * A row per limit a set has for a band: the oxide or sum, the recipe's value,
 * the range, and which side of it the value is past (null within it), and
 * whether it is past the set's figure for a likely fault too, where it has one. Null where
 * the set does not apply to the band.
 */
function limitRows(unity, set, band) {
  const ranges = unityFor(set, band);
  if (!ranges) return null;
  return Object.entries(ranges).map(([oxide, r]) => {
    const value = unityValue(unity, oxide);
    const past = r.min !== undefined && value < r.min ? 'below' : r.max !== undefined && value > r.max ? 'above' : null;
    const likely =
      (past === 'below' && r.minLikely !== undefined && value < r.minLikely) ||
      (past === 'above' && r.maxLikely !== undefined && value > r.maxLikely);
    return { oxide, value, min: r.min, max: r.max, past, likely };
  });
}

module.exports = {
  FIRING,
  CHECK_LIMITS,
  FIRING_BANDS,
  GLAZECALC_LIMITS,
  HESSELBERTH_ROY_LIMITS,
  LIMIT_SETS,
  DEFAULT_LIMIT_SET,
  bandOf,
  unityFor,
  limitRows
};
