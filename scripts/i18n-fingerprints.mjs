// Which English each translation was made from (docs/i18n-plan.md, "Keeping
// it current"). client/i18n-fingerprints/<language>.json holds, for each
// translated message and each translated section of a guide, a fingerprint of
// the English it was translated from:
//
//   { "recipe": { "print.title": "1k3j9x" }, "guides/firing": { "": "…", "cones": "…" } }
//
// npm run i18n:sources brings every translation into step with its English
// (and npm run check:i18n fails until it has):
//
// - A translation made from English that has since changed is taken out, so
//   the page shows the English until it is translated again. A guide's section
//   is replaced by its English, its heading marked {#id lang=en} (the part
//   before the first section: lang: en at the top), for the translator to
//   find.
// - A new translation is fingerprinted with the English it was made from: so
//   change the English and run this before translating again, not after.
// - A message or section the English no longer has is taken out.
//
// Messages keyed by their English (safety, records: textKey in
// lib/regions/languages.js) need no fingerprints: new English is a new key.
// A change that leaves the meaning as it was (a typo) can keep its
// translations: npm run i18n:sources -- --keep recipe:print.title --keep
// guides/firing:cones (app: for the app's own messages, guides/<guide>: for a
// section, guides/<guide>:intro for the part before the first).
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
export const I18N = path.join(ROOT, 'client', 'public', 'i18n');
export const FINGERPRINTS = path.join(ROOT, 'client', 'i18n-fingerprints');
/** Scopes keyed by a hash of their English, which therefore need no fingerprints. */
const SELF_KEYED = ['safety', 'regions', 'records'];

/** A short fingerprint of a text (FNV-1a, as textKey's). */
export function fingerprint(text) {
  let hash = 0x811c9dc5;
  for (const char of text) hash = Math.imul(hash ^ char.codePointAt(0), 0x01000193) >>> 0;
  return hash.toString(36);
}

/** { nav: { menu: 'Menu' } } as { 'nav.menu': 'Menu' }. */
function flatten(messages, prefix = '', into = {}) {
  for (const [key, value] of Object.entries(messages)) {
    const name = prefix ? prefix + '.' + key : key;
    if (value && typeof value === 'object') flatten(value, name, into);
    else into[name] = value;
  }
  return into;
}

/** Flat keys back into a nested messages file, in the order given. */
function nest(flat) {
  const out = {};
  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split('.');
    let at = out;
    for (const part of parts.slice(0, -1)) at = at[part] ??= {};
    at[parts.at(-1)] = value;
  }
  return out;
}

const SECTION = /^## .*\{#([\w-]+)( lang=en)?\}\s*$/;
const CONE_SYSTEM = /^:::(orton|temperature)$/;

/**
 * A guide's Markdown in segments: the part before the first section (id ''),
 * then each section from its heading, or from the :::orton or :::temperature
 * line just before it when the whole section is for one way of firing. Each
 * keeps its text exactly, so joining them gives the file back.
 */
export function guideSegments(markdown) {
  const lines = markdown.split('\n');
  const starts = [{ at: 0, id: '', english: /^---\n[\s\S]*?^lang: en$[\s\S]*?^---$/m.test(markdown) }];
  lines.forEach((line, index) => {
    const heading = SECTION.exec(line);
    if (!heading) return;
    let at = index;
    let before = index - 1;
    while (before > 0 && lines[before].trim() === '') before--;
    if (CONE_SYSTEM.test(lines[before])) at = before;
    starts.push({ at, id: heading[1], english: !!heading[2] });
  });
  return starts.map((start, i) => ({
    id: start.id,
    english: start.english,
    text: lines.slice(start.at, i + 1 < starts.length ? starts[i + 1].at : lines.length).join('\n')
  }));
}

/** Joins segments into a guide, each separated from the next by a blank line. */
function joinSegments(segments) {
  return (
    segments
      .map((segment) => segment.text.replace(/\n*$/, ''))
      .filter(Boolean)
      .join('\n\n') + '\n'
  );
}

