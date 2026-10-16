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
  // The 2006 Ceramic Articles regulations were revoked; these replaced them with the same limits.
  GB: rules(
    'The Materials and Articles in Contact with Food Regulations 2012 (England, Wales, Scotland, Northern Ireland)',
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
