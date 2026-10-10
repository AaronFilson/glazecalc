# How waves 1 and 2 were run

The prompts and scripts used to translate, review, back-translate and take
languages live, kept for wave 3. They were written for one session's scratch
folder: the absolute paths in them (`C:/Users/bellows/AppData/Local/Temp/claude/...`)
must be changed to wherever they are run from.

Per language, in order (see docs/i18n-plan.md, Phase 3):

1. **Translate** in nine parts (`wave2-chunks.md`): `wave2-translate-make.js`
   makes one prompt per language and part from `translate-prompt.md`.
2. **Review** in six groups: `wave2-review-make.js`, from
   `translation-review-prompt.md`. Its rulings are the lessons of waves 1–2.
3. **Make consistent** across the language's files: one prompt per language,
   written from the reviews' reports (`wave2-sl-consistency.md` is an example).
4. **Back-translate blind** the safety text: `wave2-bt-make.js <code>` (which
   runs `wave2-bt-extract.js`), from `backtranslate-prompt.md`.
5. **Go live** in batches: `wave2-go-live.mjs <every live code> <new codes>`
   sets `live: true`, adds the password emails, fills the density example and
   writes fingerprints without touching languages still in progress. Its
   `KEEP` list names English changes that keep their meaning. Then the unit
   tests, `npm run check:i18n`, and the browser tests on Windows and Linux.

`safe-mixing-pass.md` is an example of a fix across every language at once.
`wave2-log.md` is the working log of wave 2: what each step found.
