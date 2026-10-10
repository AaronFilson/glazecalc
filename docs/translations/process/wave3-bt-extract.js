// The app's warnings in one language, for blind back-translation (wave 2):
// backtranslation/<code>-warnings-source.json holds the translation only, keyed
// "scope:key" (where each lives); <code>-warnings-english.json the English under
// the same keys, opened only after. Keys are chosen from the English and the data.
//   node wave2-bt-extract.js sk
const fs = require('fs');
const ROOT = 'C:/Users/bellows/gh/glazecalc/';
const I18N = ROOT + 'client/public/i18n/';
const OUT =
  'C:/Users/bellows/AppData/Local/Temp/claude/C--Users-bellows-gh-glazecalc/fe37625a-51db-4239-bee8-4e00779ae983/scratchpad/backtranslation/';
const { textKey } = require(ROOT + 'lib/regions/languages.js');
const code = process.argv[2];
if (!code) throw new Error('language code?');
const load = (scope, lang) => JSON.parse(fs.readFileSync(`${I18N}${scope}/${lang}.json`, 'utf8'));
const flat = (o, p = '', out = {}) => {
  for (const [k, v] of Object.entries(o)) {
    if (v && typeof v === 'object') flat(v, p + k + '.', out);
    else out[p + k] = v;
  }
  return out;
};
const source = {};
const english = {};
const add = (scope, keys) => {
  const tr = flat(load(scope, code));
  const en = flat(load(scope, 'en'));
  for (const key of keys) {
    source[`${scope}:${key}`] = tr[key] ?? '(missing)';
    english[`${scope}:${key}`] = en[key];
  }
};
const keysOf = (scope) => Object.keys(flat(load(scope, 'en')));

// Who to call, and the region data's notes: every message.
add('safety', keysOf('safety'));
add('regions', keysOf('regions'));
// Every standard material's and additive's hazard line.
const hazards = new Set();
for (const file of ['materials', 'additives']) {
  for (const line of fs.readFileSync(ROOT + 'data/' + file + '.ndjson', 'utf8').split('\n')) {
    if (line.trim() && JSON.parse(line).hazards) hazards.add(textKey(JSON.parse(line).hazards));
  }
}
add(
  'records',
  keysOf('records').filter((key) => hazards.has(key))
);
// The lead setting, the recipe's lead and safety checks, and the guides' who to call, silica and food limits.
add(
  'account',
  keysOf('account').filter((key) => key.startsWith('settings.lead.'))
);
const recipeEn = flat(load('recipe', 'en'));
const safetyWords = /lead|food|leach|toxic|poison|dust|safe|respirator|hazard|fluorine|barium|lithium/i;
add(
  'recipe',
  keysOf('recipe').filter(
    (key) =>
      key.startsWith('lead.') ||
      ((key.startsWith('checks.') || key.startsWith('page.')) && safetyWords.test(recipeEn[key] || ''))
  )
);
add(
  'guides',
  keysOf('guides').filter((key) => /^(poison|silica|food)\./.test(key))
);

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(OUT + code + '-warnings-source.json', JSON.stringify(source, null, 1) + '\n');
fs.writeFileSync(OUT + code + '-warnings-english.json', JSON.stringify(english, null, 1) + '\n');
console.log(code, Object.keys(source).length, 'segments');
