'use strict';

// What a unity formula says beyond its oxides (docs/adr/0019-shared-recipe-tools.md):
// each oxide's share of the moles, and where the glaze sits on a Stull chart.
// Pure functions of the unity formula, with no words; the regions are codes.

/** Each oxide's percent of all the moles in a unity formula; empty when it has none. */
function molePercent(unity) {
  const entries = Object.entries(unity ?? {}).filter(([, moles]) => moles > 0);
  const total = entries.reduce((sum, [, moles]) => sum + moles, 0);
  return total > 0 ? Object.fromEntries(entries.map(([oxide, moles]) => [oxide, (100 * moles) / total])) : {};
}

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
 */
const STULL = Object.freeze({
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
      [1.2, 0.242],
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

/** The least alumina in any of Stull's regions. */
const LOWEST_ALUMINA = 0.08;

/** Whether a point is inside a polygon (even-odd rule; a point on an edge may fall either way). */
function inside([x, y], polygon) {
  let within = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) within = !within;
  }
  return within;
}

/**
 * Where a unity formula sits on Stull's chart: its silica and alumina, their
 * ratio, the region ('unfused', 'matte', 'semi-matte', 'bright' or
 * 'underfired', or 'unclassified' under the alumina of the lowest region; null off the chart) and whether it is in the crazed area.
 * Null without silica or alumina.
 */
function stullPoint(unity) {
  const silica = unity?.SiO2 ?? 0;
  const alumina = unity?.Al2O3 ?? 0;
  if (!(silica > 0) || !(alumina > 0)) return null;
  const point = [silica, alumina];
  const onChart =
    silica >= STULL.silica.min &&
    silica <= STULL.silica.max &&
    alumina >= STULL.alumina.min &&
    alumina <= STULL.alumina.max;
  // Stull's lowest region starts at 0.08 alumina; under it his chart says nothing.
  const region = !onChart
    ? null
    : alumina < LOWEST_ALUMINA
      ? 'unclassified'
      : (Object.keys(STULL.regions).find((name) => inside(point, STULL.regions[name])) ?? 'bright');
  return { silica, alumina, ratio: silica / alumina, region, crazed: onChart && inside(point, STULL.crazed) };
}

module.exports = { molePercent, STULL, stullPoint };
