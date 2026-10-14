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
  checked: '2026-10-14',
  /** The plan's wording (docs/asia-plan.md, Phase B item 3), for the chart to carry. */
  note:
    "The standard gives reference temperatures; at a potter's rate of about 100 °C/h, cones have been " +
    "measured bending 40–70 °C cooler (Kyoto's institute, Kyoto cones). Set a witness cone and compare.",
  cones: SK_LARGE_CONES
};

module.exports = { SK };