/** A segment's text as its fingerprint sees it: without its marks of being English. */
const segmentText = (text) =>
  text
    .replace(/\n*$/, '')
    .replace(/^(## .*\{#[\w-]+) lang=en\}/m, '$1}')
    .replace(/^lang: en\n/m, '');

/** The English segment, marked as English for a translated guide. */
function asEnglish(segment) {
  const text = segment.id
    ? segment.text.replace(/^(## .*\{#[\w-]+)\}/m, '$1 lang=en}')
    : segment.text.replace(/^---\n/, '---\nlang: en\n');
  return { ...segment, english: true, text };
}

const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));
const json = (value) => JSON.stringify(value, null, 2) + '\n';

/** The languages with translations: every name beside an en.json or en.md but English's own. */
export function translatedLanguages(dir = I18N) {
  const codes = new Set();
  for (const entry of readdirSync(dir, { recursive: true })) {
    const name = path.basename(String(entry));
    const match = /^(.+)\.(json|md)$/.exec(name);
    if (match && match[1] !== 'en') codes.add(match[1]);
  }
  return [...codes].sort();
}

/** The scopes with messages files: '' for the app's own, then 'recipe', 'server', ... */
function scopes(dir) {
  const found = new Set();
  for (const entry of readdirSync(dir, { recursive: true })) {
    const file = String(entry).replaceAll('\\', '/');
    if (file.endsWith('/en.json') || file === 'en.json') found.add(path.posix.dirname(file).replace(/^\.$/, ''));
  }
  return [...found].sort();
}

const guides = (dir) =>
  existsSync(path.join(dir, 'guides'))
    ? readdirSync(path.join(dir, 'guides'), { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && existsSync(path.join(dir, 'guides', entry.name, 'en.md')))
        .map((entry) => entry.name)
        .sort()
    : [];

/**
 * Brings each language's translations into step with the English. Returns
 * what changed (or would, with write false), and for each language what is
 * still in English: messages without a translation, and guide sections.
 *
 * keep: segments whose English changed without changing its meaning, as
 * 'recipe:print.title', 'app:nav.menu' or 'guides/firing:cones'.
 */
export function updateTranslations({ dir = I18N, fingerprints = FINGERPRINTS, write = true, keep = [] } = {}) {
  const changes = [];
  const inEnglish = {};
  const kept = new Set(keep);
  for (const language of translatedLanguages(dir)) {
    const ledgerFile = path.join(fingerprints, language + '.json');
    const ledger = existsSync(ledgerFile) ? readJson(ledgerFile) : {};
    const next = {};
    const left = (inEnglish[language] = { messages: 0, sections: 0 });

    for (const scope of scopes(dir)) {
      const name = scope || 'app';
      const english = flatten(readJson(path.join(dir, scope, 'en.json')));
      const file = path.join(dir, scope, language + '.json');
      if (!existsSync(file)) {
        left.messages += Object.keys(english).length;
        continue;
      }
      const theirs = flatten(readJson(file));
      const prints = ledger[name] ?? {};
      const current = {};
      const nextPrints = {};
      for (const [key, english_] of Object.entries(english)) {
        if (!(key in theirs)) {
          left.messages++;
          continue;
        }
        const now = fingerprint(english_);
        if (
          SELF_KEYED.includes(scope) ||
          prints[key] === undefined ||
          prints[key] === now ||
          kept.has(`${name}:${key}`)
        ) {
          current[key] = theirs[key];
          if (!SELF_KEYED.includes(scope)) nextPrints[key] = now;
          if (!SELF_KEYED.includes(scope) && prints[key] !== undefined && prints[key] !== now)
            changes.push(`${name} ${language} ${key}: kept, as its English's change was marked as keeping the meaning`);
        } else {
          left.messages++;
          changes.push(`${name} ${language} ${key}: translated from older English, so it shows the English again`);
        }
      }
      for (const key of Object.keys(theirs)) {
        if (!(key in english)) changes.push(`${name} ${language} ${key}: no longer in the English, so taken out`);
      }
      for (const key of Object.keys(current)) {
        if (!SELF_KEYED.includes(scope) && prints[key] === undefined)
          changes.push(`${name} ${language} ${key}: fingerprinted with its English`);
      }
      if (Object.keys(nextPrints).length) next[name] = nextPrints;
      const text = json(nest(current));
      if (write && text !== readFileSync(file, 'utf8')) writeFileSync(file, text);
    }

    for (const guide of guides(dir)) {
      const name = `guides/${guide}`;
      const english = guideSegments(readFileSync(path.join(dir, 'guides', guide, 'en.md'), 'utf8'));
      const file = path.join(dir, 'guides', guide, language + '.md');
      if (!existsSync(file)) {
        left.sections += english.length;
        continue;
      }
      const original = readFileSync(file, 'utf8');
      const theirs = guideSegments(original);
      const prints = ledger[name] ?? {};
      const nextPrints = {};
      const segments = english.map((segment) => {
        const label = `${name} ${language} ${segment.id || 'intro'}`;
        const translated = theirs.find((t) => t.id === segment.id);
        const now = fingerprint(segmentText(segment.text));
        const keepIt = kept.has(`${name}:${segment.id || 'intro'}`);
        if (translated && !translated.english) {
          if (prints[segment.id] === undefined || prints[segment.id] === now || keepIt) {
            if (prints[segment.id] === undefined) changes.push(`${label}: fingerprinted with its English`);
            else if (prints[segment.id] !== now)
              changes.push(`${label}: kept, as its English's change was marked as keeping the meaning`);
            nextPrints[segment.id] = now;
            return translated;
          }
          changes.push(`${label}: translated from older English, so it shows the English again`);
        } else if (!translated) {
          changes.push(`${label}: new in the English, so it shows the English`);
        }
        left.sections++;
        const marked = asEnglish(segment);
        if (translated?.english && translated.text !== marked.text)
          changes.push(`${label}: its English brought up to date`);
        return marked;
      });
      for (const segment of theirs) {
        if (!english.some((e) => e.id === segment.id))
          changes.push(`${name} ${language} ${segment.id}: no longer in the English, so taken out`);
      }
      if (Object.keys(nextPrints).length) next[name] = nextPrints;
      const text = joinSegments(segments);
      if (write && text !== original) writeFileSync(file, text);
    }

    const text = json(next);
    if (!existsSync(ledgerFile) || text !== readFileSync(ledgerFile, 'utf8')) {
      if (write) {
        mkdirSync(fingerprints, { recursive: true });
        writeFileSync(ledgerFile, text);
      }
      if (!changes.some((change) => change.split(' ')[1] === language))
        changes.push(`${language}: its fingerprints are out of step with its translations`);
    }
  }
  return { changes, inEnglish };
}
