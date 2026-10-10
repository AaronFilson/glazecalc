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
// Only verified entries are shown. Translators never touch the digits: the
// guides take them from here. Checked against the research in
// research_notes/Internationalizing glazecalc for EU languages/eu_poison_centres.md
// and Glazing guides for new potters/children_and_pets.md.
//
//   number   as people there write it; tel for the link (E.164, or the short
//            number where it is dialled as it is)
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
      ['Bordeaux', '05 56 96 40 80', '+33556964080', ''],
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
  }
};

/** A region's health ministry, where it may be shown (verified); null otherwise. */
const ministryFor = (code) => {
  const ministry = MINISTRIES[code];
  return ministry && ministry.status === 'verified' ? ministry : null;
};

/** A region's entries that may be shown: verified ones only. */
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
