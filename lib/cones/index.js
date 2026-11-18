'use strict';

// The cone charts as the app shows them (docs/adr/0030-nameless-chemistry-core.md): what each chart is,
// its sources and its notes, with the figures of the catalog's charts (lib/catalog/cones.ts), whose
// comments say where each comes from.
const { SK_CONES, ORTON_CHART_CONES, ORTON_PUBLISHED_CONES } = require('../catalog/cones.ts');

const SK = {
  /** What the figures are: the standard's reference values, not a measured bend. */
  basis: 'nominal (JIS)',
  standard: 'JIS R 8101:1999',
  size: 'large',
  /** The seller whose table the figures are read from. */
  seller: '有恒商事株式会社',
  source: 'http://www.yukotrading.co.jp/pdf/segercone_table.pdf',
  /** The JSA's listing of the standard: in force, reconfirmed 2023-10-20. */
  standardUrl: 'https://webdesk.jsa.or.jp/books/W11M0090/index/?bunsyo_id=JIS+R+8101:1999',
  standardStatus: '有効',
  standardReconfirmed: '2023-10-20',
  status: 'verified',
  /** Read again on 2026-10-19 (the same PDF, Last-Modified 2017-12-20): large cones end at SK 20; SK 26 to 42 are small cones for refractories. */
  checked: '2026-10-19',
  /** The plan's wording (docs/asia-plan.md, Phase B item 3), for the chart to carry. */
  note:
    "The standard gives reference temperatures. At a potter's rate of about 100 °C/h, Kyoto's municipal institute " +
    'measured its own Kyoto cones bending 47–79 °C cooler than the JIS figure for the same number; we found no such ' +
    'measurements for SK cones to JIS. Set a witness cone and compare.',
  cones: SK_CONES
};

const ORTON = {
  chart: {
    /** What the figures are, in a few words. */
    basis: "Orton's older chart, large cones at 150 °C an hour",
    size: 'large',
    /** °C an hour over the last 100 °C. */
    rate: 150,
    title:
      'Temperature equivalents for Orton standard pyrometric cones (as determined at the National Bureau of Standards)',
    /** A reprint by a kiln maker, not Orton's own copy. */
    source: 'https://hotkilns.com/sites/default/files/pdf/dawson-cones.pdf',
    reprintedBy: 'W P Dawson Inc (©2000)',
    alsoIn: 'https://www.fireright.com/docs/general/pcomecharts.pdf',
    status: 'secondary',
    checked: '2026-10-19',
    note:
      "Orton's older chart for large cones heated at 150 °C an hour over the last 100 °C, as kiln makers reprint it; " +
      "Orton's current figures for large cones at that rate differ from it by up to 19 °C. Orton publishes no figure " +
      'above cone 14, and this chart none above cone 15. Cones measure heatwork, not temperature: set a witness cone.',
    cones: ORTON_CHART_CONES
  },
  published: {
    title: 'Temperature Equivalents for Orton Pyrometric Cones (°C), Cone Numbers 022-14',
    publisher: 'The Edward Orton Jr. Ceramic Foundation',
    year: 2016,
    source: 'https://www.ortonceramic.com/files/2676/File/Orton-Cone-Chart-C-022-14-2016.pdf',
    /** The chart on Orton's site today: cones 022 to 12, the same figures. */
    current: 'https://www.ortonceramic.com/_files/ugd/7c9d79_655ff5f02f474711ad75e37f7f5bd03b.pdf',
    /** Orton's pages for each cone, which give 13 and 14 as the 2016 chart does. */
    products: 'https://www.ortonceramic.com/large-cones',
    status: 'verified',
    checked: '2026-10-19',
    note:
      'Rates are over the last 100 °C of the firing. Large cones 13 and 14 have different compositions and ' +
      'different temperature equivalents; Orton publishes no figure above cone 14.',
    cones: ORTON_PUBLISHED_CONES
  }
};

/**
 * The charts' notes, the words the cone chart shows beside the figures. They are
 * translated under their textKey (lib/regions/languages.js), like a material's
 * hazards, so a translation shows only for exactly the English it was made from
 * (scripts/i18n-sources.mjs writes them into records/en.json).
 * @returns {string[]}
 */
const texts = () => [SK.note, ORTON.chart.note, ORTON.published.note];

module.exports = { SK, ORTON, texts };
