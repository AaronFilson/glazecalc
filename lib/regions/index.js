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
//                but not the norm)
//   library      the standard library's region filter: US, UK, EU or AU
//   density      how glaze density is read: 'sg' (specific gravity), or
//                'baume' (degrees Baumé, read from a hydrometer, as in Italy)

const region = (code, name, languages, eu, extra = {}) => ({
  code,
  name,
  languages,
  eu,
  temperature: 'C',
  cones: eu ? 'temperature' : 'orton',
  density: 'sg',
  library: eu ? 'EU' : code,
  ...extra
});

const REGIONS = [
  region('US', 'United States', ['en'], false, { temperature: 'F' }),
  region('GB', 'United Kingdom', ['en'], false, { library: 'UK' }),
  region('AU', 'Australia', ['en'], false),
  region('NZ', 'New Zealand', ['en'], false, { library: 'AU' }),
  region('AT', 'Austria', ['de'], true),
  region('BE', 'Belgium', ['nl', 'fr', 'de'], true),
  region('BG', 'Bulgaria', ['bg'], true),
  region('HR', 'Croatia', ['hr'], true),
  region('CY', 'Cyprus', ['el'], true),
  region('CZ', 'Czechia', ['cs'], true),
  region('DK', 'Denmark', ['da'], true),
  region('EE', 'Estonia', ['et'], true),
  region('FI', 'Finland', ['fi', 'sv'], true),
  region('FR', 'France', ['fr'], true),
  region('DE', 'Germany', ['de'], true),
  region('GR', 'Greece', ['el'], true),
  region('HU', 'Hungary', ['hu'], true),
  // English-speaking, and served by the UK's suppliers as much as the EU's: Orton cones,
  // and the UK's library, since its shops sell the UK's frits and feldspars.
  region('IE', 'Ireland', ['en', 'ga'], true, { cones: 'orton', library: 'UK' }),
  region('IT', 'Italy', ['it'], true, { density: 'baume' }),
  region('LV', 'Latvia', ['lv'], true),
  region('LT', 'Lithuania', ['lt'], true),
  region('LU', 'Luxembourg', ['fr', 'de'], true),
  region('MT', 'Malta', ['mt', 'en'], true),
  region('NL', 'Netherlands', ['nl'], true),
  region('PL', 'Poland', ['pl'], true),
  region('PT', 'Portugal', ['pt'], true),
  region('RO', 'Romania', ['ro'], true),
  region('SK', 'Slovakia', ['sk'], true),
  region('SI', 'Slovenia', ['sl'], true),
  region('ES', 'Spain', ['es'], true),
  region('SE', 'Sweden', ['sv'], true)
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
  'sv-FI'
];

const { baseLanguage } = require('./languages');

const regionFor = (code) => REGIONS.find((r) => r.code === code);

/**
 * The locale for numbers and dates: the one chosen, or else the page's
 * language with the region's conventions (en with DE gives en-DE: English,
 * with a decimal comma), or the language alone where no region is chosen.
 * Portuguese is always European Portuguese, since bare pt means Brazil's.
 * A language with its own region (pt-PT) or a pseudo-locale (en-XA) gives
 * way to its base language here.
 */
const formatLocaleFor = function (language, regionCode, format) {
  if (format && format !== 'auto') return format;
  const lang = baseLanguage(language || 'en');
  if (regionFor(regionCode)) return lang + '-' + regionCode;
  return lang === 'pt' ? 'pt-PT' : lang;
};

module.exports = { REGIONS, REGION_CODES, FORMAT_LOCALES, regionFor, formatLocaleFor };
