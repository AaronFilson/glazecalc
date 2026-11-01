// Checks the app's messages (docs/adr/0013-translations.md); CI runs it.
//
//   node scripts/i18n-check.mjs
//
// 1. Every key the app uses has its English, and every English message is
//    used. Keys are found by the Transloco keys manager's own extractors, in
//    the app's templates and code but not its tests (its command line has no
//    way to leave tests out, so its extractors are called here directly).
// 2. Each translation has only keys the English has, the same placeholders
//    and tags in each message, and the plural forms its language needs
//    (CLDR's, through Intl.PluralRules).
// 3. Romanian is written with the comma below (ș ț), not the cedilla (ş ţ);
//    Simplified Chinese has no Traditional characters, Traditional Chinese
//    no Simplified ones, and Japanese no simplified hanzi (SCRIPT_PAIRS).
// 4. The English of the server's and the chemistry's messages, which live in
//    code and are shown by their codes, is current (npm run i18n:sources).
// 5. Each translated guide keeps what the page draws from the English's
//    marks: its sections' ids, its temperatures and densities, its parts for
//    each way of firing, and who to call.
// 6. The figures are the English's (docs/i18n-plan.md, the automatic gates):
//    each translated message and each section of a translated guide has the
//    same numbers, with their units, and the same links, numbers written the
//    language's way (1,5 for 1.5 in German). A changed temperature, limit or
//    phone number cannot ship. Each section of a guide keeps the English's
//    structure too: its headings, tables, lists and callouts. A guide in
//    English only (ENGLISH_ONLY_PAGES in lib/pages.js) has no other copy. The
//    cone chart and the materials (REFERENCE_LANGUAGES) are complete in each
//    language they are shown in (checkReferenceLanguages), and may be partly
//    translated in the others.
// 7. Each translation is in step with the English it was made from
//    (scripts/i18n-fingerprints.mjs); and what is still in English is
//    counted, language by language.
// 8. Korean is written in Hangul: hanja only where its glossary gives them.
// 9. A translation writes its digits 0–9: a language's own (Arabic-Indic,
//    Bengali, Devanagari) are shown from the reader's settings, never typed
//    into a translation. The figures check (6) reads them all the same, with
//    Indian digit groups (1,00,000) and the Arabic marks (٫ ٬ ٪). Indian
//    languages' 12-hour times (रात 8 बजे) are kept whole, so they show as
//    not in the English.
// 10. An Indian language is written in its own script and Latin (checkScripts);
//    every translation is in Unicode form NFC (checkNormalization); a stray
//    ZWJ or ZWNJ is a slip, but where the script needs one (checkJoiners).
// 11. Where a language's `one` also takes 0 (Hindi, Kannada, French ...), an
//    English plural whose `one` is for exactly one has an `=1` form in the
//    translation (compareMessage).
// 12. Urdu ends its sentences with ۔ and writes Urdu's letters (ی ک ہ), not
//    the Arabic ones; Bengali ends its sentences with the danda । (U+0964),
//    never its look-alike ৷ (U+09F7); both in Unicode's composed form (NFC).
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { TYPE, parse } from '@formatjs/icu-messageformat-parser';
import { Lexer } from 'marked';
import numbers from '../lib/recipe/numbers.js';
import languageData from '../lib/regions/languages.js';
import { ENGLISH_ONLY_GUIDES, guideSegments, updateTranslations } from './i18n-fingerprints.mjs';
import { sources } from './i18n-sources.mjs';

const { REFERENCE_LANGUAGES } = languageData;
const ROOT = path.resolve(import.meta.dirname, '..');
const APP = path.join(ROOT, 'client', 'app');
const I18N = path.join(ROOT, 'client', 'public', 'i18n');
/** Scopes shown by code rather than by key, whose English comes from code (scripts/i18n-sources.mjs). */
const FROM_CODE = ['server', 'chemistry', 'safety', 'regions', 'records'];
/**
 * Messages whose figures show how numbers are written ("12,5 or 12.5"), not
 * values, so a language writes them its own way: left out of the numbers check.
 */
const NOTATION = ['account settings.decimalMark.either.example'];

/** A nested messages file as flat keys: { nav: { menu: 'Menu' } } is { 'nav.menu': 'Menu' }. */
export function flatten(messages, prefix = '', into = {}) {
  for (const [key, value] of Object.entries(messages)) {
    const name = prefix ? prefix + '.' + key : key;
    if (value && typeof value === 'object') flatten(value, name, into);
    else into[name] = value;
  }
  return into;
}

/** What a message needs from its code and gives its reader: its arguments, tags, and plural forms by argument. */
export function shapeOf(message) {
  const args = new Set();
  const tags = new Set();
  const plurals = [];
  const walk = (elements) => {
    for (const element of elements) {
      if (element.type === TYPE.tag) {
        tags.add(element.value);
        walk(element.children);
      } else if (element.type !== TYPE.literal && element.type !== TYPE.pound) {
        args.add(element.value);
        if (element.type === TYPE.plural || element.type === TYPE.select) {
          if (element.type === TYPE.plural) {
            plurals.push({
              arg: element.value,
              ordinal: element.pluralType === 'ordinal',
              forms: Object.keys(element.options)
            });
          }
          for (const option of Object.values(element.options)) walk(option.value);
        }
      }
    }
  };
  walk(parse(message));
  return { args: [...args].sort(), tags: [...tags].sort(), plurals };
}

/** A message's own words, without its placeholders: each part on its own line, so no number runs into the next. */
function literalsOf(message) {
  const parts = [];
  const walk = (elements) => {
    for (const element of elements) {
      if (element.type === TYPE.literal) parts.push(element.value);
      else if (element.type === TYPE.tag) walk(element.children);
      else if (element.type === TYPE.plural || element.type === TYPE.select) {
        for (const option of Object.values(element.options)) walk(option.value);
      }
    }
  };
  walk(parse(message));
  return parts.join('\n');
}

/** Units kept as symbols after a number, longest first. */
const UNITS = [
  '°C/h',
  '°F/h',
  '°C',
  '°F',
  '%',
  'ppm',
  'mg',
  'kg',
  'g',
  'ml',
  'mL',
  'lbs',
  'lb',
  'oz',
  'mm',
  'cm',
  'µm',
  'kWh'
];
/**
 * A word goes on after a unit if a Latin, Greek or Cyrillic letter follows it
 * (5 grams is not 5 g). Japanese, Chinese, Korean and Thai run a unit into
 * the next word, 10 gの or 1240 °Cで, and it is a unit all the same.
 */
const WORD_GOES_ON = String.raw`\p{Script=Latin}\p{Script=Greek}\p{Script=Cyrillic}`;
const UNIT_AFTER = new RegExp(`^[ \\u00a0\\u202f]?(${UNITS.join('|')})(?![${WORD_GOES_ON}])`, 'u');
/** A temperature written without its degree sign, 1742 F, or with it apart, 40° F: °F all the same. */
const DEGREES_AFTER = new RegExp(`^°?[ \\u00a0\\u202f]?°?([CF])(?![${WORD_GOES_ON}\\d])`, 'u');

/**
 * A text with the forms a Japanese, Chinese or Korean keyboard types made
 * plain (NFKC): full-width digits, letters and signs, ℃ and ℉, and squared
 * units such as ㎏, so １２２２℃ is 1222 °C and ５％ is 5 %. Only these: NFKC
 * would make Europe's subscripts (Al₂O₃), fractions and no-break spaces
 * plain too. The full-width comma stays, as punctuation between CJK words
 * rather than a thousands separator.
 */
