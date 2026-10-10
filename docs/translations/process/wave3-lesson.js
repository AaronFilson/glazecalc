// Adds a lesson learned mid-wave to the prompts not yet started.
//   node wave3-lesson.js <files...>   (the lesson text is LESSON below)
const fs = require('fs');
const LESSON =
  '"not fully" is not "not at all": "may not melt fully" must not become "may not melt at all". Check where the negation falls in every "not fully", "not completely", "not always".';
const anchors = [
  // translate prompts
  "- The app's guides and a kiln's own manual must not be the same bare word.",
  // review prompts
  '   - The glossary was built from suppliers'
];
for (const f of process.argv.slice(2)) {
  let t = fs.readFileSync(f, 'utf8');
  if (t.includes('"not fully" is not "not at all"')) continue;
  const a = anchors.find((x) => t.includes(x));
  if (!a) throw new Error('no anchor in ' + f);
  t = t.replace(a, (a.startsWith('   ') ? '   - ' : '- ') + LESSON + '\n' + a);
  fs.writeFileSync(f, t);
  console.log('added', f.split(/[\\/]/).pop());
}
