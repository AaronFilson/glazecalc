'use strict';

const { textKey } = require('./languages');

// Who to call, by region (docs/i18n-plan.md): emergency numbers, poison
// lines and animal poison lines. These are facts that differ by country,
// change, and can hurt someone when wrong, so each one carries the page it
// was read on, the date it was checked and a status:
//
//   verified    read on the centre's own page or an official health or
//               government page
//   extract     seen only in a search engine's extract of an official page,
//               which blocked automated reading: to be checked by hand
//   unverified  a lead only
//
// Only verified entries are shown. (Vietnam's emergency numbers were shown as
// "reported", listed on official pages without their roles, from 2026-10-17
// until their roles were read on official pages on 2026-10-19.) Translators
// never touch the digits: the guides take them from here. Checked against the research in
// research_notes/Internationalizing glazecalc for EU languages/eu_poison_centres.md
// and Glazing guides for new potters/children_and_pets.md.
//
//   number   as people there write it; tel for the link (E.164, or the short
//            number where it is dialled as it is, with # written %23)
//   also     another number for the same line, as written; alsoTel, where
//            given, its link (Morocco's poison centre's 0801 number answers
//            only in Morocco, its other number from anywhere)
//   who      'public', or 'children' where only children's calls are taken

const CHECKED = '2026-10-08';
const line = (name, number, tel, status, source, extra = {}) => ({
  name,
  number,
  tel,
  who: 'public',
  status,
  source,
  checked: CHECKED,
  ...extra
});
const EU_112 = line('Emergency', '112', '112', 'verified', 'https://digital-strategy.ec.europa.eu/en/policies/112', {
  note: 'Free from any phone in the EU.'
});

