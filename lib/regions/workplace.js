'use strict';

const { REGIONS } = require('./index');

// Safety at work, by region (docs/i18n-plan.md, Phase 4): the workplace limit
// for respirable crystalline silica, the main long-term hazard in glaze work,
// and the national body for safety at work. Limits differ by country and
// change, so each carries the page it was read on, the day it was checked and
// a status:
//
//   verified    read on the law or the agency's own page
//   secondary   read on a named reputable source instead (the IFA's GESTIS
//               International Limit Values, NEPSI's table): shown, with it
//   extract     seen only in a search engine's extract: not shown
//   unverified  a lead only: not shown
//
// Limits are 8-hour averages in mg/m³ of respirable dust. Germany's is an
// assessment criterion (Beurteilungsmaßstab), not a binding limit. Research:
// research_notes/Region content/ (silica-*.md).

const CHECKED = '2026-10-08';
const limit = (quartz, kind, law, source, extra = {}) => ({
  quartz,
  kind,
  law,
  source,
  status: 'verified',
  checked: CHECKED,
  ...extra
});
const agency = (name, url, extra = {}) => ({ name, url, status: 'verified', checked: CHECKED, ...extra });

const EU_SILICA = limit(0.1, 'binding', 'Directive (EU) 2017/2398', 'https://eur-lex.europa.eu/eli/dir/2017/2398/oj');

