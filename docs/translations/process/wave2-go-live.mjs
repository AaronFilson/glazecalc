// Takes finished wave-2 languages live (docs/i18n-plan.md):
//   node wave2-go-live.mjs sk el cs da          does it
//   node wave2-go-live.mjs --dry sk el cs da    says what it would do
// 1. live: true in lib/regions/languages.js;
// 2. their password emails (scratchpad/emails/<code>.json) added to
//    server/lib/account_mail.ts after the others, which are left as they are;
// 3. the density setting's example (account.settings.density.sg.example) from
//    the language's own guides.density.sg, where the file lacks it;
// 4. fingerprint ledgers, made on a copy of client/public/i18n holding only the
//    English and the live languages, so that files of languages still being
//    translated are neither read nor written; changed files are copied back.
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const ROOT = 'C:/Users/bellows/gh/glazecalc/';
const I18N = ROOT + 'client/public/i18n/';
const FINGERPRINTS = ROOT + 'client/i18n-fingerprints/';
const EMAILS =
  'C:/Users/bellows/AppData/Local/Temp/claude/C--Users-bellows-gh-glazecalc/c9e2de23-6bd0-4c08-9910-8c09a9678344/scratchpad/emails/';
const dry = process.argv.includes('--dry');
const codes = process.argv.slice(2).filter((a) => a !== '--dry');
if (!codes.length) throw new Error('which languages?');
const write = (file, text) => (dry ? console.log('would write', file) : writeFileSync(file, text));

// 1. live
const languagesFile = ROOT + 'lib/regions/languages.js';
let languages = readFileSync(languagesFile, 'utf8');
for (const code of codes) {
  const line = new RegExp(`^(  language\\('${code}', '[^']+', '[^']+')\\),$`, 'm');
  if (line.test(languages)) languages = languages.replace(line, '$1, { live: true }),');
  else if (!new RegExp(`^  language\\('${code}', [^\\n]*live: true`, 'm').test(languages))
    throw new Error(code + ': not in languages.js');
}
write(languagesFile, languages);

// 2. emails
const mailFile = ROOT + 'server/lib/account_mail.ts';
let mail = readFileSync(mailFile, 'utf8');
const quote = (text) => "'" + text.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n') + "'";
const textCode = (text) =>
  text
    .split(/(?<=\n\n)|(?=\n-- \n)/)
    .map((part) => '      ' + quote(part))
    .join(' +\n');
const entry = (code, email) =>
  `  ${/^[a-z]+$/.test(code) ? code : quote(code)}: {\n    subject: ${quote(email.subject)},\n    text:\n${textCode(email.text)}\n  }`;
for (const [name, kind] of [
  ['RESET', 'reset'],
  ['CHANGED', 'changed']
]) {
  const start = mail.indexOf(`export const ${name}: Record<string, Email> = {`);
  const end = mail.indexOf('\n};', start);
  if (start < 0 || end < 0) throw new Error('cannot find ' + name);
  const added = [];
  for (const code of codes) {
    const key = /^[a-z]+$/.test(code) ? code : quote(code);
    if (mail.slice(start, end).includes(`\n  ${key}: {`)) continue;
    const email = JSON.parse(readFileSync(EMAILS + code + '.json', 'utf8'))[kind];
    if (!email?.subject || !email?.text) throw new Error(code + ': no ' + kind + ' email');
    added.push(entry(code, email));
  }
  if (added.length) mail = mail.slice(0, end) + ',\n' + added.join(',\n') + mail.slice(end);
}
write(mailFile, mail);

// 3. the density example
const json = (value) => JSON.stringify(value, null, 2) + '\n';
for (const code of codes) {
  const file = I18N + `account/${code}.json`;
  const account = JSON.parse(readFileSync(file, 'utf8'));
  const sg = account.settings?.density?.sg;
  if (!sg) throw new Error(code + ': no settings.density.sg');
  const number = new Intl.NumberFormat(code, { minimumFractionDigits: 2 }).format(1.45);
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
// English made plainer during wave 2 without changing its meaning: their translations stay.
const KEEP = [
  'guides:food.category.cooking',
  'guides/home-safety:the-kiln',
  'guides/making-a-glaze:testing',
  'guides/safe-mixing:respirators',
  'guides/home-safety:pets'
];
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
