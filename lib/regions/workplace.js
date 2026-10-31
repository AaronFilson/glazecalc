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
// A limit not yet in force (from) may carry the one that applies until then
// (before, with its own law, source and status: Taiwan's). Where a region has
// no national limit, noLimit says what was found instead, with its own law,
// source and status (India's: each state sets its own); it is shown under the
// line that no limit is confirmed, never in place of a limit. Its states, where
// given, are the limits some states set (India's Andhra Pradesh and Rajasthan),
// each a formula for respirable dust and one for total dust, with what the copy
// read cut off (clipped) said, never guessed; only those that may be shown are.
// Research: research_notes/Region content/ (silica-*.md),
// research_notes/Asia/japan-verification-2026-10-14.md,
// research_notes/Asia/turkey-verification-2026-10-14.md and, for the pass of
// 2026-10-19, scratch/round6/research/ (cn-tw-kr-hk.md, id-ph-vn-th.md, jp-tr.md).

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
    // Read on WorkSafe WA's page: Safe Work Australia's own site did not answer. Workplace exposure standards
    // become workplace exposure limits on 1 December 2026, with silica kept at 0.05 mg/m³ (Enviliance report
    // 16612, on Safe Work Australia's news of 24 June 2026: https://enviliance.com/regions/oceania/au/report_16612).
    silica: limit(
      0.05,
      'binding',
      'Work Health and Safety Regulations: workplace exposure standards (workplace exposure limits from 1 December 2026)',
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
    // No 濃度基準値 (the 2024 personal limits) for crystalline silica as of 2026-10-13: the report of
    // 2026-03-27 lists silica for FY2026 (https://www.mhlw.go.jp/content/11305000/001681085.pdf), but
    // the expert committee's FY2026 working list does not (meetings of 2026-07-16 and 2026-10-13:
    // https://www.mhlw.go.jp/content/11201000/001724211.pdf, .../001758332.pdf); why is not stated.
    silica: limit(
      0.025,
      'control',
      '作業環境評価基準（昭和63年労働省告示第79号）別表',
      'https://www.jaish.gr.jp/horei/hor1-18/hor1-18-2-1-2.html',
      {
        checked: '2026-10-14',
        formula: { numerator: 3.0, factor: 1.19 },
        // JSOH's 許容濃度 for crystalline silica, respirable, proposed in 2006: a recommendation. Its
        // 2025 list is still the latest public one on 2026-10-19 (the 2026 lists answer 404; the
        // 2026 list is for members only): 結晶質シリカ 0.03 (吸入性粉塵), in oel_2025.pdf as well.
        recommended: {
          value: 0.03,
          by: 'Japan Society for Occupational Health',
          abbr: 'JSOH',
          title: 'Recommendation of Occupational Exposure Limits (2025–2026)',
          source: 'https://www.sanei.or.jp/english/files/topics/oels/oel_en_2025.pdf',
          status: 'verified',
          checked: '2026-10-19'
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
    // regulation on 2025-08-07, with no date (https://csgb.gov.tr/isggm/tr/haberler/07082025/).
    // No revision published as of 2026-10-19: the consolidated text on mevzuat.gov.tr shows no
    // amendment, and the ministry's news up to its commission's meeting of 2026-06-19
    // (https://csgb.gov.tr/isggm/tr/haberler/19062026/) gives no draft or date. Check again.
    silica: limit(
      0.098,
      'binding',
      'Tozla Mücadele Yönetmeliği (RG 05.11.2013/28812), Ek-1',
      'https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=18989&MevzuatTur=7&MevzuatTertip=5',
      {
        checked: '2026-10-19',
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
    // 2016/425. TSE's standard search lists TS EN 149+A1 (accepted 2010-07-13, from EN
    // 149:2001+A1:2009, under 2016/425) as in force ("U, Yürürlükteki Standard"), read on
    // 2026-10-19; the FFP classes are in its paid text, read only in a secondary extract, so the
    // classes stay 'secondary', linked to the regulation.
    respirators: {
      everyday: ['FFP2'],
      higher: ['FFP3'],
      source: 'https://www.resmigazete.gov.tr/eskiler/2019/05/20190501-5.htm',
      status: 'secondary',
      checked: '2026-10-19',
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
  // 附表二 as amended on 2025-04-11 (corrected 2025-05-14), in force from 2027-01-01 (民國116年1月1日,
  // Article 11, read again on 2026-10-19): crystalline free silica (quartz, tridymite, cristobalite),
  // respirable, 0.1 mg/m³, 8-hour TWA. First read in the English attachment
  // (https://law.moj.gov.tw/ENG/LawClass/LawGetFile.ashx?FileId=0000009228&lan=E) on 2026-10-12, then
  // in Chinese on 2026-10-19, in the comparison table (條文對照表) issued with the amendment, page 85,
  // "第二條附表二修正對照表", which sets the new table (修正規定) beside the one in force until
  // 2026-12-31 (現行規定, the 2018-03-14 text): first-kind dust (第一種粉塵), mineral dust with 10 % or
  // more crystalline free silica, respirable 10 mg/m³ / (%SiO2 + 2), total 30 / (%SiO2 + 2); second-kind
  // dust (under 10 %) 1 mg/m³ respirable; crystalline free silica there means quartz, cristobalite,
  // tridymite and diatomite (說明四), 8-hour TWAs (說明一). Read by eye in the law site's own PDF:
  // verified. The earlier limit is for the whole respirable dust, not the silica in it; at Q = 100 it is
  // 10 / 102 = 0.098, the same form as Türkiye's. The law site of the labour ministry
  // (laws.mol.gov.tw) did not answer, so the MOJ's copy is the one read.
  TW: {
    silica: limit(
      0.1,
      'binding',
      '勞工作業場所容許暴露標準，附表二（2025年4月11日修正）',
      'https://law.moj.gov.tw/LawClass/LawAll.aspx?PCODE=N0060004',
      {
        checked: '2026-10-19',
        from: '2027-01-01',
        before: {
          quartz: 0.098,
          formula: { numerator: 10, factor: 1, offset: 2, places: 0 },
          until: '2026-12-31',
          law: '勞工作業場所容許暴露標準，附表二（2018年3月14日修正），第一種粉塵',
          source: 'https://law.moj.gov.tw/LawClass/LawGetFile.ashx?FileId=0000387834&lan=C&type=1&date=20250411',
          status: 'verified',
          checked: '2026-10-19'
        },
        note: 'Until 31 December 2026 the limit is for the whole respirable dust when it holds 10% or more crystalline silica (quartz, cristobalite, tridymite or diatomite), and dust with less is held to 1 mg/m³. From 1 January 2027 the limit is for the crystalline silica itself.'
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
  },
  // China (research_notes/Asia/regions-CN-HK-ID-TH-VN-PH-2026-10-16.md). GBZ 2.1—2019, 表2, row 40 矽尘:
  // PC-TWA for respirable dust (呼尘) by free SiO2 content, 0.7 mg/m³ for 10 % to 50 %, 0.3 for over 50 %
  // to 80 %, 0.2 over 80 % (total dust 1, 0.7, 0.5); its tables 1–3 are mandatory (强制性, foreword).
  // Read in China CDC's copy, and in a consolidated copy with amendments 1 and 2: amendment 2 (in force
  // 2025-05-01) adds acetochlor only. Any listed dust with 10 % free SiO2 or more is held to this row.
  // No agency: the health commission's and the emergency ministry's pages could not be read. Masks:
  // GB 2626-2019 is current (SAMR's listing, read again on 2026-10-19: 现行, in force 2020-07-01); its
  // text could not be opened (a viewer behind a captcha). KN95 is named as one of its classes on the
  // Beijing market regulator's notice of 2023-12
  // (https://scjgj.beijing.gov.cn/zwxx/gs/cpzlgs/202312/P020231218527918847103.docx); KN100, and the KN
  // (not oily) and KP (oily too) series, only in SGS's summary of the standard, so the classes are
  // 'secondary', as Taiwan's are.
  CN: {
    silica: limit(
      0.2,
      'binding',
      'GBZ 2.1—2019《工作场所有害因素职业接触限值 第1部分：化学有害因素》，表2',
      'https://www.chinacdc.cn/jkyj/hjwsyzdkz/bzxg/202109/W020220826468162167916.pdf',
      {
        checked: '2026-10-16',
        bands: [
          { from: 10, fromIncluded: true, to: 50, value: 0.7 },
          { from: 50, fromIncluded: false, to: 80, value: 0.3 },
          { from: 80, fromIncluded: false, value: 0.2 }
        ],
        note: 'These limits are for the whole respirable dust (呼尘), not only the silica in it. Any dust with 10% free silica or more is held to them.'
      }
    ),
    respirators: {
      everyday: ['KN95'],
      higher: ['KN100'],
      source: 'https://openstd.samr.gov.cn/bzgk/gb/newGbInfo?hcno=16D8935B45AD7AE40228801B7FADFC6C',
      status: 'secondary',
      checked: '2026-10-19',
      note: 'Dust masks in China are graded under the national standard GB 2626-2019. KN masks are for dust that is not oily, such as glaze dust.'
    }
  },
  // Hong Kong (the same notes). The Labour Department's guidance notes on silicosis (edition of September 2000), appendix:
  // respirable quartz 0.1, cristobalite and tridymite 0.05 mg/m³, OEL-TWA for an 8-hour day. The PDF's
  // table reads out of line as plain text; in content-stream order (pdftotext -raw) it reads
  // cristobalite 0.05, quartz 0.1, tridymite 0.05. A guide value (the notes say exposure "should not exceed" it; the code of practice that
  // lists all limits has a special legal status but breaking it is not itself an offence).
  HK: {
    silica: limit(
      0.1,
      'indicative',
      'Guidance Notes on Protection of Quarry and Construction Workers from Silicosis (Labour Department, 2000), Appendix I',
      'https://www.labour.gov.hk/eng/public/oh/silicosis.pdf',
      { checked: '2026-10-16', cristobalite: 0.05, note: "Tridymite's limit is the same as cristobalite's." }
    ),
    agency: agency('Labour Department (勞工處)', 'https://www.labour.gov.hk/', {
      checked: '2026-10-16',
      silicaUrl: 'https://www.labour.gov.hk/eng/public/oh/silicosis.pdf'
    })
  },
  // Indonesia (the same notes). Permenaker No. 5 Tahun 2018 (Berita Negara 2018 No. 567), Lampiran:
  // "Silika, kristalin – α-Quartz dan Kristobalit … 0,025 (R); A2", a NAB (8 hours a day, 40 a week).
  // Read by eye on the annex page of the gazette PDF, through a mirror (pasal.id) of peraturan.go.id's
  // copy, since peraturan.go.id refused the connection; no later regulation replacing it was found.
  ID: {
    silica: limit(
      0.025,
      'binding',
      'Peraturan Menteri Ketenagakerjaan Nomor 5 Tahun 2018 tentang Keselamatan dan Kesehatan Kerja Lingkungan Kerja, Lampiran',
      'https://peraturan.go.id/files/bn567-2018.pdf',
      { checked: '2026-10-16' }
    ),
    agency: agency('Kementerian Ketenagakerjaan', 'https://kemnaker.go.id/', {
      abbr: 'Kemnaker',
      checked: '2026-10-16'
    })
  },
  // Thailand (the same notes). ประกาศกรมสวัสดิการและคุ้มครองแรงงาน เรื่อง ขีดจำกัดความเข้มข้นของสารเคมีอันตราย
  // (Royal Gazette 2017-08-03), row 276: respirable cristobalite and α-quartz 0.025 mg/m³, the average
  // over normal working time (8 hours), read in the department's own PDF.
  TH: {
    silica: limit(
      0.025,
      'binding',
      'ประกาศกรมสวัสดิการและคุ้มครองแรงงาน เรื่อง ขีดจำกัดความเข้มข้นของสารเคมีอันตราย (พ.ศ. 2560)',
      'https://osh.labour.go.th/wp-content/uploads/2026/02/chemical01-2560.pdf',
      { checked: '2026-10-16' }
    ),
    agency: agency('กองความปลอดภัยแรงงาน กรมสวัสดิการและคุ้มครองแรงงาน', 'https://osh.labour.go.th/', {
      checked: '2026-10-16'
    })
  },
  // The Philippines. Occupational Safety and Health Standards (as amended, 1989), Rule 1070: 1072.02(2)
  // and Table 8a (Mineral Dusts): respirable quartz 10 mg/m³ / (%SiO2 + 2) as an 8-hour TWA, cristobalite
  // and tridymite half the value for quartz (total dust 30 / (%SiO2 + 3)); TLVs are for an 8-hour day
  // and a 48-hour week (1072.01); the silica content is the one found in airborne samples (footnote a).
  // Read on 2026-10-19 in DOLE's own PDF (the OSHC's reprint, 2005–2016,
  // https://www.dole.gov.ph/php_assets/uploads/2019/04/OSH-Standards-2017-2.pdf) through the Internet
  // Archive's capture of that address of 2023-03-16, which is linked, since DOLE's sites answer 403 to
  // automated reading: verified, as Indonesia's Permenaker was read through a mirror, and the note says
  // so. No later order changing Table 8a was found (DO 136-14 is GHS, DO 154-16 asbestos; RA 11058 and
  // DO 198-18 keep the Standards where not revised), which does not prove there is none. DOLE's and the
  // OSHC's own pages could not be read, so no agency is given.
  PH: {
    silica: limit(
      0.098,
      'binding',
      'Occupational Safety and Health Standards (as amended, 1989), Rule 1070, Table 8a',
      'https://web.archive.org/web/20230316084750/https://www.dole.gov.ph/php_assets/uploads/2019/04/OSH-Standards-2017-2.pdf',
      {
        checked: '2026-10-19',
        cristobalite: 0.049,
        formula: { numerator: 10, factor: 1, offset: 2, places: 0 },
        note: "Tridymite has the same limit as cristobalite: half the value for quartz. The Standards count a working week of 48 hours. Read in the Internet Archive's copy of the Department of Labor and Employment's own file, as its site could not be read."
      }
    )
  },
  // Vietnam (research_notes/Asia/region-VN-2026-10-17.md). QCVN 02:2019/BYT, issued with Thông tư
  // 02/2019/TT-BYT (2019-03-21, in force 2019-09-22), Bảng 2: free silica (silic tự do) in respirable
  // dust 0.1 mg/m³, in total dust 0.3, both shift averages (TWA); 1.2.1 works the free silica out as
  // the dust's concentration times its free silica content. A national technical regulation (QCVN),
  // so binding. Read in Caselaw Việt Nam's copy of the text, since the government's and the ministry's
  // own pages could not be read (vbpl.vn redirects, moh.gov.vn did not answer): secondary. On
  // 2026-10-19 still no official copy was reached (the Official Gazette's search does not return
  // 02/2019/TT-BYT), but the national standards committee's portal gives the total-dust figure, 0.3
  // (https://tcvn.gov.vn/gioi-han-bui-tai-noi-lam-viec-duoc-yeu-cau-trong-qcvn-022019-byt-nhu-the-nao/25/03/2022/),
  // and the national standards database lists the regulation as in force; the respirable 0.1 is still
  // only in Caselaw's copy, so it stays secondary. No agency.
  // Masks: TCVN 13409:2021 (Khẩu trang nửa mặt lọc hạt) is EN 149:2001+A1:2009 word for word (IDT) and
  // in force, per the national standards database; its text was not read, so the FFP classes are
  // 'secondary', as Türkiye's. A TCVN is voluntary. QCVN 08:2012/BLĐTBXH, which is mandatory, covers
  // particle filters to EN 143 (P1–P3), not filtering half masks.
  VN: {
    silica: limit(
      0.1,
      'binding',
      'QCVN 02:2019/BYT, Quy chuẩn kỹ thuật quốc gia về bụi (Thông tư 02/2019/TT-BYT), Bảng 2',
      'https://caselaw.vn/van-ban-phap-luat/337875-thong-tu-so-02-2019-tt-byt-ngay-21-03-2019-cua-bo-truong-bo-y-te-quy-chuan-ky-thuat-quoc-gia-ve-bui-gia-tri-gioi-han-tiep-xuc-cho-phep-05-yeu-to-bui-tai-noi-lam-viec',
      {
        status: 'secondary',
        checked: '2026-10-19',
        freeSilica: true,
        note: "This limit is for the free silica in the respirable dust: to compare a measurement with it, multiply the dust's concentration by the share of free silica in the dust. The free silica in all the dust breathed in is limited to 0.3 mg/m³. Read in a legal database's copy of the regulation, as the government's own page could not be read."
      }
    ),
    respirators: {
      everyday: ['FFP2'],
      higher: ['FFP3'],
      source: 'https://tieuchuan.vsqi.gov.vn/tieuchuan/view?sohieu=TCVN+13409%3A2021',
      status: 'secondary',
      checked: '2026-10-19',
      note: "Vietnam's national standard for filtering half masks, TCVN 13409:2021, is the European standard EN 149."
    }
  },
  // India (scratch/round6/research/in-pk-bd.md). The Factories Act 1948, whose Second Schedule gave
  // respirable quartz 10 mg/m³ / (% quartz + 2), was repealed by the Occupational Safety, Health and
  // Working Conditions Code 2020 (s.143), in force from 2025-11-21 (secondary). Under the Code, s.88,
  // the limits of exposure "in any factory shall be of the value as may be prescribed by the State
  // Government", and each state's rules set them; Gujarat's draft rules (2025-12-13) repeat the old
  // formula, and no other state's were read. No national limit, so none is shown (the owner's decision,
  // 2026-10-20): the guide says each state sets it, and links DGOSH. The Code was read in the Gazette's
  // text on PRS Legislative Research's site, since India Code refused automated reading: secondary.
  // Masks: IS 9473:2002, the Indian Standard for filtering half masks (FFP1 to FFP3), read in
  // Public.Resource.Org's scan, since BIS's own copies answer 404; BIS lists it as current.
  IN: {
    noLimit: {
      note: 'We found no national limit: under the Occupational Safety, Health and Working Conditions Code, 2020, each state sets the limits for its own factories.',
      law: 'Occupational Safety, Health and Working Conditions Code, 2020, section 88',
      source:
        'https://prsindia.org/files/bills_acts/acts_parliament/2020/Occupational%20Safety,%20Health%20And%20Working%20Conditions%20Code,%202020.pdf',
      status: 'secondary',
      checked: '2026-10-19',
      // The states whose new rules under the Code were read with a limit in them (scratch/round8/india-data/
      // report.md, 2026-10-21; the owner's decision of 2026-10-21), shown under the line that no limit is
      // confirmed, never as India's. Both repeat the repealed Factories Act's formulas, Q the quartz in the
      // dust in %, and were read only in private firms' copies of the Gazette: secondary. Rajasthan's
      // respirable-dust cell is cut off at the right edge of its gazette page (p. 602) in the copy read
      // ("10 / % respirable Quat…"), so only its total-dust formula is given. Not shown: Gujarat (none in its
      // final rules; a draft of 2025-12-13 only), Tamil Nadu (its rules point to the repealed schedule),
      // Uttar Pradesh (text not found) and the other states (drafts, or not read).
      states: [
        {
          area: 'Andhra Pradesh',
          law: 'Occupational Safety, Health and Working Conditions (Andhra Pradesh) Rules, 2026 (G.O.Rt.No.146; Andhra Pradesh Gazette No. 432, 2026-08-07), rule 136, Table 2',
          source:
            'https://employmentlaw.lkslaw.com/file/updates/state-rules/andhra-pradesh/andhra-pradesh-osh-rules-2026.pdf',
          respirable: { numerator: 10, factor: 1, offset: 2, places: 0 },
          total: { numerator: 30, factor: 1, offset: 3, places: 0 },
          status: 'secondary',
          checked: '2026-10-21',
          note: "Read in a copy of the state's gazette on a law firm's site (Lakshmikumaran & Sridharan), not on the state's own. Cristobalite and tridymite: half these values."
        },
        {
          area: 'Rajasthan',
          law: 'Rajasthan Occupational Safety, Health and Working Conditions Rules, 2026 (S.O.23, Rajasthan Gazette, 2026-06-30), rule 111, Table 2',
          source:
            'https://www.sgcms.com/regulatory-updates/wp-content/uploads/2026/07/Final-Notification-of-the-Rajasthan-Occupational-Safety-Health-and-Working-Condition-Rules-2026.pdf',
          total: { numerator: 30, factor: 1, offset: 3, places: 0 },
          clipped: ['respirable'],
          status: 'secondary',
          checked: '2026-10-21',
          note: "Read in a copy of the state's gazette on a consultancy's site (sgcms.com), not on the state's own. The limit for respirable dust is cut off at the edge of the page in that copy, so it is not given here. Cristobalite and tridymite: half these values."
        }
      ]
    },
    agency: agency('Directorate General Occupational Safety and Health', 'https://dgfasli.gov.in/en/', {
      abbr: 'DGOSH',
      checked: '2026-10-19'
    }),
    respirators: {
      everyday: ['FFP2'],
      higher: ['FFP3'],
      source: 'https://law.resource.org/pub/in/bis/S02/is.9473.2002.pdf',
      status: 'secondary',
      checked: '2026-10-19',
      note: 'Dust masks in India are graded under IS 9473:2002, the Indian Standard for filtering half masks against particles.'
    }
  },
  // Pakistan (the same notes): the Punjab Occupational Safety and Health Act 2019 lets rules limit dust
  // but gives no values, and no rules with a limit, national agency or mask standard were found.
  PK: {},
  // Bangladesh (the same notes): the Bangladesh Labour Rules 2015 (DIFE's copy) have no exposure-limit
  // table, and no mask standard was found. The inspection department's own site was read.
  BD: {
    agency: agency(
      'কলকারখানা ও প্রতিষ্ঠান পরিদর্শন অধিদপ্তর (Department of Inspection for Factories and Establishments)',
      'https://dife.gov.bd/',
      { abbr: 'DIFE', checked: '2026-10-19' }
    )
  },
  // Egypt, the United Arab Emirates, Morocco and Algeria (scratch/round6/research/eg-ae-ma-dz.md): no
  // silica limit was read in a law or on an agency's page. Egypt's Ministerial Decree 211/2003 is said
  // to give 10 / (%SiO2 + 2) mg/m³ for respirable dust, but only in a journal paper that also gives
  // another value, and the obligatory standard ES 6528/2008 was not read, so nothing is shown
  // (the lead's decision, 2026-10-20). No agency's page was read either.
  EG: {},
  AE: {},
  MA: {},
  DZ: {},
  // Sri Lanka (scratch/round8/india-data/report.md, 2026-10-21): no silica limit or mask standard was found
  // (a health ministry tender's N95 or FFP2 is a purchase specification, not a standard). The National
  // Institute of Occupational Safety and Health's own site was read for its name; it has no page on silica.
  LK: {
    agency: agency('National Institute of Occupational Safety and Health', 'https://www.niosh.gov.lk/', {
      abbr: 'NIOSH',
      checked: '2026-10-21'
    })
  },
  // Nepal (the same report): no silica limit or mask standard was found; the Department of Labour and
  // Occupational Safety's site mentions "Exposure Limit Values" but gives none that could be found.
  NP: {
    agency: agency(
      'श्रम तथा व्यवसायजन्य सुरक्षा विभाग (Department of Labour and Occupational Safety)',
      'https://dol.gov.np/',
      { checked: '2026-10-21' }
    )
  },
  // Round 10's regions: silica limits and bodies for safety at work were not researched for the groundwork
  // (scratch/round10/c-africa-latam/plan.md), so none is shown.
  MX: {},
  BR: {},
  AR: {},
  CL: {},
  ZA: {},
  KE: {},
  GH: {}
};

const shown = (fact) => (fact && (fact.status === 'verified' || fact.status === 'secondary') ? fact : null);

/** A limit that may be shown, without a recommended value or an earlier limit that may not. */
const shownLimit = (silica) => {
  const limit = shown(silica);
  if (!limit) return limit;
  const hidden = ['recommended', 'before'].filter((field) => limit[field] && !shown(limit[field]));
  if (!hidden.length) return limit;
  const rest = { ...limit };
  for (const field of hidden) delete rest[field];
  return rest;
};

/** What was found where there is no national limit, with only the states' limits that may be shown. */
const shownNoLimit = (noLimit) => {
  const found = shown(noLimit);
  if (!found?.states) return found;
  const states = found.states.filter((state) => shown(state));
  const rest = { ...found };
  if (states.length) rest.states = states;
  else delete rest.states;
  return rest;
};

/** A region's facts that may be shown; null for a region with none. */
const workplaceFor = (code) => {
  const entry = WORKPLACE[code];
  const eu = !!REGIONS.find((r) => r.code === code)?.eu;
  if (!entry && !eu) return null;
  const silica = shownLimit(entry?.silica);
  // What was found where there is no national limit (India's), only where no limit is shown.
  const noLimit = silica ? null : shownNoLimit(entry?.noLimit);
  return {
    silica,
    agency: shown(entry?.agency),
    respirators: shown(entry?.respirators),
    eu,
    ...(noLimit ? { noLimit } : {})
  };
};

/** Every piece of text shown, once, for translators: the notes. Laws and names stay as they are. */
const texts = () => {
  const all = new Set();
  for (const entry of Object.values(WORKPLACE)) {
    const silica = shown(entry.silica);
    if (silica?.note) all.add(silica.note);
    const noLimit = silica ? null : shownNoLimit(entry.noLimit);
    if (noLimit) all.add(noLimit.note);
    for (const state of noLimit?.states ?? []) if (state.note) all.add(state.note);
    const respirators = shown(entry.respirators);
    if (respirators?.note) all.add(respirators.note);
  }
  return [...all];
};

module.exports = { WORKPLACE, EU_SILICA, workplaceFor, texts };
