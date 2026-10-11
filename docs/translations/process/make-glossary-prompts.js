// One glossary and style-sheet prompt per language, from glossary-prompt.md.
//   GLAZECALC_SCRATCH=... node make-glossary-prompts.js ga mt   → <scratch>/glossary/<code>.md
const { LANGUAGES, codes, fill, write } = require('./wave');

for (const code of codes()) {
  const l = LANGUAGES[code];
  const file = write(
    `glossary/${code}.md`,
    fill('glossary-prompt.md', {
      LANGUAGE: l.language,
      CODE: code,
      COUNTRY: l.country,
      REGION: l.region,
      SHOPS: l.shops,
      TERMBANK: l.termbank
    })
  );
  console.log(file);
}
