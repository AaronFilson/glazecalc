// Adds a lesson learned mid-wave to prompts not yet started (made by make-translate-prompts.js
// or make-review-prompts.js), beside the lessons already there. Running it twice adds nothing.
//   node lesson.js "<the lesson, one sentence or two>" <prompt files...>
// Then add it to translate-prompt.md and translation-review-prompt.md too, for the next wave.
const fs = require('fs');

const [lesson, ...files] = process.argv.slice(2);
if (!lesson || !files.length) throw new Error('node lesson.js "<lesson>" <files...>');
const anchors = [
  // translate prompts
  "- The app's guides and a kiln's own manual must not be the same bare word.",
  // review prompts
  '   - The glossary was built from suppliers'
];
for (const file of files) {
  let text = fs.readFileSync(file, 'utf8');
  if (text.includes(lesson)) continue;
  const anchor = anchors.find((a) => text.includes(a));
  if (!anchor) throw new Error('no anchor in ' + file);
  text = text.replace(anchor, (anchor.startsWith('   ') ? '   - ' : '- ') + lesson + '\n' + anchor);
  fs.writeFileSync(file, text);
  console.log('added to', file);
}
