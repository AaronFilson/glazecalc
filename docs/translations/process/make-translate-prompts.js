// One translation prompt per language and part (the parts of chunks.md), from translate-prompt.md.
//   GLAZECALC_SCRATCH=... node make-translate-prompts.js ga mt   → <scratch>/translate/<code>-<part>.md
const { LANGUAGES, codes, fill, write, chunks } = require('./wave');

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
const CHUNKS = chunks();
let count = 0;
for (const code of codes()) {
  const { language, country } = LANGUAGES[code];
  for (const part of PARTS) {
    const files = `The part **${part}** of ${CHUNKS}: read that part (the heading "## ${part}"); it names your files, where each English file is, and what is in it. In each path, \`<code>\` is \`${code}\`.`;
    write(
      `translate/${code}-${part}.md`,
      fill('translate-prompt.md', { LANGUAGE: language, CODE: code, COUNTRY: country, FILES: files })
    );
    count++;
  }
}
console.log(count, 'prompts in translate/');
