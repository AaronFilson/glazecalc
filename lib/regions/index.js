'use strict';

// Where a potter works: the regions Glazecalc knows, and what each one sets
// by default (docs/i18n-plan.md). The language of the page is a separate
// choice; a region decides the number and date conventions, the temperature
// scale, whether cones are the usual way to fire, and which standard
// materials are sold there. Shared by the server (to check a saved choice)
// and the browser.
//
//   code         ISO 3166-1 alpha-2
//   name         in English, for now
//   languages    official languages there, BCP 47, the most used first
//   eu           a member of the European Union
//   temperature  'F' or 'C'
//   cones        'orton' where potters usually fire to Orton cones,
//                'temperature' where they usually fire by a controller's
//                temperature (most of the EU, where Orton cones are sold
//                but not the norm), 'sk' where they fire to SK cones (JIS R 8101,
//                Japan)
//   library      the standard library's region filter: US, UK, EU or AU
//   density      how glaze density is read: 'sg' (specific gravity), or
//                'baume' (degrees Baumé, read from a hydrometer, as in Italy)
//   currency     the money a potter there prices materials in (ISO 4217): the
//                default for an account's one currency (cost per batch); the
//                euro for the euro area, Bulgaria's since 1 January 2026

const region = (code, name, languages, eu, extra = {}) => ({
  code,
  name,
  languages,
  eu,
  temperature: 'C',
  cones: eu ? 'temperature' : 'orton',
  density: 'sg',
  library: eu ? 'EU' : code,
  currency: eu ? 'EUR' : '',
  ...extra
});

