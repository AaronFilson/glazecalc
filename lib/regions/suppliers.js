'use strict';

// Where to buy raw glaze materials, by region (docs/i18n-plan.md, Phase 4):
// two to four shops per country that sell feldspar, kaolin, silica and
// oxides to potters in small packs, each checked on its own site. Shops close
// and change, so each carries the day it was checked and a status; only
// verified ones are shown. Industrial producers that do not sell to potters
// (Sibelco, Imerys) are left out. Where no shop was found, `nearby` lists
// shops elsewhere whose own pages say they deliver there.
//
//   sells     what it sells, named by the app's messages
//             (guides.shops.sells.<code>)
//   packs     pack sizes seen, in kilograms (or pounds, in the US)
//   examples  materials as the shop names them, its own codes included,
//             to match a recipe's names to a shop's
//
// Research: research_notes/Region content/ (suppliers-*.md).

const CHECKED = '2026-10-08';
const ALL = ['materials', 'frits', 'oxides', 'clays', 'glazes', 'kilns'];
/** A shop; kg are its pack sizes seen, in kilograms. */
const shop = (name, url, place, sells, kg, examples, extra = {}) => ({
  name,
  url,
  place,
  sells,
  ...(kg.length ? { packs: { unit: 'kilogram', sizes: kg } } : {}),
  examples,
  status: 'verified',
  checked: CHECKED,
  ...extra
});
/** A shop in the US, whose pack sizes are in pounds. */
const pounds = (name, url, place, sells, lb, examples, extra = {}) => ({
  ...shop(name, url, place, sells, [], examples, extra),
  packs: { unit: 'pound', sizes: lb }
});
/** A shop in another country whose delivery page names this one. */
const delivers = (from, shipping, entry) => ({ ...entry, region: from, shipping });

const KERAMIK_KRAFT = shop(
  'KERAMIK-KRAFT',
  'https://www.keramik-kraft.com/de/Rohstoffe--Spezialprodukte/Rohstoffe-Carbonate-Oxide/Rohstoffe-und-Oxide.html',
  'Diepersdorf',
  ALL,
  [0.1, 1, 10, 25],
  ['Feldspat Kali (D75) R360', 'Kaolin WBH Cora R372', 'Quarzmehl W10 R438']
);
const RANTZAUER = shop(
  'Rantzauer Töpferbedarf',
  'https://www.toepferspass.de/index.php/keramikbedarf/Ton+&+Rohstoffe-37/Masse-+und+Glasurrohstoffe-7',
  'Barmstedt',
  ALL,
  [1, 5, 25],
  ['Kali-Feldspat K2/75 (Orthoklas)', 'China-Clay', 'Quarzmehl W 10', 'Kreide 190']
);
const KERAMIK_LEHRER = shop(
  'Keramik Lehrer',
  'https://shop.keramik.at/de/c/ola1-2/Rohstoffe.html',
  'Leonding',
  ALL,
  [1, 5, 25],
  ['Kali-Feldspat 13014', 'Natron-Feldspat 13015', 'Kaolin 13016', 'Quarzmehl W10 13020']
);
const AUX_COULEURS = shop(
  "Aux Couleurs d'Argiles",
  'https://auxcouleursdargile.be/76-matieres-premieres',
  'Libramont-Recogne',
  ['materials', 'frits', 'oxides', 'clays', 'glazes'],
  [1, 5],
  ['Feldspath potassique', 'Feldspath sodique', 'Kaolin']
);
const SOLARGIL = shop(
  'Solargil',
  'https://solargil.com/matieres-premieres',
  'Moutiers-en-Puisaye',
  ['materials', 'oxides', 'clays'],
  [1, 5, 25],
  ['Feldspath potassique FEL-K', 'Kaolin pulvérisé', 'Carbonate de chaux', 'Silice 400']
);
const BP_KERAMIA = shop(
  'BP Kerámia',
  'https://bpkeramia.hu/termek_kategoria/nyersanyagok/',
  'Budapest',
  ['materials', 'frits', 'oxides', 'stains', 'glazes', 'clays', 'kilns'],
  [1, 25],
  ['Káliföldpát', 'Nátriumföldpát', 'China clay (BSZ 4006)', 'Kvarcliszt'],
  { note: 'Orders by phone or email, from a price list.' }
);
const MANUFAKTURA = shop(
  'Manufaktura Radovljica',
  'https://manufaktura-radovljica.si/si/9-minerali',
  'Radovljica, Ljubljana',
  ['materials', 'frits', 'oxides', 'clays', 'kilns'],
  [1],
  ['Feldspat kalij 4012', 'Feldspat natrij 4013', 'Kaolin 4021', 'Kremen SiO2 4029M']
);
const KERAMICKE_CENTRUM = shop(
  'Keramické centrum',
  'https://www.keramickecentrum.cz/kategorie/42/suroviny',
  'Praha, Brno, Pečky',
  ['materials', 'oxides', 'glazes', 'clays', 'kilns'],
  [0.1, 1],
  ['Živec K 2/75 draselný (Orthoklas)', 'Živec NA LF 90 sodný (Albit)', 'Kaolin']
);
const RAMFOS = shop(
  'Ράμφος Υλικοκεραμική (Ramfos)',
  'https://www.ramfos.gr/en/product-category/ceramic-materials/raw-materials/',
  'Λυκόβρυση, Αθήνα',
  ['materials', 'frits', 'oxides', 'clays', 'kilns'],
  [0.1, 0.5],
  ['Potassium Felspar', 'Sodium Felspar', 'Kaolin-China Clay', 'Quartz-Flint-Silica']
);
const CERAMA = (url) =>
  shop(
    'Cerama',
    url,
    'Hvidovre (Danmark)',
    ['materials', 'oxides', 'clays', 'kilns'],
    [2, 5, 25],
    ['1434 Kalifeldspat', '1450 Kaolin 50', '1460 Kvarts 140']
  );

