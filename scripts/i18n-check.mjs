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
// 3. Romanian is written with the comma below (ș ț), not the cedilla (ş ţ).
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
//    structure too: its headings, tables, lists and callouts.
// 7. Each translation is in step with the English it was made from
//    (scripts/i18n-fingerprints.mjs); and what is still in English is
//    counted, language by language.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { TYPE, parse } from '@formatjs/icu-messageformat-parser';
import { Lexer } from 'marked';
import { guideSegments, updateTranslations } from './i18n-fingerprints.mjs';
import { sources } from './i18n-sources.mjs';

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
const UNIT_AFTER = new RegExp(`^[ \\u00a0\\u202f]?(${UNITS.join('|')})(?![\\p{L}])`, 'u');
/** A temperature written without its degree sign, 1742 F, or with it apart, 40° F: °F all the same. */
const DEGREES_AFTER = /^°?[ \u00a0\u202f]?°?([CF])(?![\p{L}\d])/u;

/**
 * The numbers in a text, as English writes them, each with the unit after it:
 * ['1222 °C', '06', '1.5 %']. German 1.222 and 1,5 are 1222 and 1.5; French
 * 1 222 (a narrow space) is 1222. Leading zeros stay (cone 06 is not cone 6).
 * A dot before one or two digits cannot group thousands, so it is a decimal
 * point in any language: a product's code, Keramikos 10.05, stays as it is.
 * Times are read on the 24-hour clock, as most languages write them: 8pm is 20.
 */
export function numbersIn(text, language) {
  const english = language === 'en';
  text = text.replace(/\b(\d{1,2})(?::(\d{2}))?\s?([ap])\.?m\b\.?/gi, (_, hour, minutes, half) => {
    const h = (Number(hour) % 12) + (half.toLowerCase() === 'p' ? 12 : 0);
    return minutes ? `${h}:${minutes}` : String(h);
  });
  // A clock time's hour needs no leading zero: 08:30 is 8:30, or 8 h 30.
  text = text.replace(/(?<![\d.,])0(\d)(?=(?::|\.|[ \u00a0\u202f]?h[ \u00a0\u202f]?)\d{2}(?!\d))/g, '$1');
  const pattern = english
    ? /\d+(?:,\d{3}(?!\d))*(?:\.\d+)?/g
    : /\d+(?:[.\u00a0\u202f]\d{3}(?!\d))*(?:,\d+|\.\d{1,2}(?!\d))?/g;
  const found = new Set();
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
  const ours = numbersIn(strip(english), 'en');
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
  if (language === 'ro' && /[şţŞŢ]/.test(translated)) {
    problems.push(`${key}: Romanian takes ș and ț (comma below), not ş and ţ (cedilla)`);
  }
  return problems;
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
    marks: all(/^(?::::(?:orton|temperature)?|::(?:poison-lines|shops|silica-limit|food-limits|local-equivalents))$/gm)
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
  return [...problems, ...compareFigures(label, language, prose(english), prose(translated))];
}

/** Problems with the translated guides, each against its English. */
export function checkGuides(dir = path.join(I18N, 'guides')) {
  const problems = [];
  if (!existsSync(dir)) return problems;
  for (const guide of readdirSync(dir, { withFileTypes: true }).filter((entry) => entry.isDirectory())) {
    const folder = path.join(dir, guide.name);
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

/** Problems with the translations' fingerprints, and what each language still shows in English. */
export function checkFingerprints(options) {
  const { changes, inEnglish } = updateTranslations({ ...options, write: false });
  return {
    problems: changes.map((change) => `${change}; run npm run i18n:sources`),
    inEnglish
  };
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
    ? [...checkTranslations(), ...checkGuides()].filter((problem) => aboutLanguage(problem, only))
    : [
        ...compareKeys(await keysInUse()),
        ...checkTranslations(),
        ...(await checkSources()),
        ...checkGuides(),
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