const REGIONS = [
  region('US', 'United States', ['en'], false, { temperature: 'F', currency: 'USD' }),
  region('GB', 'United Kingdom', ['en'], false, { library: 'UK', currency: 'GBP' }),
  region('AU', 'Australia', ['en'], false, { currency: 'AUD' }),
  region('NZ', 'New Zealand', ['en'], false, { library: 'AU', currency: 'NZD' }),
  region('AT', 'Austria', ['de'], true),
  region('BE', 'Belgium', ['nl', 'fr', 'de'], true),
  region('BG', 'Bulgaria', ['bg'], true),
  region('HR', 'Croatia', ['hr'], true),
  region('CY', 'Cyprus', ['el'], true),
  region('CZ', 'Czechia', ['cs'], true, { currency: 'CZK' }),
  region('DK', 'Denmark', ['da'], true, { currency: 'DKK' }),
  region('EE', 'Estonia', ['et'], true),
  region('FI', 'Finland', ['fi', 'sv'], true),
  region('FR', 'France', ['fr'], true),
  region('DE', 'Germany', ['de'], true),
  region('GR', 'Greece', ['el'], true),
  region('HU', 'Hungary', ['hu'], true, { currency: 'HUF' }),
  // English-speaking, and served by the UK's suppliers as much as the EU's: Orton cones,
  // and the UK's library, since its shops sell the UK's frits and feldspars.
  region('IE', 'Ireland', ['en', 'ga'], true, { cones: 'orton', library: 'UK' }),
  region('IT', 'Italy', ['it'], true, { density: 'baume' }),
  region('LV', 'Latvia', ['lv'], true),
  region('LT', 'Lithuania', ['lt'], true),
  region('LU', 'Luxembourg', ['fr', 'de'], true),
  region('MT', 'Malta', ['mt', 'en'], true),
  region('NL', 'Netherlands', ['nl'], true),
  region('PL', 'Poland', ['pl'], true, { currency: 'PLN' }),
  region('PT', 'Portugal', ['pt'], true),
  region('RO', 'Romania', ['ro'], true, { currency: 'RON' }),
  region('SK', 'Slovakia', ['sk'], true),
  region('SI', 'Slovenia', ['sl'], true),
  region('ES', 'Spain', ['es'], true),
  region('SE', 'Sweden', ['sv'], true, { currency: 'SEK' }),
  // East Asia (docs/asia-plan.md, Phase C). Japan fires by SK cones (JIS R 8101), with Orton
  // and temperature a setting away; potters' hydrometers there read Baumé. Its own materials
  // are not in the library yet, so it lists the US set.
  region('JP', 'Japan', ['ja'], false, { cones: 'sk', density: 'baume', library: 'US', currency: 'JPY' }),
  // Türkiye (docs/asia-plan.md, research_notes/Asia/turkey-verification-2026-10-14.md). Potters
  // fire by a controller's temperature (the national ceramics modules and the shops give °C;
  // Orton cones, sold there as "Seger piramidi", are a setting away) and read density as
  // litre weight, which is specific gravity in g/L. Its own materials are not in the library
  // yet, so it lists the EU set.
  region('TR', 'Türkiye', ['tr'], false, { cones: 'temperature', library: 'EU', currency: 'TRY' }),
  // South Korea (docs/asia-plan.md, decisions 4 and 6; research_notes/Asia/
  // verification-KR-TW-SG-MY-2026-10-16.md). Fired by temperature until potters' practice there
  // is checked, with cones a setting away; its own materials are not in the library yet, so it
  // lists the US set.
  region('KR', 'South Korea', ['ko'], false, { cones: 'temperature', library: 'US', currency: 'KRW' }),
  // Taiwan (the same notes): as Korea, by temperature and with the US library until checked.
  region('TW', 'Taiwan', ['zh-Hant'], false, { cones: 'temperature', library: 'US', currency: 'TWD' }),
  // Singapore (the same notes), in English (decision 9). How potters there fire was not checked, so
  // by temperature, as for Korea and Taiwan; the US library.
  region('SG', 'Singapore', ['en', 'zh-Hans', 'ms', 'ta'], false, {
    cones: 'temperature',
    library: 'US',
    currency: 'SGD'
  }),
  // Malaysia (the same notes), as Singapore: in English (decision 9), by temperature, the US library.
  // Malay is the official language; English is widely used.
  region('MY', 'Malaysia', ['ms', 'en'], false, { cones: 'temperature', library: 'US', currency: 'MYR' }),
  // China (docs/asia-plan.md, decision 6; research_notes/Asia/regions-CN-HK-ID-TH-VN-PH-2026-10-16.md):
  // by temperature until potters' practice there is checked, as Korea and Taiwan; the US library.
  region('CN', 'China', ['zh-Hans'], false, { cones: 'temperature', library: 'US', currency: 'CNY' }),
  // Hong Kong (the same notes, decision 5): Traditional Chinese, written for Taiwan, and English, with
  // its own region data; numbers and dates as zh-Hant-HK and en-HK. Firing practice not researched,
  // so by temperature, as Singapore. Listed after Taiwan, so Traditional Chinese pages are still
  // prerendered for Taiwan.
  region('HK', 'Hong Kong', ['zh-Hant', 'en'], false, { cones: 'temperature', library: 'US', currency: 'HKD' }),
  // Indonesia and Thailand (the same notes): by temperature, not researched; the US library.
  region('ID', 'Indonesia', ['id'], false, { cones: 'temperature', library: 'US', currency: 'IDR' }),
  region('TH', 'Thailand', ['th'], false, { cones: 'temperature', library: 'US', currency: 'THB' }),
  // The Philippines (the same notes), in English (decision 9): Filipino and English are official.
  // Firing practice not researched, so by temperature; the US library.
  region('PH', 'Philippines', ['fil', 'en'], false, { cones: 'temperature', library: 'US', currency: 'PHP' }),
  // Vietnam (research_notes/Asia/region-VN-2026-10-17.md), in Vietnamese: firing practice not
  // researched, so by temperature; the US library; dates and numbers as vi-VN.
  region('VN', 'Vietnam', ['vi'], false, { cones: 'temperature', library: 'US', currency: 'VND' }),
  // The Indian subcontinent (docs/south-asia-mena-plan.md; scratch/round6/research/in-pk-bd.md), in
  // English first. India: Hindi and English are the Union's official languages. Its studio shops sell
  // Orton cones and label glazes by cone, and sell US frits and feldspars, so it fires by Orton cones
  // (the owner's decision, 2026-10-20), with temperature a setting away, and lists the US library.
  region('IN', 'India', ['hi', 'en'], false, { cones: 'orton', library: 'US', currency: 'INR' }),
  // Pakistan (Urdu, national; English, official) and Bangladesh (Bengali): firing practice not
  // researched, so by temperature; the US library.
  region('PK', 'Pakistan', ['ur', 'en'], false, { cones: 'temperature', library: 'US', currency: 'PKR' }),
  region('BD', 'Bangladesh', ['bn'], false, { cones: 'temperature', library: 'US', currency: 'BDT' }),
  // Egypt and North Africa, and the United Arab Emirates (scratch/round6/research/eg-ae-ma-dz.md):
  // firing practice not researched, so by temperature; the US library (the UAE's one shop with a
  // raw-materials list sells US materials). Egypt is listed first of the Arabic-speaking regions,
  // so Arabic pages are written for it. Morocco and Algeria list French after Arabic, so French
  // pages are still written for France.
  region('EG', 'Egypt', ['ar'], false, { cones: 'temperature', library: 'US', currency: 'EGP' }),
  region('AE', 'United Arab Emirates', ['ar', 'en'], false, { cones: 'temperature', library: 'US', currency: 'AED' }),
  region('MA', 'Morocco', ['ar', 'fr'], false, { cones: 'temperature', library: 'US', currency: 'MAD' }),
  region('DZ', 'Algeria', ['ar', 'fr'], false, { cones: 'temperature', library: 'US', currency: 'DZD' })
];

const REGION_CODES = REGIONS.map((r) => r.code);

