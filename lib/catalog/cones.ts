// The cone charts' figures, and the figures cones are read by: data, which the core is given in its host
// (host.cones, built once by the core's coneTable) and never holds (docs/adr/0031-functional-core.md). What
// each chart is, its sources and notes, are the app's (lib/cones/index.js).

import { coneTable } from '../core/cones/firing.ts';
import type { ConeCharts, ConeRow, PublishedCone } from '../core/cones/firing.ts';

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

const row = (cone: string, celsius: number): ConeRow => ({ cone, celsius });

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
const ORTON_OLDER_150: Array<[cone: string, celsius: number]> = [
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
const ORTON_PUBLISHED: Array<
  [cone: string, slow: number | null, medium: number, fast: number, large60: number | null, large150: number | null]
> = [
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

const rates = (pairs: Array<[number, number | null]>): Record<number, number> =>
  Object.fromEntries(pairs.filter((pair): pair is [number, number] => pair[1] !== null));

/** SK's large cones: each cone as printed and its nominal melt-down temperature in °C. */
const SK_CONES = SK_LARGE_CONES;

/** Orton's older chart: each cone and its figure for large cones heated at 150 °C an hour. */
const ORTON_CHART_CONES: ConeRow[] = ORTON_OLDER_150.map(([cone, celsius]) => ({ cone, celsius }));

/** Orton's current figures: each cone's self-supporting and large figures by heating rate. */
const ORTON_PUBLISHED_CONES: PublishedCone[] = ORTON_PUBLISHED.map(([cone, slow, medium, fast, large60, large150]) => ({
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
}));

/** Orton's cones above 15, rare in a pottery: offered at the end of the list, as Orton sells them. */
const ORTON_ABOVE_15 = ['16', '17', '18', '19', '20', '21', '23', '26', '27', '28', '29', '30', '31', '31.5', '32', '32.5', '33', '34', '35', '36', '37', '38', '39', '40', '41', '42']; // prettier-ignore
/**
 * Half cones: 05½, which Orton makes and charts (ORTON.published), between 06
 * and 05; and those between whole ones from 1 to 16, a cone partly bent or a
 * controller set between two (Orton sells self-supporting 13½, 14½ and 15½).
 */
const ORTON_HALVES = ['05.5', ...Array.from({ length: 15 }, (_, i) => `${i + 1}.5`)];

/**
 * SK cones measured, not nominal: the Kyoto Municipal Institute of Industrial
 * Technology and Culture's bend points at 100 °C an hour, when it moved its
 * users from its own Seger cones to Orton (https://tc-kyoto.or.jp/app/uploads/2025/07/OrtonCorn.pdf,
 * read in the research report "Recipe cone field"). They are Kyoto's cones,
 * not JIS ones; they are used because the JIS figures (SK 8 1250 °C, SK 10
 * 1300 °C) read far hotter than a potter's kiln bends them. Of them only SK 8
 * and SK 10 are shown as a temperature, and every other SK cone is shown with
 * no temperature at all (the owner's decision, docs/adr/0021-recipe-firing.md):
 * mixing them with the JIS figures of their neighbours (SK 7 1230 °C, SK 9
 * 1280 °C) would put the cones out of order.
 */
const SK_MEASURED: Readonly<Record<string, number>> = Object.freeze({ 8: 1198, 10: 1232 });
/**
 * Kyoto's whole table, both columns bent in the same kiln at 100 °C an hour
 * (ADR 0021, amended 2026-10-19): its own cones SK 7 to 14, and Orton cones 4
 * to 12 (the table labels the first three 4a, 5a and 6a; the figure sits in
 * the Orton column). SK and Orton are matched across these two columns, not
 * against Orton's chart (ORTON_CELSIUS), which is another heating rate. They give
 * only the match between the scales; the temperatures shown are SK_MEASURED
 * and ORTON_CELSIUS.
 */
const KYOTO_SK: Readonly<Record<string, number>> = Object.freeze({
  7: 1183,
  8: 1198,
  9: 1211,
  10: 1232,
  11: 1253,
  12: 1290,
  13: 1311,
  14: 1331
});
const KYOTO_ORTON: Readonly<Record<string, number>> = Object.freeze({
  4: 1179,
  5: 1207,
  6: 1211,
  7: 1232,
  8: 1252,
  9: 1271,
  10: 1290,
  11: 1301,
  12: 1324
});
/** The institute's own replacement: SK 12 ≈ Orton 10. */
const SK_ORTON_STATED: Readonly<Record<string, string>> = Object.freeze({ 12: '10' });

/**
 * The band an SK cone's glaze is checked in, kept as a table rather than
 * read from the JIS figures: by Kyoto's same-kiln columns SK 8 is near Orton 5
 * and SK 10 near Orton 7, SK 11 near Orton 8, and SK 12 stands in for Orton 10,
 * so SK 5a to 10 is mid fire and SK 11 up high fire (the ADR gives the reasoning).
 * SK 13 is near Orton 11 and SK 14 near Orton 12, so from SK 14 up is past
 * every limit set's figures, as Orton 12 is (ADR 0021, amended 2026-10-20).
 */
const SK_MID_FROM = '5a';
const SK_HIGH_FROM = '11';
const SK_TOP_FROM = '14';

/** Band edges in °C, as Hesselberth & Roy's set draws them (lib/core/recipe/limits.ts). */
const LOW_BELOW = 1150;
const MID_BELOW = 1250;
/** From here up (Orton cone 12, 1326 °C, and hotter) no limit set has figures: the 'top' band. */
const HIGH_BELOW = 1320;

/** The charts and figures, as the core's coneTable takes them. */
const CONE_CHARTS: ConeCharts = Object.freeze({
  skCones: SK_CONES,
  ortonChart: ORTON_CHART_CONES,
  ortonPublished: ORTON_PUBLISHED_CONES,
  ortonAbove15: ORTON_ABOVE_15,
  ortonHalves: ORTON_HALVES,
  skMeasured: SK_MEASURED,
  kyotoSk: KYOTO_SK,
  kyotoOrton: KYOTO_ORTON,
  skOrtonStated: SK_ORTON_STATED,
  skMidFrom: SK_MID_FROM,
  skHighFrom: SK_HIGH_FROM,
  skTopFrom: SK_TOP_FROM,
  lowBelow: LOW_BELOW,
  midBelow: MID_BELOW,
  highBelow: HIGH_BELOW
});

/** The charts with their lookups worked out once, as the core's host takes them (host.cones). */
const CONES = coneTable(CONE_CHARTS);

export { CONE_CHARTS, CONES, ORTON_CHART_CONES, ORTON_PUBLISHED_CONES, SK_CONES, SK_MEASURED };
