'use strict';

// The languages of the page (docs/i18n-plan.md). A language is live once all
// of its translation files are in client/public/i18n; until then it is known
// but not offered, and its pages say noindex. Shared by the server (to check a
// saved choice and to write each page's lang, dir and hreflang links) and the
// browser.
//
//   code     BCP 47, as it appears in the URL (/de/recipe, /pt-PT/recipe)
//   name     in the language itself, as the language menu shows it
//   english  in English
//   dir      'ltr' or 'rtl'
//   live     offered in Settings and to search engines
//   reference  the cone chart, the list of materials and each material's page are
//            translated into it (lib/pages.js); until then they show the English
//            with a notice, as they do in a language that is not live
//   base    the language whose plural rules and number formats apply, where
//            that is not the code itself
//   pseudo   made in the browser from the English, for tests: every message
//            accented and lengthened (en-XA), right to left (ar-XB), in
//            Japanese characters with no spaces, shorter than the English (ja-XC),
//            in Arabic letters (ar-XD), in Devanagari (hi-XE), in Tamil (ta-XF),
//            in Kannada (kn-XG) or in Malayalam (ml-XH)
//   digits   the digits numbers are written in, where the language pins them
//            (Intl's numbering system: 'arab' for Arabic-Indic, ٠١٢)
//   textDigits  the figures of its messages and guides, which translations
//            write 0–9, are shown in the digits its numbers are formatted in
//            (Bengali's ১২৩ where they are usual), so a page never mixes the
//            two; 0–9 where the reader chose them (client/app/shared/text-digits.ts)
//   plainNotice  AI translates it less well than most (Irish, Maltese), so its
//            notice says so plainly, points to the English, and a line of it
//            stays on every page once closed (docs/i18n-plan.md, "The plan,
//            reviewed critically", point 2)

const language = (code, name, english, extra = {}) => ({ code, name, english, dir: 'ltr', live: false, ...extra });

