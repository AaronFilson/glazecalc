'use strict';

const { REGIONS } = require('./index');

// Ceramic ware in contact with food, by region (docs/i18n-plan.md, Phase 4):
// the lead and cadmium a fired piece may release in the legal test, as the law
// states them. EU member states follow Directive 84/500/EEC unless they have
// their own, stricter rules (the Benelux countries since 2026). Each rule set
// carries the page it was read on, the day it was checked and a status, as in
// workplace.js; only verified and secondary ones are shown.
//
//   category  a kind of article, named by the app's messages
//             (guides.food.category.<category>)
//   unit      as the law states it
//   judged    'average' of six pieces, or 'each' of six, where the law says
//   atMost    true where the law says a piece passes at the limit itself
//             (Japan: 以下)
//
// Research: research_notes/Region content/food-contact.md,
// research_notes/Asia/japan-verification-2026-10-14.md and
// research_notes/Asia/turkey-verification-2026-10-14.md.

const CHECKED = '2026-10-08';
const rules = (law, source, limits, extra = {}) => ({
  law,
  source,
  limits,
  status: 'verified',
  checked: CHECKED,
  ...extra
});
const per = (category, lead, cadmium, unit, extra = {}) => ({ category, lead, cadmium, unit, ...extra });

/** The directive's three kinds of piece, in its units. */
const DIRECTIVE = [per('flat', 0.8, 0.07, 'mg/dm²'), per('fillable', 4, 0.3, 'mg/L'), per('cooking', 1.5, 0.1, 'mg/L')];
/** The Benelux countries' since 29 May 2026 (Benelux Decision M (2024) 5): about 130 times lower for lead. */
const BENELUX = [per('flat', 6, 4, 'µg/dm²'), per('fillable', 30, 20, 'µg/L'), per('cooking', 10, 7, 'µg/L')];