/**
 * Named number and date formats a potter may choose over their language and
 * region's: each is a BCP 47 locale the browser's Intl APIs know.
 */
const FORMAT_LOCALES = [
  'en-US',
  'en-GB',
  'en-IE',
  'en-AU',
  'en-NZ',
  'bg-BG',
  'cs-CZ',
  'da-DK',
  'de-DE',
  'de-AT',
  'el-GR',
  'es-ES',
  'et-EE',
  'fi-FI',
  'fr-FR',
  'fr-BE',
  'ga-IE',
  'hr-HR',
  'hu-HU',
  'it-IT',
  'lt-LT',
  'lv-LV',
  'mt-MT',
  'nl-NL',
  'nl-BE',
  'pl-PL',
  'pt-PT',
  'ro-RO',
  'sk-SK',
  'sl-SI',
  'sv-SE',
  'sv-FI',
  // East and Southeast Asia, ahead of their languages and regions (docs/asia-plan.md).
  // Chinese keeps its script: Traditional and Simplified write dates and names differently.
  'ja-JP',
  'ko-KR',
  'zh-Hans-CN',
  'zh-Hans-SG',
  'zh-Hans-MY',
  'zh-Hant-TW',
  'zh-Hant-HK',
  'th-TH',
  'vi-VN',
  'id-ID',
  'tr-TR',
  'en-SG',
  'en-HK',
  'en-MY',
  'en-PH'
];

const { languageFor } = require('./languages');

const regionFor = (code) => REGIONS.find((r) => r.code === code);

/**
 * The language of a page, as numbers and dates are written in it: its
 * language and script, without its region (zh-Hant, pt for pt-PT, en for
 * the pseudo-locale en-XA). The script stays, since Traditional Chinese read
 * in China is still written as in Taiwan, not as zh-CN.
 */
const writtenLanguage = (code) => {
  const known = languageFor(code);
  if (known && known.base) return known.base;
  try {
    const { language, script } = new Intl.Locale(code);
    return script ? language + '-' + script : language;
  } catch {
    return 'en';
  }
};

/**
 * The calendars dates may be shown in (the Calendar setting, docs/asia-plan.md
 * Phase E item 1), as Intl names them: the Gregorian, the default everywhere;
 * the Thai Buddhist era (2569); and Japan's eras (令和8年). Only dates shown
 * change: dates typed stay in the browser's Gregorian date fields, and are
 * saved as YYYY-MM-DD.
 */
const CALENDARS = ['gregory', 'buddhist', 'japanese'];

/**
 * The locale for numbers and dates: the one chosen, or else the page's
 * language with the region's conventions (en with DE gives en-DE: English,
 * with a decimal comma; zh-Hant with IE gives zh-Hant-IE), or the language
 * alone where no region is chosen. Portuguese is always European
 * Portuguese, since bare pt means Brazil's. With a calendar other than the
 * Gregorian, the locale names it (th-TH-u-ca-buddhist, en-US-u-ca-japanese);
 * numbers are written the same either way.
 */
const formatLocaleFor = function (language, regionCode, format, calendar) {
  let locale;
  if (format && format !== 'auto') {
    locale = format;
  } else {
    const lang = writtenLanguage(language || 'en');
    if (regionFor(regionCode)) locale = lang + '-' + regionCode;
    else locale = lang === 'pt' ? 'pt-PT' : lang;
  }
  return withCalendar(locale, CALENDARS.includes(calendar) ? calendar : 'gregory');
};

/**
 * The locale with its dates in the calendar given. Gregorian is the default
 * everywhere, and Intl's own already for every language offered but Thai,
 * which it writes in the Buddhist era (2569) unless told: so Gregorian names
 * the calendar for Thai only, and leaves every other locale as it was.
 */
function withCalendar(locale, calendar) {
  try {
    if (calendar !== 'gregory') return new Intl.Locale(locale, { calendar }).toString();
    return new Intl.Locale(locale).language === 'th' && !locale.includes('-u-') ? locale + '-u-ca-gregory' : locale;
  } catch {
    return locale;
  }
}

/** The currencies an account may price materials in: each region's, once, in the regions' order. */
const CURRENCIES = [...new Set(REGIONS.map((r) => r.currency))];

/**
 * The currency to price in when none is chosen: the region's, or else that of
 * the region in the locale numbers are written in (de-DE gives the euro), or
 * else the US dollar.
 */
const currencyFor = (regionCode, locale) => {
  const chosen = regionFor(regionCode);
  if (chosen) return chosen.currency;
  try {
    const fromLocale = regionFor(new Intl.Locale(locale || 'en').region);
    if (fromLocale) return fromLocale.currency;
  } catch {
    // Not a locale: the default.
  }
  return 'USD';
};

module.exports = {
  REGIONS,
  REGION_CODES,
  FORMAT_LOCALES,
  CALENDARS,
  CURRENCIES,
  regionFor,
  formatLocaleFor,
  currencyFor
};
