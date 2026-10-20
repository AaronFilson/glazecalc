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
  /**
   * From here up (Orton cone 12, 1326 °C on lib/cones' chart, and hotter) no
   * limit set has figures: published limits stop at cone 10, and the sets read
   * theirs one cone past it, to cone 11 (1315 °C), as cone 6's reach cone 7.
   */
  topFrom: 1320,
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

/**
 * The firing bands a limit set may have, coolest first: cone 06-02, cone 4-6,
 * cone 9-11, and cone 12 up ('top'), which no set has figures for (the limits
 * we found published, Hesselberth & Roy's, the UK traditional set and Green &
 * Cooper's, stop at cone 10; docs/adr/0021-recipe-firing.md, amended 2026-10-20).
 */
const FIRING_BANDS = Object.freeze(['low', 'mid', 'high', 'top']);

const L = CHECK_LIMITS;

/**
 * The app's own limits on the unity formula. Below 1150 °C low fire, and mid
 * fire from there to cone 11, so cone 10 is checked as mid fire; from cone 12
 * up (FIRING.topFrom) it has no figures, as no published set does. A
 * range's `min` and `max` are where a caution starts (a value at the figure
 * itself is within: see `pastSide`); at or past `minLikely` or `maxLikely`
 * the fault is likely.
 */
const GLAZECALC_LIMITS = Object.freeze({
  id: 'glazecalc',
  name: 'Glazecalc',
  source: Object.freeze({
    title:
      'Glazecalc: docs/adr/0012-choosing-materials.md and the research report "Extra materials in glaze substitution"',
    url: 'https://github.com/AaronFilson/glazecalc/blob/master/docs/adr/0012-choosing-materials.md'
  }),
  bands: Object.freeze([
    Object.freeze({ band: 'low', belowC: FIRING.lowFireBelow }),
    Object.freeze({ band: 'mid', belowC: FIRING.topFrom }),
    Object.freeze({ band: 'top' })
  ]),
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
 * from about cone 8 (1250 °C) to cone 11 with the cone 10 ones. From cone 12
 * (FIRING.topFrom) it does not apply either: we found no published limits
 * that reach that far, and figures for another firing would mislead.
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
    Object.freeze({ band: 'high', belowC: FIRING.topFrom }),
    Object.freeze({ band: 'top' })
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
 * The band of a set a firing band is read as: the band itself where the set
 * names it, else the nearest it names, the cooler of two as near (the app's
 * own set, with no high band, reads cone 10 as its mid fire).
 */
function bandIn(set, band) {
  const named = set.bands.map((b) => b.band);
  if (named.includes(band)) return band;
  const order = FIRING_BANDS.indexOf(band);
  return named.reduce((best, b) =>
    Math.abs(FIRING_BANDS.indexOf(b) - order) < Math.abs(FIRING_BANDS.indexOf(best) - order) ? b : best
  );
}

/**
 * A set's ranges for a band, or null where the set does not apply: a band it
 * names but gives no figures for (Hesselberth & Roy's at low fire, and every
 * set's 'top'). A band it does not name is read as its nearest (bandIn).
 */
function unityFor(set, band) {
  return set.unity[bandIn(set, band)] ?? null;
}

/** A unity formula's value for an oxide or a sum of them ('K2O+Na2O'). */
const unityValue = (unity, key) => key.split('+').reduce((sum, oxide) => sum + (unity[oxide] ?? 0), 0);

/**
 * A value as the limits compare it: at the two decimals it is shown with
 * (recipe-limits.ts, and the checks' figures), so the table never says "below"
 * beside a figure that reads as the bound, and a float hair over a bound
 * (0.2 + 0.1 = 0.30000000000000004) is not past it. toFixed rounds the
 * double's exact value, as the page's number format does.
 */
const asShown = (value) => (Number.isFinite(value) ? Number(value.toFixed(2)) : value);

/**
 * Which side of a range a value is past, or null within it. A range is closed:
 * a value at its `min` or `max` is within, as Hesselberth & Roy's "0.25-0.40"
 * reads. The checks (checks.js pastLimits) and the table (limitRows) both use
 * this, so they agree.
 */
function pastSide(value, r) {
  const v = asShown(value);
  if (r.min !== undefined && v < r.min) return 'below';
  if (r.max !== undefined && v > r.max) return 'above';
  return null;
}

/**
 * Whether a value past a range is past its figure for a likely fault too: at
 * or beyond `minLikely` or `maxLikely` (`maxLikelyThin` for a thin glaze). A
 * range with no such figure (Hesselberth & Roy give one figure per edge) has
 * no likely fault, only a caution.
 */
function isLikely(value, r, past, thin) {
  const v = asShown(value);
  if (past === 'below') return r.minLikely !== undefined && v <= r.minLikely;
  if (past === 'above') {
    const maxLikely = (thin ? r.maxLikelyThin : undefined) ?? r.maxLikely;
    return maxLikely !== undefined && v >= maxLikely;
  }
  return false;
}

/** A thin glaze, for boron's likely figure: alumina or silica under CHECK_LIMITS.thin. */
const isThin = (unity) => (unity.Al2O3 ?? 0) < L.thin.alumina || (unity.SiO2 ?? 0) < L.thin.silica;

/**
 * A row per limit a set has for a band: the oxide or sum, the recipe's value,
 * the range, and which side of it the value is past (null within it), and
 * whether it is past the set's figure for a likely fault too, where it has one. Null where
 * the set does not apply to the band.
 */
function limitRows(unity, set, band) {
  const ranges = unityFor(set, band);
  if (!ranges) return null;
  // The same comparisons as the checks (checks.js pastLimits): pastSide and isLikely.
  const thin = isThin(unity);
  return Object.entries(ranges).map(([oxide, r]) => {
    const value = unityValue(unity, oxide);
    const past = pastSide(value, r);
    return { oxide, value, min: r.min, max: r.max, past, likely: isLikely(value, r, past, thin) };
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
  bandIn,
  unityFor,
  pastSide,
  isLikely,
  isThin,
  limitRows
};
