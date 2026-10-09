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
//   base     the language whose plural rules and number formats apply, where
//            that is not the code itself
//   pseudo   made in the browser from the English, for tests: every message
//            accented and lengthened (en-XA), or right to left (ar-XB)

const language = (code, name, english, extra = {}) => ({ code, name, english, dir: 'ltr', live: false, ...extra });

const LANGUAGES = [
  language('en', 'English', 'English', { live: true }),
  // The EU's official languages. The first wave (German, French, Spanish,
  // Italian, Polish and European Portuguese) is translated and offered
  // (docs/i18n-plan.md, Phase 3); the rest follow in later waves.
  language('bg', 'Български', 'Bulgarian'),
  language('cs', 'Čeština', 'Czech'),
  language('da', 'Dansk', 'Danish'),
  language('de', 'Deutsch', 'German', { live: true }),
  language('el', 'Ελληνικά', 'Greek'),
  language('es', 'Español', 'Spanish', { live: true }),
  language('et', 'Eesti', 'Estonian'),
  language('fi', 'Suomi', 'Finnish'),
  language('fr', 'Français', 'French', { live: true }),
  language('ga', 'Gaeilge', 'Irish'),
  language('hr', 'Hrvatski', 'Croatian'),
  language('hu', 'Magyar', 'Hungarian'),
  language('it', 'Italiano', 'Italian', { live: true }),
  language('lt', 'Lietuvių', 'Lithuanian'),
  language('lv', 'Latviešu', 'Latvian'),
  language('mt', 'Malti', 'Maltese'),
  language('nl', 'Nederlands', 'Dutch'),
  language('pl', 'Polski', 'Polish', { live: true }),
  language('pt-PT', 'Português (Portugal)', 'Portuguese (Portugal)', { live: true }),
  language('ro', 'Română', 'Romanian'),
  language('sk', 'Slovenčina', 'Slovak'),
  language('sl', 'Slovenščina', 'Slovenian'),
  language('sv', 'Svenska', 'Swedish'),
  // The first right-to-left language, for the trial of a mirrored layout (ADR 13).
  language('ar', 'العربية', 'Arabic', { dir: 'rtl' }),
  language('en-XA', 'Ëñĝļîšĥ (pseudo)', 'Pseudo-English', { base: 'en', pseudo: true }),
  language('ar-XB', 'Right to left (pseudo)', 'Pseudo right-to-left', { dir: 'rtl', base: 'en', pseudo: true })
];

const LANGUAGE_CODES = LANGUAGES.map((l) => l.code);
const LIVE_LANGUAGES = LANGUAGES.filter((l) => l.live).map((l) => l.code);

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
  languageFor,
  baseLanguage,
  textLanguage,
  languageOfPath,
  pagePath,
  languagePrefix
};
