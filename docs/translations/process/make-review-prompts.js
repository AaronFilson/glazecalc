// Six review prompts per language, from translation-review-prompt.md. Before launching
// them, add what each part's translator flagged with review-notes.js.
//   GLAZECALC_SCRATCH=... node make-review-prompts.js ga mt   → <scratch>/review/<code>-<group>.md
const { LANGUAGES, codes, fill, write, chunks } = require('./wave');

const GROUPS = {
  'app-parts': '"app" and "parts"',
  records: '"records"',
  recipe: '"recipe"',
  'basics-making': '"glazing-basics" and "making-a-glaze"',
  firing: '"firing"',
  'safety-guides': '"safe-mixing" and "home-safety"'
};
const CHUNKS = chunks();
let count = 0;
for (const code of codes()) {
  const { language, country } = LANGUAGES[code];
  for (const [group, sections] of Object.entries(GROUPS)) {
    write(
      `review/${code}-${group}.md`,
      fill('translation-review-prompt.md', {
        LANGUAGE: language,
        CODE: code,
        COUNTRY: country,
        SECTIONS: sections,
        CHUNKS
      })
    );
    count++;
  }
}
console.log(count, 'prompts in review/');