const SAFETY = {
  US: {
    emergency: [
      line(
        'Emergency',
        '911',
        '911',
        'verified',
        'https://911info.wa.gov/uploads/1/5/3/3/153301440/international_visitor_messaging_for_translations_es-us.pdf'
      )
    ],
    poison: [
      line('Poison Help', '1-800-222-1222', '+18002221222', 'verified', 'https://poisoncenters.org/', {
        hours: '24/7, free',
        note: 'Connects you to your regional poison center.',
        online: { name: 'webPOISONCONTROL', url: 'https://www.poison.org/' }
      })
    ],
    animals: [
      line(
        'ASPCA Animal Poison Control',
        '(888) 426-4435',
        '+18884264435',
        'verified',
        'https://www.aspca.org/pet-care/animal-poison-control',
        { hours: '24/7', fee: 'A fee may apply.' }
      ),
      line('Pet Poison Helpline', '(855) 764-7661', '+18557647661', 'verified', 'https://www.petpoisonhelpline.com/', {
        hours: '24/7',
        fee: '$89 per incident.'
      })
    ]
  },
  GB: {
    emergency: [line('Emergency', '999', '999', 'verified', 'https://www.nhs.uk/conditions/poisoning/')],
    advice: [
      line('NHS 111', '111', '111', 'verified', 'https://www.nhs.uk/conditions/poisoning/', {
        note: 'There is no public poisons line in the UK: NHS 111 (NHS 24 in Scotland) gives advice, and 999 is for an emergency.'
      })
    ],
    poison: [],
    animals: [
      line('Animal PoisonLine', '01202 509 000', '+441202509000', 'verified', 'https://www.animalpoisonline.co.uk/', {
        hours: '24 hours',
        fee: '£35 weekdays 8am to 8pm, £45 at other times.'
      })
    ]
  },
  AU: {
    emergency: [line('Emergency', '000', '000', 'verified', 'https://www.healthdirect.gov.au/poisoning')],
    poison: [
      line(
        'Poisons Information Centre',
        '13 11 26',
        '131126',
        'verified',
        'https://www.healthdirect.gov.au/poisoning',
        {
          hours: '24 hours, Australia-wide'
        }
      )
    ],
    animals: [
      line('Animal Poisons Helpline', '1300 869 738', '1300869738', 'verified', 'https://animalpoisons.com.au/', {
        hours: '24/7',
        fee: 'From $75 AUD.'
      })
    ]
  },
  NZ: {
    emergency: [
      line(
        'Emergency',
        '111',
        '111',
        'verified',
        'https://www.newzealand.com/au/feature/new-zealand-emergency-information-and-contacts/'
      )
    ],
    poison: [
      line('National Poisons Centre', '0800 764 766', '0800764766', 'verified', 'https://www.poisons.co.nz/', {
        hours: '24/7, free'
      })
    ],
    animals: [
      line('Animal Poisons Helpline', '0800 869 738', '0800869738', 'verified', 'https://animalpoisons.com.au/', {
        fee: 'Charges apply.',
        note: 'Or call your vet.'
      })
    ]
  },
  AT: {
    emergency: [EU_112],
    poison: [
      line(
        'Vergiftungsinformationszentrale (VIZ)',
        '01 406 43 43',
        '+4314064343',
        'verified',
        'https://goeg.at/Vergiftungsinformation',
        {
          hours: '24 hours'
        }
      )
    ],
    advice: [line('Gesundheitsnummer 1450', '1450', '1450', 'verified', 'https://1450.at/')]
  },
  BE: {
    emergency: [EU_112],
    poison: [
      line(
        'Antigifcentrum / Centre Antipoisons',
        '070 245 245',
        '+3270245245',
        'verified',
        'https://www.centreantipoisons.be/a-propos-de-nous/',
        {
          hours: '24/7, free',
          animals: 'Pet questions weekdays 8:00 to 16:00, weekends 10:00 to 16:00.'
        }
      )
    ]
  },
  BG: {
    emergency: [EU_112],
    poison: [
      line(
        'Emergency number for poisonings',
        '+359 2 9154 233',
        '+35929154233',
        'unverified',
        'https://www.moew.government.bg/en/prevention/chemicals/classification-clp/emergency-number/',
        { note: 'Listed as an "emergency number/fax"; whether the public may call it is not stated.' }
      )
    ]
  },
  HR: {
    emergency: [EU_112],
    poison: [
      line(
        'Centar za kontrolu otrovanja',
        '01 2348 342',
        '+38512348342',
        'verified',
        'https://www.imi.hr/hr/centar-za-kontrolu-otrovanja/',
        {
          hours: '24 hours'
        }
      )
    ]
  },
  CY: { emergency: [EU_112], poison: [line('Poison centre', '1401', '1401', 'unverified', '')] },
  CZ: {
    emergency: [EU_112],
    poison: [
      line(
        'Toxikologické informační středisko',
        '224 91 92 93',
        '+420224919293',
        'verified',
        'https://tis-cz.cz/index.php/informace-o-stredisku/kontakty',
        {
          hours: '24 hours',
          animals: 'Also for animals.',
          also: '224 91 54 02'
        }
      )
    ]
  },
  DK: {
    emergency: [EU_112],
    poison: [
      line(
        'Giftlinjen',
        '82 12 12 12',
        '+4582121212',
        'verified',
        'https://www.sundhed.dk/borger/patienthaandbogen/akutte-sygdomme/foerstehjaelp/forgiftninger/naar-dit-barn-har-spist-giftige-planter/',
        { hours: '24 hours' }
      )
    ]
  },
  EE: {
    emergency: [EU_112],
    poison: [
      line('Mürgistusteabekeskus', '16662', '16662', 'verified', 'https://www.16662.ee/', {
        hours: '24/7, in Estonian, Russian and English',
        note: 'From abroad: +372 794 3794.'
      })
    ]
  },
  FI: {
    emergency: [EU_112],
    poison: [
      line(
        'Myrkytystietokeskus',
        '0800 147 111',
        '0800147111',
        'verified',
        'https://www.hus.fi/en/patient/hospitals-and-other-units/poison-information-center',
        {
          hours: '24 hours, free',
          also: '09 471 977'
        }
      )
    ],
    advice: [line('Medical helpline 116117', '116117', '116117', 'verified', 'https://www.116117.fi/')]
  },
  FR: {
    emergency: [EU_112],
    poison: [
      ['Paris', '01 40 05 48 48', '+33140054848', 'Île-de-France and overseas'],
      ['Angers', '02 41 48 21 21', '+33241482121', 'Bretagne, Centre-Val de Loire, Normandie, Pays de la Loire'],
      // The CHU de Bordeaux's page for its poison centre says it covers Aquitaine and Poitou-Charentes:
      // https://www.chu-bordeaux.fr/Les-services/Centre-Anti-Poison-et-de-toxicologie/D%C3%A9couvrir/
      ['Bordeaux', '05 56 96 40 80', '+33556964080', 'Aquitaine, Poitou-Charentes'],
      ['Lille', '08 00 59 59 59', '0800595959', 'Hauts-de-France'],
      ['Lyon', '04 72 11 69 11', '+33472116911', 'Auvergne-Rhône-Alpes'],
      ['Marseille', '04 91 75 25 25', '+33491752525', "Provence-Alpes-Côte d'Azur, Corse"],
      ['Nancy', '03 83 22 50 50', '+33383225050', 'Grand Est, Bourgogne-Franche-Comté'],
      ['Toulouse', '05 61 77 74 47', '+33561777447', 'Occitanie']
    ].map(([city, number, tel, regions]) =>
      line('Centre antipoison, ' + city, number, tel, 'verified', 'https://centres-antipoison.net/', {
        hours: '24/7',
        area: regions
      })
    ),
    animals: [
      line('CNITV (Lyon)', '04 78 87 10 40', '+33478871040', 'verified', 'https://www.cnitv.fr/Contact', {
        hours: '08:30 to midnight'
      }),
      line('CAPAE-Ouest (Nantes)', '02 40 68 77 40', '+33240687740', 'verified', 'https://www.cnitv.fr/Contact', {
        hours: '08:30 to midnight',
        fee: 'Free.'
      })
    ]
  },
  DE: {
    emergency: [EU_112],
    poison: [
      ['Berlin', '030 19240', '+493019240', 'Berlin, Brandenburg'],
      ['Bonn', '0228 19240', '+4922819240', 'Nordrhein-Westfalen'],
      ['Erfurt', '0361 730 730', '+49361730730', 'Mecklenburg-Vorpommern, Sachsen, Sachsen-Anhalt, Thüringen'],
      ['Freiburg', '0761 19240', '+4976119240', 'Baden-Württemberg'],
      ['Göttingen', '0551 19240', '+4955119240', 'Bremen, Hamburg, Niedersachsen, Schleswig-Holstein'],
      ['Mainz', '06131 19240', '+49613119240', 'Rheinland-Pfalz, Hessen, Saarland'],
      ['München', '089 19240', '+498919240', 'Bayern']
    ].map(([city, number, tel, states]) =>
      line(
        'Giftnotruf ' + city,
        number,
        tel,
        'verified',
        'https://www.bvl.bund.de/DE/Arbeitsbereiche/01_Lebensmittel/03_Verbraucher/09_InfektionenIntoxikationen/02_Giftnotrufzentralen/lm_LMVergiftung_giftnotrufzentralen_node.html',
        { hours: '24 hours', area: states }
      )
    ),
    advice: [line('Ärztlicher Bereitschaftsdienst 116117', '116117', '116117', 'verified', 'https://www.116117.de/')]
  },
  GR: {
    emergency: [EU_112],
    poison: [
      line(
        'Κέντρο Δηλητηριάσεων',
        '210 779 3777',
        '+302107793777',
        'verified',
        'https://www.moh.gov.gr/articles/health/dieythynsh-dhmosias-ygieinhs/metadotika-kai-mh-metadotika-noshmata/c388-egkyklioi/12444-enhmerwsh-toy-koinoy-sxetika-me-dhlhthriash-apo-aithyloglykolh-parafloy'
      )
    ]
  },
  HU: {
    emergency: [EU_112],
    poison: [
      line(
        'Egészségügyi Toxikológiai Tájékoztató Szolgálat (ETTSZ)',
        '06 80 20 11 99',
        '+3680201199',
        'verified',
        'https://nngyk.gov.hu/hu/veszelyes-novenyek/mergezo-novenyek.html',
        {
          hours: 'Day and night, free'
        }
      )
    ]
  },
  IE: {
    emergency: [EU_112],
    poison: [
      line(
        'National Poisons Information Centre',
        '01 809 2166',
        '+35318092166',
        'verified',
        'https://www.poisons.ie/',
        {
          hours: '8am to 10pm only',
          note: 'Outside those hours, call your doctor, or 112 or 999 in an emergency.'
        }
      )
    ]
  },
  IT: {
    emergency: [EU_112],
    poison: [
      line(
        'Centro Antiveleni Milano Niguarda',
        '02 6610 1029',
        '+390266101029',
        'verified',
        'https://www.centroantiveleni.org/',
        {
          hours: '24/7',
          animals: 'Also for animals.'
        }
      ),
      line(
        'Centro Antiveleni Pavia',
        '0382 24444',
        '+39038224444',
        'verified',
        'https://www.icsmaugeri.it/centro-antiveleni-cav-cnit',
        {
          hours: '24/7'
        }
      ),
      line(
        'Centro Antiveleni Bergamo',
        '800 883300',
        '800883300',
        'verified',
        'https://www.asst-pg23.it/2021/04/centro-antiveleni-nuovo-traguardo-500mila-consulenze',
        {
          hours: '24 hours, free'
        }
      ),
      line(
        'Centro Antiveleni Roma Gemelli',
        '06 305 4343',
        '+39063054343',
        'verified',
        'https://www.policlinicogemelli.it/centri-specializzati/centro-antiveleni/',
        {
          hours: '24/7',
          animals: 'Also for animals.'
        }
      )
    ]
  },
  LV: {
    emergency: [EU_112],
    poison: [
      line(
        'Saindēšanās un zāļu informācijas centrs',
        '67042473',
        '+37167042473',
        'verified',
        'https://aslimnica.lv/stacionari/gailezers/intensivas-terapijas-klinika/saindesanas-un-zalu-informacijas-centrs/',
        { hours: '24 hours' }
      )
    ]
  },
  LT: { emergency: [EU_112], poison: [line('Poison centre', '+370 5 236 2052', '+37052362052', 'unverified', '')] },
  LU: {
    emergency: [EU_112],
    poison: [
      line('Centre Antipoisons (Belgium)', '8002 5500', '80025500', 'verified', 'https://www.centreantipoisons.be/', {
        hours: '24 hours, free'
      })
    ]
  },
  MT: {
    emergency: [EU_112],
    poison: [
      // The centre's own pages give 08:00 to 20:00 for the public; EAPCCT's chart says 24 hours,
      // which holds only for doctors.
      line('Malta National Poisons Centre', '1774', '1774', 'verified', 'https://mnpc.gov.mt/en/faqs/general-faqs/', {
        hours: '08:00 to 20:00, every day',
        note: 'Outside those hours, go to a health centre or an emergency department.'
      })
    ]
  },
  NL: {
    emergency: [EU_112],
    poison: [],
    advice: [
      line('Your GP, or the out-of-hours GP post', '', '', 'verified', 'https://nvic.umcutrecht.nl/nvic/nl/', {
        note: 'There is no public poisons line in the Netherlands: the NVIC takes calls from professionals only.'
      })
    ]
  },
  PL: {
    emergency: [EU_112],
    poison: [
      line(
        'Ośrodek Informacji Toksykologicznej, Kraków',
        '12 411 99 99',
        '+48124119999',
        'verified',
        'https://www.su.krakow.pl/jednostki/oddzialy-kliniczne/oddzial-kliniczny-gastroenterologii-hepatologii-toksykologii-i-chorob-wewnetrznych',
        { hours: '24 hours' }
      )
    ]
  },
  PT: {
    emergency: [EU_112],
    poison: [
      line(
        'CIAV',
        '800 250 250',
        '800250250',
        'verified',
        // Read on SNS 24, the health ministry's portal; INEM's own page (with the
        // hours) answered only with a bot check, so the hours are left out.
        'https://www.sns24.gov.pt/pt/tema/intoxicacoes-e-envenenamentos/intoxicacoes/como-agir-em-caso-de-intoxicacao/'
      )
    ]
  },
  RO: {
    emergency: [EU_112],
    poison: [
      line('TOXAPEL', '021 210 62 82', '+40212106282', 'verified', 'https://www.spitaluldecopii.ro/', {
        who: 'children',
        hours: 'Non-stop',
        note: 'For children only; no line for adults was found.'
      })
    ]
  },
  SK: {
    emergency: [EU_112],
    poison: [
      line(
        'Národné toxikologické informačné centrum',
        '02/54 77 41 66',
        '+421254774166',
        'verified',
        'https://www.ntic.sk/',
        {
          hours: '24/7',
          animals: 'Also for animals.',
          also: '+421 911 166 066'
        }
      )
    ]
  },
  SI: {
    emergency: [EU_112],
    poison: [],
    advice: [
      line('Your own or duty doctor', '', '', 'verified', 'https://ktf.si/prva-pomoc/', {
        note: 'There is no public poisons line in Slovenia: the centre takes calls from professionals only.'
      })
    ]
  },
  ES: {
    emergency: [EU_112],
    poison: [
      line(
        'Servicio de Información Toxicológica',
        '91 562 04 20',
        '+34915620420',
        'verified',
        'https://www.mjusticia.gob.es/es/institucional/organismos/instituto-nacional/servicios/servicio-informacion/servicio-informacion1',
        { hours: '24 hours, every day' }
      )
    ]
  },
  SE: {
    emergency: [EU_112],
    poison: [
      line('Giftinformationscentralen', '010-456 6700', '+46104566700', 'verified', 'https://giftinformation.se/', {
        hours: '24 hours',
        note: 'When it is acute, call 112 and ask for Giftinformation; this number is for less urgent questions.'
      })
    ],
    advice: [line('1177 Vårdguiden', '1177', '1177', 'verified', 'https://www.1177.se/')]
  },
  // Japan (research_notes/Asia/japan-verification-2026-10-14.md). The Japan Poison Information
  // Center's two public lines take only acute poisoning that has actually happened, not
  // long-term (chronic) exposure, which the centre names as including work injuries. Its
  // medical lines are for professionals and are left out.
  JP: {
    emergency: [
      line(
        'Emergency',
        '119',
        '119',
        'verified',
        'https://www.fdma.go.jp/mission/enrichment/kyukyumusen_kinkyutuhou/119.html',
        { checked: '2026-10-12', note: 'Ambulance and fire.' }
      )
    ],
    poison: [
      ['Osaka', '大阪中毒110番', '072-727-2499', '+81727272499'],
      ['Tsukuba', 'つくば中毒110番', '029-852-9999', '+81298529999']
    ].map(([city, own, number, tel]) =>
      line(
        'Japan Poison Information Center, ' + city + ' (' + own + ')',
        number,
        tel,
        'verified',
        'https://www.j-poison-ic.jp/110serviece/service-guide-genelal/',
        {
          checked: '2026-10-14',
          hours: '24 hours, every day, free',
          note: 'Only for acute poisoning that has actually happened, such as a swallowed glaze; not for long-term exposure, such as dust at work.'
        }
      )
    ),
    // #8000 (read on 2026-10-19): MHLW's notice 医政地発0418第1号 (2018-04-18,
    // https://www.mhlw.go.jp/topics/2006/10/dl/tp1010-3.pdf) speaks of the "医師、看護師等" working in it,
    // run by each prefecture; MHLW's table (as of 令和８年５月22日) still says every prefecture runs it
    // after midnight. Its cost is not on MHLW's pages; Shiga's and Osaka's say the advice is free and
    // the caller pays for the call ("相談は無料ですが通話料金は利用者負担",
    // https://www.pref.shiga.lg.jp/ippan/kenkouiryouhukushi/iryo/349808.html;
    // https://www.pref.osaka.lg.jp/o100030/iryo/syouni-qq/syouni_qq_tel.html), two prefectures of 47, so
    // the note says the prefectures' pages say so.
    advice: [
      line(
        "Children's medical advice line (子ども医療電話相談)",
        '#8000',
        '%238000',
        'verified',
        'https://www.mhlw.go.jp/topics/2006/10/tp1010-3.html',
        {
          who: 'children',
          checked: '2026-10-19',
          note: "Medical advice about a child, by phone, from nurses or doctors. Hours vary by prefecture; in every prefecture it runs after midnight. The prefectures' pages we read say the advice is free and the caller pays for the call."
        }
      )
    ]
  },
  // Türkiye (research_notes/Asia/turkey-verification-2026-10-14.md). 112 is the one number
  // for every emergency service. The Ministry of Health's UZEM page
  // (https://www.saglik.gov.tr/TR-99659/ulusal-zehir-danisma--merkezi-uzem.html) leads to tel:114,
  // and a ministry hospital's page gives 114 and its hours (7/24,
  // https://divrigisadikozgurdh.saglik.gov.tr/TR-389626/alo-114.html). On 2026-10-19 the ministry's
  // own UZEM pages (hsgm.saglik.gov.tr) did not answer, so the rest is from other official pages:
  // free, Pamukkale's district governorate (İlçe Hıfzıssıhha Kurulu decision of 2024-10-03,
  // https://pamukkalekaymakamligi.gov.tr/mantar-zehirlenmeleriyle-ilgili-ilce-hifzissihha-kurul-karari:
  // "ücretsiz olarak kullanılan 114 nolu telefon hattı"); for the public as well as health workers, 24
  // hours, a family health centre's page (the source) and Amasya's provincial governorate ("7 gün 24
  // saat kesintisiz hizmet ... vatandaşlar 114 numaralı Ulusal Zehir Danışma Merkezi'ni
  // arayabilmektedir"); and the number in BTK's list of short numbers ("114 SAĞLIK BAKANLIĞI Zehir
  // Danışma", https://www.btk.gov.tr/uploads/ntsfiles/KN.pdf). No page limits who may call. The unit
  // that runs it is named differently over the years, so only the ministry is named.
  TR: {
    emergency: [
      line('Emergency', '112', '112', 'verified', 'https://www.112.gov.tr/hakkimizda', {
        checked: '2026-10-14',
        note: 'One number for ambulance, fire, police, gendarmerie and coast guard.'
      })
    ],
    poison: [
      line(
        'National Poison Information Centre (Ulusal Zehir Danışma Merkezi, UZEM)',
        '114',
        '114',
        'verified',
        'https://www.havuzlarasm.gov.tr/114-zehir-danisma-merkezi',
        { checked: '2026-10-19', hours: '24 hours, every day, free', note: 'For the public and for health workers.' }
      )
    ]
  },
  // South Korea (research_notes/Asia/verification-KR-TW-SG-MY-2026-10-16.md). No official page
  // gives a national public poison line: the National Emergency Medical Center's portal
  // (https://www.e-gen.or.kr/egen/toxic_chemicals_addicted.do) says to check with 119, and its
  // poison service is for clinicians only. The Seoul Poison Control Center (weekdays, Seoul only)
  // is known only from a journal report, so it is left out until an official page is read. Read
  // again on 2026-10-19, with no change: E-Gen's poisoning page says "잘 모르거나 증상이 있으면 119에
  // 확인 한다", and NEMC's 중독정보시스템 (https://erpoison.nemc.or.kr/) takes requests only from the
  // clinicians treating a patient in an emergency room. 1342 and the 중독관리통합지원센터 are addiction
  // services, not poison information.
  // 119's medical advice is from the Ministry of Health and Welfare's release of 2013-06-21,
  // when 119 took over the old 1339 line.
  KR: {
    emergency: [
      line('Emergency', '119', '119', 'verified', 'https://world.seoul.go.kr/service/living/medical-facilities/', {
        checked: '2026-10-13',
        note: 'Fire, rescue and ambulance; the ambulance is free.'
      })
    ],
    poison: [],
    advice: [
      line(
        '119 emergency medical advice (응급의료상담)',
        '119',
        '119',
        'verified',
        'https://mohw.go.kr/board.es?act=view&bid=0027&cg_code=&list_no=287774&mid=a10503010100&tag=',
        {
          checked: '2026-10-16',
          hours: '24 hours',
          note: 'We found no national public poison line in South Korea: 119 also gives emergency medical advice, around the clock.'
        }
      )
    ]
  },
  // Taiwan (research_notes/Asia/verification-KR-TW-SG-MY-2026-10-16.md). 119's page (內政部消防署)
  // read with its body text; police (110) are left out, as Japan's are. The poison centre is run
  // by Taipei Veterans General Hospital, not by the ministry: its contact page gives the number and
  // 24 hours, and its page https://www.pcc-vghtpe.tw/active-detail1259.htm says the service is free
  // and all year round (全天候且全年無休的免費諮詢服務). Its other number's extension (85500 or
  // 85519) was not resolved, so only the main number is given.
  TW: {
    emergency: [
      line('Emergency', '119', '119', 'verified', 'https://www.nfa.gov.tw/cht/index.php?code=list&ids=66', {
        checked: '2026-10-16',
        note: 'Fire and ambulance, 24 hours. If a mobile call to 119 will not go through, dial 112, which works on any network, even without a SIM card; then press 9 for 119.'
      })
    ],
    poison: [
      line(
        'Poison Control Center, Taipei Veterans General Hospital (臺北榮總毒藥物防治諮詢中心)',
        '02-2871-7121',
        '+886228717121',
        'verified',
        'https://www.pcc-vghtpe.tw/contact.htm',
        { checked: '2026-10-16', hours: '24 hours, every day, free' }
      )
    ]
  },
  // Singapore (research_notes/Asia/verification-KR-TW-SG-MY-2026-10-16.md). 995 read on SCDF's
  // page on 2026-10-16; police (999) are left out, as Japan's are. No public poison line is on an
  // official page: the numbers in directories (6423 9119) and a 2004–2008 pilot are not shown,
  // nor NurseFirst (a non-official page only), so the health ministry is linked.
  SG: {
    emergency: [
      line('Emergency', '995', '995', 'verified', 'https://www.scdf.gov.sg/', {
        checked: '2026-10-16',
        note: 'Fire, rescue and emergency ambulance (SCDF). Or SMS 70995.'
      })
    ],
    poison: []
  },
  // Malaysia (research_notes/Asia/verification-KR-TW-SG-MY-2026-10-16.md). 999 (MERS) for police,
  // fire and rescue and the ambulance, read on the government portal on 2026-10-12 (script-rendered
  // on 2026-10-16). 112 from a mobile is on no official page read, so it is not given. The National
  // Poison Centre is a university centre (USM), not a ministry service: its page, read again on
  // 2026-10-16, gives the number, its hours and Telegram, and says most calls come from hospitals and
  // clinics, some from households and workplaces. It does not say the call is free, so that is not said.
  MY: {
    emergency: [
      line(
        'Emergency',
        '999',
        '999',
        'verified',
        'https://www.malaysia.gov.my/en/categories/safety-and-community/public-safety/mers-999-emergency-line',
        { checked: '2026-10-12', note: 'Police, fire and rescue, and ambulance (MERS 999). Only for real emergencies.' }
      )
    ],
    poison: [
      line(
        'National Poison Centre (Pusat Racun Negara)',
        '04-6536 999',
        '+6046536999',
        'verified',
        'https://prn.usm.my/index.php/servicesv2/dpis',
        {
          checked: '2026-10-16',
          hours: 'Monday to Friday 8:00 to 22:00; weekends and public holidays 8:00 to 17:00',
          note: 'Run by Universiti Sains Malaysia. Most calls come from hospitals and clinics, and some from households and workplaces. Outside those hours, call 999 in an emergency.',
          online: { name: 'Telegram', url: 'https://t.me/usm_prn_bot' }
        }
      )
    ]
  },
  // China (research_notes/Asia/regions-CN-HK-ID-TH-VN-PH-2026-10-16.md). 110, 119 and 120 read on the
  // Shanghai government's English page; the national ministries' sites refuse automated reading. The
  // health commission's site (nhc.gov.cn) could not be read, so no ministry is linked.
  // The national poison hotline (全国中毒咨询热线), read on 2026-10-19: China CDC's own article of
  // 2025-08-26, by its occupational health and poison control institute (NIOHP), gives
  // "中国疾病预防控制中心中毒咨询热线：010-83132345" and tells the public to call it if needed
  // ("必要时紧急就医或求助中毒咨询热线"), so the number, its 010 area code and public use are verified;
  // NIOHP's FAQ (https://niohp.chinacdc.cn/zdzx/) and its antidote list (Beijing, 010-83132345) agree.
  // No official page gives its hours, whether it answers at night, or its cost, so the note says so.
  CN: {
    emergency: [
      line(
        'Emergency',
        '120',
        '120',
        'verified',
        'https://english.shanghai.gov.cn/en-EmergencyNumbers/20241210/cbc5280b9f96440a93234bfc5e0c1023.html',
        { checked: '2026-10-16', note: 'Ambulance and medical emergencies. For a fire, call 119; for the police, 110.' }
      )
    ],
    poison: [
      line(
        'National poison information hotline, China CDC (全国中毒咨询热线)',
        '010-83132345',
        '+861083132345',
        'verified',
        'https://www.chinacdc.cn/jkkp/zyjk/zdzs/202508/t20250826_309858.html',
        {
          checked: '2026-10-19',
          note: "Run by China CDC's National Institute for Occupational Health and Poison Control, in Beijing. No official page gives its hours or its cost; in an emergency, call 120."
        }
      )
    ]
  },
  // Hong Kong (the same notes). 999 read on the government's HK Talent Engage page (police, fire and
  // ambulance). The Hong Kong Poison Information Centre (United Christian Hospital; folded into the
  // Hospital Authority's Hong Kong Poison Control Centre in 2023) gives its advice to health care
  // professionals (LegCo paper, 2007) and publishes no public number, so no poison line is shown and
  // the Department of Health is linked.
  HK: {
    emergency: [
      line(
        'Emergency',
        '999',
        '999',
        'verified',
        'https://www.hkengage.gov.hk/en/essentials/basics/emergency-ambulance-services',
        { checked: '2026-10-16', note: 'Police, fire services and ambulance.' }
      )
    ],
    poison: []
  },
  // Indonesia (the same notes). The numbers read on the Ministry of Tourism's site; 119 is the
  // Ministry of Health's medical emergency service (kemkes.go.id, 2024), which states no hours or
  // cost. 118 is the older emergency ambulance number (Ambulans Gawat Darurat 118, national since 1995),
  // which the Ministry of Tourism still lists beside 119 but which has closed in some cities, so the note
  // says only some. HALOBPOM (1500533) was said to take poisoning calls 24 hours only on a 2014 BPOM page, when
  // its number was 500533; that is not confirmed now, so no poison line is shown.
  ID: {
    emergency: [
      line(
        'Emergency',
        '119',
        '119',
        'verified',
        'https://www.indonesia.travel/au/en/general-information/staying-safe-in-indonesia',
        {
          checked: '2026-10-16',
          note: 'Ambulance and medical emergencies. 118 also reaches an ambulance in some cities. For the police, call 110 (or 112 from a mobile); for a fire, 113.'
        }
      )
    ],
    poison: []
  },
  // Thailand (the same notes). 1669, 191 and 199 read on the Ministry of Foreign Affairs' page, which
  // calls 191 "General Emergency" (not the police alone, so the note does not say police)
  // (2025); the emergency medicine institute's own site (niems.go.th) refused the connection. The
  // Ramathibodi Poison Center is a university hospital's centre: its contact page, in the menu for the
  // public, gives 1367 around the clock; it says nothing of cost, so that is not said.
  TH: {
    emergency: [
      line('Emergency', '1669', '1669', 'verified', 'https://www.mfa.go.th/en/content/eq2', {
        checked: '2026-10-16',
        note: 'Emergency medical services. For other emergencies, call 191; for a fire, 199.'
      })
    ],
    poison: [
      line(
        'Ramathibodi Poison Center (ศูนย์พิษวิทยารามาธิบดี)',
        '1367',
        '1367',
        'verified',
        'https://www.rama.mahidol.ac.th/poisoncenter/th/contactus',
        {
          checked: '2026-10-16',
          hours: '24 hours, every day',
          note: 'Run by the Faculty of Medicine Ramathibodi Hospital, Mahidol University.',
          online: { name: 'LINE (@rpc1367)', url: 'https://page.line.me/749ilrut?openQrModal=true' }
        }
      )
    ]
  },
  // Vietnam (research_notes/Asia/region-VN-2026-10-17.md). 113 (police), 114 (fire and rescue) and 115
  // (medical emergencies). Shown as reported from 2026-10-17 (owner's decision), then read with their
  // roles on official pages on 2026-10-19: Điện Biên's provincial police (Ministry of Public Security),
  // 2025-12-16, the source: "113 – Lực lượng Công an …", "114 – Cảnh sát phòng cháy, chữa cháy và cứu
  // nạn, cứu hộ …", "115 – Cấp cứu y tế …", and that calls to emergency numbers are free under the
  // Telecommunications Law ("hoàn toàn miễn phí"), dialled without an area code; and Da Nang's city
  // portal (https://danang.gov.vn/en/so-dien-thoai-can-biet, 2017): 113 Công an, 114 Cứu hỏa, 115 Cấp
  // cứu Y tế. So the status is verified, as Korea's 119 is on Seoul's page. Merger: Tuyên Quang's
  // commune portal (2026-08-10,
  // https://minhthanh.tuyenquang.gov.vn/vi/tin-bai/tich-hop-cac-so-dien-thoai-khan-cap-113-114-115-thanh-mot-tong-dai-113-duy-nhat?type=NEWS&id=249302)
  // gives a provincial plan: the systems joined in 2026, the single 113 launched in 2027–2028, and
  // while that happens people may still call 113, 114 and 115. Bạch Mai Hospital's Poison Control
  // Centre lists a phone number (0869 587 705), but not its hours or whether it is an advice line for
  // the public, so no poison line is shown; the health ministry's site (moh.gov.vn) did not answer, so
  // none is linked.
  VN: {
    emergency: [
      line(
        'Emergency',
        '115',
        '115',
        'verified',
        'https://congan.dienbien.gov.vn/Danh-muc-tin-tuc/tong-hop-cac-so-dien-thoai-khan-cap-quoc-gia-ghi-nho-de-bao-ve-minh-va-ho-tro-nguoi-khac-13182.html',
        {
          checked: '2026-10-19',
          note: 'Medical emergencies; the call is free. For the police, call 113; for a fire or a rescue, 114. These numbers are being merged into 113, with the single number planned for 2027–2028; until then, all three still work.'
        }
      )
    ],
    poison: []
  },
  // The Philippines (the same notes). 911 read on the Department of the Interior and Local
  // Government's regional page (2025-09-05): one number for police, fire, medical and disaster
  // response, free and 24/7. The National Poison Management and Control Center (Philippine General
  // Hospital): its number is in the hospital's Citizen's Charter (updated 2024-01-22), whose service 4
  // is a 24/7 phone consultation for lay persons as well as health workers, with no fee; University of
  // the Philippines Manila's page (2024-07-02) gives the same number for poisonings.
  PH: {
    emergency: [
      line(
        'Emergency',
        '911',
        '911',
        'verified',
        'https://calabarzon.dilg.gov.ph/one-number-for-all-emergencies-unified-911-to-launch-nationwide/',
        { checked: '2026-10-16', note: 'Police, fire, medical and disaster response; free, 24 hours.' }
      )
    ],
    poison: [
      line(
        'National Poison Management and Control Center (UP-PGH)',
        '(02) 8524 1078',
        '+63285241078',
        'verified',
        'https://www.pgh.gov.ph/wp-content/uploads/2025/05/UP-PGH-Citizens-Charter-Handbook-Updated-January-22-2024.pdf',
        {
          checked: '2026-10-16',
          hours: '24 hours, every day, free',
          note: 'Run by the Philippine General Hospital, University of the Philippines Manila.'
        }
      )
    ]
  },
  // India (scratch/round6/research/in-pk-bd.md). 112 (ERSS) read on 112.gov.in's FAQ and About pages
  // and the Ministry of Home Affairs' ERSS page, in the Internet Archive's copies of 2026-05-11 and
  // 2026-04-10, since both sites refused the connection: one number for police, fire and ambulance in
  // every state and union territory, free; the About page says 100, 101 and 108 "will be integrated"
  // into it. The National Poisons Information Centre's own pages at AIIMS give the toll-free number,
  // 24 hours a day, every day, and say it advises the general public as well as health workers; the
  // health ministry's list of poison centres (NCDC, archived 2025-12-07) gives the same numbers.
  IN: {
    emergency: [
      line('Emergency', '112', '112', 'verified', 'https://www.112.gov.in/faq', {
        checked: '2026-10-19',
        note: 'One number for police, fire and ambulance, free, in every state and union territory. The older numbers 100 (police), 101 (fire) and 108 (ambulance) are to be joined to it.'
      })
    ],
    poison: [
      line(
        'National Poisons Information Centre (NPIC), AIIMS New Delhi',
        '1800 116 117',
        '1800116117',
        'verified',
        'https://aiims.edu/index.php/en/npic_intro',
        {
          checked: '2026-10-19',
          hours: '24 hours, every day, toll free',
          also: '011 2658 9391',
          alsoTel: '+911126589391',
          note: 'Run by the All India Institute of Medical Sciences for the whole country. It advises the public as well as health workers.'
        }
      )
    ]
  },
  // Pakistan (the same notes). Emergency services are run by each province. Rescue 1122's own site is
  // Punjab's Emergency Services Department: ambulance, rescue and fire in all its districts, with
  // expansion to the other provinces "rapidly underway"; Khyber Pakhtunkhwa's Rescue 1122 works in 34
  // districts (APP, the state news agency, 2025-11-24: secondary). One entry, with the provinces in its
  // note (lead's decision, 2026-10-20). Police 15 is read on Punjab Police's pages only, so the note
  // gives it for Punjab. No poison line was found on any official page, so the health ministry is linked.
  PK: {
    emergency: [
      line('Emergency', '1122', '1122', 'verified', 'https://www.rescue.gov.pk/AmbulanceService.aspx', {
        checked: '2026-10-19',
        note: 'Ambulance, rescue and fire. Each province runs its own Rescue 1122 service; it began in Punjab. In Punjab, call 15 for the police.'
      })
    ],
    poison: []
  },
  // Bangladesh (the same notes). 999 read on the national portal as the national emergency service
  // (জরুরি সেবা) and on the Fire Service's site among its toll-free hotlines, beside its own 102. That
  // it reaches the police, fire service and ambulance is only in the ICT Division's entry in the ITU's
  // WSIS list (secondary), so the note says where that comes from. No poison line is on any official
  // page, so the health directorate's 24-hour call centre is given as the medical advice line, not as
  // a poison line, and the ministry is linked.
  BD: {
    emergency: [
      line('Emergency', '999', '999', 'verified', 'https://bangladesh.gov.bd/', {
        checked: '2026-10-19',
        note: "The national emergency service; the call is free. It reaches the police, the fire service and an ambulance, as the government's entry in an ITU list describes it. For a fire, 102 also reaches the fire service."
      })
    ],
    poison: [],
    advice: [
      line('Health Call Centre (হেলথ কল সেন্টার)', '16263', '16263', 'verified', 'https://dghs.gov.bd/', {
        checked: '2026-10-19',
        hours: '24 hours',
        note: 'Health advice from the Directorate General of Health Services, 24 hours. It is not a poison line: we found no public poison line in Bangladesh.'
      })
    ]
  },
  // Egypt (scratch/round6/research/eg-ae-ma-dz.md). 123 read on the Egyptian Ambulance Authority's own
  // site (eao.gov.eg, its texts in /assets/i18n/en.json and ar.json): "call the toll-free number 123",
  // the ambulance free for all citizens and residents. 122 and 180 from Egypt's entries in ITU-T E.129
  // (2012), as the UK's travel advice gives them. 112 and 911, listed in E.129 as a unified number
  // (2023), are on no Egyptian page read, so they are not given. No poison line is shown: Ain Shams
  // University's Clinical Toxicology Center gives an office number but not its hours or that it advises
  // the public by phone, and no official page was found for Kasr Al Ainy's centre.
  EG: {
    emergency: [
      line('Emergency', '123', '123', 'verified', 'https://eao.gov.eg/', {
        checked: '2026-10-19',
        note: 'Ambulance; the call and the ambulance are free. For the police, call 122; for a fire, 180.'
      })
    ],
    poison: []
  },
  // The United Arab Emirates (the same notes). 998, 999 and 997 in the footer of the government portal
  // (u.ae) and on the Ajman government's page, "while anywhere in the UAE". No poison line is shown (the
  // owner's decision, 2026-10-20): Abu Dhabi's Poison and Drug Information Service is one emirate's,
  // and its current page describes it as support for health professionals. The federal ministry's site
  // refused the connection, so no ministry is linked.
  AE: {
    emergency: [
      line('Emergency', '998', '998', 'verified', 'https://u.ae/en/', {
        checked: '2026-10-19',
        note: 'Ambulance. For the police, call 999; for a fire, 997.'
      })
    ],
    poison: []
  },
  // Morocco (the same notes). 141 for medical emergencies, national and free, read on the national
  // tourist office's page (ONMT) and in Morocco's entries in ITU-T E.129 (2024-06-11), which give the
  // others. The Centre Anti Poison et de Pharmacovigilance du Maroc's own posters and brochures on its
  // site (capm-sante.ma, linked from the health ministry's site; capm.ma is no longer its domain) give
  // 0801 000 180 at the price of a local call, and 05 37 68 64 64, day and night every day, with a
  // doctor's advice free. The 0801 number is linked as dialled in Morocco, since such numbers may not
  // answer from abroad; the other in its international form.
  MA: {
    emergency: [
      line('Emergency', '141', '141', 'verified', 'https://www.visitmorocco.com/fr/informations-pratiques', {
        checked: '2026-10-19',
        note: 'Medical emergencies; free. For the police, call 19, or the Gendarmerie Royale on 177; for a fire, the civil protection service on 15 or 150.'
      })
    ],
    poison: [
      line(
        'Poison Control and Pharmacovigilance Centre of Morocco (Centre Anti Poison et de Pharmacovigilance du Maroc, CAPM)',
        '0801 000 180',
        '0801000180',
        'verified',
        'https://www.capm-sante.ma/uploads/documents/103.pdf',
        {
          checked: '2026-10-19',
          hours: '24 hours, every day',
          also: '05 37 68 64 64',
          alsoTel: '+212537686464',
          fee: 'The call costs the same as a local call; the advice is free.',
          note: 'A doctor judges how serious the poisoning is and gives first-aid advice.'
        }
      )
    ]
  },
  // Algeria (the same notes). 14 and 1021 for civil protection (Protection civile), 17 and 1548 for the
  // police, 1055 for the gendarmerie: Algeria's entries in ITU-T E.129 (2024-04-08) and the Ministry of
  // Post and Telecommunications as Radio Algérie reported it (2025-05-27). No official page read says
  // that 14 sends an ambulance, so the note says only civil protection. No poison line is shown:
  // Executive Decree 25-237 (JO 61, 2025-09-15) charges the Centre National de Toxicologie with
  // answering the public's calls day and night and with a free number, but no number has been
  // published on a page we could read. The health ministry's site refused the connection.
  DZ: {
    emergency: [
      line(
        'Emergency',
        '14',
        '14',
        'verified',
        'https://www.itu.int/net/itu-t/inrdb/e129_important_numbers.aspx?country=67&pg_size=50',
        {
          checked: '2026-10-19',
          note: 'Civil protection (Protection civile); also 1021. For the police, call 17 or 1548; for the gendarmerie, 1055.'
        }
      )
    ],
    poison: []
  }
};