const plainForms = (text) =>
  text.replace(/[\u2103\u2109\u3380-\u33ff\uff01-\uff0b\uff0d-\uff5e]+/gu, (run) => run.normalize('NFKC'));

/** Whether a language writes the percent sign before its number, as Turkish does: %5. */
const percentFirst = (language) =>
  new Intl.NumberFormat(language, { style: 'percent' }).formatToParts(0.05)[0].type === 'percentSign';

/**
 * A clock time written with a 12-hour marker: 午後8時 (Japanese), 晚上8点 and
 * 下午8時 (Chinese), 오후 8시 (Korean), 8 giờ tối (Vietnamese), pukul 8 malam
 * (Indonesian). The style sheets ask for the 24-hour clock (20時, 20点, 20시),
 * so these are not read as numbers but kept whole, and so reported.
 */
const TWELVE_HOUR = new RegExp(
  [
    String.raw`(?:午前|午後|上午|下午|早上|晚上|凌晨|傍晚|中午|오전|오후)[ \u00a0]?\d{1,2}[ \u00a0]?(?:時|时|点|點|시)`,
    String.raw`\d{1,2}[ \u00a0]?giờ[ \u00a0](?:sáng|trưa|chiều|tối|đêm)`,
    String.raw`pukul[ \u00a0]\d{1,2}(?:[.:]\d{2})?[ \u00a0](?:pagi|siang|sore|malam)`
  ]
    .concat(indicTwelveHour())
    .join('|'),
  'giu'
);

/**
 * The Indian languages' 12-hour times, a part of the day before the hour and the word for o'clock after it, as
 * their style sheets ask to be left out: रात 8 बजे (Hindi), रात्री 8 वाजता (Marathi), இரவு 8 மணிக்கு (Tamil),
 * రాత్రి 8 గంటలకు (Telugu), ರಾತ್ರಿ 8 ಗಂಟೆಗೆ (Kannada), രാത്രി 8 മണിക്ക് (Malayalam), રાત્રે 8 વાગ્યે (Gujarati),
 * ਰਾਤ 8 ਵਜੇ (Punjabi), ରାତି 8 ଟା (Odia), राति 8 बजे (Nepali), ප.ව. 8.00 (Sinhala). Hindi also puts the part of
 * the day after the time (8 बजे रात) and may add को or के; Sinhala puts ප.ව. (afternoon) or පෙ.ව. (morning)
 * before or after it. The 24-hour clock is 20:00. The patterns are NFC, as the translations are
 * (checkNormalization).
 */
function indicTwelveHour() {
  const hour = String.raw`[ \u00a0]?\d{1,2}(?:[:.]\d{2})?[ \u00a0]?`;
  // [the parts of the day, the word for o'clock, a particle that may come between]
  const clocks = [
    ['रात|सुबह|सवेरे|शाम|दोपहर|भोर', 'बजे', String.raw`(?:[ \u00a0](?:को|के|में))?`],
    ['रात्री|रात्र|रात|सकाळी|दुपारी|संध्याकाळी|सायंकाळी|पहाटे', 'वाज(?:ता|ले|ून)'],
    ['காலை|மாலை|இரவு|பிற்பகல்|மதியம்|நள்ளிரவு|அதிகாலை', 'மணி(?:க்கு|யளவில்)?'],
    ['రాత్రి|ఉదయం|సాయంత్రం|మధ్యాహ్నం|తెల్లవారుజామున', 'గంట(?:లకు|కు|ల)?'],
    ['ರಾತ್ರಿ|ಬೆಳಿಗ್ಗೆ|ಬೆಳಗ್ಗೆ|ಸಂಜೆ|ಮಧ್ಯಾಹ್ನ|ಮಧ್ಯರಾತ್ರಿ', 'ಗಂಟೆ(?:ಗೆ|ಯ)?'],
    ['രാത്രി|രാവിലെ|വൈകുന്നേരം|ഉച്ചയ്ക്ക്|ഉച്ച', 'മണി(?:ക്ക്|ക്കു)?'],
    ['રાત્રે|રાતે|સવારે|સાંજે|બપોરે', '(?:વાગ્યે|વાગે)'],
    ['ਰਾਤ|ਸਵੇਰ|ਸ਼ਾਮ|ਦੁਪਹਿਰ', 'ਵਜੇ', String.raw`(?:[ \u00a0](?:ਨੂੰ|ਦੇ))?`],
    ['ରାତି|ସକାଳ|ସନ୍ଧ୍ୟା|ଅପରାହ୍ନ|ଦିନ', 'ଟା(?:ରେ)?'],
    ['बेलुका|राति|बिहान|दिउँसो|साँझ', 'बजे']
  ];
  const patterns = clocks.map(([parts, o, particle = '']) => `(?:${parts})${particle}${hour}${o}`.normalize('NFC'));
  patterns.push(
    String.raw`\d{1,2}(?:[:.]\d{2})?[ \u00a0]?बजे[ \u00a0](?:रात|सुबह|शाम|दोपहर)`,
    String.raw`(?:ප\.ව\.|පෙ\.ව\.)[ \u00a0]?\d{1,2}(?:[:.]\d{2})?`,
    String.raw`\d{1,2}(?:[:.]\d{2})?[ \u00a0]?(?:ප\.ව\.|පෙ\.ව\.)`
  );
  return patterns;
}

/**
 * Thai, Indonesian and Turkish write 8 pm 20.00: the hour before น. (Thai)
 * or a time zone (WIB, WITA, WIT), or after pukul or jam (Indonesian) or saat
 * (Turkish). Read as 20, or 20:30, as English's 8pm and 8:30pm are.
 */
const DOTTED_TIME = {
  th: /(?<![\d.,])(\d{1,2})\.(\d{2})(?=[ \u00a0]?น\.)/gu,
  id: /(?<=\b(?:pukul|jam)[ \u00a0])(\d{1,2})\.(\d{2})(?!\d)|(?<![\d.,])(\d{1,2})\.(\d{2})(?=[ \u00a0](?:WIB|WITA|WIT)\b)/giu,
  tr: /(?<=\bsaat )(\d{1,2})\.(\d{2})(?!\d)/giu
};

/**
 * A unit a language writes in its own words, as its style sheet asks:
 * Lithuanian writes degrees per hour as °C/val. (valanda, an hour), which is
 * English's °C/h.
 */
const UNIT_WORDS = {
  lt: [[/°([CF])\/val\.?(?![\p{L}\d])/gu, '°$1/h']]
};

/** Whether a language writes 1.5 with a point, as English does (or Arabic's ١٫٥), rather than a comma. */
const decimalPoint = (language) =>
  ['.', '٫'].includes(
    new Intl.NumberFormat(language).formatToParts(1.5).find((part) => part.type === 'decimal')?.value
  );

/**
 * A text's numbers written with 0–9 and the marks of the language's own
 * pattern: Arabic-Indic, Devanagari, Bengali and other digits as 0–9; the
 * Arabic decimal and thousands marks (١٬٢٢٢٫٥) as a point and a comma, or a
 * comma and a point where the language takes a decimal comma; the Arabic
 * percent sign as %; and without the marks that keep a number's direction in
 * Arabic text, which Intl writes around a sign or a percent and a copied
 * number keeps.
 */
