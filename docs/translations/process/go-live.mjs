// Takes finished languages live (docs/i18n-plan.md). Name only the new ones; the
// languages already live are read from lib/regions/languages.js.
//   GLAZECALC_SCRATCH=... node go-live.mjs ga          does it
//   GLAZECALC_SCRATCH=... node go-live.mjs --dry ga    says what it would do
// 1. live: true in lib/regions/languages.js;
// 2. their password emails (<scratch>/emails/<code>.json) written to
//    server/i18n/mail/<code>.json, which server/lib/account_mail.ts reads; what
//    a language's file has already is left as it is;
// 3. the density setting's example (account.settings.density.sg.example) from
//    the language's own guides.density.sg, where the file lacks it;
// 4. fingerprint ledgers, made on a copy of client/public/i18n holding only the
//    English and the live languages, so that files of languages still being
//    translated are neither read nor written; changed files are copied back.
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const wave = createRequire(import.meta.url)('./wave.js');
const ROOT = wave.ROOT.replace(/\\/g, '/') + '/';
const I18N = ROOT + 'client/public/i18n/';
const FINGERPRINTS = ROOT + 'client/i18n-fingerprints/';
const EMAILS = wave.SCRATCH + 'emails/';
const dry = process.argv.includes('--dry');
const codes = process.argv.slice(2).filter((a) => a !== '--dry');
if (!codes.length) throw new Error('which languages?');
// A code as languages.js writes one (en, pt-BR, zh-Hant, es-419, en-XA), and nothing else: it goes into the
// patterns and file names below.
for (const code of codes) {
  if (!/^[a-z]{2,3}(-([A-Z][a-z]{3}|[A-Z]{2}|\d{3}))?$/.test(code))
    throw new Error(code + ': not a language code (such as ga, pt-BR or zh-Hant)');
}
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const write = (file, text) => (dry ? console.log('would write', file) : writeFileSync(file, text));

// 1. live
const languagesFile = ROOT + 'lib/regions/languages.js';
let languages = readFileSync(languagesFile, 'utf8');
for (const code of codes) {
  const name = escapeRegExp(code);
  const line = new RegExp(`^(  language\\('${name}', '[^']+', '[^']+')\\),$`, 'm');
  // A language with options of its own (Irish, Maltese: { plainNotice: true }) gets live first among them.
  const withOptions = new RegExp(
    `^(  language\\('${name}', '[^']+', '[^']+', \\{ )(?!live: true)([^}\\n]*\\}\\)),$`,
    'm'
  );
  if (line.test(languages)) languages = languages.replace(line, '$1, { live: true }),');
  else if (withOptions.test(languages)) languages = languages.replace(withOptions, '$1live: true, $2,');
  else if (!new RegExp(`^  language\\('${name}', [^\\n]*live: true`, 'm').test(languages))
    throw new Error(code + ': not in languages.js');
}
write(languagesFile, languages);

// 2. emails: one file a language, its kinds in the order of English's (by name)
const MAIL = ROOT + 'server/i18n/mail/';
const byName = ([a], [b]) => (a < b ? -1 : a > b ? 1 : 0);
for (const code of codes) {
  const file = MAIL + code + '.json';
  const mail = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
  const before = JSON.stringify(mail);
  for (const [name, kind] of [
    ['RESET', 'reset'],
    ['CHANGED', 'changed']
  ]) {
    if (mail[name]) continue;
    const email = JSON.parse(readFileSync(EMAILS + code + '.json', 'utf8'))[kind];
    if (!email?.subject || !email?.text) throw new Error(code + ': no ' + kind + ' email');
    mail[name] = { subject: email.subject, text: email.text };
  }
  if (JSON.stringify(mail) !== before)
    write(file, JSON.stringify(Object.fromEntries(Object.entries(mail).sort(byName)), null, 2) + '\n');
}