const LANGUAGES = [
  language('en', 'English', 'English', { live: true, reference: true }),
  // The EU's official languages. The first wave (German, French, Spanish,
  // Italian, Polish and European Portuguese) is translated and offered
  // (docs/i18n-plan.md, Phase 3); the rest follow in later waves.
  language('bg', 'Български', 'Bulgarian', { live: true, reference: true }),
  language('cs', 'Čeština', 'Czech', { live: true, reference: true }),
  language('da', 'Dansk', 'Danish', { live: true, reference: true }),
  language('de', 'Deutsch', 'German', { live: true, reference: true }),
  language('el', 'Ελληνικά', 'Greek', { live: true, reference: true }),
  language('es', 'Español', 'Spanish', { live: true, reference: true }),
  language('et', 'Eesti', 'Estonian', { live: true, reference: true }),
  language('fi', 'Suomi', 'Finnish', { live: true, reference: true }),
  language('fr', 'Français', 'French', { live: true, reference: true }),
  language('ga', 'Gaeilge', 'Irish', { live: true, plainNotice: true, reference: true }),
  language('hr', 'Hrvatski', 'Croatian', { live: true, reference: true }),
  language('hu', 'Magyar', 'Hungarian', { live: true, reference: true }),
  language('it', 'Italiano', 'Italian', { live: true, reference: true }),
  language('lt', 'Lietuvių', 'Lithuanian', { live: true, reference: true }),
  language('lv', 'Latviešu', 'Latvian', { live: true, reference: true }),
  language('mt', 'Malti', 'Maltese', { live: true, plainNotice: true, reference: true }),
  language('nl', 'Nederlands', 'Dutch', { live: true, reference: true }),
  language('pl', 'Polski', 'Polish', { live: true, reference: true }),
  language('pt-PT', 'Português (Portugal)', 'Portuguese (Portugal)', { live: true, reference: true }),
  language('ro', 'Română', 'Romanian', { live: true, reference: true }),
  language('sk', 'Slovenčina', 'Slovak', { live: true, reference: true }),
  language('sl', 'Slovenščina', 'Slovenian', { live: true, reference: true }),
  language('sv', 'Svenska', 'Swedish', { live: true, reference: true }),
  // East Asia's first (docs/asia-plan.md, Phase D), with the standard notice.
  language('ja', '日本語', 'Japanese', { live: true, reference: true }),
  // Phase E's Turkish (docs/asia-plan.md), with the standard notice; live since the owner's
  // KVKK decision (decision 10), with the sign-up page's notice on where accounts are kept.
  language('tr', 'Türkçe', 'Turkish', { live: true, reference: true }),
  // Wave 1's other three (docs/asia-plan.md, Phase D), with the standard notice: Traditional
  // Chinese as Taiwan writes it (Hong Kong reads it too), Korean, and Simplified Chinese; each
  // live once its back-translated safety text was checked against the English.
  language('zh-Hant', '繁體中文', 'Traditional Chinese', { live: true, reference: true }),
  language('ko', '한국어', 'Korean', { live: true, reference: true }),
  language('zh-Hans', '简体中文', 'Simplified Chinese', { live: true, reference: true }),
  // Wave 2's three (docs/asia-plan.md, Phase E), with the standard notice: Indonesian, Vietnamese
  // and Thai (digits stay Western; dates Gregorian unless the Calendar setting says otherwise);
  // each live once its back-translated safety text was checked against the English.
  language('id', 'Bahasa Indonesia', 'Indonesian', { live: true, reference: true }),
  language('vi', 'Tiếng Việt', 'Vietnamese', { live: true, reference: true }),
  language('th', 'ภาษาไทย', 'Thai', { live: true, reference: true }),
  // The Indian subcontinent and Arabic's first two (docs/translations/process/README.md, "Indian
  // subcontinent and Arabic, Phase D"), with the standard notice: Modern Standard Arabic, the first
  // right-to-left language (its pages were the trial of a mirrored layout, ADR 13), and Hindi. Their
  // translations write the digits 0 to 9; the app writes each region's own when it formats a number.
  language('ar', 'العربية', 'Arabic', { live: true, dir: 'rtl' }),
  language('hi', 'हिन्दी', 'Hindi', { live: true }),
  // The subcontinent's next two (docs/translations/process/README.md, "Indian subcontinent, Phase D: Urdu
  // and Bengali"), with the standard notice: Urdu, right to left in Nastaliq, written for Pakistan, which
  // writes 0–9; and Bengali, written for Bangladesh, whose pages show every figure in Bengali digits (the
  // owner's decision, 2026-10-21). Their translations write the digits 0 to 9.
  language('ur', 'اردو', 'Urdu', { live: true, dir: 'rtl' }),
  language('bn', 'বাংলা', 'Bengali', { live: true, textDigits: true }),
  // India's regional languages (docs/translations/ta.md, mr.md, kn.md; wave I1 of scratch/round8/in-langs/plan.md),
  // written for India with the standard notice: Tamil and Kannada show 0–9, Marathi Devanagari digits by default
  // (CLDR); their translations write 0 to 9. The later waves (te gu ml, pa or, ne si) are one line here, one in
  // groups.js, and their fonts in client/styles.scss.
  language('ta', 'தமிழ்', 'Tamil', { live: true }),
  language('mr', 'मराठी', 'Marathi', { live: true }),
  language('kn', 'ಕನ್ನಡ', 'Kannada', { live: true }),
  // India's next waves (scratch/round8/in-langs/plan.md): I2 Telugu, Gujarati and Malayalam, live since round 9
  // (docs/translations/te.md, gu.md, ml.md), and I3 Punjabi (Gurmukhi) and Odia, written for India, live since
  // round 9 too (pa.md, or.md), and I4 Nepali, written for Nepal, and Sinhala, for Sri Lanka, live since round 9
  // as well (ne.md, si.md). Nepali shows Devanagari digits by default (CLDR; owner kept it, 2026-10-30), the others 0–9.
  // Every one of them has the standard notice (owner, 2026-10-30).
  language('te', 'తెలుగు', 'Telugu', { live: true }),
  language('gu', 'ગુજરાતી', 'Gujarati', { live: true }),
  language('ml', 'മലയാളം', 'Malayalam', { live: true }),
  language('pa', 'ਪੰਜਾਬੀ', 'Punjabi', { live: true }),
  language('or', 'ଓଡ଼ିଆ', 'Odia', { live: true }),
  language('ne', 'नेपाली', 'Nepali', { live: true }),
  language('si', 'සිංහල', 'Sinhala', { live: true }),
  language('en-XA', 'Ëñĝļîšĥ (pseudo)', 'Pseudo-English', { base: 'en', pseudo: true }),
  language('ar-XB', 'Right to left (pseudo)', 'Pseudo right-to-left', { dir: 'rtl', base: 'en', pseudo: true }),
  // Japanese's fonts, line breaks and plural rules (other only), on text that has no spaces to break at.
  language('ja-XC', '擬似日本語 (pseudo)', 'Pseudo-Japanese', { base: 'ja', pseudo: true }),
  // Real Arabic letters, read right to left by the browser's own rules, with Arabic's six plural forms and
  // Arabic-Indic digits: a value not kept apart from the text around it shows it ("1240 °C" read "C° 1240").
  language('ar-XD', 'عربي مستعار (pseudo)', 'Pseudo-Arabic', { dir: 'rtl', base: 'ar', pseudo: true, digits: 'arab' }),
  // Devanagari, with letters stacked and marks above and below them: Hindi's fonts and taller lines.
  language('hi-XE', 'छद्म हिन्दी (pseudo)', 'Pseudo-Hindi', { base: 'hi', pseudo: true }),
  // Tamil's wide letters and long words, with vowel signs above and below them (no plural forms but one and other).
  language('ta-XF', 'போலித் தமிழ் (pseudo)', 'Pseudo-Tamil', { base: 'ta', pseudo: true }),
  // Kannada's tall stacks of letters below the line, and `one` taking 0 as well as 1.
  language('kn-XG', 'ನಕಲಿ ಕನ್ನಡ (pseudo)', 'Pseudo-Kannada', { base: 'kn', pseudo: true }),
  // Malayalam's wide letters and the longest words of all (about 40% more letters than the English), with its
  // chillu letters. Its own letter, H: G is Kannada's.
  language('ml-XH', 'വ്യാജ മലയാളം (pseudo)', 'Pseudo-Malayalam', { base: 'ml', pseudo: true })
];

