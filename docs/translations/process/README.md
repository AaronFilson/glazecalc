# How the translation waves are run

The prompts and scripts used to write glossaries, translate, review, back-translate and take languages live (waves
1–3, docs/i18n-plan.md, Phase 3), ready for the next wave. The scripts take the session's scratch folder from
`GLAZECALC_SCRATCH` (an absolute path) and write every prompt and agent work file there; the branch named in the
prompts is the current one (or `GLAZECALC_BRANCH`). A language must be in `LANGUAGES` in [wave.js](wave.js) (its
name, who reads it, its region, where its glossary research starts); Irish and Maltese are there.

```bash
export PATH="/c/nvm4w/nodejs:$PATH"
export GLAZECALC_SCRATCH="<the session's scratchpad>"
cd docs/translations/process
```

Per language, in order:

1. **Glossary and style sheet:** `node make-glossary-prompts.js ga mt` → `glossary/<code>.md`, from
   `glossary-prompt.md`. The agent writes `docs/translations/<code>.md` from the language's own sources. Check its
   plural forms, its word for specific gravity, and that none of its rules asks for figures the English lacks (the
   numbers check rejects them; wave 3's glossaries had to be corrected for "mid fire").
2. **Translate** in nine parts: `node make-translate-prompts.js ga mt` → `translate/<code>-<part>.md`, from
   `translate-prompt.md` (the lessons of waves 1–3 are written into it) and `chunks.md` (the parts and their files).
   The emails come back as `<scratch>/emails/<code>.json`.
3. **Review** in six groups: `node make-review-prompts.js ga mt` → `review/<code>-<group>.md`, from
   `translation-review-prompt.md`. Before launching, put what each translator flagged in a JSON file
   (`{ "ga": { "recipe": ["…"] } }`) and run `node review-notes.js <file>`.
4. **Make consistent** across the language's files: one prompt per language, written by hand from the reviews'
   reports (examples: `wave3-consistency-<code>.md`, `wave2-sl-consistency.md`).
5. **Back-translate blind** the safety text: `node make-bt-prompts.js ga` (runs `bt-extract.js`) →
   `bt/<code>-{safe-mixing,home-safety,warnings}.md`, from `backtranslate-prompt.md`.
6. **Go live** one language at a time: `node go-live.mjs --dry ga`, then without `--dry`. It sets `live: true`, adds
   the password emails, fills the density example and writes fingerprints, without touching languages still in
   progress. If the English changed during the wave and every translation was brought into line, name the changed
   sections in its `KEEP` list first. Then, in a worktree at the commit (so files of languages in progress are not
   read): `npm run check:i18n`, lint, `npm test`, `npm run test:client`, `npm run test:e2e`, `npm run
test:e2e:linux`; update the README's language count and the changelog.

A lesson found mid-wave goes into every prompt not yet started (`node lesson.js "<lesson>" <files…>`) and then into
the templates. A correction to the English goes into every language at once (`wave3-firing-fix.md`,
`safe-mixing-pass.md`), and a slip found in a new language is checked in the live ones (`wave3-live-notfully.md`).
`wave2-log.md` and `wave3-log.md` are the working logs: what each step found. The examples keep the scratch paths of
the sessions that wrote them.

**How waves 2 and 3 ran agents:** one per prompt (a fresh agent told to read the prompt file and do what it says),
**at most six at a time** (the owner's choice; wave 2 ran twenty and a usage limit stopped them all at once), longest
parts first, interleaving the next language's translations with the last one's reviews. A log in the scratch folder
(as `wave3-log.md`) keeps the queue and what each agent reported.

## Wave 4: Irish and Maltese (not started)

Decide first, with the owner (docs/i18n-plan.md, "The plan, reviewed critically", point 2): translate them, or leave
them in English with their region data only. Over 90% of Irish and Maltese respondents read English, and machine
translation is weakest for them.

If they are translated:

- **The plainer notice** the plan promises them ("their notice says so more plainly"): today every translated page
  shows the same `notice` messages (client/public/i18n/en.json `notice`). Irish and Maltese need a variant that says
  plainly the translation is machine-made and the English may read better, with the link to it. That is a code and
  message change before go-live, with a test.
- **Glossaries:** Irish ceramics vocabulary is thin (téarma.ie has much of it); Maltese draws on Italian and English
  loanwords, and the glossary must say which the Maltese potter uses. Irish has five plural categories in CLDR
  (one, two, few, many, other) and initial mutations after the article and numbers; Maltese has its own five
  (one, two, few, many, other) and the article's assimilation (il-, ix-, iż-…), which a `{name}` placeholder cannot take.
- **Who reads it:** Ireland's region lists English first (`lib/regions/index.js`), Malta's Maltese first.

## After the EU

docs/i18n-plan.md, "After the EU: Asia, the Indian subcontinent and Africa": right-to-left (Arabic, Urdu), Japanese
SK cones, the regions before the languages. Add those languages to `LANGUAGES` in wave.js; the scripts are otherwise
the same.
