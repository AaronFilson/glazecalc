'use strict';

// How the language and region pickers group their choices: languages by the part
// of the world they are mostly spoken in, regions by continent. A separate file
// from languages.js and index.js, so adding a language or a region is one line
// there and one line here (a test fails until it is). The groups' names are
// messages in the client (picker.groups.* in client/public/i18n/en.json).
//
// A language belongs where it is mostly spoken, not everywhere it is spoken:
// Spanish and Portuguese are in Europe's group though most of their speakers are
// elsewhere, and Arabic is in the Middle East and North Africa's. Turkish is
// there too, since Türkiye lies on both sides of the line between Europe and Asia.

/** The language groups, in the order the picker lists them (alphabetical, so no part of the world comes first). */
const LANGUAGE_GROUPS = [
  'africa',
  'east-asia',
  'europe',
  'latin-america',
  'middle-east-north-africa',
  'south-asia',
  'southeast-asia',
  'other'
];

/**
 * Each language's group. An empty group lists it first, with no heading: English,
 * the language the app is written in. A language not here (a pseudo-locale made
 * for tests) is in 'other'. The Indian subcontinent's are in ahead of their
 * translations (docs/asia-plan.md, the report on the subcontinent and Arabic).
 */
const LANGUAGE_GROUP_OF = {
  en: '',
  bg: 'europe',
  cs: 'europe',
  da: 'europe',
  de: 'europe',
  el: 'europe',
  es: 'europe',
  et: 'europe',
  fi: 'europe',
  fr: 'europe',
  ga: 'europe',
  hr: 'europe',
  hu: 'europe',
  it: 'europe',
  lt: 'europe',
  lv: 'europe',
  mt: 'europe',
  nl: 'europe',
  pl: 'europe',
  'pt-PT': 'europe',
  ro: 'europe',
  sk: 'europe',
  sl: 'europe',
  sv: 'europe',
  ar: 'middle-east-north-africa',
  tr: 'middle-east-north-africa',
  ja: 'east-asia',
  ko: 'east-asia',
  'zh-Hans': 'east-asia',
  'zh-Hant': 'east-asia',
  id: 'southeast-asia',
  th: 'southeast-asia',
  vi: 'southeast-asia',
  bn: 'south-asia',
  gu: 'south-asia',
  hi: 'south-asia',
  kn: 'south-asia',
  ml: 'south-asia',
  mr: 'south-asia',
  ne: 'south-asia',
  or: 'south-asia',
  pa: 'south-asia',
  si: 'south-asia',
  ta: 'south-asia',
  te: 'south-asia',
  ur: 'south-asia',
  // Round 10 (scratch/round10/c-africa-latam/plan.md), ahead of their translations: Brazilian Portuguese, Latin
  // American Spanish and Quechua in a group of their own, "Latin America" (the lead's default, 2026-10-31),
  // while Spain's Spanish and Portugal's Portuguese stay in Europe's; Africa's languages in Africa's.
  'pt-BR': 'latin-america',
  'es-419': 'latin-america',
  qu: 'latin-america',
  af: 'africa',
  am: 'africa',
  ha: 'africa',
  ig: 'africa',
  so: 'africa',
  sw: 'africa',
  yo: 'africa',
  zu: 'africa'
};

/** The region groups, in the order the picker lists them (alphabetical). */
const REGION_GROUPS = ['africa', 'americas', 'asia', 'europe', 'oceania', 'other'];

/**
 * Each region's continent. Cyprus is in Europe's, as a member of the EU; Türkiye in
 * Asia's, as the United Nations lists it, and the subcontinent's (Sri Lanka and Nepal
 * among them) are in Asia's too. The regions planned for the Arab world are in ahead
 * of their data.
 */
const REGION_GROUP_OF = {
  US: 'americas',
  GB: 'europe',
  AU: 'oceania',
  NZ: 'oceania',
  AT: 'europe',
  BE: 'europe',
  BG: 'europe',
  HR: 'europe',
  CY: 'europe',
  CZ: 'europe',
  DK: 'europe',
  EE: 'europe',
  FI: 'europe',
  FR: 'europe',
  DE: 'europe',
  GR: 'europe',
  HU: 'europe',
  IE: 'europe',
  IT: 'europe',
  LV: 'europe',
  LT: 'europe',
  LU: 'europe',
  MT: 'europe',
  NL: 'europe',
  PL: 'europe',
  PT: 'europe',
  RO: 'europe',
  SK: 'europe',
  SI: 'europe',
  ES: 'europe',
  SE: 'europe',
  JP: 'asia',
  TR: 'asia',
  KR: 'asia',
  TW: 'asia',
  SG: 'asia',
  MY: 'asia',
  CN: 'asia',
  HK: 'asia',
  ID: 'asia',
  TH: 'asia',
  PH: 'asia',
  VN: 'asia',
  IN: 'asia',
  PK: 'asia',
  BD: 'asia',
  LK: 'asia',
  NP: 'asia',
  AE: 'asia',
  IQ: 'asia',
  JO: 'asia',
  EG: 'africa',
  MA: 'africa',
  DZ: 'africa',
  TN: 'africa',
  // Latin America and Africa's first regions (round 10). Latin America is in the Americas' group, as the
  // United States is.
  MX: 'americas',
  BR: 'americas',
  AR: 'americas',
  CL: 'americas',
  ZA: 'africa',
  KE: 'africa',
  GH: 'africa'
};

/** A language's group: '' for none (listed first), one of LANGUAGE_GROUPS otherwise. */
const languageGroup = (code) => (Object.hasOwn(LANGUAGE_GROUP_OF, code) ? LANGUAGE_GROUP_OF[code] : 'other');

/** A region's group, one of REGION_GROUPS. */
const regionGroup = (code) => (Object.hasOwn(REGION_GROUP_OF, code) ? REGION_GROUP_OF[code] : 'other');

module.exports = {
  LANGUAGE_GROUPS,
  LANGUAGE_GROUP_OF,
  REGION_GROUPS,
  REGION_GROUP_OF,
  languageGroup,
  regionGroup
};
