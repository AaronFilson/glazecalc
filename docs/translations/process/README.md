# How waves 1 to 3 were run

The prompts and scripts used to write glossaries, translate, review, back-translate and take languages live, kept
for wave 4. They were written for one session's scratch folder: the absolute paths in them
(`C:/Users/bellows/AppData/Local/Temp/claude/...`) must be changed to wherever they are run from. The `wave3-*`
files are the latest; the `wave2-*` ones are kept for reference.

Per language, in order (see docs/i18n-plan.md, Phase 3):

0. **Glossary and style sheet** (`glossary-prompt.md`), researched in the language's own sources. Check its plural
   forms, its word for specific gravity and that its rules can pass the numbers check (wave 3's asked for figures
   the English lacks, and had to be corrected).
1. **Translate** in nine parts (`wave2-chunks.md`): `wave3-translate-make.js` makes one prompt per language and part
   from `translate-prompt.md`, with the lessons of waves 1–3.
2. **Review** in six groups: `wave3-review-make.js`, from `translation-review-prompt.md`. Before launching,
   `wave3-review-notes.js <code>` adds what each part's translator flagged to the review of that part.
3. **Make consistent** across the language's files: one prompt per language, written from the reviews' reports
   (`wave3-consistency-<code>.md`).
4. **Back-translate blind** the safety text: `wave3-bt-make.js <code>` (which runs `wave3-bt-extract.js`), from
   `backtranslate-prompt.md`.
5. **Go live** one language at a time: `wave3-go-live.mjs <every live code> <new code>` sets `live: true`, adds the
   password emails, fills the density example and writes fingerprints without touching languages still in progress.
   Its `KEEP` list names English changes whose translations were brought into line. Then, in a worktree at the
   commit (so files of languages in progress are not checked): `npm run check:i18n`, lint, the unit tests, and the
   browser tests on Windows and Linux.

A lesson found mid-wave goes into every prompt not yet started (`wave3-lesson.js`); a correction to the English goes
into every language at once (`wave3-firing-fix.md`, `safe-mixing-pass.md`), and a slip found in a new language is
checked in the live ones (`wave3-live-notfully.md`). `wave2-log.md` and `wave3-log.md` are the working logs: what each
step found. Wave 3 ran at most six agents at a time.