const WORKPLACE = {
  US: {
    silica: limit(
      0.05,
      'binding',
      '29 CFR 1910.1053',
      'https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.1053',
      {
        actionLevel: 0.025
      }
    ),
    agency: agency('Occupational Safety and Health Administration', 'https://www.osha.gov/', {
      abbr: 'OSHA',
      silicaUrl: 'https://www.osha.gov/silica-crystalline'
    })
  },
  GB: {
    silica: limit(
      0.1,
      'binding',
      'EH40/2005 Workplace exposure limits',
      'https://www.hse.gov.uk/pubns/priced/eh40.pdf'
    ),
    agency: agency('Health and Safety Executive', 'https://www.hse.gov.uk/', {
      abbr: 'HSE',
      silicaUrl: 'https://www.hse.gov.uk/lung-disease/silicosis.htm'
    })
  },
  AU: {
    // Read on WorkSafe WA's page: Safe Work Australia's own site did not answer.
    silica: limit(
      0.05,
      'binding',
      'Work Health and Safety Regulations: workplace exposure standards',
      'https://www.worksafe.wa.gov.au/whs-duties-businesses-who-work-crystalline-silica-substances'
    ),
    agency: agency('Safe Work Australia', 'https://www.safeworkaustralia.gov.au/', {
      abbr: 'SWA',
      silicaUrl: 'https://www.safeworkaustralia.gov.au/safety-topic/hazards/crystalline-silica-and-silicosis',
      status: 'unverified'
    })
  },
  NZ: {
    // A workplace exposure standard is guidance in New Zealand, not a legal limit.
    silica: limit(
      0.025,
      'indicative',
      'WorkSafe, Workplace exposure standards, 16th edition',
      'https://www.worksafe.govt.nz/dmsdocument/62251-workplace-exposure-standards-wes-and-biological-exposure-indices-bei-16th-edition/latest/'
    ),
    agency: agency('WorkSafe New Zealand', 'https://www.worksafe.govt.nz/', {
      silicaUrl: 'https://www.worksafe.govt.nz/topic-and-industry/dust/silica-dust-in-the-workplace/'
    })
  },
  AT: {
    silica: limit(
      0.05,
      'binding',
      'Grenzwerteverordnung (GKV), Anhang I',
      'https://www.ris.bka.gv.at/Dokumente/Bundesnormen/NOR40274774/II_339_2025_Anhang_I_2025.pdf'
    ),
    agency: agency('Arbeitsinspektion', 'https://www.arbeitsinspektion.gv.at/', {
      silicaUrl:
        'https://www.arbeitsinspektion.gv.at/arbeitsschutz/arbeitsstoffe/arbeitsstoffe_mit_sonderbestimmungen/quarzfeinstaub.html'
    })
  },
  BE: {
    // Lowered from 0.1 on 1 September 2025; NEPSI's and GESTIS's tables still give 0.1.
    silica: limit(
      0.05,
      'binding',
      'Codex over het welzijn op het werk / Code du bien-être au travail, bijlage / annexe VI.1-1',
      'https://werk.belgie.be/sites/default/files/content/documents/Welzijn%20op%20het%20werk/grenswaardentabel.pdf'
    ),
    agency: agency(
      'FOD Werkgelegenheid, Arbeid en Sociaal Overleg / SPF Emploi, Travail et Concertation sociale',
      'https://werk.belgie.be/nl',
      { abbr: 'FOD WASO / SPF ETCS' }
    )
  },
  DE: {
    silica: limit(
      0.05,
      'assessment',
      'TRGS 559 „Quarzhaltiger Staub“',
      'https://www.baua.de/DE/Angebote/Regelwerk/TRGS/TRGS-559'
    ),
    agency: agency('Bundesanstalt für Arbeitsschutz und Arbeitsmedizin', 'https://www.baua.de/DE/Home/Home_node.html', {
      abbr: 'BAuA',
      silicaUrl: 'https://www.baua.de/DE/Angebote/Regelwerk/TRGS/TRGS-559'
    })
  },
  FR: {
    silica: limit(
      0.1,
      'binding',
      'Code du travail, article R. 4412-149',
      'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000053786000',
      { cristobalite: 0.05 }
    ),
    agency: agency(
      'Institut national de recherche et de sécurité pour la prévention des accidents du travail et des maladies professionnelles',
      'https://www.inrs.fr/',
      { abbr: 'INRS', silicaUrl: 'https://www.inrs.fr/risques/silice-cristalline/ce-qu-il-faut-retenir.html' }
    )
  },
  IE: {
    silica: limit(
      0.1,
      'binding',
      'HSA, 2026 Code of Practice for the Chemical Agents and Carcinogens Regulations, Schedule 1',
      'https://www.hsa.ie/media/5yglnef1/2026-code-of-practice-for-the-safety-health-and-welfare-at-work-chemical-agents-regulations-2001-to-2026-and-the-safety-health-and-welfare-at-work-carcinogens-mutagens-and-reprotoxic-substanc.pdf'
    ),
    agency: agency('Health and Safety Authority', 'https://www.hsa.ie/', {
      abbr: 'HSA',
      silicaUrl: 'https://hsa.ie/your_industry/construction/silica-dust/'
    })
  },
  LU: {
    // NEPSI's 2020 table printed 0.15; the law has said 0.1 since 2020.
    silica: limit(
      0.1,
      'binding',
      'Règlement grand-ducal du 13 mars 2025, annexe III',
      'https://data.legilux.public.lu/filestore/eli/etat/leg/rgd/2025/03/13/a93/consolide/20260724/fr/pdf/eli-etat-leg-rgd-2025-03-13-a93-consolide-20260724-fr-pdf.pdf'
    ),
    agency: agency('Inspection du travail et des mines', 'https://itm.public.lu/fr.html', { abbr: 'ITM' })
  },
  NL: {
    silica: limit(
      0.075,
      'binding',
      'Arbeidsomstandighedenregeling, bijlage XIII',
      'https://wetten.overheid.nl/BWBR0008587/2026-08-27'
    ),
    agency: agency('Nederlandse Arbeidsinspectie', 'https://www.nlarbeidsinspectie.nl/')
  },
  ES: {
    silica: limit(
      0.05,
      'binding',
      'Real Decreto 665/1997, anexo III',
      'https://www.boe.es/buscar/act.php?id=BOE-A-1997-11145'
    ),
    agency: agency('Instituto Nacional de Seguridad y Salud en el Trabajo', 'https://www.insst.es/', {
      abbr: 'INSST',
      silicaUrl:
        'https://www.insst.es/agentes-quimicos-infocarquim/procedimientos/trabajos-que-supongan-exposicion-al-polvo-respirable-de-s%C3%ADlice-cristalina-generado-en-un-proceso-de-trabajo'
    })
  },
  PT: {
    // 0.025 in July 2020, then 0.05 from December 2020 (Decreto-Lei 102-A/2020).
    silica: limit(
      0.05,
      'binding',
      'Decreto-Lei n.º 301/2000, anexo I',
      'https://files.diariodarepublica.pt/1s/2024/12/23500/0010600119.pdf'
    ),
    agency: agency('Autoridade para as Condições do Trabalho', 'https://www.act.gov.pt/', {
      abbr: 'ACT',
      status: 'unverified'
    })
  },
  IT: {
    // INAIL's own silica page (October 2024) still says Italy has no legal limit, so it is not linked.
    silica: limit(
      0.1,
      'binding',
      'D.Lgs. 81/2008, allegato XLIII',
      'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2008-04-09;81'
    ),
    agency: agency(
      "Istituto Nazionale per l'Assicurazione contro gli Infortuni sul Lavoro",
      'https://www.inail.it/portale/it.html',
      {
        abbr: 'INAIL'
      }
    )
  },
  MT: {
    silica: limit(0.1, 'binding', 'S.L. 646.14, Schedule III', 'https://legislation.mt/eli/sl/646.14/eng/pdf'),
    agency: agency('Awtorità għas-Saħħa u s-Sigurtà fuq il-Post tax-Xogħol', 'https://www.ohsa.mt/', { abbr: 'OHSA' })
  },
  CY: {
    silica: limit(
      0.1,
      'binding',
      'Κ.Δ.Π. 343/2025 (Καρκινογόνοι Παράγοντες), Δεύτερος Πίνακας',
      'https://www.mlsi.gov.cy/mlsi/dli/dliup.nsf/all/D74ACEE6A814B7EAC2257E03002A76C9/$file/KDP_343_2025.pdf?openelement'
    ),
    agency: agency(
      'Τμήμα Επιθεώρησης Εργασίας',
      'https://www.mlsi.gov.cy/mlsi/dli/dliup.nsf/index_gr/index_gr?opendocument'
    )
  },
  GR: {
    // NEPSI's 0.05 for cristobalite is the mining regulation's, for mines and quarries only.
    silica: limit(
      0.1,
      'binding',
      'Π.Δ. 48/2024, Παράρτημα III',
      'https://www.et.gr/api/DownloadFeksApi/?fek_pdf=20240100136'
    ),
    agency: agency('Ελληνικό Ινστιτούτο Υγείας και Ασφάλειας στην Εργασία', 'https://www.elinyae.gr/', {
      abbr: 'ΕΛ.ΙΝ.Υ.Α.Ε.'
    })
  },
  HR: {
    // There is no national safety agency: the ministry is the EU-OSHA focal point.
    silica: limit(
      0.1,
      'binding',
      'Pravilnik o zaštiti radnika od izloženosti opasnim kemikalijama na radu, Prilog I',
      'https://narodne-novine.nn.hr/clanci/sluzbeni/2023_12_148_2098.html',
      { cristobalite: 0.05 }
    ),
    agency: agency('Ministarstvo rada, mirovinskoga sustava, obitelji i socijalne politike', 'https://mrosp.gov.hr/', {
      abbr: 'MROSP'
    })
  },
  SI: {
    silica: limit(
      0.05,
      'binding',
      'Pravilnik o varovanju delavcev pred tveganji zaradi izpostavljenosti rakotvornim, mutagenim ali reprotoksičnim snovem pri delu, Priloga III',
      'https://www.uradni-list.si/_pdf/2025/Ur/u2025026.pdf'
    ),
    agency: agency(
      'Inšpektorat Republike Slovenije za delo',
      'https://www.gov.si/drzavni-organi/organi-v-sestavi/inspektorat-za-delo/',
      {
        abbr: 'IRSD'
      }
    )
  },
  PL: {
    silica: limit(
      0.1,
      'binding',
      'Rozporządzenie w sprawie najwyższych dopuszczalnych stężeń i natężeń czynników szkodliwych dla zdrowia (NDS)',
      'https://api.sejm.gov.pl/eli/acts/DU/2026/447/text.pdf'
    ),
    agency: agency('Centralny Instytut Ochrony Pracy – Państwowy Instytut Badawczy', 'https://www.ciop.pl/', {
      abbr: 'CIOP-PIB'
    })
  },
  CZ: {
    silica: limit(
      0.1,
      'binding',
      'Nařízení vlády č. 361/2007 Sb., příloha č. 3',
      'https://e-sbirka.gov.cz/sb/2007/361'
    ),
    agency: agency('Státní úřad inspekce práce', 'https://suip.gov.cz/', { abbr: 'SÚIP' })
  },
  SK: {
    silica: limit(
      0.1,
      'binding',
      'Nariadenie vlády č. 355/2006 Z. z., príloha č. 1',
      'https://static.slov-lex.sk/pdf/prilohy/SK/ZZ/2006/355/20260715_5862227-2.pdf'
    ),
    agency: agency('Národný inšpektorát práce', 'https://www.ip.gov.sk/', { abbr: 'NIP' })
  },
  HU: {
    silica: limit(
      0.1,
      'binding',
      '5/2020. (II. 6.) ITM rendelet, 2. melléklet',
      'https://njt.jog.gov.hu/jogszabaly/2020-5-20-7Q'
    ),
    agency: agency('Szociális és Családügyi Minisztérium – Munkavédelmi Irányítási Főosztály', 'https://mvff.munka.hu/')
  },
  // Romania's and Bulgaria's law sites would not load, so their limits were read
  // only in NEPSI's table and in private copies of the law: the page says the
  // national limit is not confirmed, and gives the EU's.
  RO: {
    agency: agency('Inspecția Muncii', 'https://www.inspectiamuncii.ro/')
  },
  BG: {
    agency: agency('Изпълнителна агенция „Главна инспекция по труда“', 'https://www.gli.government.bg/bg', {
      abbr: 'ИА ГИТ'
    })
  },
  DK: {
    silica: limit(
      0.1,
      'binding',
      'Bekendtgørelse nr. 613 af 29. juni 2026 om grænseværdier for stoffer og materialer, bilag 2',
      'https://www.retsinformation.dk/eli/lta/2026/613/pdf',
      { cristobalite: 0.05 }
    ),
    agency: agency('Arbejdstilsynet', 'https://at.dk/', {
      silicaUrl: 'https://at.dk/faa-viden/arbejde-med-kemi-og-biologi/undgaa-stoev-paa-arbejdet/'
    })
  },
  SE: {
    silica: limit(
      0.1,
      'binding',
      'Arbetsmiljöverkets föreskrifter AFS 2023:14, bilaga 1',
      'https://www.av.se/arbetsmiljoarbete-och-inspektioner/publikationer/foreskrifter/afs-202314/',
      { cristobalite: 0.05 }
    ),
    agency: agency('Arbetsmiljöverket', 'https://www.av.se/', {
      silicaUrl:
        'https://www.av.se/halsa-och-sakerhet/kemiska-risker/risker-for-vissa-amnen-produkter-och-verksamheter/kvartsdamm/'
    })
  },
  FI: {
    // The binding limit; the lower HTP value (STM 55/2025) must be taken into account.
    silica: limit(
      0.1,
      'binding',
      'Valtioneuvoston asetus 113/2024, liite II',
      'https://www.finlex.fi/fi/lainsaadanto/saadoskokoelma/2024/113',
      {
        note: "Finland's HTP value, which employers must take into account, is lower: 0.05 mg/m³."
      }
    ),
    agency: agency('Työterveyslaitos', 'https://www.ttl.fi/', {
      silicaUrl:
        'https://www.ttl.fi/teemat/tyoturvallisuus/altistuminen-tyoympariston-haittatekijoille/kemiallisten-tekijoiden-hallinta-tyopaikalla/tyoympariston-polyt/ohjeet-kvartsipolyn-hallintaan'
    })
  },
  EE: {
    // NEPSI's 0.05 for quartz was never the law's.
    silica: limit(
      0.1,
      'binding',
      'Vabariigi Valitsuse määrus nr 49 (2026), lisa',
      'https://www.riigiteataja.ee/aktilisa/1130/5202/6003/VV_08052026_m49lisa.pdf'
    ),
    agency: agency('Tööinspektsioon', 'https://www.ti.ee/')
  },
  LV: {
    silica: limit(
      0.1,
      'binding',
      'Ministru kabineta noteikumi Nr. 803, 1. pielikums',
      'https://likumi.lv/ta/id/181871-darba-aizsardzibas-prasibas-saskaroties-ar-kancerogenam-vielam-darba-vietas',
      { note: "Latvia's law gives this limit for the inhalable fraction of the dust." }
    ),
    agency: agency('Valsts darba inspekcija', 'https://www.vdi.gov.lv/lv', { abbr: 'VDI' })
  },
  LT: {
    silica: limit(
      0.1,
      'binding',
      'Lietuvos higienos norma HN 23:2011',
      'https://e-seimas.lrs.lt/portal/legalAct/lt/TAD/TAIS.405920/asr',
      { cristobalite: 0.05 }
    ),
    agency: agency('Valstybinė darbo inspekcija', 'https://www.vdi.lt/', { abbr: 'VDI', status: 'unverified' })
  }
};

const shown = (fact) => (fact && (fact.status === 'verified' || fact.status === 'secondary') ? fact : null);

/** A region's facts that may be shown; null for a region with none. */
const workplaceFor = (code) => {
  const entry = WORKPLACE[code];
  const eu = !!REGIONS.find((r) => r.code === code)?.eu;
  if (!entry && !eu) return null;
  return { silica: shown(entry?.silica), agency: shown(entry?.agency), eu };
};

/** Every piece of text shown, once, for translators: the notes. Laws and names stay as they are. */
const texts = () => {
  const all = new Set();
  for (const entry of Object.values(WORKPLACE)) {
    const silica = shown(entry.silica);
    if (silica?.note) all.add(silica.note);
  }
  return [...all];
};

module.exports = { WORKPLACE, EU_SILICA, workplaceFor, texts };
