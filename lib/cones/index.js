'use strict';

// SK (JIS R 8101) pyrometric cones, as sold in Japan (docs/asia-plan.md, Phase B).
// The large cones (大型コーン, 1種) from SK 022 to SK 20, with the nominal
// melt-down temperature printed in the seller's table. These are the standard's
// reference temperatures, not what a potter's kiln will show, and they are never
// converted to or matched with another cone system's numbers.
//
// Source: 有恒商事株式会社 (Yuko Trading), 「ゼーゲルコーンの標準溶倒温度表」, the
// PDF's Last-Modified date 2017-12-20. It prints no heating rate. The standard
// itself is on the JSA's list as in force, reconfirmed 2023-10-20.
// Research: research_notes/Asia/japan-verification-2026-10-14.md.

/** The cone number as printed ('022', '015a', '7'), and its nominal melt-down temperature in °C. */
const row = (cone, celsius) => ({ cone, celsius });

const SK_LARGE_CONES = [
  row('022', 600),
  row('021', 650),
  row('020', 670),
  row('019', 690),
  row('018', 710),
  row('017', 730),
  row('016', 750),
  row('015a', 790),
  row('014a', 815),
  row('013a', 835),
  row('012a', 855),
  row('011a', 880),
  row('010a', 900),
  row('09a', 920),
  row('08a', 940),
  row('07a', 960),
  row('06a', 980),
  row('05a', 1000),
  row('04a', 1020),
  row('03a', 1040),
  row('02a', 1060),
  row('01a', 1080),
  row('1a', 1100),
  row('2a', 1120),
  row('3a', 1140),
  row('4a', 1160),
  row('5a', 1180),
  row('6a', 1200),
  row('7', 1230),
  row('8', 1250),
  row('9', 1280),
  row('10', 1300),
  row('11', 1320),
  row('12', 1350),
  row('13', 1380),
  row('14', 1410),
  row('15', 1435),
  row('16', 1460),
  row('17', 1480),
  row('18', 1500),
  row('19', 1520),
  row('20', 1530)
];

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
  cones: SK_LARGE_CONES
};

// Orton pyrometric cones (docs/adr/0021-recipe-firing.md, amended 2026-10-20).
// Two tables: the one Glazecalc shows and checks by, and Orton's own current
// figures beside it. Both are read at the heating rate over the last 100 °C of
// the firing; neither is converted from the other.
//
// ORTON.chart, the figures Glazecalc uses for a cone's temperature, its limits
// band and the cone check (lib/cones/firing.js): large cones heated at 150 °C
// an hour, from Orton's older chart "Temperature equivalents for Orton standard
// pyrometric cones (as determined at the National Bureau of Standards)", as
// kiln makers reprint it. Two reprints print the same figures: W P Dawson
// Inc's (©2000, hosted by L&L Kiln) and FireRight Controls' (©1994). It is the
// only Orton chart we found with a figure above cone 14: cone 15, 1431 °C.
// Matt Katz's boron rule (lib/chemistry/lead.js) gives cone 10 as 1305 °C, the
// same chart's figure. Before 2026-10-20 the code called these figures "60 °C an
// hour", and took 022 to 07 from the current chart's self-supporting column; the
// figures for 06 to 14 are unchanged.
//
// ORTON.published, Orton's own current figures: "Temperature Equivalents for
// Orton Pyrometric Cones (°C), Cone Numbers 022-14" (©2016), self-supporting
// regular cones (SSB) at 15, 60 and 150 °C an hour and large regular cones (LRB)
// at 60 and 150 °C an hour. The chart on Orton's site today stops at cone 12,
// with the same figures; its pages for each cone give the same for 13 and 14.
// Large cones 13 and 14 "have different compositions and different temperature
// equivalents", and large 14 is printed hotter at 60 °C an hour (1388 °C) than
// at 150 (1366 °C), in the chart and on its page alike. The iron-free and small
// cones' columns are left out.
//
// Above cone 14 Orton makes large cones (15 to 21, 23, 26 to 42), self-supporting
// ones (to 32, with 13½, 14½ and 15½) and PCE cones for refractories, but
// publishes no temperature for them: its charts for them are "available (by
// request)". So cone 15 has the older chart's figure and cones from 16 up have none.