const SUPPLIERS = {
  DE: {
    shops: [
      shop(
        'Carl Jäger Tonindustriebedarf',
        'https://shop.carl-jaeger.de/gesamtes-sortiment/masse-und-glasurrohstoffe/',
        'Hilgert',
        ['materials', 'frits', 'oxides', 'stains'],
        [1, 25],
        ['Kalifeldspat 2/75 (13305)', 'Kaolin 233 (13360)', 'Quarzmehl W 10', 'Kreide 190'],
        { note: 'Sells to private buyers in Germany only.' }
      ),
      KERAMIK_KRAFT,
      RANTZAUER,
      shop(
        'Keramikbedarf-online',
        'https://shop.keramikbedarf-online.de/Glasuren/Rohstoffe/',
        'Anzing',
        ALL,
        [1],
        ['Kali Feldspat 2415', 'Kaolin 2419', 'Quarzmehl 2433B', 'Kalkspat 2418B']
      )
    ]
  },
  AT: {
    shops: [
      KERAMIK_LEHRER,
      {
        ...KERAMIK_KRAFT,
        name: 'KERAMIK-KRAFT Österreich',
        place: 'Bad Vöslau',
        examples: ['Feldspat Kali (D75) R360', 'Feldspat Natron (Maxum/LA75) R362', 'Kaolin WBH Cora R372']
      }
    ]
  },
  LU: {
    shops: [],
    nearby: [
      delivers('BE', 'https://auxcouleursdargile.be/content/18-livraisons', AUX_COULEURS),
      delivers('DE', 'https://www.keramik-kraft.com/de/menu.shtml?id=MT06', KERAMIK_KRAFT),
      delivers('DE', 'https://www.toepferspass.de/index.php/information/lieferkosten', RANTZAUER),
      delivers('FR', 'https://solargil.com/content/livraison', SOLARGIL)
    ]
  },
  NL: {
    shops: [
      shop(
        'Keramikos',
        'https://www.keramikos.nl/12-grondstoffen',
        'Haarlem',
        ALL,
        [1, 5, 25],
        ['Veldspaat kali', 'Kaolin (china clay)']
      ),
      shop(
        'Silex',
        'https://www.silexshop.nl/product-categorie/grondstoffen/',
        "'s-Hertogenbosch, Zwolle",
        ALL,
        [1, 5, 25],
        [
          'GS 5003 Kaliveldspaat Norflux D 75',
          'GS 5303 Natronveldspaat',
          'GS 5007 Kaolin extra wit',
          'GS 5016 Kwarts superfijn'
        ]
      ),
      shop(
        'Creavisie',
        'https://webshop.creavisie.com/raw_material.php',
        'Surhuisterveen',
        ALL,
        [0.5, 1, 5, 25],
        ['Veldspaat - Kali', 'Chinaclay / Kaolin', 'Kwarts M300']
      )
    ]
  },
  BE: {
    shops: [
      shop(
        'Colpaert',
        'https://www.colpaertonline.be/nl/188-matieres-premieres',
        'Nevele, Wommelgem, Sint-Pieters-Leeuw',
        ALL,
        [1, 5, 25],
        ['Kaliveldspaat GR40B', 'Veldspaat-natron GR41', 'Kaolien GR20']
      ),
      shop(
        'Keramiek Centrum Limburg',
        'https://shop.keramiekcentrum.be/nl/grondstoffen/glazuurgrondstoffen/',
        'Genk',
        ALL,
        [1, 5],
        ['Kaliumveldspaat GLZGR018', 'Natriumveldspaat', 'Kaolien']
      ),
      AUX_COULEURS
    ]
  },
  FR: {
    shops: [
      SOLARGIL,
      shop(
        'Ceradel',
        'https://ceradel.fr/collections/matieres-premieres',
        'Panazol (Limoges)',
        ['materials', 'frits', 'oxides', 'clays', 'kilns'],
        [1, 5, 25],
        ['Feldspath potassique FP325', 'Kaolin A (Polwhite KL)', 'Silice C 400', 'Carbonate de chaux (craie)']
      ),
      shop(
        'Céram Décor',
        'https://www.ceram-decor.fr/462-matierespremieres',
        'Saint-Genis-Laval (Lyon)',
        ['materials', 'oxides', 'glazes', 'kilns'],
        [1, 5, 25],
        ['Feldspath potassique ICE 10 C200', 'Kaolin B Prodesco', 'Silice 200 Vicar', 'Carbonate de calcium Prodesco']
      ),
      shop(
        'Peter Lavem',
        'https://www.peterlavem.fr/50-matieres-premieres',
        'Chennevières-sur-Marne',
        ['materials', 'oxides', 'clays', 'kilns'],
        [1, 5, 25],
        ['Feldspath sodique MAT125', 'Feldspath potassique Norflux', 'Quartz - Silice MAT132']
      )
    ]
  },
  IT: {
    shops: [
      shop(
        'Sila Argille',
        'https://www.sila.net/materie-prime/',
        'Spicchio-Vinci (Firenze)',
        ['materials', 'oxides', 'clays', 'glazes'],
        [1, 5, 10, 25],
        ['Feldspato potassico', 'Caolino', 'Quarzo ventilato']
      ),
      shop(
        'Cibas',
        'https://www.e-cibas.com/fondenti-primari',
        'Bassano del Grappa',
        ['materials', 'oxides', 'clays', 'kilns'],
        [1, 5, 25],
        ['Potassio Feldspato', 'Sodio Feldspato', 'Caolino China Clay', 'Quarzo Silice']
      )
    ]
  },
  ES: {
    shops: [
      shop(
        'Marphil',
        'https://marphil.com/9-materias-primas',
        'Madrid',
        ['materials', 'oxides', 'glazes'],
        [1, 5, 25],
        ['Feldespato Sódico SPS 1831C', 'Cuarzo 1823C', 'Caolín Nacional 1775B']
      ),
      shop(
        'Bisbal Ceram',
        'https://bisbalceram.com/es/10-materias-primas',
        'Corçà (Girona)',
        ['materials', 'oxides', 'clays'],
        [0.5, 1, 5, 25],
        ['Feldespato potásico "M"', 'Cuarzo', 'Caolín Nacional superfino', 'Carbonato cálcico (creta)']
      ),
      shop(
        'SIO-2 Store',
        'https://www.sio-2.com/es/72-materias-primas-y-oxidos',
        'Esparreguera, Barcelona',
        ALL,
        [1, 5],
        ['Feldespato potásico', 'Cuarzo', 'Caolín China Clay inglés', 'Carbonato cálcico (creta)']
      ),
      shop(
        'Esmalte y Barro',
        'https://www.esmalteybarro.com/producto-categoria/materias-primas/',
        'Tomares (Sevilla)',
        ['materials', 'oxides', 'glazes', 'kilns'],
        [1],
        ['Feldespato potásico 01-M.P.139', 'Caolín CFK', 'Cuarzo 01-M.P.133', 'Carbonato de cal (creta)'],
        { note: 'Orders by quote, or in the shop.' }
      )
    ]
  },
  PT: {
    shops: [
      shop(
        'Ceramistashop',
        'https://ceramistashop.pt/collections/materias-primas',
        'Lisboa, Oeiras, Porto, Setúbal',
        ['materials', 'frits', 'oxides', 'clays', 'kilns'],
        [0.1, 1],
        ['Feldspato potássico 50101501', 'Feldspato sódico', 'Caulino', 'Sílica']
      ),
      shop(
        'Graffito Store',
        'https://graffitostore.com/en/product-category/raw-materials/',
        'Alcobaça',
        ['materials', 'frits', 'oxides'],
        [1, 5],
        ['Potassium feldspar 404000006', 'Kaolin VE', 'Silica SS100']
      )
    ]
  },
  MT: {
    shops: [],
    nearby: [delivers('FR', 'https://solargil.com/content/livraison', SOLARGIL)]
  },
  PL: {
    shops: [
      shop(
        'AGANI',
        'https://www.agani.pl/category/surowce',
        'Świętochłowice',
        ['materials', 'frits', 'oxides', 'glazes', 'clays'],
        [0.1, 1],
        ['Skaleń potasowy (Orthoklas)', 'Skaleń sodowy (Albit)', 'Kwarc W10 (mączka kwarcowa)']
      ),
      shop(
        'HEHO',
        'https://heho.pl/pl/c/SUROWCE-CHEMICZNE/93',
        'Poznań',
        ['materials', 'frits', 'oxides', 'glazes', 'clays'],
        [1],
        ['Skaleń potasowy / Ortoklaz', 'Skaleń sodowy / Albit', 'Kaolin']
      ),
      shop(
        'Świat Gliny',
        'https://swiatgliny.pl/pl/11-surowce',
        'Gliwice',
        ['materials', 'frits', 'oxides', 'stains', 'glazes', 'clays', 'kilns'],
        [1],
        ['Skaleń potasowy 2/75', 'Kaolin', 'Mączka kwarcowa W 10']
      )
    ]
  },
  CZ: {
    shops: [
      KERAMICKE_CENTRUM,
      shop(
        'Služby keramikům',
        'https://sluzbykeramikum.cz/suroviny-oxidy/',
        'Roudnice nad Labem',
        ['materials', 'oxides', 'glazes', 'kilns'],
        [1, 25],
        ['Živec 75 K13', 'Živec 55 NAK 60', 'Kaolín mletý', 'Křemen jemný ST6'],
        { note: 'Orders by form, without a cart.' }
      )
    ]
  },
  SK: {
    shops: [],
    nearby: [
      delivers(
        'HU',
        'https://bpkeramia.hu/2026/04/01/csomagkuldes-telefonos-vagy-email-ben-leadott-rendeles-alapjan/',
        BP_KERAMIA
      ),
      delivers('CZ', 'https://www.keramickecentrum.cz/zpusob-doruceni-ceny-postovneho', KERAMICKE_CENTRUM),
      delivers('AT', 'https://shop.keramik.at/de/cms/Versandkosten.html', KERAMIK_LEHRER)
    ]
  },
  HU: { shops: [BP_KERAMIA] },
  SI: { shops: [MANUFAKTURA] },
  HR: {
    shops: [],
    nearby: [
      delivers('SI', 'https://manufaktura-radovljica.si/si/stran/1-dostava-in-dobavni-roki', MANUFAKTURA),
      delivers(
        'HU',
        'https://bpkeramia.hu/2026/04/01/csomagkuldes-telefonos-vagy-email-ben-leadott-rendeles-alapjan/',
        BP_KERAMIA
      ),
      delivers('AT', 'https://shop.keramik.at/de/cms/Versandkosten.html', KERAMIK_LEHRER)
    ]
  },
  RO: {
    shops: [
      shop(
        'Interceram',
        'https://interceram.ro/shop/materii-prime-de-baza',
        'Sighișoara',
        ['materials', 'oxides', 'clays', 'kilns'],
        [1],
        ['Feldspat potasic FK-80', 'Feldspat sodic', 'Caolin Zettlici', 'Făină de cuarț']
      ),
      shop(
        'Barro',
        'https://www.barro.ro/collections/materii-prime',
        'București',
        ['materials', 'oxides', 'clays', 'kilns'],
        [0.1, 0.5, 1],
        ['Feldspat potasic', 'Feldspat sodic', 'Caolin China Clay', 'Carbonat de calciu (cretă)'],
        { note: 'No quartz seen.' }
      )
    ]
  },
  BG: {
    shops: [
      shop(
        'Глазура (Glazura)',
        'https://glazura.bg/product-category/other/',
        'Троян',
        ['materials', 'frits', 'oxides', 'clays', 'kilns'],
        [0.1, 1, 25],
        ['Каолин на прах', 'Кварцово брашно < 63 микрона'],
        { note: 'No feldspar seen.' }
      ),
      shop(
        'Кератек (Ceramit)',
        'https://ceramit.eu/product-category/materiali_za_keramika/surovini/',
        'Брацигово, София',
        ['materials', 'frits', 'oxides', 'clays', 'kilns'],
        [0.1, 1, 25],
        ['Каолин К2', 'Кварцов пясък', 'Калциев карбонат'],
        { note: 'No feldspar seen.' }
      )
    ]
  },
  GR: {
    shops: [
      shop(
        'Zanias Ceramics',
        'https://zaniasceramics.gr/index.php?page=1&path=150&route=product%2Fcategory',
        'Αθήνα',
        ['materials', 'frits', 'oxides', 'clays'],
        [0.1, 0.5],
        ['Άστριος καλίου', 'Άστριος νατρίου', 'Καολίνης']
      ),
      RAMFOS,
      shop(
        'Κεραμικό Κέντρο (Ceramic Center)',
        'https://ceramicc.com/product-category/protes-yles/',
        'Αθήνα',
        ['materials', 'oxides', 'clays'],
        [0.25, 0.5, 1],
        ['Άστριος Καλίου', 'Άστριος Νατρίου', 'Καολίνη (China Clay)']
      )
    ]
  },
  CY: {
    shops: [],
    nearby: [delivers('GR', 'https://www.ramfos.gr/en/home/shipping/', RAMFOS)]
  },
  SE: {
    shops: [
      shop(
        'Lermakeriet',
        'https://lermakeriet.se/produkt-kategori/ravaror/',
        'Valbo (Gävle)',
        ['materials', 'frits', 'oxides', 'clays', 'kilns'],
        [1, 5],
        ['Kalifältspat FFF 4122', 'Kaolin 4064', 'Kvarts 4080']
      ),
      shop(
        'Lars Tärn',
        'https://www.tarn.se/ramaterial.htm',
        'Tomelilla',
        ['materials', 'frits', 'oxides', 'clays', 'kilns'],
        [1, 2, 5],
        ['Kalifältspat', 'Natronfältspat', 'Kvarts 150 mesh'],
        { note: 'Orders by email, from a price list.' }
      ),
      CERAMA('https://cerama.se/keramik/raavaror/raavaror')
    ]
  },
  DK: {
    shops: [
      shop(
        'Silica Nordic',
        'https://silicanordic.dk/produkt-kategori/raavarer/',
        'Jyllinge',
        ['materials', 'frits', 'oxides', 'clays', 'kilns'],
        [0.1, 1, 5, 25],
        [
          'Feldspat Potash / Kalifeldspat',
          'Feldspat Soda / Natronfeldspat',
          'Kaolin / China Clay / Grolleg',
          'Kvartsmel'
        ]
      ),
      { ...CERAMA('https://cerama.dk/keramik/raavarer-mv/raavarer'), place: 'Hvidovre' },
      shop(
        'Sorring Lervarefabrik',
        'https://sorringler.dk/shop/51-raavarer/',
        'Sorring',
        ['materials', 'frits', 'oxides', 'clays', 'kilns'],
        [2, 5, 25],
        ['Kalifeldspat - Potash', 'Natronfeldspat', 'Kaolin - 50', 'Zettlicher Kaolin']
      )
    ]
  },
  FI: {
    shops: [
      shop(
        'Kerasil',
        'https://www.kerasil.fi/epages/Kerasil.sf/fi_FI/?ObjectPath=/Shops/Kerasil/Categories/%22Raaka-aineet%2C%20kipsit%20ja%20muut%20materiaalit%22/Raaka-aineet',
        'Nurmijärvi, Helsinki',
        ['materials', 'oxides', 'clays', 'kilns'],
        [1, 25],
        ['Maasälpä K7 FFF 60 (797124)', 'Kalimaasälpä Norfloat (707139)', 'Kvartsi 200 M FFQ 45 (720002)']
      ),
      shop(
        'Varnia',
        'https://www.varnia.fi/c32-raaka-aineet-fi.html',
        'Suomusjärvi (Salo)',
        ['materials', 'frits', 'oxides', 'clays', 'kilns'],
        [1, 25],
        ['Sekamaasälpä FFF60', 'Natronmaasälpä', 'Kvartsi FFQ 45 / 200 M', 'Kaoliini Grolleg']
      )
    ]
  },
  EE: {
    shops: [
      shop(
        'Emilie',
        'https://www.emilie.ee/tootekategooria/toorained/',
        'Tallinn',
        ['materials', 'frits', 'oxides', 'clays', 'kilns'],
        [1, 40],
        ['Põldpagu FFF 200 (7971244)', 'Kvarts 200 M FFQ (720002)', 'Kaoliin Grolleg (710002)']
      ),
      shop(
        'Loovuspood',
        'https://www.loovuspood.ee/tootekategooria/toorained/',
        'Tallinn',
        ['materials', 'oxides', 'clays', 'kilns'],
        [0.1, 1],
        ['Põldpagu (kaalium)', 'Põldpagu (naatrium)', 'Kvarts W 10', 'Kaoliin', 'Kriit']
      )
    ]
  },
  LV: {
    shops: [],
    nearby: [delivers('DE', 'https://www.toepferspass.de/index.php/information/lieferkosten', RANTZAUER)]
  },
  LT: {
    // Keramikams.lt (Panevėžys) answered only with a bot check: seen in search results, not on its site.
    shops: [],
    nearby: [delivers('DE', 'https://www.toepferspass.de/index.php/information/lieferkosten', RANTZAUER)]
  },
  IE: {
    shops: [
      shop(
        'DBI Pottery Supplies',
        'https://www.dbipottery.com/product-category/raw-materials/',
        'Cork',
        ['materials', 'frits', 'oxides', 'clays', 'kilns'],
        [0.5, 2.5, 5, 25],
        ['FFF Feldspar', 'Potash Feldspar', 'China Clay', 'Quartz']
      ),
      shop(
        'RPM Supplies',
        'https://rpmsupplies.com/product-category/pottery-ceramics/raw-materials/',
        'Dublin',
        ['materials', 'frits', 'oxides', 'clays', 'kilns'],
        [1, 2.5, 5, 25],
        ['Potash Feldspar', 'Soda Feldspar', 'China Clay', 'Dry Flint']
      )
    ]
  },
  GB: {
    shops: [
      shop(
        'Potterycrafts',
        'https://potterycrafts.co.uk/collections/raw-materials',
        'Stoke-on-Trent',
        ['materials', 'frits', 'oxides', 'kilns'],
        [1, 5, 25],
        ['Feldspar Potash P3296', 'FFF Feldspar P3316', 'Grolleg China Clay P3298', 'Quartz P3337']
      ),
      shop(
        'Bath Potters Supplies',
        'https://www.bathpotters.co.uk/clays-raw-materials/raw-materials/c15',
        'Radstock (Bath)',
        ['materials', 'oxides', 'clays'],
        [1, 2.5, 5, 10, 25],
        ['FFF Feldspar', 'Potash Feldspar', 'Grolleg China Clay', 'Quartz']
      ),
      shop(
        'Potclays',
        'https://www.potclays.co.uk/oxides-basic-materials-basic-materials/',
        'Stoke-on-Trent',
        ['materials', 'oxides'],
        [0.5, 2.5, 5, 10, 25],
        ['FFF Feldspar 3428', 'Feldspar FFP45 3430', 'Grolleg China Clay 3416-03', 'Quartz 3452M']
      ),
      shop(
        'Ulster Ceramics',
        'https://www.ulsterceramicspotterysupplies.co.uk/collections/raw-materials',
        'Swatragh (Northern Ireland)',
        ['materials', 'frits', 'oxides', 'clays', 'kilns'],
        [1, 5, 10, 25],
        ['Potash Feldspar 3039', 'FFF Feldspar 3017', 'Grolleg China Clay 3011', 'Quartz 3032']
      )
    ]
  },
  US: {
    shops: [
      pounds(
        'Laguna Clay',
        'https://www.lagunaclay.com/collections/dry-materials',
        'City of Industry, California',
        ['materials', 'clays'],
        [5, 50],
        [
          'Minspar 200 (MFELMIN)',
          'Mahavir Potash Feldspar (MFELPF01)',
          'Silica 325 mesh (MSIL325)',
          'Whiting 325 mesh (MWHIT325)'
        ]
      ),
      pounds(
        'Clay Art Center',
        'https://clayartcenter.net/product-category/raw-materials/',
        'Tacoma, Washington',
        ['materials', 'clays'],
        [1, 5, 10, 25, 50],
        ['Minspar 200', 'G200 EU Feldspar', '6 Tile Kaolin', 'Whiting']
      ),
      pounds(
        'The Ceramic Shop',
        'https://www.theceramicshop.com/store/category/7/7/chemicals/',
        'Norristown, Pennsylvania',
        ['materials', 'frits', 'oxides', 'clays', 'kilns'],
        [1, 50],
        ['Feldspar G200 EU (CH-G200EU)', 'Minspar 200 (CH-KONA)', 'Silica 200 mesh', 'Whiting (CH-WH)']
      ),
      pounds(
        'New Mexico Clay',
        'https://nmclay.com/potters-material-chemicals',
        'Albuquerque, New Mexico',
        ['materials', 'frits', 'oxides', 'clays', 'kilns'],
        [1],
        ['Minspar 200', 'Feldspar Potash G200', 'Kaolin EPK', 'Silica 325 mesh (Sil-Co-Sil 49)']
      )
    ]
  },
  AU: {
    // Walker Ceramics answered only with a bot check; Oxerra sells to industry only.
    shops: [
      shop(
        'Northcote Pottery Supplies',
        'https://northcotepotterysupplies.com.au/collections/raw-materials-1',
        'Brunswick East (Melbourne)',
        ['materials', 'oxides', 'clays', 'kilns'],
        [1, 5, 25],
        ['Feldspar - Potash 200', 'Kaolin - Eckalite 2', 'Silica 200#', 'Whiting - Omyacarb 10']
      ),
      shop(
        'Keane Ceramics',
        'https://keaneceramics.com.au/collections/ceramics-powders',
        'West Gosford, New South Wales',
        ['materials', 'frits', 'oxides'],
        [1, 5, 25],
        ['Feldspar Potash 200F', 'China Clay Eckalite', 'Silica 200#', 'Whiting Omya Carb 10']
      ),
      shop(
        'Pottery Supplies Online',
        'https://www.potterysuppliesonline.com.au/product-category/raw-materials/',
        'Milton (Brisbane)',
        ['materials', 'frits', 'oxides'],
        [1, 5],
        ['Potash Feldspar', 'Kaolin – Eckalite', 'Silica 200', 'Calcite (Whiting) Omya Carb 10']
      ),
      shop(
        'The Pug Mill',
        'https://pugmill.com.au/product-category/raw-materials/',
        'Mile End (Adelaide)',
        ['materials', 'frits', 'oxides', 'clays', 'kilns'],
        [2.5, 5, 25],
        [
          'Feldspar Potash PM-FePo',
          'Kaolin Eckalite 1 PM-KoEck1',
          'Silica (200 Mesh) PM-Sili',
          'Whiting – Omya Carb 10'
        ]
      )
    ]
  },
  NZ: {
    shops: [
      shop(
        'CCG',
        'https://www.ccg.co.nz/craft/products/category/4375/raw-materials',
        'Rosedale (Auckland)',
        ['materials', 'frits', 'oxides', 'clays', 'kilns'],
        [0.5, 1, 2.5, 5, 25],
        ['Feldspar Potash K200', 'NZ China Clay Ultrafine', 'Silica 325# Mesh', 'Calcium Carbonate']
      ),
      shop(
        'Decopot',
        'https://decopot.co.nz/collections/raw-materials',
        'Palmerston North',
        ['materials', 'oxides', 'clays'],
        [2.5, 5, 25],
        ['Potash Feldspar 200#', 'NZ China Clay Ultrafine', 'Silica 325#', 'Calcium Carbonate 200#']
      )
    ]
  }
};

const verified = (shops) => (shops || []).filter((shop) => shop.status === 'verified');

/** A region's shops that may be shown; null for a region with no entry. */
const shopsFor = (code) => {
  const entry = SUPPLIERS[code];
  if (!entry) return null;
  return { shops: verified(entry.shops), nearby: verified(entry.nearby) };
};

/** Every piece of text shown, once, for translators: the notes. Names and places stay as they are. */
const texts = () => {
  const all = new Set();
  for (const code of Object.keys(SUPPLIERS)) {
    const { shops, nearby } = shopsFor(code);
    for (const shop of [...shops, ...nearby]) if (shop.note) all.add(shop.note);
  }
  return [...all];
};

module.exports = { SUPPLIERS, shopsFor, texts };
