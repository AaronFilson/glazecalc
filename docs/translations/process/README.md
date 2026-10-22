# How the translation waves are run

The prompts and scripts used to write glossaries, translate, review, back-translate and take languages live (waves
1–3, docs/i18n-plan.md, Phase 3), ready for the next wave. The scripts take the session's scratch folder from
`GLAZECALC_SCRATCH` (an absolute path) and write every prompt and agent work file there; the branch named in the
prompts is the current one (or `GLAZECALC_BRANCH`), and the repo they name is the checkout the scripts run in
(`{REPO}`): run them in the worktree the agents will work in, never in the main checkout for a worktree's wave, and
read the first line of one prompt before starting. A language must be in `LANGUAGES` in [wave.js](wave.js) (its
name, who reads it, its region, where its glossary research starts); Irish, Maltese, Japanese and Turkish are there.
A language outside the EU also gives its own research lines (`kilns`, `law`, `terms`, in place of the EU's), and any
language may give `notes`: rules added to its glossary, translate, review or back-translation prompts only
(`{NOTES}` in the templates; empty for the others, whose prompts are unchanged).

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
   `bt/<code>-{safe-mixing,home-safety,warnings}.md`, from `backtranslate-prompt.md`. One blind back-translator per
   language: a fresh agent that did not translate or review that language, covering all of its back-translation
   files (give it the three prompts, not one agent per file). A group checker (one agent over several languages)
   is blind only for its first language: after that it has read the earlier languages' English, so it is not blind.
6. **Go live** one language at a time: `node go-live.mjs --dry ga`, then without `--dry`. It sets `live: true`, adds
   the password emails, fills the density example and writes fingerprints, without touching languages still in
   progress. If the English changed during the wave and every translation was brought into line, name the changed
   sections in its `KEEP` list first. Then, in a worktree at the commit (so files of languages in progress are not
   read): `npm run check:i18n`, lint, `npm test`, `npm run test:client`, `npm run test:e2e`, `npm run
test:e2e:linux`; update the README's language count and the changelog. Put the worktree on the same drive as the
   repository and link its `node_modules` with a junction (`mklink /J`): across drives the client build cannot
   resolve the fonts' files. Remove the junction (`rmdir`) before the worktree.

A lesson found mid-wave goes into every prompt not yet started (`node lesson.js "<lesson>" <files…>`) and then into
the templates. A correction to the English goes into every language at once (`wave3-firing-fix.md`,
`safe-mixing-pass.md`), and a slip found in a new language is checked in the live ones (`wave3-live-notfully.md`, `wave4-live-barium.md`).
`wave2-log.md`, `wave3-log.md` and `wave4-log.md` are the working logs: what each step found. The examples keep the scratch paths of
the sessions that wrote them.

**How waves 2 and 3 ran agents:** one per prompt (a fresh agent told to read the prompt file and do what it says),
**at most six at a time** (the owner's choice; wave 2 ran twenty and a usage limit stopped them all at once), longest
parts first, interleaving the next language's translations with the last one's reviews. A log in the scratch folder
(as `wave3-log.md`) keeps the queue and what each agent reported.

## Wave 4: Irish and Maltese (done)

The owner chose to translate both (2026-10-10; docs/i18n-plan.md, "The plan, reviewed critically", point 2). Over 90%
of Irish and Maltese respondents read English, and machine translation is weakest for them, so:

- **The plainer notice** the plan promises them ("their notice says so more plainly"): `plainNotice: true` in
  lib/regions/languages.js shows `notice.plain` (AI handles this language less well than most; the English page may
  read better) and, once closed, `notice.plainBrief` on every page, not only on the safety guides. Settings says so
  (`account.settings.notice.hidden.savedPlain`). Only these languages translate the three messages; the others do
  not count them as still in English (scripts/i18n-fingerprints.mjs).
- **Glossaries:** Irish ceramics vocabulary is thin (téarma.ie has much of it); Maltese draws on Italian and English
  loanwords, and the glossary must say which the Maltese potter uses. Irish has five plural categories in CLDR
  (one, two, few, many, other) and initial mutations after the article and numbers; Maltese has its own five
  (one, two, few, many, other) and the article's assimilation (il-, ix-, iż-…), which a `{name}` placeholder cannot take.
- **Who reads it:** Ireland's region lists English first (`lib/regions/index.js`), Malta's Maltese first.
- **Numbers:** both write 1.5 with a point, as English does; the numbers check takes each language's decimal mark from
  CLDR (`numbersIn` in scripts/i18n-check.mjs).

What wave 4 taught, now in the templates: check that every negation and hedge survived (a safety guide lost a "never",
another a "may"), and that a comparison of two materials cannot read the other way round; name the UK's HSE as the
UK's where a country has its own (Ireland's HSE is its health service). The consistency prompts
(`wave4-consistency-ga.md`, `wave4-consistency-mt.md`) list what the reviews found. A usage limit stopped the wave
once: a stopped agent can be resumed with a message, and goes on from its transcript.

## After the EU

docs/i18n-plan.md, "After the EU: Asia, the Indian subcontinent and Africa": right-to-left (Arabic, Urdu), Japanese
SK cones, the regions before the languages. Add those languages to `LANGUAGES` in wave.js; the scripts are otherwise
the same.

## Asia, Phase D: Japanese (in preparation)

docs/asia-plan.md, Phase D. Japanese is first (`ja`, `live: false` in lib/regions/languages.js, the standard notice);
Simplified and Traditional Chinese and Korean follow with their own entries. Japanese's entry in wave.js carries what
the European templates did not say: research from Japanese law (e-Gov), MHLW and CAA texts, JIS and the 学術用語集
instead of EUR-Lex and IATE, and notes on SK cones (always "SK", never ゼーゲル as a label, never converted to Orton),
half-width digits, the 24-hour clock, the Western calendar, `other`-only plurals with the counter inside, です/ます, 。
and 、, and the law's own words (以下, never 未満, for "at most"; 管理濃度; 加熱調理用器具). The style sheet is
docs/translations/ja.md. The numbers check reads a month written as its number (2026年10月) as the English's month
name (scripts/i18n-check.mjs), and its other Asian rules came with Phase A.

## Asia, Phase E: Turkish (in preparation)

docs/asia-plan.md, Phase E, point 5, and "Lessons from Japan, applied to Türkiye". Turkish (`tr`, `live: false`, the
standard notice) is prepared first of wave 2; its go-live waits on the owner's KVKK decision (decision 10). Its entry in
wave.js reads Turkish law on mevzuat.gov.tr, the MEB MEGEP modules, TS standards and TDK instead of EUR-Lex and IATE,
and its notes say: Orton cones named as Orton, beside the shops' "Seger piramidi" at most; SK cones as SK; Seger only
where the English says Seger, and "Seger formülü" never a cone; specific gravity as özgül ağırlık with the English's
figure, never litre weight (g/L), and bome for Baumé; 1,5, %5 and a range %10–60 (the numbers check reads it since this
phase), times as saat 20.00 (the check reads 20:00 as two numbers); İ/i and I/ı in capitals; an apostrophe before a
suffix on a name or figure and none on a placeholder; `one` and `other` with the noun singular; siz forms; en fazla,
never "-den az" or "altında", for "at most"; and no mutlaka, kesinlikle or her zaman the English lacks. The style sheet
is docs/translations/tr.md. Generate its prompts in the worktree its agents work in (`{REPO}`).

## Asia, Phase E: Indonesian, Vietnamese and Thai (live)

docs/asia-plan.md, Phase E. `id`, `vi` and `th` are live since 2026-10-18 (round 3: translated, reviewed, back-translated, caught up and taken live with `go-live.mjs th`, `vi`, `id`, one per commit). They are in lib/regions/languages.js (the standard notice) and in wave.js, and their style sheets are docs/translations/id.md, vi.md and th.md, written after Korean's, each with a "Choices for the owner and a native potter" section, a search-terms subsection and a table of the two-step sign-in words as Google and Apple write them. All three have only `other` in CLDR (the classifier goes inside it). Indonesian: "Anda", berat jenis, decimal comma, times as pukul 20.00, glasir always paired with keramik. Vietnamese: "bạn", tỷ trọng, NFC and one tone-mark style, "tháng 10 năm 2026" (the check reads the month as a number), times as 20:30, men always paired with gốm. Thai: no particles, no spaces inside words, Western digits, dates Gregorian with ค.ศ. and never a Buddhist-era year, times as 20.00 น., ความถ่วงจำเพาะ, เคลือบ always paired with เซรามิก or สูตร. Order: Indonesian, Vietnamese, Thai (Thai last). Generate the prompts in the worktree they run in (`{REPO}`).

## Asia, Phase D: Traditional Chinese, Korean and Simplified Chinese (live)

docs/asia-plan.md, Phase D. `zh-Hant`, `ko` and `zh-Hans` are in lib/regions/languages.js (`live: false`, the
standard notice) and in wave.js, and their style sheets are docs/translations/zh-Hant.md (Taiwan's usage, which Hong
Kong also reads), ko.md and zh-Hans.md, each with a table of the two-step sign-in words. They are written separately:
zh-Hant is never converted from zh-Hans or the reverse (矽/硅). ko.md must hold no Chinese or Japanese characters
except hanja a translator may use, since the hanja check allows every run of them it finds there.

## Indian subcontinent and Arabic, Phase D: Arabic and Hindi (in preparation)

The owner's decisions of 2026-10-20 (round 6): Arabic and Hindi first, then Urdu and Bengali, then the other Indic
languages. `ar` (العربية, right to left) and `hi` (हिन्दी) are in lib/regions/languages.js (`live: false`, the standard
notice) and in wave.js, whose research lines and notes replace the EU's. **Arabic** is Modern Standard Arabic, one page
for more than 20 countries (Egypt's pages first, region `EG`): pan-Arab terms with the Mashriq's and the Maghreb's
variants in the Notes, impersonal forms and verbal nouns where "you" would be masculine or feminine, all six CLDR plural
forms (zero, one, two, few, many, other) in every plural message, and Latin units, formulas and trade names kept as the
English writes them, left to right; its glossary rests on the shops' and makers' names, Arabic courses, ALECSO's
unified dictionaries (the Arabization Coordination Bureau), the Arabic texts of the GSO and SFDA, Egypt's decrees and
ES standards, and the UAE federal portal. **Hindi** is India's (region `IN`): आप, the studio potters' English loanwords
first (ग्लेज़, फ्रिट) with CSTT's term in brackets where it differs, and `one` (which covers 0 and 1) and `other`; its
glossary rests on the Indian shops, Hindi potters' usage, CSTT, NCERT's Hindi chemistry and BIS's Hindi titles. Both
write the digits 0 to 9 only, never Arabic-Indic or Devanagari digits: the app writes each region's own digits and
grouping (Arabic-Indic for Egypt, 0 to 9 for the UAE and the Maghreb, the Indian grouping 12,34,567) when it formats a
number, and the numbers check reads 0 to 9. The style sheets are docs/translations/ar.md (written 2026-10-20: 331 rows,
its "Choices for the owner and a native potter" first, then the gender-neutral forms, the six plural forms with a table
per counted noun, the month names by region, and the law's words from Algeria's Arabic Journal officiel) and hi.md (to
come). Neither goes live
before the groundwork for right-to-left pages, digits, fonts and the numbers check (Phase A) and the regions (Phase C).

## Indian subcontinent, Phase D: Urdu and Bengali (live)

Round 8, after Arabic and Hindi went live; both live since 2026-10-21 (translated, reviewed in six groups, made
consistent, back-translated blind, the English changed during the wave caught up, and taken live with `go-live.mjs ur`,
then `bn`, one per commit). `ur` (اردو, right to left, Nastaliq) and `bn` (বাংলা) are in
lib/regions/languages.js (the standard notice) and in wave.js, with the owner's decisions of 2026-10-21:
Hindi's model (the studio potters' loanwords first, the language's own term in brackets) but for three words whose
loanword collides with an everyday one, the kiln (بھٹی, চুল্লি with "(কিলন)" once), firing (پکائی, পোড়ানো; never
فائرنگ or ফায়ারিং, gunfire) and the cone (مخروط, শঙ্কু; never کون "who" or কোন "which"), each cone with "(Orton cone)"
in Latin letters at its first use. **Urdu** is Pakistan's (region `PK`): آپ, sentences end with ۔, Urdu letters (ی ک
ہ, never the Arabic ي ك ه), and Urdu pages show the digits 0 to 9, as Pakistan writes them. **Bengali** is
Bangladesh's (region `BD`; West Bengal reads the same page): আপনি, পানি, sentences end with the danda । (U+0964, never
its look-alike U+09F7), and Bengali pages show every figure in Bengali digits, the text's as well as the formatted
numbers (`textDigits` in lib/regions/languages.js), unless the reader chose 0 to 9 in Settings. Both translations write
0 to 9 only. The translations check (scripts/i18n-check.mjs) holds them to it: checkUrdu (۔, the Urdu letters, no
tatweel or direction marks, NFC) and checkBengali (।, never U+09F7, NFC). The style sheets are docs/translations/ur.md
and bn.md (written 2026-10-21 from the round-8 terminology pass, scratch/round8/urbn-terms in the main checkout), each
with "The owner's decisions and the native check" first. Generate the prompts in the worktree they run in (`{REPO}`).