const plainNumbers = (text, english) =>
  numbers
    .plainDigits(text)
    .replace(/٫/g, english ? '.' : ',')
    .replace(/٬/g, english ? ',' : '.')
    .replace(/٪/g, '%');

/**
 * The numbers in a text, as English writes them, each with the unit after it:
 * ['1222 °C', '06', '1.5 %']. German 1.222 and 1,5 are 1222 and 1.5; French
 * 1 222 (a narrow space) is 1222. Leading zeros stay (cone 06 is not cone 6).
 * A dot before one or two digits cannot group thousands, so it is a decimal
 * point in any language: a product's code, Keramikos 10.05, stays as it is.
 * Times are read on the 24-hour clock, as most languages write them: 8pm is 20.
 * Irish and Maltese write numbers as English does (CLDR's, through Intl).
 * Full-width forms are read as their plain ones (１０ｇ is 10 g, ℃ is °C),
 * Turkish %5 is 5 %, and a 12-hour time such as 午後8時 is kept whole, so it
 * shows as not in the English. Numbers written in words (十, 二十) are not
 * read, so they show as missing. Indian digit groups are read as one number
 * (Hindi's 1,00,000 is 100000, 12,34,567.5 is 1234567.5); so are any
 * script's digits (١٢٢٢ is 1222, though checkDigits asks a translation for
 * 0–9), the Arabic marks (١٫٥, ٥٪) and a number among the marks that keep
 * its direction.
 */
export function numbersIn(text, language) {
  const english = decimalPoint(language);
  const found = new Set();
  text = plainNumbers(plainForms(text), english).replace(TWELVE_HOUR, (time) => {
    found.add(time);
    return ' ';
  });
  const dotted = DOTTED_TIME[new Intl.Locale(language).language];
  if (dotted) {
    text = text.replace(dotted, (...groups) => {
      const [hour, minutes] = groups.slice(1, 5).filter(Boolean);
      return minutes === '00' ? String(Number(hour)) : `${hour}:${minutes}`;
    });
  }
  for (const [words, unit] of UNIT_WORDS[new Intl.Locale(language).language] ?? []) {
    text = text.replace(words, unit);
  }
  if (percentFirst(language)) {
    // A range takes the sign once, before it, as English takes it once after: %10\u201360 is 10\u201360%.
    text = text.replace(
      /(?<![\p{L}\p{N}])%[ \u00a0\u202f]?(\d[\d.,]*\d|\d)([\u2013-])(\d[\d.,]*\d|\d)(?![\d%])/gu,
      '$1$2$3 %'
    );
    text = text.replace(/(?<![\p{L}\p{N}])%[ \u00a0\u202f]?(\d[\d.,]*\d|\d)/gu, '$1 %');
  }
  text = text.replace(/\b(\d{1,2})(?::(\d{2}))?\s?([ap])\.?m\b\.?/gi, (_, hour, minutes, half) => {
    const h = (Number(hour) % 12) + (half.toLowerCase() === 'p' ? 12 : 0);
    return minutes ? `${h}:${minutes}` : String(h);
  });
  // A clock time's hour needs no leading zero: 08:30 is 8:30, or 8 h 30.
  text = text.replace(/(?<![\d.,])0(\d)(?=(?::|\.|[ \u00a0\u202f]?h[ \u00a0\u202f]?)\d{2}(?!\d))/g, '$1');
  // A time on the hour is its hour, however written: 8:00 and 8 h 00 are 8, as 8am and Turkish saat 8.00 are.
  text = text.replace(/(?<![\d.,:])(\d{1,2})(?::|[ \u00a0\u202f]?h[ \u00a0\u202f]?)00(?![\d:])/g, '$1');
  // Indian groups first, where a decimal point leaves the comma to group: 12,34,567.5, not 12 and 34.
  const pattern = english
    ? /\d{1,2}(?:,\d{2})+,\d{3}(?!\d)(?:\.\d+)?|\d+(?:,\d{3}(?!\d))*(?:\.\d+)?/g
    : /\d+(?:[.\u00a0\u202f]\d{3}(?!\d))*(?:,\d+|\.\d{1,2}(?!\d))?/g;
  for (const match of text.matchAll(pattern)) {
    let number = match[0];
    number = english
      ? number.replaceAll(',', '')
      : number
          .replace(/\.(\d{1,2})$/, ',$1')
          .replace(/[.\u00a0\u202f]/g, '')
          .replace(',', '.');
    const after = text.slice(match.index + match[0].length);
    const unit =
      UNIT_AFTER.exec(after)?.[1]?.replace(/^lbs$/, 'lb') ??
      (DEGREES_AFTER.test(after) ? '°' + DEGREES_AFTER.exec(after)[1] : null);
    found.add(unit ? `${number} ${unit}` : number);
  }
  return [...found].sort();
}

