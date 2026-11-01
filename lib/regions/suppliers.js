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
  },
  // Japan (research_notes/Asia/japan-verification-2026-10-14.md), each page read again on
  // 2026-10-14. Japanese feldspars are named by where they are mined; some (釜戸, 三雲) are
  // feldspathic rocks rather than pure feldspar.
  JP: {
    shops: [
      shop(
        '陶芸百貨店',
        'https://www.tougei-dept.com/yuyaku-genryo',
        '埼玉県上尾市',
        ['materials', 'oxides', 'clays', 'glazes', 'kilns'],
        [],
        ['福島長石', '釜戸長石', '福島硅石', '天草陶石', '合成土灰'],
        { checked: '2026-10-14' }
      ),
      // Its site has no https address; the http page was read. Its town is not on the pages
      // read (the notes' 蒲郡市 may be another shop's), so none is given.
      shop(
        '丸二陶料',
        'http://02-maruni.sun.bindcloud.jp/cn8/yuuyakugenryou.html',
        undefined,
        ['materials'],
        [1, 25, 30],
        ['三雲長石', '特級釜戸長石', '極上福島長石'],
        { checked: '2026-10-14' }
      ),
      shop(
        'ヤマニファーストセラミック',
        'https://www.yamani-fc.jp/products/list.php?category_id=12',
        '島根県松江市',
        ['materials', 'glazes'],
        [],
        ['特級福島長石', '特級釜戸長石', '三雲長石', '霞石閃長石(ネフェリン長石)'],
        { checked: '2026-10-14' }
      )
    ]
  },
  // Türkiye (research_notes/Asia/turkey-verification-2026-10-14.md), each page read on
  // 2026-10-14. Pega Seramik also has a shop in Kütahya (Çalca OSB). Tecnodieci's page shows
  // no pack sizes, and Seramiksir's no town, so neither is given. Duygu Seramik (glazes in
  // 50–150 g jars, no address) is left out, and no Turkish producer's analysis was found.
  TR: {
    shops: [
      shop(
        'Pega Seramik',
        'https://www.pegaseramik.com.tr/urunler/hammaddeler-ve-oksitler-10',
        'Tuzla (İstanbul)',
        ['materials', 'oxides'],
        [0.25, 0.5, 1],
        ['SODYUM FELDSPAT', 'POTASYUM FELDSPAT', 'KAOLEN', 'KUVARS', 'KOLEMANİT'],
        { checked: '2026-10-14' }
      ),
      shop(
        'Tecnodieci Shopping',
        'https://www.tecnodiecishopping.com/urunler/ham-maddeler',
        'Bozüyük (Bilecik)',
        ['materials', 'frits'],
        [],
        ['Sodyum Feldspat(Albit)', 'Kolemanit', 'Üleksit', 'Nefelin', 'Opak Beyaz Seramik Frit 1040-1060 C'],
        { checked: '2026-10-14' }
      ),
      shop(
        'Seramiksir',
        'https://seramiksir.com/hammaddeler',
        undefined,
        ['materials', 'frits'],
        [0.1, 0.5, 1],
        ['Nefelin Siyenit', 'Zirkonyum Silikat', 'Wollastonite', 'Talk', 'Titan Rutil'],
        { checked: '2026-10-14' }
      )
    ]
  },
  // South Korea (research_notes/Asia/verification-KR-TW-SG-MY-2026-10-16.md), each page read on
  // 2026-10-16. Neither page gives a town. 세라믹미네랄 (Ceramic Minerals) is a feldspar producer,
  // not confirmed as a shop for potters, so it is left out.
  KR: {
    shops: [
      shop('중앙도재', 'https://www.joongangceramic.com/50', undefined, ['materials', 'frits'], [1, 25], ['도석'], {
        checked: '2026-10-16',
        note: 'Ask the shop whether an item is in stock before buying.'
      }),
      shop(
        '클레이어',
        'https://clayer.co.kr/',
        undefined,
        ['oxides', 'stains', 'clays', 'glazes', 'kilns'],
        [0.1],
        [],
        {
          checked: '2026-10-16'
        }
      )
    ]
  },
  // Taiwan (the same notes), read on 2026-10-16. Its site has no https address; the http page was
  // read. No town on the page read. 釉藥堂 (glazes.com.tw) blocked automated reading and is known
  // only from a search extract, so it is left out; 泰盛興 sells to industry.
  TW: {
    shops: [
      shop(
        '太麟化工原料有限公司',
        'http://www.tai-lin.com.tw/',
        undefined,
        ['materials'],
        [],
        ['福島長石粉', '葉長石', 'E.P.K. 高嶺土', '釜戶長石粉', '日化長石粉'],
        { checked: '2026-10-16' }
      )
    ]
  },
  // Singapore (the same notes), each page read on 2026-10-16. Sam Mui Kuang's site has no https
  // address; the http page was read. The Potters' Guilt sells ready-made glazes and clay, and no raw
  // materials were seen. No town is given: the addresses were in a search extract only. Wei Chuan
  // Pottery Studio's page was blocked and is known only from a search extract, so it is left out.
  SG: {
    shops: [
      shop(
        'Sam Mui Kuang Pottery',
        'http://smkpottery.com/',
        undefined,
        ['materials', 'clays', 'glazes', 'kilns'],
        [],
        [],
        { checked: '2026-10-16' }
      ),
      shop("The Potters' Guilt", 'https://www.thepottersguilt.com/shop', undefined, ['clays', 'glazes'], [2], [], {
        checked: '2026-10-16',
        note: 'Ready-made glazes and clay; no raw materials seen.'
      })
    ]
  },
  // Malaysia (the same notes): searches in English and Malay on 2026-10-16 found manufacturers,
  // studios and industrial producers (Sibelco), but no shop selling raw glaze materials to potters,
  // so none is listed and the page says none was found.
  MY: { shops: [] },
  // China and Indonesia (research_notes/Asia/regions-CN-HK-ID-TH-VN-PH-2026-10-16.md): searches on
  // 2026-10-16 and again on 2026-10-19 found no shop whose own site shows raw glaze materials for
  // potters. China's sellers (Jingdezhen) trade mostly on marketplaces and B2B platforms; Indonesia's
  // results were marketplace listings, a chemicals trader and producers for industry. None is listed,
  // and the page says none was found. Hearty Ceramic (Hong Kong) takes overseas orders but does not
  // name the Mainland, so it is not listed as delivering to China.
  CN: { shops: [] },
  // Hong Kong, read on 2026-10-19 (scratch/round6/research/cn-tw-kr-hk.md): Hearty Ceramic's raw
  // materials pages (two), with its address in Tai Kok Tsui on its contact page; 1, 5 and 10 kg on its
  // potash feldspar's page. It also sells oxides, stains, clays, glazes, kilns and Orton cones. Paton
  // (Yau Ma Tei) is known only from an undated newspaper list, with no site, so it is left out.
  HK: {
    shops: [
      shop(
        'Hearty Ceramic (Hearty Arts International Limited)',
        'https://heartyceramic.com/en/categories/%E8%89%B2%E7%B2%89%E5%8F%8A%E7%89%A9%E6%96%99/%E7%89%A9%E6%96%99/',
        'Tai Kok Tsui (Kowloon)',
        ['materials', 'frits', 'oxides', 'stains', 'clays', 'glazes', 'kilns'],
        [1, 5, 10],
        [
          'Potash Feldspar (Mahavir)',
          'Soda Feldspar (Minspar 200)',
          'Kaolin (China Clay Grolleg)',
          'Silica 325 Mesh',
          'Frit 3134'
        ],
        { checked: '2026-10-19' }
      )
    ]
  },
  ID: { shops: [] },
  // Thailand, read on 2026-10-19 (scratch/round6/research/id-ph-vn-th.md). Pottery Clay Thailand's
  // catalogue (its menu: clay, kilns, wheels, glazes, underglaze and overglaze colours, stains,
  // oxides), 1 kg variants seen; no town on its contact page. Cerawan's price list for glaze materials,
  // per kilogram (กก.ละ), with its address in Krathum Baen, Samut Sakhon, on its location page; its
  // page answers only at the full address with the Thai words (the short one gives 404). No frit seen
  // there. M.S. Industrial Supplies (403, for industry) is left out.
  TH: {
    shops: [
      shop(
        'Pottery Clay Thailand',
        'https://potteryclaythailand.com/collections/oxide',
        undefined,
        ['materials', 'frits', 'oxides', 'stains', 'clays', 'glazes', 'kilns'],
        [1],
        [
          'PRM-24 Potash feldspar โปแทสเซียม เฟลสปาร์ (อินเดีย) 325',
          'PRM-03 Alkaline Frit',
          'PRM-17 KAOLIN NARATON ดินขาวนราธิวาส',
          'PRM-27 Wonderfil,Silica,ทรายแก้ว 325 mesh',
          'POX-04 Cobalt oxide'
        ],
        { checked: '2026-10-19' }
      ),
      shop(
        'Cerawan (เซล่าวัล ซัพพลาย)',
        'https://www.cerawan.com/14360596/เคมีภัณฑ์-chemical-วัตถุดิบในงานเคลือบและทดลอง',
        'Krathum Baen (Samut Sakhon)',
        ['materials', 'oxides', 'stains', 'clays', 'glazes', 'kilns'],
        [],
        [
          'Potassium Feldspar โพแทสเซียมเฟลด์สปาร์',
          'Kamado Feldspar (JAPAN)',
          'Kaolin (Clay China)',
          'ดินขาว ลำปาง RDB',
          'Cobalt Oxide โคบอลท์ออกไซด์ 71.5 %'
        ],
        { checked: '2026-10-19', note: 'Priced by the kilogram.' }
      )
    ]
  },
  // The Philippines, read on 2026-10-19 (the same notes). Tahanan Pottery's raw materials page (packs of
  // ¼, ½ and 1 kg, and sacks), its address in Quezon City on its contact page. Odangputik Pottery sells
  // stoneware clays (5 kg), glazes (500 g) and kits, also in Quezon City; no raw materials were seen,
  // and its note says so.
  PH: {
    shops: [
      shop(
        'Tahanan Pottery',
        'https://tahananpottery.ph/collections/raw-materials-1',
        'Quezon City',
        ['materials', 'frits', 'oxides', 'stains', 'clays', 'glazes', 'kilns'],
        [0.25, 0.5, 1],
        [
          '3110 Ferro Frit',
          'Minspar 200 Soda Feldspar (NC-4)',
          'Potash Feldspar Vardhman India (325 mesh)',
          'Silica Vardhman India (325 mesh)',
          'EPK Kaolin (USA)'
        ],
        { checked: '2026-10-19' }
      ),
      shop(
        'Odangputik Pottery',
        'https://odangputik.com/pottery-clay-supplies-ph/',
        'Quezon City',
        ['clays', 'glazes'],
        [0.5, 5],
        [],
        {
          checked: '2026-10-19',
          note: 'Ready-made glazes and clay; no raw materials seen.'
        }
      )
    ]
  },
  // Vietnam (research_notes/Asia/region-VN-2026-10-17.md): a search on 2026-10-17 found a directory
  // listing of a trade supplier to tile makers, but no shop whose own site shows raw glaze materials
  // for potters; none is listed.
  VN: { shops: [] },
  // India (scratch/round6/research/in-pk-bd.md), each shop's own pages (Shopify product feeds) read on
  // 2026-10-19. Both sell Orton cones and US frits beside Indian materials. Bhoomi gives no town on any
  // page read and ships across India; Clay Station calls itself Bangalore-based. Sara (Chennai) sells
  // only its own clays, glazes and washes, so it is not listed.
  IN: {
    shops: [
      shop(
        'Bhoomi Pottery',
        'https://in.bhoomi.com/collections/artha-pottery-raw-materials-india',
        undefined,
        ['materials', 'frits', 'oxides', 'stains', 'clays', 'glazes', 'kilns'],
        [0.1, 1],
        [
          'Soda Feldspar 1 Kg',
          'Feldspar Minspar 200 Soda MFELMIN',
          'China Clay Kaolin Calcined',
          'Ferro Frit 3134 FF3134',
          'Pottery Talc'
        ],
        { checked: '2026-10-19' }
      ),
      shop(
        'Clay Station',
        'https://online.claystation.in/collections/flux-menu',
        'Bangalore',
        ['materials', 'frits', 'oxides', 'clays', 'glazes', 'kilns'],
        [1],
        [
          'CS Potash Feldspar (G-325)',
          'CS Soda Feldspar (G-325)',
          'CS China Clay (G)',
          'CS Whiting (G-200)',
          'Ferro Frit 3134'
        ],
        { checked: '2026-10-19' }
      )
    ]
  },
  // Pakistan and Bangladesh (the same notes): searches on 2026-10-19 found trade brochures, research
  // papers and news of pottery markets, but no shop whose own site shows raw glaze materials; none is
  // listed.
  PK: { shops: [] },
  BD: { shops: [] },
  // Egypt, Morocco and Algeria (scratch/round6/research/eg-ae-ma-dz.md): searches in English, Arabic and
  // French on 2026-10-19 found studios, sellers of finished ware and industrial producers, but no shop
  // whose own site shows raw glaze materials; none is listed. "Clay Supply" in Fustat (Cairo), a lead from
  // the Arabic glossary work, has no site of its own that could be found on 2026-10-20 (claysupply.com is
  // a parked page), so it is not listed either.
  EG: { shops: [] },
  // The United Arab Emirates (the same notes), each shop's own pages read on 2026-10-19. Art Central's
  // chemicals page lists US raw materials, priced in dirhams, with no pack sizes. Abu Dhabi Pottery
  // supplies Nabertherm kilns, wheels, tools and clay from UK suppliers, by quote; no raw glaze
  // materials were seen, and its note says so. Bhoomi's UAE shop lists raw materials as "coming soon",
  // so it is left out.
  AE: {
    shops: [
      shop(
        'Art Central Pottery',
        'https://artcentralpottery.com/collections/chemicals',
        'Abu Dhabi',
        ['materials', 'frits', 'oxides', 'clays', 'glazes', 'kilns'],
        [],
        [
          'Feldstar, Custer-Potash',
          'Feldstar, Soda-Minspar 250',
          'Epk-Kaolin',
          'Ferro Frit No3195',
          'Whiting (Calcium Carb.)'
        ],
        { checked: '2026-10-19' }
      ),
      shop(
        'Abu Dhabi Pottery',
        'https://www.abudhabipottery.com/equipment-tools-machinery/',
        'Abu Dhabi',
        ['clays', 'kilns'],
        [],
        [],
        {
          checked: '2026-10-19',
          note: 'Kilns, wheels, tools and clay, from suppliers in the UK, by quote; no raw glaze materials seen.'
        }
      )
    ]
  },
  MA: { shops: [] },
  DZ: { shops: [] },
  // Sri Lanka and Nepal (scratch/round8/india-data/report.md): searches on 2026-10-21 found no shop whose
  // own site shows raw glaze materials; none is listed.
  LK: { shops: [] },
  NP: { shops: [] },
  // Round 10's regions: shops not researched for the groundwork (scratch/round10/c-africa-latam/plan.md);
  // none is listed yet.
  MX: { shops: [] },
  BR: { shops: [] },
  AR: { shops: [] },
  CL: { shops: [] },
  ZA: { shops: [] },
  KE: { shops: [] },
  GH: { shops: [] }
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
