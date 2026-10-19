import { expect } from 'chai';
import cones from '../../lib/cones/index.js';

const { SK } = cones;

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
      checked: '2026-10-14',
      status: 'verified'
    });
    expect(SK.note).to.include('47–79 °C cooler');
    expect(SK.note).to.include('witness cone');
  });
});
