// One translation prompt per language and part (wave 2).
const fs = require('fs');
const S = 'C:/Users/bellows/AppData/Local/Temp/claude/C--Users-bellows-gh-glazecalc/c9e2de23-6bd0-4c08-9910-8c09a9678344/scratchpad/';
const CHUNKS =
  'C:\\Users\\bellows\\AppData\\Local\\Temp\\claude\\C--Users-bellows-gh-glazecalc\\c9e2de23-6bd0-4c08-9910-8c09a9678344\\scratchpad\\wave2-chunks.md';
let t = fs.readFileSync(S + 'translate-prompt.md', 'utf8');
t = t.replace('branch i18n-phase3', 'branch i18n-wave2');
t = t.replace(
  '3. docs/translations/terms.md only where you need the English meaning of a term.',
  "3. docs/translations/terms.md only where you need the English meaning of a term.\n4. If your language has plural forms the README does not list (it names the first wave's), its style sheet lists them: write every category CLDR gives your language."
);
t = t.replace(
  /(\n4\. If your language has plural forms[^\n]*\n)/,
  `$1
What the reviews of the languages done before yours found, to get right the first time:
- "leach test" means a test of the metals a fired piece releases. Several glossaries render it as a test for lead and cadmium only; use the general wording unless the English names lead and cadmium.
- \`guides.density.sg\` writes a specific gravity in the language's own word or abbreviation, as the glossary gives it, not the English "SG".
- "must be tested" means the test must be done, not that it must be passed; "should" is not "must", nor "must" "should"; "some" (some sulfur, some fine quartz) is not "a little".
- The food-contact category "Cooking ware of any size, and packaging and storage vessels over 3 L": the 3 L applies only to packaging and storage vessels. Punctuate as your language's official text of Directive 84/500/EEC does, so it cannot be read otherwise.
- A cone is "one number hotter" or "one number cooler", never higher or lower, above or below, up or down: cone 05 is cooler than 04, so "one number higher" points the wrong way for low-fire potters.
- The app's guides and a kiln's own manual must not be the same bare word. Where another translator of your language has already written a guide (client/public/i18n/guides/*/{CODE}.md), use its front-matter title, the same in every link, page title and list.
`
);
if (!t.includes('What the reviews of the languages done before yours found')) throw new Error('lessons not added');
if (!t.includes('{FILES}')) throw new Error('no FILES');
fs.writeFileSync(S + 'wave2-translate-prompt.md', t);
const PARTS = ['app', 'parts', 'recipe', 'records', 'glazing-basics', 'making-a-glaze', 'safe-mixing', 'home-safety', 'firing'];
const L = {
  nl: ['Dutch', 'the Netherlands and Flanders'],
  ro: ['Romanian', 'Romania'],
  cs: ['Czech', 'Czechia'],
  hu: ['Hungarian', 'Hungary'],
  el: ['Greek', 'Greece and Cyprus'],
  sv: ['Swedish', 'Sweden'],
  da: ['Danish', 'Denmark'],
  fi: ['Finnish', 'Finland'],
  sk: ['Slovak', 'Slovakia'],
  sl: ['Slovenian', 'Slovenia'],
  hr: ['Croatian', 'Croatia'],
  bg: ['Bulgarian', 'Bulgaria']
};
fs.mkdirSync(S + 'wave2-translate', { recursive: true });
for (const [code, [language, country]] of Object.entries(L)) {
  for (const part of PARTS) {
    const files = `The part **${part}** of ${CHUNKS}: read that part (the heading "## ${part}"); it names your files, where each English file is, and what is in it. In each path, \`<code>\` is \`${code}\`.`;
    fs.writeFileSync(
      S + `wave2-translate/${code}-${part}.md`,
      t
        .replace(/\{LANGUAGE\}/g, language)
        .replace(/\{CODE\}/g, code)
        .replace(/\{COUNTRY\}/g, country)
        .replace('{FILES}', files)
    );
  }
}
console.log(fs.readdirSync(S + 'wave2-translate').length);