const FOOD = {
  EU: rules(
    'Directive 84/500/EEC (amended by Directive 2005/31/EC)',
    'https://publications.europa.eu/resource/celex/01984L0500-20050520',
    DIRECTIVE
  ),
  NL: rules(
    'Warenwetregeling verpakkingen en gebruiksartikelen (Staatscourant 2026, 16308)',
    'https://zoek.officielebekendmakingen.nl/stcrt-2026-16308.html',
    BENELUX,
    {
      inForce: '2026-05-29',
      note: 'Pieces first sold before 1 December 2026 under the old rules may be sold until stocks run out.'
    }
  ),
  BE: rules(
    'Koninklijk besluit van 19 juli 2026 / Arrêté royal du 19 juillet 2026',
    'https://www.ejustice.just.fgov.be/cgi/article_body.pl?language=fr&caller=summary&pub_date=2026-09-11&numac=2026006323',
    BENELUX,
    { inForce: '2026-05-29' }
  ),
  LU: rules(
    'Règlement grand-ducal du 19 mai 2026',
    'https://legilux.public.lu/eli/etat/leg/rgd/2026/05/19/a252/jo',
    BENELUX,
    {
      inForce: '2026-05-29'
    }
  ),
  DK: rules(
    'Bekendtgørelse nr. 681 af 25. maj 2020',
    'https://www.retsinformation.dk/eli/lta/2020/681',
    [DIRECTIVE[0], per('rimBand', 0.8, 0.07, 'mg/dm²'), DIRECTIVE[1], DIRECTIVE[2]],
    { note: 'A cup or mug must meet both the limit for its rim and the limit for pieces that can be filled.' }
  ),
  DE: rules(
    'Bedarfsgegenständeverordnung (BedGgstV), Anlage 6',
    'https://www.gesetze-im-internet.de/bedggstv/BJNR008660992.html',
    DIRECTIVE
  ),
  AT: rules(
    'Keramik-Verordnung (BGBl. Nr. 893/1993)',
    'https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=10010737',
    DIRECTIVE,
    { note: 'Austria also limits zinc, antimony and barium.' }
  ),
  CZ: rules('Vyhláška č. 38/2001 Sb.', 'https://e-sbirka.gov.cz/sb/2001/38?zalozka=text', [
    ...DIRECTIVE,
    per('rimArticle', 2, 0.2, 'mg')
  ]),
  FR: rules('Arrêté du 7 novembre 1985', 'https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000874106/', DIRECTIVE),
  IT: rules(
    'Decreto ministeriale 4 aprile 1985',
    'https://www.gazzettaufficiale.it/eli/gu/1985/04/26/98/sg/pdf',
    DIRECTIVE
  ),
  ES: rules('Real Decreto 891/2006', 'https://www.boe.es/buscar/act.php?id=BOE-A-2006-13274', DIRECTIVE),
  SE: rules(
    'Livsmedelsverkets föreskrifter LIVSFS 2023:5, 5 kap.',
    'https://www.livsmedelsverket.se/4ad7ea/globalassets/om-oss/lagstiftning/forpackn---matrl-i-kontakt-m-livsm/livsfs-2023-5_kons_livsfs-2025-1.pdf',
    DIRECTIVE
  ),
  FI: rules('Asetus 165/2006', 'https://www.finlex.fi/fi/lainsaadanto/saadoskokoelma/2006/165', DIRECTIVE),
  PL: rules(
    'Rozporządzenie Ministra Zdrowia z dnia 15 stycznia 2008 r. (Dz.U. 2008 nr 17 poz. 113)',
    'https://api.sejm.gov.pl/eli/acts/DU/2008/113/text.pdf',
    DIRECTIVE
  ),
  IE: rules('S.I. No. 49 of 2017', 'https://www.irishstatutebook.ie/eli/2017/si/49/made/en/print', DIRECTIVE),
  // The 2006 Ceramic Articles regulations were revoked; these replaced them with the same limits. The link is
  // England's (S.I. 2012/2619); Wales (W.S.I. 2012/2705), Scotland (S.S.I. 2012/318) and Northern Ireland
  // (S.R. 2012/384) made their own regulations of 2012 with the same limits (titles read on legislation.gov.uk).
  GB: rules(
    'The Materials and Articles in Contact with Food (England) Regulations 2012, and the matching Wales, Scotland and Northern Ireland regulations',
    'https://www.legislation.gov.uk/uksi/2012/2619',
    DIRECTIVE
  ),
  US: rules('FDA Compliance Policy Guides 545.450 and 545.400', 'https://www.fda.gov/media/71764/download', [
    per('flatware', 3, 0.5, 'µg/mL', { judged: 'average' }),
    per('smallHollow', 2, 0.5, 'µg/mL', { judged: 'each' }),
    per('cups', 0.5, 0.5, 'µg/mL', { judged: 'each' }),
    per('largeHollow', 1, 0.25, 'µg/mL', { judged: 'each' }),
    per('pitchers', 0.5, 0.25, 'µg/mL', { judged: 'each' })
  ]),
  AU: rules(
    'Customs (Prohibited Imports) Regulations 1956, regulation 4E',
    'https://www.legislation.gov.au/F1996B03651/2026-07-13/2026-07-13/text/original/epub/OEBPS/document_1/document_1.html',
    [
      per('auSmall', 7, 0.7, 'mg/L'),
      per('auLarge', 2, 0.2, 'mg/L'),
      per('auPlates', 20, 2, 'mg/L'),
      per('auCooking', 7, 0.7, 'mg/L')
    ],
    { note: 'These limits are for imported ware; we found no official limit for ware made in Australia.' }
  ),
  // 第3 D-1 ⑵ as revised by 令和7年内閣府告示第95号 (read in the CAA's 新旧対照表): the values
  // are the 2008 ones, each 以下 (at most), with 4 % acetic acid at room temperature in the
  // dark for 24 hours. The law does not say whether pieces are judged each or on average.
  // The volume tiers are for pieces 2.5 cm deep or more that are not cooking ware. Cooking ware
  // (加熱調理用器具) is defined in 食安発第0731001号 (2008-07-31), 第2 1 (3) (注):
  // https://www.caa.go.jp/policies/policy/standards_evaluation/appliance/assets/080731-1_1.pdf
  JP: rules(
    '食品、添加物等の規格基準（昭和34年厚生省告示第370号）第3 D',
    'https://www.caa.go.jp/policies/policy/standards_evaluation/appliance/assets/standards_cms101_250530_001.pdf',
    [
      per('jpFlat', 8, 0.7, 'µg/cm²'),
      per('jpSmall', 2, 0.5, 'µg/mL'),
      per('jpLarge', 1, 0.25, 'µg/mL'),
      per('jpStorage', 0.5, 0.25, 'µg/mL'),
      per('jpCooking', 0.5, 0.05, 'µg/mL')
    ],
    {
      checked: '2026-10-14',
      atMost: true,
      note: 'Cooking ware means pieces made mainly for cooking over a direct flame, in an oven or in a microwave. Pieces warmed in hot water or used at no more than 100 °C, such as sake warmers (tokkuri) and chawanmushi cups, are not cooking ware, nor are pieces only for reheating in a microwave.'
    }
  ),
  // Türk Gıda Kodeksi, read in full: parallel to 84/500/EEC, with its three categories and
  // limits (Kategori 1 to 3) and its test (4 % acetic acid, 22 ± 2 °C, 24 hours). Madde 5(ç)
  // judges at least three samples. Not amended; in force under the 2018 food-contact
  // regulation (RG 05.04.2018/30382). No Turkish move to the Benelux limits was found.
  TR: rules(
    'Türk Gıda Kodeksi Gıda ile Temas Eden Seramik Malzemeler Tebliği (Tebliğ No: 2012/30)',
    'https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=16076&MevzuatTur=9&MevzuatTertip=5',
    DIRECTIVE,
    {
      checked: '2026-10-14',
      note: 'At least three samples are tested: the ware passes if their average is within the limit and no single sample is more than 50% over it.'
    }
  ),
  // 「기구 및 용기·포장의 기준 및 규격」 III-7 나. 도자기제·옹기류 (research_notes/Asia/region-data.md,
  // carried in verification-KR-TW-SG-MY-2026-10-16.md): the same values as Japan's, flat ware in
  // µg/cm² and the rest in mg/L. The test solution, each-or-average judging and whether the law
  // says "at most" were not read, so none is said.
  KR: rules(
    '기구 및 용기·포장의 기준 및 규격 (식품의약품안전처고시 제2026-24호), III-7 나. 도자기제·옹기류',
    'https://www.law.go.kr/행정규칙/기구및용기·포장의기준및규격',
    [
      per('krFlat', 8, 0.7, 'µg/cm²'),
      per('krSmall', 2, 0.5, 'mg/L'),
      per('krMedium', 1, 0.25, 'mg/L'),
      per('krStorage', 0.5, 0.25, 'mg/L'),
      per('krCooking', 0.5, 0.05, 'mg/L')
    ],
    { checked: '2026-10-13' }
  ),
  // 食品器具容器包裝衛生標準 附表一, amended 2023-01-11 (research_notes/Asia/region-data.md, carried
  // in verification-KR-TW-SG-MY-2026-10-16.md; English table FileId=0000007733): glass, porcelain
  // and enamel, 4 % acetic acid at room temperature in the dark for 24 hours. The law writes ppm
  // for the hollow ware. No cooking ware, and no each-or-average rule, is stated.
  TW: rules(
    '食品器具容器包裝衛生標準，附表一',
    'https://law.moj.gov.tw/LawClass/LawAll.aspx?PCODE=L0040019',
    [per('twFlat', 17, 1.7, 'µg/cm²'), per('twSmall', 5, 0.5, 'ppm'), per('twLarge', 2.5, 0.25, 'ppm')],
    { checked: '2026-10-12' }
  ),
  // Singapore's Food Regulations, regulation 37(3) (research_notes/Asia/region-data.md, carried in
  // verification-KR-TW-SG-MY-2026-10-16.md): lead only, in µg/mL ("mcg per ml of leaching
  // solution"), none of six units examined above the limit. The kinds of piece are the US ones,
  // word for word. Read on Singapore Statutes Online on 2026-10-12; it answered 403 on 2026-10-16,
  // so the date stays. The test method is not named.
  SG: rules(
    'Food Regulations, regulation 37(3)',
    'https://sso.agc.gov.sg/SL/SFA1973-RG1?ProvIds=pr37-',
    [
      per('flatware', 3, undefined, 'µg/mL', { judged: 'each' }),
      per('smallHollow', 2, undefined, 'µg/mL', { judged: 'each' }),
      per('cups', 0.5, undefined, 'µg/mL', { judged: 'each' }),
      per('largeHollow', 1, undefined, 'µg/mL', { judged: 'each' }),
      per('pitchers', 0.5, undefined, 'µg/mL', { judged: 'each' })
    ],
    {
      checked: '2026-10-12',
      note: "Singapore's rule gives limits for lead only; cadmium falls under its general ban on vessels that can impart lead, cadmium or any other toxic substance."
    }
  ),
  // Malaysia's Food Regulations 1985, regulation 28 and the Thirteenth Schedule, as amended by
  // P.U. (A) 48/2026 (gazetted 2026-01-30, in force 2026-08-01), read from the gazette's page images
  // on 2026-10-12; SGS and Cristal Standards (2026) give the same four rows. Four pieces of the same
  // size, shape, colour and decoration: hollow ware and cooking ware each within the limit, flatware
  // on average. The 1.1 L line between small and large hollow ware is in regulation 28, which was
  // not read, so it is not given; nor is the test method.
  MY: rules(
    'Peraturan-Peraturan Makanan 1985, peraturan 28 dan Jadual Ketiga Belas (P.U. (A) 48/2026)',
    'https://hq.moh.gov.my/fsq/xs/dl.php?filename=WARTA+KERAJAAN_P.U.A+48.pdf',
    [
      per('myFlat', 0.8, 0.07, 'mg/dm²', { judged: 'average', pieces: 4 }),
      per('mySmall', 2, 0.5, 'mg/L', { judged: 'each', pieces: 4 }),
      per('myLarge', 1, 0.25, 'mg/L', { judged: 'each', pieces: 4 }),
      per('myCooking', 0.5, 0.05, 'mg/L', { judged: 'each', pieces: 4 })
    ],
    {
      checked: '2026-10-12',
      inForce: '2026-08-01',
      note: 'Cooking ware means ceramic ware meant to be heated, conventionally or in a microwave.'
    }
  ),
  // Indonesia (research_notes/Asia/regions-CN-HK-ID-TH-VN-PH-2026-10-16.md). Peraturan BPOM 11/2026,
  // Lampiran I.D Keramik, from BPOM's legal database (JDIH): its scope takes in tableware and food
  // preparation ware. Both hollow sizes have the same limits, 0.5 lead, as written (the ≥ of the
  // second read in the PDF's text). Lampiran II.E: the same sample extracted three times, fresh 4 %
  // acetic acid each time, 22 ± 2 °C, 24 hours; the third result is compared with the limit. Set on
  // 2026-06-23; the copy leaves its promulgation date blank, so no in-force date is given.
  ID: rules(
    'Peraturan Badan Pengawas Obat dan Makanan Nomor 11 Tahun 2026 tentang Kemasan Pangan, Lampiran I.D',
    'https://jdih.pom.go.id/download/rule/1762/11/2026/Peraturan%20Badan%20Pengawas%20Obat%20dan%20Makanan%20Nomor%2011%20Tahun%202026%20tentang%20Kemasan%20Pangan',
    [per('idFlat', 0.8, 0.07, 'mg/dm²'), per('idSmall', 0.5, 0.25, 'mg/L'), per('idLarge', 0.5, 0.25, 'mg/L')],
    {
      checked: '2026-10-16',
      note: 'The same piece is tested three times, each time for 24 hours in fresh 4% acetic acid, and the third result is held to the limit.'
    }
  ),
  // Thailand (the same notes). ประกาศกระทรวงสาธารณสุข ฉบับที่ 92 (พ.ศ. 2528), clause 3 and Schedule 2,
  // read by eye in the Thai original (the FDA's scan of the Royal Gazette, 1985-09-02), and matching
  // the FDA's English translation: every limit in mg/L, the shallow pieces' too ("ได้ไม่เกิน", not
  // more than). In force the day after publication. The FDA's page lists no later rule for ceramics.
  TH: rules(
    'ประกาศกระทรวงสาธารณสุข ฉบับที่ 92 (พ.ศ. 2528), บัญชีหมายเลข 2',
    'https://food.fda.moph.go.th/media.php?id=509201864848449536&name=P92.PDF',
    [
      per('thFlat', 7, 0.7, 'mg/L'),
      per('thSmall', 5, 0.5, 'mg/L'),
      per('thLarge', 2.5, 0.25, 'mg/L'),
      per('thInfant', 2.5, 0.25, 'mg/L'),
      per('thCooking', 5, 0.5, 'mg/L')
    ],
    {
      checked: '2026-10-16',
      inForce: '1985-09-03',
      note: "The law gives every limit in milligrams per litre of the test solution, the shallow pieces' too."
    }
  ),
  // Vietnam (research_notes/Asia/region-VN-2026-10-17.md). QCVN 12-4:2015/BYT, issued with Thông tư
  // 35/2015/TT-BYT (2015-10-28, in force 2016-05-01), II.1.2, ceramic and glass-ceramic ware (gốm, gốm
  // thủy tinh), "mức tối đa": shallow pieces for holding or cooking food in mg/dm², deep ones in mg/L of
  // the test solution, cups and small bowls (cốc, chén) apart. Test method TCVN 7146-1:2002 (ISO
  // 6486-1:1999); the regulation says nothing of how many pieces or each-or-average. Read in Caselaw
  // Việt Nam's copy, as the government's pages could not be read: secondary.
  VN: rules(
    'QCVN 12-4:2015/BYT (Thông tư 35/2015/TT-BYT), II.1.2',
    'https://caselaw.vn/van-ban-phap-luat/263354-thong-tu-35-2015-tt-byt-ban-hanh-quy-chuan-ky-thuat-quoc-gia-ve-ve-sinh-an-toan-doi-voi-bao-bi-dung-cu-lam-bang-thuy-tinh-gom-su-va-trang-men-tiep-xuc-truc-tiep-voi-thuc-pham-do-bo-truong-bo-y-te-ban-hanh',
    [
      per('vnFlat', 0.8, 0.07, 'mg/dm²'),
      per('vnSmall', 2, 0.5, 'mg/L'),
      per('vnMedium', 1, 0.25, 'mg/L'),
      per('vnStorage', 0.5, 0.25, 'mg/L'),
      per('vnCooking', 0.5, 0.05, 'mg/L'),
      per('vnCups', 0.5, 0.25, 'mg/L')
    ],
    {
      status: 'secondary',
      checked: '2026-10-17',
      inForce: '2016-05-01',
      note: "The test is TCVN 7146-1:2002, the same as ISO 6486-1:1999. Read in a legal database's copy of the regulation, as the government's own page could not be read."
    }
  )
};

const shown = (rules) => (rules && (rules.status === 'verified' || rules.status === 'secondary') ? rules : null);

/** The rules for a region: its own, or the EU's for a member state without its own. */
const foodRulesFor = (code) => {
  const eu = !!REGIONS.find((r) => r.code === code)?.eu;
  const own = shown(FOOD[code]);
  if (own) return { rules: own, own: true, eu };
  const union = eu ? shown(FOOD.EU) : null;
  return union ? { rules: union, own: false, eu } : null;
};

/**
 * Every piece of text shown, once, for translators: the notes, and the EU
 * directive's name, which each language writes its official way. A national
 * law keeps its own name.
 */
const texts = () => {
  const all = new Set([FOOD.EU.law]);
  for (const rules of Object.values(FOOD)) if (shown(rules)?.note) all.add(rules.note);
  return [...all];
};

module.exports = { FOOD, foodRulesFor, texts };
