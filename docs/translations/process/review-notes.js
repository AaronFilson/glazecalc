// Adds what each part's translator flagged to the review of that part, so the reviewer settles it.
//   GLAZECALC_SCRATCH=... node review-notes.js <notes.json>
// notes.json: { "<code>": { "<group>": ["a flag", ...], ... }, ... }, groups as in make-review-prompts.js.
// Run after make-review-prompts.js; running it twice adds nothing.
const fs = require('fs');
const { SCRATCH } = require('./wave');

const notesFile = process.argv[2];
if (!notesFile) throw new Error('Which notes file?');
const NOTES = JSON.parse(fs.readFileSync(notesFile, 'utf8'));
const anchor = 'Fix what is wrong, directly in the translation file.';
for (const [code, groups] of Object.entries(NOTES)) {
  for (const [group, notes] of Object.entries(groups)) {
    const file = SCRATCH + `review/${code}-${group}.md`;
    let text = fs.readFileSync(file, 'utf8');
    if (text.includes('What the translators of your files flagged')) continue;
    if (!text.includes(anchor)) throw new Error('anchor missing in ' + file);
    const list = notes.map((note) => '- ' + note).join('\n');
    text = text.replace(anchor, `What the translators of your files flagged, to settle:\n${list}\n\n${anchor}`);
    fs.writeFileSync(file, text);
    console.log(code, group, notes.length);
  }
}
