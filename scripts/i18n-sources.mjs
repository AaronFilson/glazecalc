// Writes the English of the messages kept in code, for translators
// (docs/translating.md):
//
//   client/public/i18n/server/en.json     from server/lib/messages.ts
//   client/public/i18n/chemistry/en.json  from lib/chemistry/messages.js
//   client/public/i18n/safety/en.json     the words in lib/regions/safety.js
//                                         (who to call), each under its textKey
//   client/public/i18n/records/en.json    the standard records' words in data/:
//                                         materials' and additives' notes and
//                                         hazards, the advice; likewise
//
//   node scripts/i18n-sources.mjs          writes them, then brings each
//                                          translation into step with its
//                                          English (scripts/i18n-fingerprints.mjs)
//   (npm run check:i18n checks they are current)
//
// The app shows these messages by their code; a language's file beside the
// English translates them.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { updateTranslations } from './i18n-fingerprints.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const I18N = path.join(ROOT, 'client', 'public', 'i18n');

/** A message written as a function of its values, as ICU: each value becomes its placeholder. */
const asIcu = (text) =>
  typeof text === 'function' ? text(new Proxy({}, { get: (_, name) => `{${String(name)}}` })) : text;

/** The English files, by their path under client/public/i18n, as they should be. */
export async function sources() {
  const { MESSAGES: server } = await import(pathToFileURL(path.join(ROOT, 'server', 'lib', 'messages.ts')).href);
  const require = createRequire(import.meta.url);
  const { MESSAGES: chemistry } = require('../lib/chemistry/messages.js');
  const safety = require('../lib/regions/safety.js');
  // Safety text is plain text: braces and apostrophes in it are quoted for ICU.
  const plainAsIcu = (text) => text.replace(/'/g, "''").replace(/[{}]/g, (brace) => "'" + brace + "'");
  const json = (messages) =>
    JSON.stringify(Object.fromEntries(Object.entries(messages).map(([code, text]) => [code, asIcu(text)])), null, 2) +
    '\n';
  const safetyTexts = Object.fromEntries(safety.texts().map((text) => [safety.textKey(text), plainAsIcu(text)]));
  const records = new Set();
  for (const file of ['materials', 'additives', 'advice']) {
    for (const line of readFileSync(path.join(ROOT, 'data', file + '.ndjson'), 'utf8').split('\n')) {
      if (!line.trim()) continue;
      const record = JSON.parse(line);
      for (const text of [
        ...(record.notes ?? []),
        record.hazards,
        record.title,
        record.content,
        ...(record.tags ?? [])
      ]) {
        if (typeof text === 'string' && text.trim()) records.add(text);
      }
    }
  }
  const recordTexts = Object.fromEntries([...records].map((text) => [safety.textKey(text), plainAsIcu(text)]));
  return {
    'server/en.json': json(server),
    'chemistry/en.json': json(chemistry),
    'safety/en.json': JSON.stringify(safetyTexts, null, 2) + '\n',
    'records/en.json': JSON.stringify(recordTexts, null, 2) + '\n'
  };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  for (const [file, text] of Object.entries(await sources())) writeFileSync(path.join(I18N, file), text);
  console.log("Wrote the English of the server's, the chemistry's, who to call's and the standard records' messages.");
  // --keep recipe:print.title: an English change that keeps the meaning keeps its translations.
  const keep = process.argv.flatMap((arg, i, args) => (args[i - 1] === '--keep' ? [arg] : []));
  const { changes } = updateTranslations({ keep });
  for (const change of changes) console.log(change);
  console.log(
    changes.length
      ? 'Brought the translations into step with the English.'
      : 'The translations are in step with the English.'
  );
}