// 3. the density example
const json = (value) => JSON.stringify(value, null, 2) + '\n';
for (const code of codes) {
  const file = I18N + `account/${code}.json`;
  const account = JSON.parse(readFileSync(file, 'utf8'));
  const sg = account.settings?.density?.sg;
  if (!sg) throw new Error(code + ': no settings.density.sg');
  // A translation writes 0–9 (Bengali's own digits are shown from the reader's settings), so 1.45, never ১.৪৫.
  const number = new Intl.NumberFormat(code, { minimumFractionDigits: 2, numberingSystem: 'latn' }).format(1.45);
  // The English's example copied in by a translator ("SG 1.45") is filled like a missing one.
  const english = JSON.parse(readFileSync(I18N + 'account/en.json', 'utf8')).settings.density.sg.example;
  if (sg.example === english) delete sg.example;
  if (sg.example) {
    const repeats = sg.example.toLowerCase().startsWith(sg.label.trim().toLowerCase() + ' ');
    if (!repeats) continue;
    sg.example = number;
    console.log(code, 'density example, which repeated the label:', sg.example);
    write(file, json(account));
    continue;
  }
  const form = JSON.parse(readFileSync(I18N + `guides/${code}.json`, 'utf8')).density.sg;
  // "Massefylde (massefylde 1,45)" says the word twice: then the number alone.
  const word = form.replace('{value}', '').trim().toLowerCase();
  sg.example = word === sg.label.trim().toLowerCase() ? number : form.replace('{value}', number);
  console.log(code, 'density example:', sg.example);
  write(file, json(account));
}

// 4. fingerprints, on a copy
const require = createRequire(import.meta.url);
delete require.cache[languagesFile];
const live = new Set([...(dry ? [] : require(languagesFile).LIVE_LANGUAGES), ...codes]);
if (dry) for (const m of languages.matchAll(/^ {2}language\('([^']+)'[^\n]*live: true/gm)) live.add(m[1]);
const tmp = mkdtempSync(path.join(tmpdir(), 'golive-'));
const copyI18n = tmp + '/i18n/';
const copyPrints = tmp + '/prints/';
const ours = (name) => {
  const m = /^(.+)\.(json|md)$/.exec(name);
  return !m || live.has(m[1]);
};
for (const entry of readdirSync(I18N, { recursive: true, withFileTypes: true })) {
  if (!entry.isFile() || !ours(entry.name)) continue;
  const from = path.join(entry.parentPath, entry.name);
  const to = path.join(copyI18n, path.relative(I18N, from));
  mkdirSync(path.dirname(to), { recursive: true });
  cpSync(from, to);
}
cpSync(FINGERPRINTS, copyPrints, { recursive: true });
const { updateTranslations } = await import('file:///' + ROOT + 'scripts/i18n-fingerprints.mjs');
// English changed during the wave whose translations were brought into line (or
// whose meaning stayed the same), as 'scope:key' or 'guides/<guide>:<section>':
// those translations keep their place instead of going back to English. Empty at
// the start of each wave; waves 2 and 3 listed theirs here (see their logs).
const KEEP = [];
const result = updateTranslations({ dir: copyI18n, fingerprints: copyPrints, write: true, keep: KEEP });
const changes = Array.isArray(result) ? result : (result?.changes ?? []);
const kinds = {};
for (const change of changes) {
  const kind = change.replace(/^.*?: /, '');
  const language = change.split(' ')[1];
  kinds[`${language}: ${kind}`] = (kinds[`${language}: ${kind}`] ?? 0) + 1;
}
console.log(kinds);
for (const change of changes) if (!/fingerprinted with its English/.test(change)) console.log('  ', change);
let copied = 0;
for (const [copyRoot, realRoot] of [
  [copyI18n, I18N],
  [copyPrints, FINGERPRINTS]
]) {
  for (const entry of readdirSync(copyRoot, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const from = path.join(entry.parentPath, entry.name);
    const to = path.join(realRoot, path.relative(copyRoot, from));
    const text = readFileSync(from, 'utf8');
    if (!existsSync(to) || readFileSync(to, 'utf8') !== text) {
      copied++;
      write(to, text);
    }
  }
}
console.log(copied, 'files', dry ? 'would change' : 'changed');
rmSync(tmp, { recursive: true, force: true });