/** The web addresses and Markdown link targets in a text. */
export function linksIn(text) {
  const found = new Set();
  for (const match of text.matchAll(/\]\(([^)\s]+)\)/g)) found.add(match[1]);
  for (const match of text.replace(/\]\([^)\s]+\)/g, '').matchAll(/https?:\/\/[^\s<>"')\]]+/g))
    found.add(match[0].replace(/[.,;:]$/, ''));
  return [...found].sort();
}

/**
 * Codes written with dots, such as a regulation (29 CFR 1910.1053) or a
 * document number (545.450): more than one dot, or three digits or more on
 * each side of one (a limit such as 0.025 mg is a number). A translation keeps
 * them exactly, so they are not read as its numbers.
 */
const CODE = /(?<![\d.,])\d+(?:\.\d+){2,}(?![\d.,]*\d)|(?<![\d.,])\d{3,}\.\d{3,}(?![\d.,]*\d)/g;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** An English month's name, in full or short (Apr, Sept.). */
const MONTH_NAME = String.raw`\b(?:January|February|March|April|May|June|July|August|September|October|November|December|(?:Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept?|Oct|Nov|Dec)\.?)(?!\p{L})`;
/** A month's name beside a day or a year: October 2026, 29 May 2026, Apr 2013. */
const MONTH = new RegExp(String.raw`(?<=\d[ \u00a0])${MONTH_NAME}|${MONTH_NAME}(?=[ \u00a0]\d)`, 'gu');
/**
 * Whether a language writes a month as its number: Japanese and Chinese
 * 2026年10月, Korean 2026년 10월, Vietnamese tháng 10. For them, the
 * English's October 2026 is read as 10 2026, so the month is a figure on
 * both sides and must agree.
 */
const monthsAsNumbers = (language) => ['ja', 'zh', 'ko', 'vi'].includes(new Intl.Locale(language).language);
const monthNumbers = (text) =>
  text.replace(MONTH, (name) => ' ' + (MONTHS.findIndex((month) => name.startsWith(month)) + 1) + ' ');

/** Problems with the figures and links of a text against its English's. */
function compareFigures(label, language, english, translated) {
  const problems = [];
  const links = (text) => text.replace(/\]\([^)\s]+\)/g, ']').replace(/https?:\/\/[^\s<>"')\]]+/g, '');
  // A code the English has, written the same in the translation, is the same code.
  const codes = new Set([...links(english).matchAll(CODE)].map((match) => match[0]));
  const strip = (text) => {
    let out = links(text);
    for (const code of codes) out = out.split(code).join(' ');
    return out;
  };
  const ours = numbersIn(monthsAsNumbers(language) ? monthNumbers(strip(english)) : strip(english), 'en');
  const theirs = numbersIn(strip(translated), language);
  if (ours.join('|') !== theirs.join('|')) {
    const missing = ours.filter((n) => !theirs.includes(n));
    const extra = theirs.filter((n) => !ours.includes(n));
    problems.push(
      `${label}: its numbers differ from the English` +
        (missing.length ? `; missing ${missing.join(', ')}` : '') +
        (extra.length ? `; not in the English ${extra.join(', ')}` : '')
    );
  }
  const [ourLinks, theirLinks] = [linksIn(english), linksIn(translated)];
  if (ourLinks.join('|') !== theirLinks.join('|')) {
    problems.push(`${label}: its links differ from the English: ${theirLinks.join(', ') || 'none'}`);
  }
  return problems;
}

/**
 * Each cardinal plural in a message, as { arg, forms, one } where `one` is whether its `one` branch shows the
 * number (has a #) and `forms` are the branches' names.
 */
function cardinalPlurals(message) {
  const found = [];
  const shows = (elements) =>
    elements.some((element) => element.type === TYPE.pound || (element.type === TYPE.tag && shows(element.children)));
  const walk = (elements) => {
    for (const element of elements) {
      if (element.type === TYPE.tag) walk(element.children);
      else if (element.type === TYPE.plural || element.type === TYPE.select) {
        if (element.type === TYPE.plural && element.pluralType === 'cardinal') {
          found.push({
            arg: element.value,
            forms: Object.keys(element.options),
            one: element.options.one ? shows(element.options.one.value) : false
          });
        }
        for (const option of Object.values(element.options)) walk(option.value);
      }
    }
  };
  walk(parse(message));
  return found;
}

/** Whether a language's `one` form also takes 0 (Hindi, Bengali, Gujarati, Kannada, Punjabi, Sinhala, French). */
const oneCoversZero = (language) => new Intl.PluralRules(language).select(0) === 'one';

/**
 * Where the English's `one` form is for exactly one ("this passkey", "it": no #, and no =0 form of its own), a
 * language whose `one` also takes 0 would show it for 0. Its translation needs an `=1` form for that plural
 * (the `one` form then reads right for 0, with its #).
 */
function exactOneProblems(key, language, english, translated) {
  if (!oneCoversZero(language)) return [];
  const exact = cardinalPlurals(english)
    .filter((plural) => plural.forms.includes('one') && !plural.one && !plural.forms.includes('=0'))
    .map((plural) => plural.arg);
  if (!exact.length) return [];
  const args = cardinalPlurals(translated)
    .filter((plural) => exact.includes(plural.arg) && plural.forms.includes('one') && !plural.forms.includes('=1'))
    .map((plural) => plural.arg);
  return [...new Set(args)].map(
    (arg) =>
      `${key}: ${language}'s "one" also takes 0, so the English's one-only text for {${arg}} needs an =1 form (or the English an =0 form)`
  );
}

/**
 * Problems with one translated message, against its English. rich: whether
 * the message is drawn by gc-rich, which can show a key term's English
 * (<en>frit</en>); the messages kept in code (server, chemistry, safety,
 * records) are shown as plain text.
 */
export function compareMessage(language, key, english, translated, { rich = true, figures = true } = {}) {
  const problems = [];
  let theirs;
  try {
    theirs = shapeOf(translated);
  } catch (error) {
    return [`${key}: not a valid ICU message (${error.message})`];
  }
  const ours = shapeOf(english);
  if (ours.args.join() !== theirs.args.join()) {
    problems.push(
      `${key}: placeholders ${theirs.args.join(', ') || 'none'}, but the English has ${ours.args.join(', ') || 'none'}`
    );
  }
  // A translation may give the English for a key term, <en>frit</en>, in a
  // message gc-rich draws: one whose English has tags. Elsewhere the tag
  // would show as text.
  if (rich && ours.tags.length) theirs.tags = theirs.tags.filter((tag) => tag !== 'en' || ours.tags.includes('en'));
  if (ours.tags.join() !== theirs.tags.join()) {
    problems.push(
      `${key}: tags ${theirs.tags.join(', ') || 'none'}, but the English has ${ours.tags.join(', ') || 'none'}`
    );
  }
  if (figures) problems.push(...compareFigures(key, language, literalsOf(english), literalsOf(translated)));
  for (const plural of theirs.plurals) {
    const needed = new Intl.PluralRules(language, { type: plural.ordinal ? 'ordinal' : 'cardinal' }).resolvedOptions()
      .pluralCategories;
    const given = plural.forms.filter((form) => !form.startsWith('='));
    const missing = needed.filter((form) => !given.includes(form));
    const unknown = given.filter((form) => !needed.includes(form));
    if (missing.length)
      problems.push(`${key}: ${language} needs the plural forms ${missing.join(', ')} for {${plural.arg}}`);
    if (unknown.length)
      problems.push(`${key}: ${language} has no plural form ${unknown.join(', ')} for {${plural.arg}}`);
  }
  problems.push(...exactOneProblems(key, language, english, translated));
  // A word the English itself writes with the cedilla is a name in another language (Turkish
  // Ulusal Zehir Danışma Merkezi) and stays as it is.
  const cedillaWords = (text) => text.match(/[\p{L}]*[şţŞŢ][\p{L}]*/gu) ?? [];
  const borrowed = new Set(cedillaWords(english));
  if (language === 'ro' && cedillaWords(translated).some((word) => !borrowed.has(word))) {
    problems.push(`${key}: Romanian takes ș and ț (comma below), not ş and ţ (cedilla)`);
  }
  return [...problems, ...scriptProblems(key, language, translated)];
}

/**
 * Characters Simplified and Traditional Chinese write differently, as
 * [Simplified, Traditional]: a short list of the app's own words, not a full
 * table, so that a file slipping into the other script is caught. Silicon is
 * 硅 on the mainland and 矽 in Taiwan, a ceramics word above all. Japanese
 * writes none of the Simplified forms but those in JAPANESE_TOO.
 */
const SCRIPT_PAIRS = [
  ['硅', '矽'], // silicon
  ['钾', '鉀'], // potassium
  ['钠', '鈉'], // sodium
  ['钙', '鈣'], // calcium
  ['镁', '鎂'], // magnesium
  ['锌', '鋅'], // zinc
  ['铝', '鋁'], // aluminium
  ['铁', '鐵'], // iron
  ['烧', '燒'], // to fire
  ['窑', '窯'], // kiln
  ['温', '溫'], // temperature
  ['软', '軟'], // soft
  ['设', '設'], // settings
  ['计', '計'], // calculate
  ['数', '數'], // number
  ['页', '頁'], // page
  ['选', '選'], // choose
  ['删', '刪'], // delete
  ['编', '編'], // edit
  ['显', '顯'], // show
  ['录', '錄'], // record, log in
  ['码', '碼'], // code, password
  ['语', '語'], // language
  ['户', '戶'], // account
  ['帮', '幫'], // help
  ['这', '這'], // this
  ['们', '們'], // plural of people
  ['个', '個'], // counter
  ['为', '為'], // for
  ['说', '說'], // to say
  ['时', '時'], // time
  ['发', '發'] // to send
];
/** Simplified forms Japanese writes too (温度, 数, 硅素). */
const JAPANESE_TOO = '温数硅';

/** Problems with a text's script: Chinese in the other script's characters, Japanese in simplified hanzi. */
function scriptProblems(label, language, text) {
  const wrong = { 'zh-Hans': 1, 'zh-Hant': 0, ja: 0 }[language];
  if (wrong === undefined) return [];
  const pairs = SCRIPT_PAIRS.filter(([simplified]) => language !== 'ja' || !JAPANESE_TOO.includes(simplified));
  const found = pairs.filter((pair) => text.includes(pair[wrong]));
  if (!found.length) return [];
  const given = found.map((pair) => pair[wrong]).join(' ');
  if (language === 'ja') return [`${label}: Japanese is not written with simplified hanzi such as ${given}`];
  const right = found.map((pair) => pair[1 - wrong]).join(' ');
  return [`${label}: ${wrong ? 'Simplified' : 'Traditional'} Chinese takes ${right}, not ${given}`];
}

/** The messages files: { '': { en: path, de: path }, recipe: { en: path } }. */
export function messageFiles(dir = I18N) {
  const files = {};
  for (const entry of readdirSync(dir, { recursive: true })) {
    const file = String(entry).replaceAll('\\', '/');
    if (!file.endsWith('.json')) continue;
    const scope = path.posix.dirname(file) === '.' ? '' : path.posix.dirname(file);
    (files[scope] ??= {})[path.posix.basename(file, '.json')] = path.join(dir, file);
  }
  return files;
}

const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));