// Each EU country's health ministry, linked where no public poison line could
// be confirmed (docs/i18n-plan.md, Phase 4): never a guessed number.
//
//   name     in its own language
//   url      its own home page, or its page on poisoning

// Lithuania's ministry site answered only with a bot check, so it is not linked.
const MINISTRIES = {
  AT: {
    name: 'Bundesministerium für Arbeit, Soziales, Gesundheit, Pflege und Konsumentenschutz',
    url: 'https://www.gesundheit.gv.at/krankheiten/vergiftungsinformation/vergiftung-vorgehen-notfall.html',
    status: 'verified',
    checked: CHECKED
  },
  BE: {
    name: 'FOD Volksgezondheid / SPF Santé publique',
    url: 'https://www.health.belgium.be/fr',
    status: 'verified',
    checked: CHECKED
  },
  BG: {
    name: 'Министерство на здравеопазването',
    url: 'https://www.mh.government.bg/',
    status: 'verified',
    checked: CHECKED
  },
  HR: { name: 'Ministarstvo zdravstva', url: 'https://zdravlje.gov.hr/', status: 'verified', checked: CHECKED },
  CY: { name: 'Υπουργείο Υγείας', url: 'https://www.gov.cy/moh/', status: 'verified', checked: CHECKED },
  CZ: { name: 'Ministerstvo zdravotnictví', url: 'https://mzd.gov.cz/', status: 'verified', checked: CHECKED },
  DK: { name: 'Sundheds- og Kirkeministeriet', url: 'https://www.ism.dk/', status: 'verified', checked: CHECKED },
  EE: { name: 'Sotsiaalministeerium', url: 'https://www.sm.ee/', status: 'verified', checked: CHECKED },
  FI: { name: 'Sosiaali- ja terveysministeriö', url: 'https://stm.fi/', status: 'verified', checked: CHECKED },
  FR: { name: 'Ministère chargé de la santé', url: 'https://sante.gouv.fr/', status: 'verified', checked: CHECKED },
  DE: {
    name: 'Bundesministerium für Gesundheit',
    url: 'https://www.bundesgesundheitsministerium.de/',
    status: 'verified',
    checked: CHECKED
  },
  GR: { name: 'Υπουργείο Υγείας', url: 'https://www.moh.gov.gr/', status: 'verified', checked: CHECKED },
  HU: {
    name: 'Egészségügyi Minisztérium',
    url: 'https://kormany.hu/kormanyzat/egeszsegugyi-miniszterium',
    status: 'verified',
    checked: CHECKED
  },
  IE: {
    name: 'Department of Health',
    url: 'https://www.gov.ie/en/department-of-health/',
    status: 'verified',
    checked: CHECKED
  },
  IT: { name: 'Ministero della Salute', url: 'https://www.salute.gov.it/', status: 'verified', checked: CHECKED },
  LV: { name: 'Veselības ministrija', url: 'https://www.vm.gov.lv/', status: 'verified', checked: CHECKED },
  LT: { name: 'Sveikatos apsaugos ministerija', url: 'https://sam.lrv.lt/lt/', status: 'unverified', checked: CHECKED },
  LU: {
    name: 'Ministère de la Santé et de la Sécurité sociale',
    url: 'https://m3s.gouvernement.lu/fr.html',
    status: 'verified',
    checked: CHECKED
  },
  MT: { name: 'Ministry for Health', url: 'https://health.gov.mt/', status: 'verified', checked: CHECKED },
  NL: {
    name: 'Ministerie van Volksgezondheid, Welzijn en Sport',
    url: 'https://www.rijksoverheid.nl/ministeries/ministerie-van-volksgezondheid-welzijn-en-sport',
    status: 'verified',
    checked: CHECKED
  },
  PL: { name: 'Ministerstwo Zdrowia', url: 'https://www.gov.pl/web/zdrowie', status: 'verified', checked: CHECKED },
  PT: {
    name: 'Ministério da Saúde',
    url: 'https://www.sns24.gov.pt/pt/tema/intoxicacoes-e-envenenamentos/intoxicacoes/como-agir-em-caso-de-intoxicacao/',
    status: 'verified',
    checked: CHECKED
  },
  RO: { name: 'Ministerul Sănătății', url: 'https://www.ms.ro/', status: 'verified', checked: CHECKED },
  SK: {
    name: 'Ministerstvo zdravotníctva Slovenskej republiky',
    url: 'https://www.health.gov.sk/',
    status: 'verified',
    checked: CHECKED
  },
  SI: {
    name: 'Ministrstvo za zdravje',
    url: 'https://www.gov.si/drzavni-organi/ministrstva/ministrstvo-za-zdravje/',
    status: 'verified',
    checked: CHECKED
  },
  ES: { name: 'Ministerio de Sanidad', url: 'https://www.sanidad.gob.es/', status: 'verified', checked: CHECKED },
  SE: {
    name: 'Socialdepartementet',
    url: 'https://www.regeringen.se/sveriges-regering/socialdepartementet/',
    status: 'verified',
    checked: CHECKED
  },
  JP: { name: '厚生労働省', url: 'https://www.mhlw.go.jp/', status: 'verified', checked: '2026-10-14' },
  TR: { name: 'Sağlık Bakanlığı', url: 'https://www.saglik.gov.tr/', status: 'verified', checked: '2026-10-14' },
  KR: { name: '보건복지부', url: 'https://www.mohw.go.kr/', status: 'verified', checked: '2026-10-13' },
  TW: { name: '衛生福利部', url: 'https://www.mohw.gov.tw/', status: 'verified', checked: '2026-10-12' },
  SG: { name: 'Ministry of Health', url: 'https://www.moh.gov.sg/', status: 'verified', checked: '2026-10-12' },
  // www.moh.gov.my answers 403; the ministry's name was read on its food safety division's site.
  MY: {
    name: 'Kementerian Kesihatan Malaysia',
    url: 'https://hq.moh.gov.my/fsq/',
    status: 'verified',
    checked: '2026-10-16'
  },
  HK: {
    name: 'Department of Health (衞生署)',
    url: 'https://www.dh.gov.hk/',
    status: 'verified',
    checked: '2026-10-16'
  },
  ID: { name: 'Kementerian Kesehatan', url: 'https://kemkes.go.id/', status: 'verified', checked: '2026-10-16' },
  // The subcontinent's and the Arab world's (scratch/round6/research/in-pk-bd.md and eg-ae-ma-dz.md).
  // India's own site renders its text in script, so its name was read on the National Portal of India.
  IN: {
    name: 'Ministry of Health and Family Welfare',
    url: 'https://mohfw.gov.in/',
    status: 'verified',
    checked: '2026-10-19'
  },
  PK: {
    name: 'Ministry of National Health Services, Regulations and Coordination',
    url: 'https://www.nhsrc.gov.pk/',
    status: 'verified',
    checked: '2026-10-19'
  },
  BD: {
    name: 'স্বাস্থ্য ও পরিবার কল্যাণ মন্ত্রণালয়',
    url: 'https://mohfw.gov.bd/',
    status: 'verified',
    checked: '2026-10-19'
  },
  EG: { name: 'وزارة الصحة والسكان', url: 'https://www.mohp.gov.eg/', status: 'verified', checked: '2026-10-19' },
  // The UAE's federal ministry and Algeria's refused the connection; each was read only in the
  // Internet Archive (2026-07-12 and 2022-08-24), so neither is linked.
  AE: { name: 'وزارة الصحة ووقاية المجتمع', url: 'https://mohap.gov.ae/', status: 'unverified', checked: '2026-10-19' },
  MA: {
    name: 'Ministère de la Santé et de la Protection Sociale',
    url: 'https://www.sante.gov.ma/',
    status: 'verified',
    checked: '2026-10-19'
  },
  DZ: { name: 'Ministère de la Santé', url: 'https://www.sante.gov.dz/', status: 'unverified', checked: '2026-10-19' }
};

