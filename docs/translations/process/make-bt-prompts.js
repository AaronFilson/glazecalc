// Three blind back-translation prompts for one language: the two safety guides, and
// the app's warnings (gathered by bt-extract.js). Run after its reviews and consistency pass.
//   GLAZECALC_SCRATCH=... node make-bt-prompts.js ga   → <scratch>/bt/<code>-{safe-mixing,home-safety,warnings}.md
const { execFileSync } = require('child_process');
const path = require('path');
const { LANGUAGES, SCRATCH_WIN, codes, fill, write } = require('./wave');

const [code] = codes();
const guide = (name, title) =>
  `The ${title} guide: client/public/i18n/guides/${name}/${code}.md (the English is client/public/i18n/guides/${name}/en.md). Every paragraph, list item and table row. Edit only client/public/i18n/guides/${name}/${code}.md.`;
const WHAT = {
  'safe-mixing': guide('safe-mixing', '"Safe mixing and ventilation"'),
  'home-safety': guide('home-safety', '"Don\'t poison the family"'),
  warnings: `The app's warnings, gathered for you in ${SCRATCH_WIN}backtranslation\\${code}-warnings-source.json: who to call in each country, the region notes, every material's hazard line, the lead setting, the recipe page's lead and safety checks, and the guides' poison, silica and food limits. Each key is "scope:key": the text lives in client/public/i18n/<scope>/${code}.json under that key (dots are nesting). Read only that source file for step 1. For step 2, the English under the same keys is in ${SCRATCH_WIN}backtranslation\\${code}-warnings-english.json; open it only after your back-translation is written. Fix in the client/public/i18n/<scope>/${code}.json files, only the keys listed. Names of services, agencies and laws stay in the language's own form (a poison centre's name is never translated into English in the translation), so compare what the name refers to, not its spelling.`
};
execFileSync(process.execPath, [path.join(__dirname, 'bt-extract.js'), code], { stdio: 'inherit' });
for (const [part, what] of Object.entries(WHAT)) {
  write(
    `bt/${code}-${part}.md`,
    fill('backtranslate-prompt.md', { LANGUAGE: LANGUAGES[code].language, CODE: code, PART: part, WHAT: what })
  );
}
console.log(['safe-mixing', 'home-safety', 'warnings'].map((part) => `bt/${code}-${part}.md`).join('  '));