const LANGUAGE_CODES = LANGUAGES.map((l) => l.code);
const LIVE_LANGUAGES = LANGUAGES.filter((l) => l.live).map((l) => l.code);
const REFERENCE_LANGUAGES = LANGUAGES.filter((l) => l.reference).map((l) => l.code);

const languageFor = (code) => LANGUAGES.find((l) => l.code === code);

/**
 * The language itself, without its region: en for en-XA, pt for pt-PT. Number
 * formats add the reader's region to it (lib/regions/index.js).
 */
const baseLanguage = (code) => {
  const known = languageFor(code);
  if (known && known.base) return known.base;
  try {
    return new Intl.Locale(code).language;
  } catch {
    return 'en';
  }
};

/**
 * The locale of a page's text: its plural rules, and the names of regions and
 * languages in it. A language's own code where it has its own rules (pt-PT,
 * where 0 is plural, unlike Brazil's pt); English for a pseudo-locale.
 */
const textLanguage = (code) => {
  const known = languageFor(code);
  if (known && known.base) return known.base;
  try {
    return Intl.getCanonicalLocales(code)[0];
  } catch {
    return 'en';
  }
};

/**
 * The language a page is in, from the first part of its path: /de/recipe is
 * German, /recipe is English (docs/adr/0013-translations.md).
 */
const languageOfPath = (pathname) => {
  const language = languageFor(String(pathname).split('/')[1] || '');
  return language && language.code !== 'en' ? language.code : 'en';
};

/**
 * The same address with its language's part written as the language's code
 * is (/zh-hans/recipe to /zh-Hans/recipe, /DE/guides to /de/guides), for a
 * redirect: language tags are not case-sensitive, but a page has one
 * address. Null where the part is already written so, or is no language's.
 * English has no part of its own; /EN/ goes the way /en/ does.
 */
const canonicalLanguagePath = (pathname) => {
  const part = String(pathname).split('/')[1] || '';
  const known = LANGUAGES.find((l) => l.code.toLowerCase() === part.toLowerCase());
  if (!known || known.code === part || known.code === 'en') return null;
  return '/' + known.code + pathname.slice(part.length + 1);
};

/**
 * The language offered that a browser's language tag asks for, or null: de-AT
 * asks for de, pt-BR for pt-PT, and Chinese for the script its region writes
 * (zh-TW, zh-HK and zh-MO for zh-Hant; zh-CN and zh-SG for zh-Hans), as
 * Intl.Locale's maximize() fills it in. Of two that fit, the one of the same
 * region. For the language links only: no page is ever sent to a language
 * by a guess (docs/adr/0013-translations.md).
 */
const languageOfTag = (tag, offered = LIVE_LANGUAGES) => {
  let wanted;
  try {
    wanted = new Intl.Locale(tag).maximize();
  } catch {
    return null;
  }
  const fits = offered
    .filter((code) => !(languageFor(code) || {}).pseudo)
    .map((code) => ({ code, full: new Intl.Locale(code).maximize() }))
    .filter(({ full }) => full.language === wanted.language && full.script === wanted.script);
  const same = fits.find(({ full }) => full.region === wanted.region) || fits[0];
  return same ? same.code : null;
};

/** A page's path without its language's part: /de/recipe and /recipe are both /recipe. */
const pagePath = (pathname) => {
  const code = languageOfPath(pathname);
  return code === 'en' ? pathname : pathname.slice(code.length + 1) || '/';
};

/** Where a language's pages start, before the page's path: '' for English, /de for German. */
const languagePrefix = (code) => (languageFor(code) && code !== 'en' ? '/' + code : '');

/**
 * The key a piece of text from the app's data is translated under (who to
 * call, the standard materials' notes and hazards): a few of its words, and a
 * hash of all of it, so a translation is only ever shown for exactly the
 * English it was made from. Change a hazard, and its old translation stops
 * showing.
 */
const textKey = (text) => {
  let hash = 0x811c9dc5;
  for (const char of text) hash = Math.imul(hash ^ char.codePointAt(0), 0x01000193) >>> 0;
  const words = text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .split('-')
    .slice(0, 6)
    .join('-');
  return (words || 'text') + '-' + hash.toString(36);
};

module.exports = {
  textKey,
  LANGUAGES,
  LANGUAGE_CODES,
  LIVE_LANGUAGES,
  REFERENCE_LANGUAGES,
  languageFor,
  baseLanguage,
  textLanguage,
  languageOfPath,
  canonicalLanguagePath,
  languageOfTag,
  pagePath,
  languagePrefix
};