/** A cone of Orton's older chart and its figure for large cones heated at 150 °C an hour. */
const ORTON_OLDER_150 = [
  ['022', 600], ['021', 614], ['020', 635], ['019', 683], ['018', 717], ['017', 747], ['016', 792],
  ['015', 804], ['014', 838], ['013', 852], ['012', 884], ['011', 894], ['010', 894], ['09', 923],
  ['08', 955], ['07', 984], ['06', 999], ['05', 1046], ['04', 1060], ['03', 1101], ['02', 1120],
  ['01', 1137], ['1', 1154], ['2', 1162], ['3', 1168], ['4', 1186], ['5', 1196], ['6', 1222],
  ['7', 1240], ['8', 1263], ['9', 1280], ['10', 1305], ['11', 1315], ['12', 1326], ['13', 1346],
  ['14', 1366], ['15', 1431]
]; // prettier-ignore

/**
 * Orton's current chart, a row a cone: self-supporting at 15, 60 and 150 °C an
 * hour, then large at 60 and 150 (null where Orton prints none). Half cones as
 * printed, '05.5' and '5.5'.
 */
const ORTON_PUBLISHED = [
  ['022', null, 586, 590, null, null],
  ['021', null, 600, 617, null, null],
  ['020', null, 626, 638, null, null],
  ['019', 656, 678, 695, 676, 693],
  ['018', 686, 715, 734, 712, 732],
  ['017', 705, 738, 763, 736, 761],
  ['016', 742, 772, 796, 769, 794],
  ['015', 750, 791, 818, 788, 816],
  ['014', 757, 807, 838, 807, 836],
  ['013', 807, 837, 861, 837, 859],
  ['012', 843, 861, 882, 858, 880],
  ['011', 857, 875, 894, 873, 892],
  ['010', 891, 903, 915, 898, 913],
  ['09', 907, 920, 930, 917, 928],
  ['08', 922, 942, 956, 942, 954],
  ['07', 962, 976, 987, 973, 985],
  ['06', 981, 998, 1013, 995, 1011],
  ['05.5', 1004, 1015, 1025, 1012, 1023],
  ['05', 1021, 1031, 1044, 1030, 1046],
  ['04', 1046, 1063, 1077, 1060, 1070],
  ['03', 1071, 1086, 1104, 1086, 1101],
  ['02', 1078, 1102, 1122, 1101, 1120],
  ['01', 1093, 1119, 1138, 1117, 1137],
  ['1', 1109, 1137, 1154, 1136, 1154],
  ['2', 1112, 1142, 1164, 1142, 1162],
  ['3', 1115, 1152, 1170, 1152, 1168],
  ['4', 1141, 1162, 1183, 1160, 1181],
  ['5', 1159, 1186, 1207, 1184, 1205],
  ['5.5', 1167, 1203, 1225, null, null],
  ['6', 1185, 1222, 1243, 1220, 1241],
  ['7', 1201, 1239, 1257, 1237, 1255],
  ['8', 1211, 1249, 1271, 1247, 1269],
  ['9', 1224, 1260, 1280, 1257, 1278],
  ['10', 1251, 1285, 1305, 1282, 1303],
  ['11', 1272, 1294, 1315, 1293, 1312],
  ['12', 1285, 1306, 1326, 1304, 1324],
  ['13', 1310, 1331, 1348, 1321, 1346],
  ['14', 1351, 1365, 1384, 1388, 1366]
];
/** The large cones Orton marks as made differently, with their own equivalents. */
const ORTON_LARGE_DIFFERENT = ['13', '14'];

const rates = (pairs) => Object.fromEntries(pairs.filter(([, celsius]) => celsius !== null));

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
    cones: ORTON_OLDER_150.map(([cone, celsius]) => ({ cone, celsius }))
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
    cones: ORTON_PUBLISHED.map(([cone, slow, medium, fast, large60, large150]) => ({
      cone,
      selfSupporting: rates([
        [15, slow],
        [60, medium],
        [150, fast]
      ]),
      ...(large60 !== null && {
        large: rates([
          [60, large60],
          [150, large150]
        ])
      }),
      ...(ORTON_LARGE_DIFFERENT.includes(cone) && { largeDiffers: true })
    }))
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
