// Writes the English of the messages kept in code, for translators
// (docs/translating.md):
//
//   client/public/i18n/server/en.json     from server/lib/messages.ts
//   client/public/i18n/chemistry/en.json  from lib/chemistry/messages.js
//   client/public/i18n/safety/en.json     the words in lib/regions/safety.js
//                                         (who to call), each under its textKey
//   client/public/i18n/regions/en.json    likewise the words in the other region
//                                         data: workplace.js, food.js and
//                                         suppliers.js
//   client/public/i18n/records/en.json    the standard records' words in data/:
//                                         materials' and additives' notes and
//                                         hazards, the advice, the cone chart's
//                                         notes; likewise
//
//   node scripts/i18n-sources.mjs          writes them, then brings each
//                                          translation into step with its
//                                          English (scripts/i18n-fingerprints.mjs)
//   ... --dry-run                          says what it would change, and changes
//                                          nothing
//   ... --force                            runs even with translations not yet
//                                          committed (see below)
//
// Bringing translations into step takes out every one made from older
// English, so it refuses to run while a translation (a language's file other
// than English, under client/public/i18n or client/i18n-fingerprints) has
// changes git has not committed: commit them first, or they could be lost.
// Changed English files are fine, as changing the English is how it starts.
//   (npm run check:i18n checks they are current)
//
// The app shows these messages by their code; a language's file beside the
// English translates them.
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
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
  const cones = require('../lib/cones/index.js');
  const regionData = ['workplace', 'food', 'suppliers'].map((name) => require('../lib/regions/' + name + '.js'));
  // Safety text is plain text: braces and apostrophes in it are quoted for ICU.
  const plainAsIcu = (text) => text.replace(/'/g, "''").replace(/[{}]/g, (brace) => "'" + brace + "'");
  const json = (messages) =>
    JSON.stringify(Object.fromEntries(Object.entries(messages).map(([code, text]) => [code, asIcu(text)])), null, 2) +
    '\n';
  const safetyTexts = Object.fromEntries(safety.texts().map((text) => [safety.textKey(text), plainAsIcu(text)]));
  const regionTexts = Object.fromEntries(
    regionData.flatMap((data) => data.texts()).map((text) => [safety.textKey(text), plainAsIcu(text)])
  );
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
        ...(record.tags ?? []),
        // The one source named in words; the others are citations (spec sheet titles), as printed.
        record.source?.name === 'Theoretical formula' ? record.source.name : undefined
      ]) {
        if (typeof text === 'string' && text.trim()) records.add(text);
      }
    }
  }
  // The cone chart's notes (lib/cones).
  for (const text of cones.texts()) records.add(text);
  const recordTexts = Object.fromEntries([...records].map((text) => [safety.textKey(text), plainAsIcu(text)]));
  return {
    'server/en.json': json(server),
    'chemistry/en.json': json(chemistry),
    'safety/en.json': JSON.stringify(safetyTexts, null, 2) + '\n',
    'regions/en.json': JSON.stringify(regionTexts, null, 2) + '\n',
    'records/en.json': JSON.stringify(recordTexts, null, 2) + '\n'
  };
}

/**
 * Translation files (not English) with changes git has not committed, under
 * the given paths relative to the repository; null when git cannot say.
 */
export function uncommittedTranslations(paths = ['client/public/i18n', 'client/i18n-fingerprints'], cwd = ROOT) {
  let out;
  try {
    out = execFileSync('git', ['status', '--porcelain', '--untracked-files=all', '--', ...paths], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    });
  } catch {
    return null;
  }
  return out
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => line.slice(3).replace(/^"|"$/g, '').split(' -> ').pop())
    .filter((file) => !/(^|\/)en\.(json|md)$/.test(file));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  // --keep recipe:print.title: an English change that keeps the meaning keeps its translations.
  const keep = args.flatMap((arg, i) => (args[i - 1] === '--keep' ? [arg] : []));
  const written = await sources();

  if (dryRun) {
    // The same run on a copy, so nothing here changes.
    const copy = mkdtempSync(path.join(os.tmpdir(), 'glazecalc-i18n-'));
    try {
      cpSync(I18N, copy, { recursive: true });
      for (const [file, text] of Object.entries(written)) {
        if (text !== readFileSync(path.join(I18N, file), 'utf8')) console.log('Would write ' + file + '.');
        writeFileSync(path.join(copy, file), text);
      }
      const { changes } = updateTranslations({ dir: copy, keep, write: false });
      for (const change of changes) console.log('Would change: ' + change);
      console.log(
        changes.length ? 'Nothing was changed (--dry-run).' : 'The translations are in step with the English.'
      );
    } finally {
      rmSync(copy, { recursive: true, force: true });
    }
    process.exit(0);
  }

  const uncommitted = uncommittedTranslations();
  if (uncommitted === null) {
    console.warn('git could not say whether any translations are uncommitted; going on.');
  } else if (uncommitted.length && !args.includes('--force')) {
    console.error(
      'These translations have changes not yet committed, and this could take some of them out:\n  ' +
        uncommitted.join('\n  ') +
        '\nCommit them first, see what would change with --dry-run, or run with --force.'
    );
    process.exit(1);
  }

  for (const [file, text] of Object.entries(written)) writeFileSync(path.join(I18N, file), text);
  console.log(
    "Wrote the English of the server's, the chemistry's, who to call's, the region data's and the standard records' messages."
  );
  const { changes } = updateTranslations({ keep });
  for (const change of changes) console.log(change);
  console.log(
    changes.length
      ? 'Brought the translations into step with the English.'
      : 'The translations are in step with the English.'
  );
}
