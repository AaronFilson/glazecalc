// The limits a recipe is checked against, and Stull's chart: data, which the core is given in its host
// (host.limits, host.stull) and never holds (docs/adr/0031-functional-core.md). The figures the recipe
// checks warn at (docs/adr/0012 and the research report "Extra materials in glaze substitution") and the
// limit sets on the unity formula; unity formula values are moles, shares are percents of the batch. Where a
// check has two figures, past `caution` a glaze "tends to" show the fault and past `likely` it "will
// probably". The checks in the swaps use the app's own set; the recipe page shows the set the potter
// chooses, Hesselberth & Roy's by default (docs/adr/0019-shared-recipe-tools.md).

import type { CheckLimits, FiringFigures, LimitSet, LimitTable, UnityRange } from '../core/recipe/limits.ts';
import type { StullChart } from '../core/recipe/analysis.ts';
import { HIGH_BELOW, LOW_BELOW, MID_BELOW } from './cones.ts';

/** Firing bands, in °C. */
const FIRING: FiringFigures = Object.freeze({
  /** Below this the firing is low fire (cone 06-02); above it, mid fire (cone 4-6). */
  lowFireBelow: LOW_BELOW,
  /**
   * From here up (Orton cone 12, 1326 °C on lib/cones' chart, and hotter) no
   * limit set has figures: published limits stop at cone 10, and the sets read
   * theirs one cone past it, to cone 11 (1315 °C), as cone 6's reach cone 7.
   */
  topFrom: HIGH_BELOW,
  /** Zinc hardly melts below cone 03. */
  zincMeltsFrom: 1101
});

const CHECK_LIMITS: CheckLimits = Object.freeze({
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
  /**
   * BaO in the unity formula, at any firing: past `caution` barium can leach from the fired glaze
   * onto food, and from `likely` it is likely to. Digitalfire's Limit Formula page
   * (https://digitalfire.com/glossary/123): "For functional glazes low BaO levels can often be
   * tolerated (e.g. 0.05-0.1) if the glaze chemistry is balanced", and "any glaze that has 0.4 BaO
   * would be off-the-scale for potential to leach". Read as a range is (checks.js bariumSeverity):
   * at the two decimals shown, 0.10 itself is within.
   */
  barium: { caution: 0.1, likely: 0.4 },
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

const L = CHECK_LIMITS;

/**
 * The app's own limits on the unity formula. Below 1150 °C low fire, and mid
 * fire from there to cone 11, so cone 10 is checked as mid fire; from cone 12
 * up (FIRING.topFrom) it has no figures, as no published set does. A
 * range's `min` and `max` are where a caution starts (a value at the figure
 * itself is within: see `pastSide`); at or past `minLikely` or `maxLikely`
 * the fault is likely.
 */
const GLAZECALC_LIMITS: LimitSet = Object.freeze({
  id: 'glazecalc',
  bands: Object.freeze([
    Object.freeze({ band: 'low', belowC: FIRING.lowFireBelow }),
    Object.freeze({ band: 'mid', belowC: FIRING.topFrom }),
    Object.freeze({ band: 'top' })
  ]),
  whenUnknown: 'low' as const,
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

const range = (min: number, max: number): UnityRange => Object.freeze({ min, max });

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
const HESSELBERTH_ROY_LIMITS: LimitSet = Object.freeze({
  id: 'hesselberth-roy',
  bands: Object.freeze([
    Object.freeze({ band: 'low', belowC: FIRING.lowFireBelow }),
    Object.freeze({ band: 'mid', belowC: MID_BELOW }),
    Object.freeze({ band: 'high', belowC: FIRING.topFrom }),
    Object.freeze({ band: 'top' })
  ]),
  whenUnknown: 'mid' as const,
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
const LIMIT_SETS: Readonly<Record<string, LimitSet>> = Object.freeze({
  'hesselberth-roy': HESSELBERTH_ROY_LIMITS,
  glazecalc: GLAZECALC_LIMITS
});

/** The set the recipe page shows until the potter chooses another (the owner's choice, 2026-10). */
const DEFAULT_LIMIT_SET: string = 'hesselberth-roy';

/**
 * R. T. Stull's chart of silica against alumina in the unity formula: "Influences
 * of variable silica and alumina on porcelain glazes of constant RO", Transactions
 * of the American Ceramic Society 14 (1912), 62-70. Stull fired at cone 11 with
 * the fluxes fixed at 0.3 K2O and 0.7 CaO, so the regions are a guide to the
 * surface, not a prediction: other fluxes and firings move them, and a matte
 * glaze can plot as bright when underfired.
 *
 * The outlines are Glazy's reading of Stull's chart, by Derek Au: points
 * { x: SiO2, y: Al2O3 } from charts/stull-chart-d3.js in
 * https://github.com/derekphilipau/ceramic-chemistry-visualization
 * (Copyright (c) 2017 Derek Au, MIT License: the full notice, which the licence
 * asks to travel with the outlines, is in THIRD-PARTY-NOTICES.md at the repo's
 * root and credited on the About page). Bright is what the others leave,
 * and crazed overlaps them. `bright` is Stull's line of the brightest glazes.
 * Semi-matte's first point is on matte's lower edge, as on Stull's chart:
 * Glazy's 0.242 is 0.00035 under it, which left a sliver of bright between
 * the two.
 */
const STULL: StullChart = Object.freeze<StullChart>({
  /** The chart's extent, in moles. */
  silica: Object.freeze({ min: 0.6, max: 7.2 }),
  alumina: Object.freeze({ min: 0, max: 1 }),
  regions: Object.freeze({
    unfused: [
      [0.6, 0.42],
      [0.6, 1.0],
      [2.8, 1.0]
    ],
    matte: [
      [0.6, 0.08],
      [0.6, 0.42],
      [2.8, 1.0],
      [4.0, 1.0]
    ],
    'semi-matte': [
      // At 1.2 on the line from (0.6, 0.08) to (4.0, 1.0).
      [1.2, 0.08 + ((1.0 - 0.08) * (1.2 - 0.6)) / (4.0 - 0.6)],
      [4.0, 1.0],
      [5.0, 1.0]
    ],
    underfired: [
      [2.4, 0.08],
      [7.2, 0.65],
      [7.2, 0.08]
    ]
  }),
  crazed: [
    [0.6, 0.08],
    [0.6, 1.0],
    [1.67, 1.0],
    [2.1, 0.5],
    [2.38, 0.25],
    [2.7, 0.23],
    [3.3, 0.25],
    [3.9, 0.28],
    [4.2, 0.29],
    [5.4, 0.49],
    [7.2, 0.615],
    [7.2, 0.08]
  ],
  bright: [
    [1.8, 0.2],
    [4.2, 0.6],
    [6.0, 0.8],
    [7.2, 0.92]
  ]
});

/** The limits as the core's host takes them (host.limits): the figures, the app's own set, and the set cone fit reads. */
const LIMITS: LimitTable = Object.freeze({
  firing: FIRING,
  checks: CHECK_LIMITS,
  own: GLAZECALC_LIMITS,
  forFit: HESSELBERTH_ROY_LIMITS
});

export { CHECK_LIMITS, DEFAULT_LIMIT_SET, FIRING, GLAZECALC_LIMITS, HESSELBERTH_ROY_LIMITS, LIMIT_SETS, LIMITS, STULL };
