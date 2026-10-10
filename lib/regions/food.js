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
//
// Research: research_notes/Region content/food-contact.md.

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