/** Problems with the translations: each language against the English, scope by scope. */
export function checkTranslations(files = messageFiles()) {
  const problems = [];
  for (const [scope, languages] of Object.entries(files)) {
    if (!languages.en) {
      problems.push(`${scope}: has translations but no en.json`);
      continue;
    }
    const english = flatten(readJson(languages.en));
    for (const [key, message] of Object.entries(english)) {
      try {
        shapeOf(message);
      } catch (error) {
        problems.push(`${scope || 'app'} en ${key}: not a valid ICU message (${error.message})`);
      }
    }
    for (const [language, file] of Object.entries(languages)) {
      if (language === 'en') continue;
      const translated = flatten(readJson(file));
      for (const [key, message] of Object.entries(translated)) {
        const label = `${scope || 'app'} ${language}`;
        if (!(key in english)) problems.push(`${label} ${key}: no such message in English`);
        else {
          const rich = !FROM_CODE.includes(scope);
          const figures = !NOTATION.includes(`${scope || 'app'} ${key}`);
          problems.push(
            ...compareMessage(language, key, english[key], message, { rich, figures }).map((p) => `${label} ${p}`)
          );
        }
      }
    }
  }
  return problems;
}

/** The keys the app uses, by scope ('' for the app's own), from the keys manager's extractors. */
export async function keysInUse() {
  const keysManager = (file) =>
    import(pathToFileURL(path.join(ROOT, 'node_modules', '@jsverse', 'transloco-keys-manager', file)).href);
  const [{ resolveConfig }, { setConfig }, { extractTemplateKeys }, { extractTSKeys }] = await Promise.all([
    keysManager('utils/resolve-config.js'),
    keysManager('config.js'),
    keysManager('keys-builder/template/index.js'),
    keysManager('keys-builder/typescript/index.js')
  ]);
  const config = resolveConfig({});
  setConfig(config);
  const files = (extension) =>
    readdirSync(APP, { recursive: true })
      .map(String)
      .filter((file) => file.endsWith(extension) && !file.endsWith('.spec.ts') && !file.startsWith('testing'))
      .map((file) => path.join(APP, file));
  const found = [
    extractTemplateKeys({ ...config, files: files('.html') }),
    extractTSKeys({ ...config, files: files('.ts') })
  ];
  const keys = {};
  for (const { scopeToKeys } of found) {
    for (const [scope, scopeKeys] of Object.entries(scopeToKeys)) {
      const name = scope === '__global' ? '' : scope;
      for (const key of Object.keys(flatten(scopeKeys))) (keys[name] ??= new Set()).add(key);
    }
  }
  // The keys manager files a key named in code, translate('site.advice.saved'),
  // with the app's own; it belongs to its scope, as no group in en.json shares a
  // scope's name (docs/translating.md).
  const scopes = new Set(Object.keys(messageFiles()).filter(Boolean));
  for (const key of [...(keys[''] ?? [])]) {
    const [scope, ...rest] = key.split('.');
    if (scopes.has(scope) && rest.length) {
      keys[''].delete(key);
      (keys[scope] ??= new Set()).add(rest.join('.'));
    }
  }
  return keys;
}

/** Problems between the keys the app uses and its English. */
export function compareKeys(used, files = messageFiles()) {
  const problems = [];
  const scopes = new Set([...Object.keys(used), ...Object.keys(files)]);
  for (const scope of scopes) {
    if (FROM_CODE.includes(scope)) continue;
    const label = scope || 'app';
    const englishFile = files[scope]?.en;
    const english = englishFile && existsSync(englishFile) ? Object.keys(flatten(readJson(englishFile))) : [];
    const inUse = used[scope] ?? new Set();
    for (const key of inUse) if (!english.includes(key)) problems.push(`${label}: ${key} is used but has no English`);
    for (const key of english) if (!inUse.has(key)) problems.push(`${label}: ${key} has English but is not used`);
  }
  return problems;
}

/** Problems with the English written from code: a file missing or out of date. */
export async function checkSources(dir = I18N) {
  const problems = [];
  for (const [file, text] of Object.entries(await sources())) {
    const at = path.join(dir, file);
    if (!existsSync(at) || readFileSync(at, 'utf8') !== text) {
      problems.push(`${file}: out of date with its messages in code; run npm run i18n:sources`);
    }
  }
  return problems;
}

