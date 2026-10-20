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
//             (Japan: 以下; China: ≤)
//   none      true where an official page says the region has no law with
//             figures for ceramic ware (Hong Kong): the page says so, and
//             there are no limits
//
// Research: research_notes/Region content/food-contact.md,
// research_notes/Asia/japan-verification-2026-10-14.md,
// research_notes/Asia/turkey-verification-2026-10-14.md and, for the pass of
// 2026-10-19, scratch/round6/research/ (cn-tw-kr-hk.md, id-ph-vn-th.md, jp-tr.md).

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
  // The standards for food utensils moved from MHLW to the Consumer Affairs Agency in April 2024.
  // In force (消食基第361号, 2025-05-30, 第３): the revision from 2025-06-01, its changes to
  // specifications and test methods from 2026-06-01:
  // https://www.caa.go.jp/policies/policy/standards_evaluation/appliance/assets/standards_cms101_250530_002.pdf
  // 令和8年内閣府告示第5号 (2026-02-13) let ware sold, made or imported for sale, or used in business,
  // before 2030-06-01 follow the earlier rules (it was 2027-06-01):
  // https://www.caa.go.jp/policies/policy/standards_evaluation/appliance/notice/assets/standards_cms101_260213_01.pdf
  // The ceramic values did not change, so no in-force date is given (it would read as if the
  // limits were new); the note says when the revision applies. Read on 2026-10-19.
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
      checked: '2026-10-19',
      atMost: true,
      note: 'Cooking ware means pieces made mainly for cooking over a direct flame, in an oven or in a microwave. Pieces warmed in hot water or used at no more than 100 °C, such as sake warmers (tokkuri) and chawanmushi cups, are not cooking ware, nor are pieces only for reheating in a microwave. These limits date from 2008. The standards, kept by the Consumer Affairs Agency since 2024, were revised in 2025 without changing them: the revision applies from 1 June 2025 and its changes to specifications and test methods from 1 June 2026, and ware sold, made or imported before 1 June 2030 may still follow the earlier rules.'
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
  // 2026-06-23 and promulgated on 2026-06-30 (Berita Negara 2026 No. 433, JDIH's record of it, read
  // on 2026-10-19: https://jdih.pom.go.id/view/slide/1762/11/2026/Peraturan%20Badan%20Pengawas%20Obat%20dan%20Makanan%20Nomor%2011%20Tahun%202026%20tentang%20Kemasan%20Pangan);
  // in force that day (Pasal 15). Pasal 13(1): packaging already on the market must comply within
  // twelve months of promulgation, so by 2026-06-30 + 12 months.
  ID: rules(
    'Peraturan Badan Pengawas Obat dan Makanan Nomor 11 Tahun 2026 tentang Kemasan Pangan, Lampiran I.D',
    'https://jdih.pom.go.id/download/rule/1762/11/2026/Peraturan%20Badan%20Pengawas%20Obat%20dan%20Makanan%20Nomor%2011%20Tahun%202026%20tentang%20Kemasan%20Pangan',
    [per('idFlat', 0.8, 0.07, 'mg/dm²'), per('idSmall', 0.5, 0.25, 'mg/L'), per('idLarge', 0.5, 0.25, 'mg/L')],
    {
      checked: '2026-10-19',
      inForce: '2026-06-30',
      note: 'The same piece is tested three times, each time for 24 hours in fresh 4% acetic acid, and the third result is held to the limit. Ware already on the market has until 30 June 2027 to comply.'
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
  // the test solution, cups and small bowls (cốc, chén) apart. Read by eye on 2026-10-19 in the Official
  // Gazette's scan (Công báo số 1153 + 1154, 2015-11-28), the Government Portal's signed PDF; the same
  // figures as Caselaw Việt Nam's copy, read on 2026-10-17. The signed scan is also on the Vietnam SPS
  // Office's site (http://www.spsvietnam.gov.vn/352015tt-byt; its https certificate fails). III.2: the
  // test methods of Phụ lục 01 (TCVN 7146-1:2002, the same as ISO 6486-1:1999) are not mandatory, and
  // others of the same accuracy may be used. The regulation says nothing of how many pieces or
  // each-or-average. The national standards database lists it as in force ("A - Còn hiệu lực").
  VN: rules(
    'QCVN 12-4:2015/BYT (Thông tư 35/2015/TT-BYT), II.1.2',
    'https://congbaocdn.chinhphu.vn/CongBaoCP/VanBan/2015/10/18091/12699-1-352015tt-byt12702pdf',
    [
      per('vnFlat', 0.8, 0.07, 'mg/dm²'),
      per('vnSmall', 2, 0.5, 'mg/L'),
      per('vnMedium', 1, 0.25, 'mg/L'),
      per('vnStorage', 0.5, 0.25, 'mg/L'),
      per('vnCooking', 0.5, 0.05, 'mg/L'),
      per('vnCups', 0.5, 0.25, 'mg/L')
    ],
    {
      checked: '2026-10-19',
      inForce: '2016-05-01',
      note: 'The regulation names a test method (TCVN 7146-1:2002, the same as ISO 6486-1:1999) but allows others of the same accuracy.'
    }
  ),
  // China. GB 4806.4—2016《食品安全国家标准 陶瓷制品》, issued 2016-10-19 by the then National Health and
  // Family Planning Commission, in force 2017-04-19; 表1, each row "≤" (at most). It replaces GB 13121-1991,
  // GB 14147-1993, GB 8058-2003 and GB 12651-2003. Read by eye on 2026-10-19 in the issued PDF (its
  // cover, foreword, definitions 2.1–2.7 and tables 1 and 2) on 安安网 (anan.gov.cn), the site of the
  // Guangdong Medical Products Administration's service centre (广东省药品监督管理局事务中心), since the
  // national database (sppt.cfsa.net.cn) refused the connection and nhc.gov.cn answered 412: verified, as
  // Indonesia's Permenaker was read through a copy of the gazette. Kinds of piece (2.1–2.7): flat ware,
  // 25 mm deep or less; hollow ware deeper; small hollow ware under 1.1 L (cups apart); large hollow ware
  // 1.1 L to under 3 L; storage jars 3 L or more; cups, for water or drinks; cooking ware, for heating
  // food. 5.1.2 and 表2: 4 % acetic acid only; cooking ware 120 min at 98 °C, ware for the microwave
  // 15 min at 100 °C, the rest 24 h at 22 °C. No each-or-average rule (that would be in GB 31604.1 or
  // GB 4806.1, not read). An earlier note of ours gave cooking ware 0.5 / 0.05 from memory: the standard
  // says 3.0 / 0.30. A revision is approved (立项, NHC's 2025 plan; secondary) but not published; the
  // "GB 4806.4-2023" one lab names is on no official or standards page.
  CN: rules(
    'GB 4806.4—2016《食品安全国家标准 陶瓷制品》，表1',
    'https://www.anan.gov.cn/anan/cpbz/201801/2cfe33a50d8b4f30a9025a3767c59804/files/bbdd08b51484439ca736fc52bb8847fe.pdf',
    [
      per('cnFlat', 0.8, 0.07, 'mg/dm²'),
      per('cnSmall', 2, 0.3, 'mg/L'),
      per('cnLarge', 1, 0.25, 'mg/L'),
      per('cnStorage', 0.5, 0.25, 'mg/L'),
      per('cnCups', 0.5, 0.25, 'mg/L'),
      per('cnCooking', 3, 0.3, 'mg/L')
    ],
    {
      checked: '2026-10-19',
      inForce: '2017-04-19',
      atMost: true,
      note: "Cooking ware is tested hot, two hours in 4% acetic acid at 98 °C, while other pieces stand 24 hours at 22 °C (pieces for the microwave, 15 minutes at 100 °C), so its limits cannot be compared with the other rows or with other countries' cooking ware. Read in the standard's issued text on the site of a Guangdong provincial regulator, as the national database could not be reached."
    }
  ),
  // Hong Kong: no law sets figures for food-contact materials. The Centre for Food Safety (FEHD),
  // Guidelines on the Use of Disposable Tray Liners (December 2009): "Although there is no specific
  // legislation governing the use of food contact materials or tray liners, the Public Health and
  // Municipal Services Ordinance (PHMSO) Cap 132 stipulates that all food offered for sale in Hong Kong
  // must be fit for human consumption." Its Food Safety Focus 33 (April 2009,
  // https://www.cfs.gov.hk/english/multimedia/multimedia_pub/multimedia_pub_fsf_33_01.html): food
  // containers supplied for private use "are controlled under the Consumer Goods Safety Ordinance,
  // Cap. 456", which gives no figures (its s.4 was not read: elegislation.gov.hk loads by script). No
  // later CFS page saying otherwise was found on 2026-10-19. The Consumer Council's 2024 test of cups
  // and bowls judged them against ISO 6486-2, France's rules and the Mainland's GB 4806.4, citing no
  // Hong Kong law.
  HK: {
    law: 'Centre for Food Safety, Guidelines on the Use of Disposable Tray Liners (December 2009)',
    source: 'https://www.cfs.gov.hk/english/food_leg/files/Guidelines_Tray_liner.pdf',
    limits: [],
    none: true,
    status: 'verified',
    checked: '2026-10-19',
    note: 'The Centre for Food Safety wrote in 2009 that Hong Kong has no specific law on materials that touch food, and we found no later change. Food sold must be fit to eat (Cap. 132), and food containers for home use come under the Consumer Goods Safety Ordinance (Cap. 456), but neither gives figures for lead or cadmium.'
  },
  // Algeria (scratch/round6/research/eg-ae-ma-dz.md): the joint ministerial order of 16 January 2019,
  // read again on 2026-10-20 in the Journal officiel's French edition (n° 36, 6 June 2019, pp. 19–22):
  // Art. 3, the directive's three categories and limits; Annex I, 4 % acetic acid at 22 ± 2 °C for
  // 24 hours; Art. 6, a piece up to 50 % over passes if at least three more identical pieces (shape,
  // size, decoration and glaze) are within the limits on average and none is more than 50 % over. In
  // force on publication (the Ministry of Commerce's notice of 2019-08-19). Later amendments were not
  // looked for. India's IS 9806:2001 gives limits too, but it is a voluntary standard, so India has none
  // here (the lead's decision, 2026-10-20); nor have Pakistan, Bangladesh, Egypt (ES 7809-2/2022's
  // values not read), the UAE (GSO ISO 6486-2:2013's status there not read) or Morocco (none found).
  DZ: rules(
    'Arrêté interministériel du 16 janvier 2019 fixant les spécifications relatives aux objets et matériaux fabriqués en céramique destinés à être mis en contact avec les denrées alimentaires (JO n° 36 du 6 juin 2019)',
    'https://www.joradp.dz/FTP/JO-FRANCAIS/2019/F2019036.pdf',
    DIRECTIVE,
    {
      checked: '2026-10-20',
      inForce: '2019-06-06',
      note: 'A piece no more than 50% over a limit still passes if at least three more pieces of the same shape, size, decoration and glaze, tested the same way, are within the limit on average and none of them is more than 50% over it.'
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
