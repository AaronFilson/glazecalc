// Three blind back-translation prompts per language (wave 2), from Phase 3's:
// the two safety guides, and the app's warnings (extracted by wave2-bt-extract.js).
//   node wave2-bt-make.js sk
const fs = require('fs');
const { execFileSync } = require('child_process');
const S = 'C:/Users/bellows/AppData/Local/Temp/claude/C--Users-bellows-gh-glazecalc/c9e2de23-6bd0-4c08-9910-8c09a9678344/scratchpad/';
const WIN = 'C:\\Users\\bellows\\AppData\\Local\\Temp\\claude\\C--Users-bellows-gh-glazecalc\\c9e2de23-6bd0-4c08-9910-8c09a9678344\\scratchpad\\';
const L = {
  nl: 'Dutch', ro: 'Romanian', cs: 'Czech', hu: 'Hungarian', el: 'Greek', sv: 'Swedish',
  da: 'Danish', fi: 'Finnish', sk: 'Slovak', sl: 'Slovenian', hr: 'Croatian', bg: 'Bulgarian'
};
const code = process.argv[2];
if (!L[code]) throw new Error('language code?');
let t = fs.readFileSync(S + 'backtranslate-prompt.md', 'utf8');
const rep = (a, b) => {
  if (!t.includes(a)) throw new Error('missing: ' + a.slice(0, 60));
  t = t.split(a).join(b);
};
rep('branch i18n-phase3', 'branch i18n-wave2');
rep('(docs/i18n-plan.md, Phase 3, step 4)', '(docs/i18n-plan.md, the wave-2 languages)');
rep(
  'Ignore differences of wording that keep the meaning.',
  'Ignore differences of wording that keep the meaning. "Should" and "must" are not the same: a "should" made "must" (or the reverse) is a difference.'
);
const guide = (name, title) =>
  `The ${title} guide: client/public/i18n/guides/${name}/{CODE}.md (the English is client/public/i18n/guides/${name}/en.md). Every paragraph, list item and table row. Edit only client/public/i18n/guides/${name}/{CODE}.md.`;
const WHAT = {
  'safe-mixing': guide('safe-mixing', '"Safe mixing and ventilation"'),
  'home-safety': guide('home-safety', '"Don\'t poison the family"'),
  warnings: `The app's warnings, gathered for you in ${WIN}backtranslation\\{CODE}-warnings-source.json: who to call in each country, the region notes, every material's hazard line, the lead setting, the recipe page's lead and safety checks, and the guides' poison, silica and food limits. Each key is "scope:key": the text lives in client/public/i18n/<scope>/{CODE}.json under that key (dots are nesting). Read only that source file for step 1. For step 2, the English under the same keys is in ${WIN}backtranslation\\{CODE}-warnings-english.json; open it only after your back-translation is written. Fix in the client/public/i18n/<scope>/{CODE}.json files, only the keys listed. Names of services, agencies and laws stay in the language's own form (a poison centre's name is never translated into English in the translation), so compare what the name refers to, not its spelling.`
};
execFileSync('node', [S + 'wave2-bt-extract.js', code], { stdio: 'inherit' });
fs.mkdirSync(S + 'wave2-bt', { recursive: true });
for (const [part, what] of Object.entries(WHAT)) {
  const text = t
    .replace(/\{WHAT\}/g, what)
    .replace(/\{LANGUAGE\}/g, L[code])
    .replace(/\{CODE\}/g, code)
    .replace(/\{PART\}/g, part);
  if (/\{[A-Z]+\}/.test(text)) throw new Error(part + ': placeholder left');
  fs.writeFileSync(S + `wave2-bt/${code}-${part}.md`, text);
}
console.log(fs.readdirSync(S + 'wave2-bt').filter((f) => f.startsWith(code + '-')));
