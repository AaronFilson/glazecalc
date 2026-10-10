// Six review prompts per language (wave 3), from Phase 3's review prompt.
const fs = require('fs');
const S =
  'C:/Users/bellows/AppData/Local/Temp/claude/C--Users-bellows-gh-glazecalc/fe37625a-51db-4239-bee8-4e00779ae983/scratchpad/';
const WIN =
  'C:\\Users\\bellows\\AppData\\Local\\Temp\\claude\\C--Users-bellows-gh-glazecalc\\fe37625a-51db-4239-bee8-4e00779ae983\\scratchpad\\';
let t = fs.readFileSync(S + 'translation-review-prompt.md', 'utf8');
const rep = (a, b) => {
  if (!t.includes(a)) throw new Error('missing: ' + a.slice(0, 60));
  t = t.split(a).join(b);
};
rep('branch i18n-phase3', 'branch i18n-wave3');
rep(WIN + 'chunks.md', WIN + 'wave3-chunks.md');
rep(
  '9. **Mechanics.**',
  `9. **Rulings that apply to every language of this wave:**
   - "leach test" means a test of the metals a fired piece releases. Several glossaries render it as a test for lead and cadmium only, which narrows the English: use the general wording unless the English names lead and cadmium.
   - \`guides.density.sg\` writes a specific gravity in the language's own words or abbreviation, as the glossary gives it (German "spez. Gewicht {value}"), not the English "SG"; the guides' sentences around \`{{SG …}}\` must read naturally with it.
   - "must be tested" means the test must be done, not that it must be passed; "should" is not "must", nor "must" "should"; "some" (some sulfur, some fine quartz) is not "a little". Earlier languages' reviews and back-translations found each of these several times.
   - The food-contact category "Cooking ware of any size, and packaging and storage vessels over 3 L" (\`guides.food.category.cooking\`): the 3 L applies only to packaging and storage vessels; the translation must not be readable as cooking ware over 3 L only.
   - The cone pack's guide, firing and guard cones are one cone cooler and one cone hotter than the target. "One number lower/higher" (or "up/down") is wrong for the 0-series, where 07 is cooler than 06: say cooler and hotter.
   - The app's guides and a kiln's own manual must not be the same bare word. The five guide titles must be the same in the guides' front matter, every link, the page titles (\`titles\`) and the guide list (\`list\`); where yours disagree with another file, make yours match the guide's own front matter, and say so in your report.
   - "sealed containers" (wet scraps, glaze) means airtight, not merely closed; "ready-mixed glaze" is wet glaze already mixed, not a powder; "powder" covers powdered commercial glazes as well as raw materials. Earlier languages got each wrong.
   - Plural forms: every CLDR category of the language is written and agrees with its number, including the form that fractions such as 1.5 take.
   - \`account.settings.density.sg.example\` stays in English until go-live: leave it.
   - "not fully" is not "not at all": "may not melt fully" must not become "may not melt at all". Check where the negation falls in every "not fully", "not completely", "not always".
   - The glossary was built from suppliers' catalogues, not by potters, and lists its uncertain choices. Where a glossary term reads wrong to you in context, keep the translation consistent with the glossary unless it is plainly wrong, and say so in your report; do not edit the glossary.
10. **Mechanics.**`
);
fs.writeFileSync(S + 'wave3-review-prompt.md', t);
const GROUPS = {
  'app-parts': '"app" and "parts"',
  records: '"records"',
  recipe: '"recipe"',
  'basics-making': '"glazing-basics" and "making-a-glaze"',
  firing: '"firing"',
  'safety-guides': '"safe-mixing" and "home-safety"'
};
const L = {
  lt: ['Lithuanian', 'Lithuania'],
  lv: ['Latvian', 'Latvia'],
  et: ['Estonian', 'Estonia']
};
fs.mkdirSync(S + 'wave3-review', { recursive: true });
for (const [code, [language, country]] of Object.entries(L)) {
  for (const [group, sections] of Object.entries(GROUPS)) {
    const text = t
      .replace(/\{LANGUAGE\}/g, language)
      .replace(/\{CODE\}/g, code)
      .replace(/\{COUNTRY\}/g, country)
      .replace(/\{SECTIONS\}/g, sections);
    if (/\{[A-Z]+\}/.test(text)) throw new Error(code + ' ' + group + ': placeholder left');
    fs.writeFileSync(S + `wave3-review/${code}-${group}.md`, text);
  }
}
console.log(fs.readdirSync(S + 'wave3-review').length);