/** A region's health ministry, where it may be shown (verified); null otherwise. */
const ministryFor = (code) => {
  const ministry = MINISTRIES[code];
  return ministry && ministry.status === 'verified' ? ministry : null;
};

/** A region's entries that may be shown: verified ones. */
const shownFor = (code) => {
  const entry = SAFETY[code];
  if (!entry) return null;
  const shown = (list) => (list || []).filter((item) => item.status === 'verified');
  return {
    emergency: shown(entry.emergency),
    poison: shown(entry.poison),
    animals: shown(entry.animals),
    advice: shown(entry.advice)
  };
};

/** The words in a line that a translation may change; numbers and addresses never. */
const TEXT_FIELDS = ['name', 'hours', 'note', 'fee', 'animals', 'area'];

/** Every piece of text shown, once, for translators. */
const texts = () => {
  const all = new Set();
  for (const code of Object.keys(SAFETY)) {
    const shown = shownFor(code);
    for (const line of [...shown.emergency, ...shown.poison, ...shown.animals, ...shown.advice]) {
      for (const field of TEXT_FIELDS) if (line[field]) all.add(line[field]);
    }
  }
  return [...all];
};

module.exports = { SAFETY, MINISTRIES, shownFor, ministryFor, CHECKED, textKey, texts };
