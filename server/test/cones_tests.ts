import { expect } from 'chai';
import chemistry from '../../lib/chemistry/index.js';
import cones from '../../lib/cones/index.js';

const { SK, ORTON } = cones;

// SK (JIS R 8101) large cones, SK 022 to SK 20, as printed in Yuko Trading's table
// (research_notes/Asia/japan-verification-2026-10-14.md). The frozen copy is typed
// again here, so a slip in the data file shows up as a difference.
const FROZEN: Array<[string, number]> = [
  ['022', 600], ['021', 650], ['020', 670], ['019', 690], ['018', 710], ['017', 730], ['016', 750],
  ['015a', 790], ['014a', 815], ['013a', 835], ['012a', 855], ['011a', 880], ['010a', 900],
  ['09a', 920], ['08a', 940], ['07a', 960], ['06a', 980], ['05a', 1000], ['04a', 1020],
  ['03a', 1040], ['02a', 1060], ['01a', 1080], ['1a', 1100], ['2a', 1120], ['3a', 1140],
  ['4a', 1160], ['5a', 1180], ['6a', 1200], ['7', 1230], ['8', 1250], ['9', 1280], ['10', 1300],
  ['11', 1320], ['12', 1350], ['13', 1380], ['14', 1410], ['15', 1435], ['16', 1460],
  ['17', 1480], ['18', 1500], ['19', 1520], ['20', 1530]
]; // prettier-ignore

describe('SK cones', () => {
  it('should have all 42 rows (the brief says 39, the table prints 42), each as the seller printed it', () => {
    expect(SK.cones).to.have.length(42);
    expect(SK.cones.map((c) => [c.cone, c.celsius])).to.eql(FROZEN);
  });

  it('should rise from cone to cone, with no number twice', () => {
    SK.cones.forEach((cone, i) => {
      if (i) expect(cone.celsius, cone.cone).to.be.above(SK.cones[i - 1].celsius);
    });
    expect(new Set(SK.cones.map((c) => c.cone)).size).to.equal(SK.cones.length);
  });

  it('should say what the figures are and where they were read', () => {
    expect(SK).to.include({
      basis: 'nominal (JIS)',
      standard: 'JIS R 8101:1999',
      seller: '有恒商事株式会社',
      source: 'http://www.yukotrading.co.jp/pdf/segercone_table.pdf',
      standardUrl: 'https://webdesk.jsa.or.jp/books/W11M0090/index/?bunsyo_id=JIS+R+8101:1999',
      standardReconfirmed: '2023-10-20',
      checked: '2026-10-19',
      status: 'verified'
    });
    expect(SK.note).to.include('47–79 °C cooler');
    expect(SK.note).to.include('witness cone');
  });

  it("should go as high as the standard's large cones: SK 14, 15 and 16, and none past SK 20", () => {
    const at = (cone: string) => SK.cones.find((c) => c.cone === cone)?.celsius;
    expect([at('14'), at('15'), at('16')]).to.eql([1410, 1435, 1460]);
    expect(SK.cones.at(-1)).to.eql({ cone: '20', celsius: 1530 });
    // SK 26 to 42 are the small cones for refractories (2種), not in the large cones' chart.
    expect(at('26')).to.equal(undefined);
  });
});

// Orton's older chart for large cones heated at 150 °C an hour (as determined at the National
// Bureau of Standards), as W P Dawson Inc (©2000) and FireRight Controls (©1994) reprint it:
// the figures Glazecalc shows and checks by. Typed again here from the reprint.
const ORTON_FROZEN: Array<[string, number]> = [
  ['022', 600], ['021', 614], ['020', 635], ['019', 683], ['018', 717], ['017', 747], ['016', 792],
  ['015', 804], ['014', 838], ['013', 852], ['012', 884], ['011', 894], ['010', 894], ['09', 923],
  ['08', 955], ['07', 984], ['06', 999], ['05', 1046], ['04', 1060], ['03', 1101], ['02', 1120],
  ['01', 1137], ['1', 1154], ['2', 1162], ['3', 1168], ['4', 1186], ['5', 1196], ['6', 1222],
  ['7', 1240], ['8', 1263], ['9', 1280], ['10', 1305], ['11', 1315], ['12', 1326], ['13', 1346],
  ['14', 1366], ['15', 1431]
]; // prettier-ignore

