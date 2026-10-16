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
// assessment criterion (Beurteilungsmaßstab), not a binding limit. Japan's is
// a control concentration (管理濃度, kind 'control'): a yardstick for judging
// the air of a work area by measurement, not a limit on what one person
// breathes, and it depends on the dust's free silica content Q (%), as
// E = 3.0 / (1.19Q + 1); quartz holds its value at Q = 100. Beside it, the
// value the Japan Society for Occupational Health recommends, which is not law.
// Türkiye's binding limit has the same form with other numbers: E = 10 / (Q + 2)
// for quartz, and half that for cristobalite and tridymite. A formula is
// E = numerator / (factor × Q + offset), offset 1 where not given, its
// numerator written with places decimals (1 where not given: Japan's 3.0).
// Research: research_notes/Region content/ (silica-*.md),
// research_notes/Asia/japan-verification-2026-10-14.md and
// research_notes/Asia/turkey-verification-2026-10-14.md.

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
  },
  JP: {
    // 作業環境評価基準, 別表 一: E = 3.0 / (1.19Q + 1) mg/m³, Q the free silica content (%) of the
    // dust; 0.025 at Q = 100. One value for all free silica, so no separate cristobalite value.
    // No 濃度基準値 (the 2024 personal limits) for crystalline silica as of 2026-03-27: it is a
    // candidate for FY2026 (https://www.mhlw.go.jp/content/11305000/001681085.pdf).
    silica: limit(
      0.025,
      'control',
      '作業環境評価基準（昭和63年労働省告示第79号）別表',
      'https://www.jaish.gr.jp/horei/hor1-18/hor1-18-2-1-2.html',
      {
        checked: '2026-10-14',
        formula: { numerator: 3.0, factor: 1.19 },
        // JSOH's 許容濃度 for crystalline silica, respirable, proposed in 2006: a recommendation.
        recommended: {
          value: 0.03,
          by: 'Japan Society for Occupational Health',
          abbr: 'JSOH',
          title: 'Recommendation of Occupational Exposure Limits (2025–2026)',
          source: 'https://www.sanei.or.jp/english/files/topics/oels/oel_en_2025.pdf',
          status: 'verified',
          checked: '2026-10-14'
        }
      }
    ),
    agency: agency('厚生労働省', 'https://www.mhlw.go.jp/', {
      abbr: 'MHLW',
      silicaUrl: 'https://anzeninfo.mhlw.go.jp/anzen/gmsds/14808-60-7.html',
      checked: '2026-10-14'
    }),
    // 国家検定 dust masks: DS (disposable) and RS (replaceable filters), classes 1 to 3 at
    // 80.0, 95.0 and 99.9 % (MHLW's leaflet). Named by class; no claim that one equals N95 or FFP2.
    respirators: {
      everyday: ['DS2', 'RS2'],
      higher: ['DS3', 'RS3'],
      source: 'https://www.mhlw.go.jp/content/11201000/000587014.pdf',
      status: 'verified',
      checked: '2026-10-13',
      note: 'Dust masks in Japan pass a national test (国家検定). DS masks are disposable and RS masks take replaceable filters; class 2 filters at least 95.0% of the test particles, class 3 at least 99.9%.'
    }
  },
  TR: {
    // Tozla Mücadele Yönetmeliği, Madde 9 and Ek-1 (read in the annex 7.5.18989-EK.doc): an
    // 8-hour TWA (ZAOD) that may not be exceeded, for respirable quartz 10 mg/m³ / (%SiO2 + 2),
    // and half that for cristobalite and tridymite. At Q = 100: 0.098 and 0.049. The
    // carcinogens regulation (RG 06.08.2013/28730, Ek-2) has no entry for crystalline silica:
    // Türkiye has not adopted (EU) 2017/2398. The ministry announced a revision of the dust
    // regulation on 2025-08-07, with no date (https://csgb.gov.tr/isggm/tr/haberler/07082025/):
    // check again.
    silica: limit(
      0.098,
      'binding',
      'Tozla Mücadele Yönetmeliği (RG 05.11.2013/28812), Ek-1',
      'https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=18989&MevzuatTur=7&MevzuatTertip=5',
      {
        checked: '2026-10-14',
        cristobalite: 0.049,
        formula: { numerator: 10, factor: 1, offset: 2, places: 0 },
        note: "Türkiye has not adopted the EU's binding limit (Directive (EU) 2017/2398). Tridymite has the same limit as cristobalite: half the value for quartz."
      }
    ),
    agency: agency(
      'Çalışma ve Sosyal Güvenlik Bakanlığı, İş Sağlığı ve Güvenliği Genel Müdürlüğü',
      'https://csgb.gov.tr/',
      {
        abbr: 'ÇSGB İSGGM',
        checked: '2026-10-14'
      }
    ),
    // The regulation on protective equipment (RG 01.05.2019/30761) follows Regulation (EU)
    // 2016/425; the FFP classes (TS EN 149+A1) were read only in a secondary extract, so the
    // classes are 'secondary', linked to the regulation.
    respirators: {
      everyday: ['FFP2'],
      higher: ['FFP3'],
      source: 'https://www.resmigazete.gov.tr/eskiler/2019/05/20190501-5.htm',
      status: 'secondary',
      checked: '2026-10-14',
      note: "Türkiye's rules for protective equipment follow the EU's (Regulation (EU) 2016/425)."
    }
  },
  // South Korea (research_notes/Asia/region-data.md, carried in verification-KR-TW-SG-MY-2026-10-16.md):
  // 고용노동부고시 제2020-48호, 별표 1, respirable quartz and cristobalite 0.05 mg/m³ each (tridymite
  // 0.05, tripoli 0.1), 8-hour TWA. An exposure standard (노출기준), not one of the binding 허용기준 of
  // 산업안전보건법 시행규칙 별표 19, so 'indicative'. No newer notice was found on 2026-10-16, which
  // does not prove there is none. KOSHA's site could not be read, so no silica page is linked.
  KR: {
    silica: limit(
      0.05,
      'indicative',
      '화학물질 및 물리적인자의 노출기준 (고용노동부고시 제2020-48호), 별표 1',
      'https://www.law.go.kr/행정규칙/화학물질및물리적인자의노출기준',
      {
        checked: '2026-10-13',
        note: "This is an exposure standard (노출기준): employers must measure the dust at work and act when it is over the standard, but crystalline silica is not among Korea's binding limits (허용기준)."
      }
    ),
    agency: agency('고용노동부', 'https://www.moel.go.kr/', { abbr: 'MoEL', checked: '2026-10-13' }),
    // 보호구 안전인증 고시 (고용노동부고시 제2023-64호), 별표 4: 방진마스크 특급, 1급 and 2급; a filtering
    // facepiece filters 99.0, 94.0 and 80.0 %. The notice allows 2급 for silica-type dust; the
    // guides name 1급, and 특급 above it. KF94 (MFDS, 0.4 µm, 94 %) is a health mask, not a
    // certified dust mask for work: named only as that.
    respirators: {
      everyday: ['1급'],
      higher: ['특급'],
      source: 'https://www.law.go.kr/행정규칙/보호구안전인증고시',
      status: 'verified',
      checked: '2026-10-13',
      note: 'Dust masks for work in Korea (방진마스크) carry the KOSHA safety certification mark (안전인증). A 1급 filtering-facepiece mask filters at least 94.0% of the test particles, a 특급 one at least 99.0%. KF94 masks are health masks approved by the Ministry of Food and Drug Safety, not certified dust masks for work.'
    }
  },
  // Taiwan (research_notes/Asia/verification-KR-TW-SG-MY-2026-10-16.md). 勞工作業場所容許暴露標準
  // 附表二 as amended on 2025-04-11 (corrected 2025-05-14), in force from 2027-01-01 (民國116年1月1日):
  // crystalline free silica (quartz, tridymite, cristobalite), respirable, 0.1 mg/m³, 8-hour TWA.
  // The Chinese attachment is an image; the numbers were read in the English attachment
  // (https://law.moj.gov.tw/ENG/LawClass/LawGetFile.ashx?FileId=0000009228&lan=E) on 2026-10-12.
  // The table in force until 2026-12-31 is not on the law site; a university table (secondary,
  // undated) gives 10 mg/m³ / (%SiO2 + 2), so it is not shown, only said to depend on the content.
  TW: {
    silica: limit(
      0.1,
      'binding',
      '勞工作業場所容許暴露標準，附表二（2025年4月11日修正）',
      'https://law.moj.gov.tw/LawClass/LawAll.aspx?PCODE=N0060004',
      {
        checked: '2026-10-12',
        from: '2027-01-01',
        note: 'Until 31 December 2026 an earlier table applies, in which the limit depends on how much silica the dust contains. We have not read that table on an official page, so it is not shown here.'
      }
    ),
    agency: agency('勞動部職業安全衛生署', 'https://www.osha.gov.tw/', { checked: '2026-10-12' }),
    // CNS 14755 Z2125「拋棄式防塵口罩」, the standard the Bureau of Standards lists for workplaces;
    // the Ministry of Labor's handbook errata names class D3. D2 (about 95 %) and D3 (about 99 %)
    // were read only on a mask maker's site, so the classes are 'secondary' and no percentage is given.
    respirators: {
      everyday: ['D2'],
      higher: ['D3'],
      source: 'https://www.bsmi.gov.tw/wSite/ct?xItem=88403&ctNode=2229&mp=27',
      status: 'secondary',
      checked: '2026-10-16',
      note: 'Disposable dust masks in Taiwan are graded under the national standard CNS 14755 (拋棄式防塵口罩).'
    }
  },
  // Singapore (research_notes/Asia/region-data.md, carried in verification-KR-TW-SG-MY-2026-10-16.md).
  // Workplace Safety and Health (General Provisions) Regulations, First Schedule, PEL (Long Term):
  // respirable quartz 0.1, cristobalite and tridymite 0.05 mg/m³ (tripoli 0.1), for an 8-hour day
  // and 40-hour week. Read on Singapore Statutes Online on 2026-10-12; on 2026-10-16 the site
  // answered 403, so the date stays 2026-10-12. No MOM page on silica was found. Respirators: MOM
  // refers to SS 548:2022, whose classes were not read, and names N95 only in a search extract,
  // so no classes are given.
  SG: {
    silica: limit(
      0.1,
      'binding',
      'Workplace Safety and Health (General Provisions) Regulations, First Schedule',
      'https://sso.agc.gov.sg/SL/WSHA2006-RG1?ProvIds=Sc1-',
      { checked: '2026-10-12', cristobalite: 0.05, note: "Tridymite's limit is the same as cristobalite's." }
    ),
    agency: agency('Ministry of Manpower', 'https://www.mom.gov.sg/workplace-safety-and-health', {
      abbr: 'MOM',
      checked: '2026-10-12'
    })
  },
  // Malaysia (research_notes/Asia/region-data.md, carried in verification-KR-TW-SG-MY-2026-10-16.md).
  // USECHH Regulations 2000, Jadual I: respirable quartz 0.1, cristobalite and tridymite 0.05 mg/m³
  // (tripoli 0.1), 8-hour TWA, read on 2026-10-12. No later amendment of the schedule was found on
  // 2026-10-16, which does not prove there is none. DOSH's site answered on 2026-10-16.
  // Respirators: DOSH's Guidelines on PPE against chemical hazards (2005), Table 4 (NIOSH classes)
  // and Table 9 (the standards it accepts), read on 2026-10-12.
  MY: {
    silica: limit(
      0.1,
      'binding',
      'Peraturan-Peraturan Keselamatan dan Kesihatan Pekerjaan (Penggunaan dan Standard Pendedahan Bahan Kimia Berbahaya kepada Kesihatan) 2000, Jadual I',
      'https://dosh.gov.my/wp-content/uploads/2025/01/Peraturan-Keselamatan-dan-Kesihatan-Pekerjaan-Penggunaan-dan-Standard-Pendedahan-Bahan-Kimia-Berbahaya-Kepada-Kesihatan-2000.pdf',
      { checked: '2026-10-12', cristobalite: 0.05, note: "Tridymite's limit is the same as cristobalite's." }
    ),
    agency: agency('Jabatan Keselamatan dan Kesihatan Pekerjaan', 'https://dosh.gov.my/', {
      abbr: 'JKKP',
      checked: '2026-10-16'
    }),
    respirators: {
      everyday: ['N95'],
      higher: ['N99', 'N100'],
      source:
        'https://dosh.gov.my/wp-content/uploads/2024/10/Garis-Panduan-bagi-Penggunaan-Kelengkapan-Perlindungan-Diri-Terhadap-Bahan-Kimia-Berhazard-2005.pdf',
      status: 'verified',
      checked: '2026-10-12',
      note: "Malaysia's guidelines use the US (NIOSH) classes, and also accept masks certified to the Australian and New Zealand (AS/NZS 1716), European (EN 149), Korean and Japanese standards."
    }
  }
};

const shown = (fact) => (fact && (fact.status === 'verified' || fact.status === 'secondary') ? fact : null);

/** A limit that may be shown, without a recommended value that may not. */
const shownLimit = (silica) => {
  const limit = shown(silica);
  if (!limit || !limit.recommended || shown(limit.recommended)) return limit;
  const rest = { ...limit };
  delete rest.recommended;
  return rest;
};

/** A region's facts that may be shown; null for a region with none. */
const workplaceFor = (code) => {
  const entry = WORKPLACE[code];
  const eu = !!REGIONS.find((r) => r.code === code)?.eu;
  if (!entry && !eu) return null;
  return {
    silica: shownLimit(entry?.silica),
    agency: shown(entry?.agency),
    respirators: shown(entry?.respirators),
    eu
  };
};

/** Every piece of text shown, once, for translators: the notes. Laws and names stay as they are. */
const texts = () => {
  const all = new Set();
  for (const entry of Object.values(WORKPLACE)) {
    const silica = shown(entry.silica);
    if (silica?.note) all.add(silica.note);
    const respirators = shown(entry.respirators);
    if (respirators?.note) all.add(respirators.note);
  }
  return [...all];
};

module.exports = { WORKPLACE, EU_SILICA, workplaceFor, texts };