/** What a guide's Markdown must keep in every language: ids, values in {{...}}, and its marks. */
export function guideMarks(markdown) {
  const all = (pattern) => [...markdown.matchAll(pattern)].map((match) => match[0].replace(/\s+/g, ' ')).sort();
  return {
    // A section still in English is marked {#id lang=en} (scripts/i18n-fingerprints.mjs).
    ids: all(/\{#[\w-]+(?: lang=en)?\}/g).map((id) => id.replace(' lang=en', '')),
    values: all(/\{\{(?!\s*en:)[^}]+\}\}/g),
    marks: all(
      /^(?::::(?:orton|sk|temperature)?|::(?:poison-lines|shops|silica-limit|food-limits|local-equivalents))$/gm
    )
  };
}

/** A guide section's structure: its headings, tables (columns × rows), lists (items), callouts and captions, in order. */
export function structureOf(markdown) {
  const found = [];
  const walk = (tokens) => {
    for (const token of tokens) {
      if (token.type === 'heading') found.push('h' + token.depth);
      else if (token.type === 'table') found.push(`table ${token.header.length}×${token.rows.length}`);
      else if (token.type === 'list') {
        found.push(`${token.ordered ? 'ol' : 'ul'} ${token.items.length}`);
        for (const item of token.items) walk(item.tokens ?? []);
      } else if (token.type === 'blockquote') {
        found.push('quote' + (/^\[!(\w+)\]/.exec(token.text)?.[1] ?? ''));
        walk(token.tokens ?? []);
      } else if (token.type === 'hr' || token.type === 'code') found.push(token.type);
    }
  };
  walk(new Lexer({ gfm: true }).lex(markdown));
  found.push(`definitions ${(markdown.match(/^: /gm) ?? []).length}`);
  found.push(`captions ${(markdown.match(/^(?:Table|Label): /gm) ?? []).length}`);
  return found;
}

/** Problems with one section of a translated guide (or the part before the first): its structure, numbers and links. */
export function compareSegment(label, language, english, translated) {
  const problems = [];
  const [ours, theirs] = [structureOf(english), structureOf(translated)];
  if (ours.join() !== theirs.join()) {
    const at = ours.findIndex((part, i) => part !== theirs[i]);
    problems.push(
      `${label}: its structure differs from the English: ${theirs[at] ?? 'nothing'} where it has ${ours[at]}`
    );
  }
  // Temperatures and densities ({{...}}) and section ids are checked whole; what is left is the text's own figures.
  const prose = (text) =>
    text
      .replace(/\{\{[^}]*\}\}/g, ' ')
      .replace(/\{#[\w-]+(?: lang=en)?\}/g, ' ')
      .replace(/^lang: en$/m, '');
  return [
    ...problems,
    ...compareFigures(label, language, prose(english), prose(translated)),
    ...scriptProblems(label, language, translated)
  ];
}

/** Problems with the translated guides, each against its English; a guide in English only has no translation. */
export function checkGuides(dir = path.join(I18N, 'guides'), englishOnly = ENGLISH_ONLY_GUIDES) {
  const problems = [];
  if (!existsSync(dir)) return problems;
  for (const guide of readdirSync(dir, { withFileTypes: true }).filter((entry) => entry.isDirectory())) {
    const folder = path.join(dir, guide.name);
    if (englishOnly.includes(guide.name)) {
      for (const file of readdirSync(folder).filter((name) => name.endsWith('.md') && name !== 'en.md'))
        problems.push(
          `guides/${guide.name}/${file}: this guide is in English only (lib/pages.js), so it has no copies`
        );
      continue;
    }
    const englishText = readFileSync(path.join(folder, 'en.md'), 'utf8');
    const english = guideMarks(englishText);
    for (const file of readdirSync(folder).filter((name) => name.endsWith('.md') && name !== 'en.md')) {
      const text = readFileSync(path.join(folder, file), 'utf8');
      const language = path.basename(file, '.md');
      const segments = guideSegments(text);
      for (const segment of guideSegments(englishText)) {
        const translated = segments.find((s) => s.id === segment.id);
        if (translated && !translated.english) {
          problems.push(
            ...compareSegment(
              `guides/${guide.name}/${file} ${segment.id || 'intro'}`,
              language,
              segment.text,
              translated.text
            )
          );
        }
      }
      const theirs = guideMarks(text);
      for (const [kind, what] of [
        ['ids', 'section ids'],
        ['values', 'temperatures and densities ({{...}})'],
        ['marks', 'cone, temperature and who-to-call marks']
      ]) {
        if (english[kind].join('\n') !== theirs[kind].join('\n')) {
          const missing = english[kind].filter((item) => !theirs[kind].includes(item));
          const extra = theirs[kind].filter((item) => !english[kind].includes(item));
          problems.push(
            `guides/${guide.name}/${file}: its ${what} differ from the English` +
              (missing.length ? `; missing ${missing.slice(0, 3).join(', ')}` : '') +
              (extra.length ? `; not in the English ${extra.slice(0, 3).join(', ')}` : '')
          );
        }
      }
    }
  }
  return problems;
}

/**
 * Problems with the digits a translation writes: 0–9 only. A language whose
 * own digits are shown (Arabic in Egypt ١٢٣, Bengali ১২৩, Marathi १२३) gets
 * them from the reader's settings when numbers are formatted (lib/regions
 * formatLocaleFor), so a translator writes 1222 °C as the English does; a
 * number in other digits would stay in them whatever the reader chose.
 */
export function checkDigits(dir = I18N) {
  const OTHER_DIGITS = /(?![0-9])\p{Nd}/gu;
  const problems = [];
  const check = (label, text) => {
    const found = [...new Set(text.match(OTHER_DIGITS) ?? [])];
    if (found.length) {
      problems.push(
        `${label}: writes digits as 0–9, not ${found.join(' ')}; the reader's settings show a language's own digits`
      );
    }
  };
  for (const [scope, languages] of Object.entries(messageFiles(dir))) {
    for (const [language, file] of Object.entries(languages)) {
      if (language === 'en') continue;
      for (const [key, message] of Object.entries(flatten(readJson(file)))) {
        check(`${scope || 'app'} ${language} ${key}`, message);
      }
    }
  }
  const guides = path.join(dir, 'guides');
  if (existsSync(guides)) {
    for (const guide of readdirSync(guides, { withFileTypes: true }).filter((entry) => entry.isDirectory())) {
      for (const file of readdirSync(path.join(guides, guide.name)).filter((n) => n.endsWith('.md') && n !== 'en.md')) {
        check(`guides/${guide.name}/${file}`, readFileSync(path.join(guides, guide.name, file), 'utf8'));
      }
    }
  }
  return problems;
}

/** One language's translated texts (translatedTexts below), as [label, text]. */
const textsOf = (dir, language) =>
  [...translatedTexts(dir)].filter((text) => text.language === language).map(({ label, text }) => [label, text]);

/**
 * The Latin full stops that end a sentence written in a script (Urdu's Arabic letters, Bengali's): a "."
 * after a word, a figure, a unit or a closing mark, at the end of the text or before a space, in a sentence
 * with that script's letters in it. Not a figure's point (1.5), an address's dot (example.com/a.b), a
 * numbered list's "1." (no letters before it on its line), an ellipsis, or an abbreviation the English keeps
 * (e.g., etc., Ltd.).
 */
const SENTENCE_STOP = /(?<![.\s])\.(?=["'”’)\]*_]*(?:\s|$))/gu;
const KEPT_ABBREVIATIONS =
  /(?:^|[\s(])(?:e\.g|i\.e|etc|Ltd|Inc|Co|Corp|No|vs|approx|Dr|St|Ing|Repr|Carc|Cap|U\.S|[A-Z])$/u;
function latinStops(text, letters) {
  const found = [];
  const prose = text.replace(/\]\([^)\s]*\)/g, ']').replace(/(?:https?:\/\/|www\.)\S+|\S+@\S+/g, ' ');
  for (const match of prose.matchAll(SENTENCE_STOP)) {
    const before = prose.slice(0, match.index);
    const sentence = before.slice(
      Math.max(before.lastIndexOf('\n'), ...['.', '!', '?', '۔', '।'].map((mark) => before.lastIndexOf(mark + ' '))) + 1
    );
    if (letters.test(sentence) && !KEPT_ABBREVIATIONS.test(before)) found.push(sentence.trim().slice(-24) + '.');
  }
  return found;
}

/** Bidi controls (LRM, RLM, ALM, the embeddings and the isolates): the app sets a text's direction itself. */
const DIRECTION_CONTROLS = /[‎‏؜‪-‮⁦-⁩]/u;

/**
 * Problems with Urdu (docs/translations/ur.md): a sentence ends with ۔ (U+06D4), never a Latin "."; Urdu's
 * own letters, never the Arabic ي ى ك ه that an Arabic keyboard types and Nastaliq draws wrongly (ی ک ہ:
 * U+06CC, U+06A9, U+06C1); no tatweel or direction controls; Unicode's composed form (NFC).
 */
export function checkUrdu(dir = I18N) {
  const ARABIC_LETTERS = /[كهىي]/gu;
  const URDU = /[؀-ۿ]/u;
  const problems = [];
  for (const [label, text] of textsOf(dir, 'ur')) {
    const stops = latinStops(text, URDU);
    if (stops.length)
      problems.push(`${label}: an Urdu sentence ends with ۔, not "." (${stops.slice(0, 2).join(' | ')})`);
    const arabic = [...new Set(text.match(ARABIC_LETTERS) ?? [])];
    if (arabic.length) problems.push(`${label}: Urdu takes ی ک ہ, not the Arabic ${arabic.join(' ')}`);
    if (text.includes('ـ')) problems.push(`${label}: no tatweel (ـ) in Urdu`);
    if (DIRECTION_CONTROLS.test(text)) problems.push(`${label}: no direction marks; the app sets the direction`);
    if (text.normalize('NFC') !== text) problems.push(`${label}: not in Unicode's composed form (NFC)`);
  }
  return problems;
}

/**
 * Problems with Bengali (docs/translations/bn.md): a sentence ends with the danda । (U+0964), never a Latin
 * "." nor ৷ (U+09F7, a currency numerator that looks the same); Unicode's composed form (NFC).
 */
export function checkBengali(dir = I18N) {
  const BENGALI = /[ঀ-৿]/u;
  const problems = [];
  for (const [label, text] of textsOf(dir, 'bn')) {
    const stops = latinStops(text, BENGALI);
    if (stops.length)
      problems.push(`${label}: a Bengali sentence ends with ।, not "." (${stops.slice(0, 2).join(' | ')})`);
    if (text.includes('৷')) problems.push(`${label}: the danda is । (U+0964), not ৷ (U+09F7)`);
    if (text.normalize('NFC') !== text) problems.push(`${label}: not in Unicode's composed form (NFC)`);
  }
  return problems;
}

/**
 * Problems with the reference pages' translations (the cone chart, the materials and each material's page):
 * a language they are shown in (REFERENCE_LANGUAGES in lib/regions/languages.js) has every message of
 * reference/ and every standard record's words in records/, the materials' and the cone charts' among them.
 * A language not in the list may have them in part while it is translated, as a guide may.
 */
export function checkReferenceLanguages(dir = I18N, shown = REFERENCE_LANGUAGES) {
  const problems = [];
  const files = messageFiles(dir);
  for (const scope of ['reference', 'records']) {
    const english = files[scope]?.en ? Object.keys(flatten(readJson(files[scope].en))) : [];
    for (const language of shown.filter((code) => code !== 'en')) {
      const file = files[scope]?.[language];
      const have = new Set(file ? Object.keys(flatten(readJson(file))) : []);
      const missing = english.filter((key) => !have.has(key));
      if (missing.length) {
        problems.push(
          `${scope} ${language}: the reference pages are shown in ${language}, but ${missing.length} message(s) are missing, such as ${missing[0]}`
        );
      }
    }
  }
  return problems;
}

/** Problems with the translations' fingerprints, and what each language still shows in English. */
export function checkFingerprints(options) {
  const { changes, inEnglish } = updateTranslations({ ...options, write: false });
  return {
    problems: changes.map((change) => `${change}; run npm run i18n:sources`),
    inEnglish
  };
}

/**
 * Problems with Korean's script: Korean is written in Hangul, so hanja (the
 * Chinese characters, 長石 for 장석, feldspar) in a Korean message or guide
 * are a slip, unless its glossary (docs/translations/ko.md) gives them, as a
 * term's hanja may be given after it. Each run of hanja must be in the
 * glossary as it is written.
 */
export function checkHanja({ dir = I18N, glossary = path.join(ROOT, 'docs', 'translations', 'ko.md') } = {}) {
  const HANJA = /\p{Script=Han}+/gu;
  const glossaried = existsSync(glossary) ? readFileSync(glossary, 'utf8') : '';
  const problems = [];
  const check = (label, text) => {
    const hanja = [...new Set(text.match(HANJA) ?? [])].filter((run) => !glossaried.includes(run));
    if (hanja.length) {
      problems.push(
        `${label}: Korean is written in Hangul, not hanja such as ${hanja.join(' ')} (or give them in its glossary)`
      );
    }
  };
  for (const [scope, languages] of Object.entries(messageFiles(dir))) {
    if (!languages.ko) continue;
    const messages = flatten(readJson(languages.ko));
    for (const [key, message] of Object.entries(messages)) check(`${scope || 'app'} ko ${key}`, message);
  }
  const guides = path.join(dir, 'guides');
  if (existsSync(guides)) {
    for (const guide of readdirSync(guides, { withFileTypes: true }).filter((entry) => entry.isDirectory())) {
      const file = path.join(guides, guide.name, 'ko.md');
      if (!existsSync(file)) continue;
      // A section still in English ({#id lang=en}) is the English's, which may quote Japanese.
      const korean = guideSegments(readFileSync(file, 'utf8')).filter((segment) => !segment.english);
      check(`guides/${guide.name}/ko.md`, korean.map((segment) => segment.text).join('\n'));
    }
  }
  return problems;
}

/**
 * Every translated message and the translated sections of every translated guide, as { label, language, text,
 * english }: the texts the script, normalisation and joiner checks read, with the English they were made from
 * (the message's, or the guide's whole). A guide section still in English ({#id lang=en}) is the English's and
 * is left out.
 */
function* translatedTexts(dir = I18N) {
  for (const [scope, languages] of Object.entries(messageFiles(dir))) {
    const english = languages.en ? flatten(readJson(languages.en)) : {};
    for (const [language, file] of Object.entries(languages)) {
      if (language === 'en') continue;
      for (const [key, text] of Object.entries(flatten(readJson(file)))) {
        yield { label: `${scope || 'app'} ${language} ${key}`, language, text, english: english[key] ?? '' };
      }
    }
  }
  const guides = path.join(dir, 'guides');
  if (!existsSync(guides)) return;
  for (const guide of readdirSync(guides, { withFileTypes: true }).filter((entry) => entry.isDirectory())) {
    const english = existsSync(path.join(guides, guide.name, 'en.md'))
      ? readFileSync(path.join(guides, guide.name, 'en.md'), 'utf8')
      : '';
    for (const file of readdirSync(path.join(guides, guide.name)).filter((n) => n.endsWith('.md') && n !== 'en.md')) {
      const translated = guideSegments(readFileSync(path.join(guides, guide.name, file), 'utf8')).filter(
        (segment) => !segment.english
      );
      yield {
        label: `guides/${guide.name}/${file}`,
        language: path.basename(file, '.md'),
        text: translated.map((segment) => segment.text).join('\n'),
        english
      };
    }
  }
}

/**
 * The Indian languages and the Unicode script each is written in (Script_Extensions names), for the script and
 * joiner checks. Every language of India's waves is here ahead of its translation (wave I1: Tamil, Marathi,
 * Kannada; then Telugu, Malayalam, Gujarati, Punjabi, Odia, Nepali, Sinhala), with Hindi and Bengali.
 */
export const INDIC_SCRIPTS = {
  hi: 'Deva',
  mr: 'Deva',
  ne: 'Deva',
  bn: 'Beng',
  ta: 'Taml',
  te: 'Telu',
  kn: 'Knda',
  ml: 'Mlym',
  gu: 'Gujr',
  pa: 'Guru',
  or: 'Orya',
  si: 'Sinh'
};

/**
 * Problems with the script an Indian language is written in: its letters and marks are its own script's, Latin
 * (units, formulas, names, addresses) or common (digits, punctuation, spaces). That catches Bengali letters in
 * Odia, Devanagari in Gurmukhi, Hindi pasted into Tamil, and the garbage a legacy-font copy leaves. A run of
 * foreign letters that the English gives as a name (a foreign poison centre's, in its own script), or its
 * glossary (docs/translations/<language>.md) gives, as a word it contrasts, is let through, as checkHanja
 * lets through a hanja. Hindi, Marathi and Nepali share Devanagari, so a Hindi word in Marathi is
 * for the style sheet and the reviewers.
 */
export function checkScripts({ dir = I18N, glossaries = path.join(ROOT, 'docs', 'translations') } = {}) {
  const problems = [];
  const glossary = new Map();
  const glossaryOf = (language) => {
    if (!glossary.has(language)) {
      const file = path.join(glossaries, language + '.md');
      glossary.set(language, existsSync(file) ? readFileSync(file, 'utf8') : '');
    }
    return glossary.get(language);
  };
  const foreign = new Map();
  const foreignPattern = (script) => {
    if (!foreign.has(script)) {
      foreign.set(
        script,
        new RegExp(`(?:(?![\\p{scx=Latn}\\p{scx=${script}}\\p{scx=Zyyy}\\p{scx=Zinh}])[\\p{L}\\p{M}])+`, 'gu')
      );
    }
    return foreign.get(script);
  };
  for (const { label, language, text, english } of translatedTexts(dir)) {
    const script = INDIC_SCRIPTS[language];
    if (!script) continue;
    // A name the English itself gives in another script (a poison centre's, in Korean or Greek) stays as it is.
    const runs = [...new Set(text.match(foreignPattern(script)) ?? [])].filter(
      (run) => !english.includes(run) && !glossaryOf(language).includes(run)
    );
    if (runs.length) {
      problems.push(
        `${label}: ${language} is written in ${script} and Latin, not letters such as ${runs.slice(0, 5).join(' ')} (or give them in its glossary)`
      );
    }
  }
  return problems;
}

/**
 * Problems with Unicode normalisation: every translation is in NFC, so that a letter has one form (a Gurmukhi,
 * Odia or Devanagari letter with a nukta is the letter and the nukta, ਸ਼ as ਸ + ਼, not the precomposed U+0A36),
 * and search, fingerprints and comparisons agree. Typing a letter another way, or copying one from a legacy
 * font, is the usual slip.
 */
export function checkNormalization(dir = I18N) {
  const problems = [];
  for (const { label, text } of translatedTexts(dir)) {
    if (text === text.normalize('NFC')) continue;
    const words = [...new Set(text.split(/[\s]+/).filter((word) => word !== word.normalize('NFC')))];
    const shown = words
      .slice(0, 3)
      .map(
        (word) =>
          `${word} (${[...word].map((c) => 'U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')).join(' ')})`
      );
    problems.push(`${label}: not in Unicode normalisation form NFC, as ${shown.join('; ')}`);
  }
  return problems;
}

/**
 * Where a zero-width joiner (U+200D) or non-joiner (U+200C) may stand, by language. None in the languages not
 * listed. Malayalam writes its chillu letters as single characters (U+0D7A to U+0D7F), never as a letter,
 * virama and ZWJ, and a ZWNJ only after a virama (U+0D4D). Sinhala writes yansaya and rakaransaya with a ZWJ
 * between the virama (U+0DCA) and ය or ර (ක්‍ය, ශ්‍රී), and its touching letters with one between
 * a consonant and the virama (ක‍්ව); no other ZWJ (a repaya, ර්‍ක, is written ර්ක), and no ZWNJ.
 * Bengali writes ra with ya-phala (as in the word for ramp) as ra, ZWJ, virama, ya (U+09B0 U+200D U+09CD
 * U+09AF; without the ZWJ it is reph and ya), so its ZWJ stands only between ra and the virama, and no ZWNJ.
 * In the others a joiner is a slip.
 */
const SINHALA_CONSONANT = /^[ක-ෆ]$/;
const JOINERS = {
  bn: {
    allowed: (joiner, before, after) => joiner === '‍' && before === 'র' && after === '্',
    takes: 'a ZWJ only between র and the virama (র + ZWJ + ্ + য) and no ZWNJ'
  },
  ml: {
    allowed: (joiner, before) => joiner === '‌' && before === '്',
    takes: 'a ZWNJ only after a virama and no ZWJ, for its chillu letters are single characters'
  },
  si: {
    allowed: (joiner, before, after) =>
      joiner === '‍' &&
      ((before === '්' && (after === 'ය' || after === 'ර')) || (SINHALA_CONSONANT.test(before ?? '') && after === '්')),
    takes:
      'a ZWJ only in yansaya and rakaransaya (් + ZWJ + ය or ර) and in touching letters (a consonant + ZWJ + ්), and no ZWNJ'
  }
};

/** Problems with stray joiners in the Indian languages' translations. */
export function checkJoiners(dir = I18N) {
  const problems = [];
  for (const { label, language, text } of translatedTexts(dir)) {
    if (!INDIC_SCRIPTS[language]) continue;
    const rule = JOINERS[language] ?? { allowed: () => false, takes: 'none' };
    const found = [...text.matchAll(/[‌‍]/g)].filter(
      (match) => !rule.allowed(match[0], text[match.index - 1], text[match.index + 1])
    );
    if (found.length) {
      const names = [...new Set(found.map((match) => (match[0] === '‍' ? 'ZWJ (U+200D)' : 'ZWNJ (U+200C)')))];
      problems.push(`${label}: a stray ${names.join(' and ')} (${found.length}); ${language} takes ${rule.takes}`);
    }
  }
  return problems;
}

/** Whether a problem is with one language's translation, rather than the English or another language. */
const aboutLanguage = (problem, language) =>
  problem.includes(` ${language} `) || problem.includes(`/${language}.md`) || problem.includes(`/${language}.json`);

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  // --language de: only German's translations, as a translator checks their work. Their
  // fingerprints are left for npm run i18n:sources, once the translation is done.
  const only = process.argv.includes('--language') ? process.argv[process.argv.indexOf('--language') + 1] : null;
  const fingerprints = checkFingerprints();
  const problems = only
    ? [
        ...checkTranslations(),
        ...checkGuides(),
        ...checkHanja(),
        ...checkDigits(),
        ...checkScripts(),
        ...checkNormalization(),
        ...checkJoiners(),
        ...checkUrdu(),
        ...checkBengali()
      ].filter((problem) => aboutLanguage(problem, only))
    : [
        ...compareKeys(await keysInUse()),
        ...checkTranslations(),
        ...(await checkSources()),
        ...checkReferenceLanguages(),
        ...checkGuides(),
        ...checkHanja(),
        ...checkDigits(),
        ...checkScripts(),
        ...checkNormalization(),
        ...checkJoiners(),
        ...checkUrdu(),
        ...checkBengali(),
        ...fingerprints.problems
      ];
  for (const [language, left] of Object.entries(fingerprints.inEnglish)) {
    if (only && language !== only) continue;
    console.log(`${language}: ${left.messages} messages and ${left.sections} guide sections still in English.`);
  }
  if (problems.length) {
    console.error(problems.join('\n'));
    console.error(`\n${problems.length} problem${problems.length === 1 ? '' : 's'} with the app's messages.`);
    process.exit(1);
  }
  console.log("The app's messages are complete.");
}