// Orton's own chart (©2016, cones 022-14; its site's chart today stops at 12 with the same figures):
// self-supporting at 15, 60 and 150 °C an hour, large at 60 and 150, null where none is printed.
const PUBLISHED_FROZEN: Array<[string, number | null, number, number, number | null, number | null]> = [
  ['022', null, 586, 590, null, null], ['021', null, 600, 617, null, null], ['020', null, 626, 638, null, null],
  ['019', 656, 678, 695, 676, 693], ['018', 686, 715, 734, 712, 732], ['017', 705, 738, 763, 736, 761],
  ['016', 742, 772, 796, 769, 794], ['015', 750, 791, 818, 788, 816], ['014', 757, 807, 838, 807, 836],
  ['013', 807, 837, 861, 837, 859], ['012', 843, 861, 882, 858, 880], ['011', 857, 875, 894, 873, 892],
  ['010', 891, 903, 915, 898, 913], ['09', 907, 920, 930, 917, 928], ['08', 922, 942, 956, 942, 954],
  ['07', 962, 976, 987, 973, 985], ['06', 981, 998, 1013, 995, 1011], ['05.5', 1004, 1015, 1025, 1012, 1023],
  ['05', 1021, 1031, 1044, 1030, 1046], ['04', 1046, 1063, 1077, 1060, 1070], ['03', 1071, 1086, 1104, 1086, 1101],
  ['02', 1078, 1102, 1122, 1101, 1120], ['01', 1093, 1119, 1138, 1117, 1137], ['1', 1109, 1137, 1154, 1136, 1154],
  ['2', 1112, 1142, 1164, 1142, 1162], ['3', 1115, 1152, 1170, 1152, 1168], ['4', 1141, 1162, 1183, 1160, 1181],
  ['5', 1159, 1186, 1207, 1184, 1205], ['5.5', 1167, 1203, 1225, null, null], ['6', 1185, 1222, 1243, 1220, 1241],
  ['7', 1201, 1239, 1257, 1237, 1255], ['8', 1211, 1249, 1271, 1247, 1269], ['9', 1224, 1260, 1280, 1257, 1278],
  ['10', 1251, 1285, 1305, 1282, 1303], ['11', 1272, 1294, 1315, 1293, 1312], ['12', 1285, 1306, 1326, 1304, 1324],
  ['13', 1310, 1331, 1348, 1321, 1346], ['14', 1351, 1365, 1384, 1388, 1366]
]; // prettier-ignore

describe('Orton cones', () => {
  it("should give the older chart's large cones at 150 °C an hour from 022 to 15, as the reprint prints them", () => {
    expect(ORTON.chart.cones.map((c) => [c.cone, c.celsius])).to.eql(ORTON_FROZEN);
    expect(ORTON.chart).to.include({
      size: 'large',
      rate: 150,
      source: 'https://hotkilns.com/sites/default/files/pdf/dawson-cones.pdf',
      alsoIn: 'https://www.fireright.com/docs/general/pcomecharts.pdf',
      status: 'secondary',
      checked: '2026-10-19'
    });
    expect(ORTON.chart.basis).to.equal("Orton's older chart, large cones at 150 °C an hour");
    expect(ORTON.chart.note).to.include('no figure above cone 14');
  });

  it("should give Orton's current figures, 022 to 14, by heating rate, with large 13 and 14 marked as made differently", () => {
    const rows = ORTON.published.cones.map((c) => [
      c.cone,
      c.selfSupporting[15] ?? null,
      c.selfSupporting[60],
      c.selfSupporting[150],
      c.large?.[60] ?? null,
      c.large?.[150] ?? null
    ]);
    expect(rows).to.eql(PUBLISHED_FROZEN);
    expect(ORTON.published.cones.filter((c) => c.largeDiffers).map((c) => c.cone)).to.eql(['13', '14']);
    expect(ORTON.published).to.include({
      year: 2016,
      source: 'https://www.ortonceramic.com/files/2676/File/Orton-Cone-Chart-C-022-14-2016.pdf',
      status: 'verified',
      checked: '2026-10-19'
    });
    expect(ORTON.published.cones.at(-1)!.cone).to.equal('14');
  });

  it("should agree with Orton's current chart where both are read the same way, and differ by at most 19 °C at 150 °C an hour", () => {
    // From 06 up the older chart's large cones at 150 °C an hour, against Orton's large cones at that rate today.
    for (const { cone, celsius } of ORTON.chart.cones) {
      const today = ORTON.published.cones.find((c) => c.cone === cone)?.large?.[150];
      if (today === undefined) continue;
      expect(Math.abs(today - celsius), cone).to.be.at.most(19);
    }
    // Katz's cone 10, 1305 °C, is the older chart's figure.
    expect(ORTON.chart.cones.find((c) => c.cone === '10')!.celsius).to.equal(1305);
  });

  it('should be the chart the lead replacement reads, cone 06 to 6', () => {
    for (const { cone, celsius } of chemistry.CONES) {
      expect(ORTON.chart.cones.find((c) => c.cone === cone)?.celsius, cone).to.equal(celsius);
    }
  });
});
