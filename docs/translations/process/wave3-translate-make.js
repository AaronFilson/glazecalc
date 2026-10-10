// One translation prompt per language and part (wave 3).
const fs = require('fs');
const S =
  'C:/Users/bellows/AppData/Local/Temp/claude/C--Users-bellows-gh-glazecalc/fe37625a-51db-4239-bee8-4e00779ae983/scratchpad/';
const CHUNKS =
  'C:\\Users\\bellows\\AppData\\Local\\Temp\\claude\\C--Users-bellows-gh-glazecalc\\fe37625a-51db-4239-bee8-4e00779ae983\\scratchpad\\wave3-chunks.md';
let t = fs.readFileSync(S + 'translate-prompt.md', 'utf8');
t = t.replace('branch i18n-phase3', 'branch i18n-wave3');
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
- "sealed containers" (for wet scraps and glaze) means airtight, not merely closed. "ready-mixed glaze" is wet glaze already mixed, not a powder; "powder" covers powdered commercial glazes as well as raw materials.
- Where a guide writes \`{{SG 1.45}}\`, the page shows your guides.density.sg message (the word and the number): do not repeat the word around it ("a density of density 1,45").
- Plural forms: write every CLDR category your language has, each agreeing with its number, including the form that fractions such as 1.5 take.
- \`account.settings.density.sg.example\` stays in English until the language goes live, when a script fills it: ignore it.
- "not fully" is not "not at all": "may not melt fully" must not become "may not melt at all". Check where the negation falls in every "not fully", "not completely", "not always".
- The app's guides and a kiln's own manual must not be the same bare word. Where another translator of your language has already written a guide (client/public/i18n/guides/*/{CODE}.md), use its front-matter title, the same in every link, page title and list.
`
);
if (!t.includes('What the reviews of the languages done before yours found')) throw new Error('lessons not added');
if (!t.includes('{FILES}')) throw new Error('no FILES');
fs.writeFileSync(S + 'wave3-translate-prompt.md', t);
const PARTS = [
  'app',
  'parts',
  'recipe',
  'records',
  'glazing-basics',
  'making-a-glaze',
  'safe-mixing',
  'home-safety',
  'firing'
];
const L = {
  lt: ['Lithuanian', 'Lithuania'],
  lv: ['Latvian', 'Latvia'],
  et: ['Estonian', 'Estonia']
};
fs.mkdirSync(S + 'wave3-translate', { recursive: true });
for (const [code, [language, country]] of Object.entries(L)) {
  for (const part of PARTS) {
    const files = `The part **${part}** of ${CHUNKS}: read that part (the heading "## ${part}"); it names your files, where each English file is, and what is in it. In each path, \`<code>\` is \`${code}\`.`;
    fs.writeFileSync(
      S + `wave3-translate/${code}-${part}.md`,
      t
        .replace(/\{LANGUAGE\}/g, language)
        .replace(/\{CODE\}/g, code)
        .replace(/\{COUNTRY\}/g, country)
        .replace('{FILES}', files)
    );
  }
}
console.log(fs.readdirSync(S + 'wave3-translate').length);
