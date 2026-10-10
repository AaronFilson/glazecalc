You are translating part of Glazecalc, a free, open source glaze chemistry web app for potters (repo C:\Users\bellows\gh\glazecalc, branch {BRANCH}), from English into {LANGUAGE} ({CODE}). Readers are potters, many of them beginners, in {COUNTRY}. Every translated page carries a notice that it was translated by AI, with a link to suggest corrections; the aim is still a translation a native potter would not stumble over.

Ground rules:

- Do not run git commands that change anything (no add, commit, checkout, stash, reset, restore).
- Create or edit only the file(s) named under "Your files". Other translators are working in the same folder at the same time on other files and other languages; never touch theirs, and never edit any English file.
- In Git Bash, Node is on PATH after `export PATH="/c/nvm4w/nodejs:$PATH"`.
- Never put the user's name, email address or other personal details in a web request (headers such as User-Agent, URLs, form data).

Read first, in full:

1. docs/translations/README.md: the rules every translation follows. They are not optional: placeholders, tags, plural forms, numbers, links, guide marks.
2. docs/translations/{CODE}.md: the {LANGUAGE} style sheet and glossary. Use its register and its terms every time, so a potter meets one word for one thing everywhere. Where you need a term it lacks, choose the one {COUNTRY} potters and suppliers use, and list it in your report.
3. docs/translations/terms.md only where you need the English meaning of a term.
4. If your language has plural forms the README does not list (it names the first wave's), its style sheet lists them: write every category CLDR gives your language.

What the reviews of the languages done before yours found, to get right the first time:

- "leach test" means a test of the metals a fired piece releases. Several glossaries render it as a test for lead and cadmium only; use the general wording unless the English names lead and cadmium.
- `guides.density.sg` writes a specific gravity in the language's own word or abbreviation, as the glossary gives it, not the English "SG".
- "must be tested" means the test must be done, not that it must be passed; "should" is not "must", nor "must" "should"; "some" (some sulfur, some fine quartz) is not "a little".
- The food-contact category "Cooking ware of any size, and packaging and storage vessels over 3 L": the 3 L applies only to packaging and storage vessels. Punctuate as your language's official text of Directive 84/500/EEC does, so it cannot be read otherwise.
- A cone is "one number hotter" or "one number cooler", never higher or lower, above or below, up or down: cone 05 is cooler than 04, so "one number higher" points the wrong way for low-fire potters.
- "sealed containers" (for wet scraps and glaze) means airtight, not merely closed. "ready-mixed glaze" is wet glaze already mixed, not a powder; "powder" covers powdered commercial glazes as well as raw materials.
- Where a guide writes `{{SG 1.45}}`, the page shows your guides.density.sg message (the word and the number): do not repeat the word around it ("a density of density 1,45").
- Plural forms: write every CLDR category your language has, each agreeing with its number, including the form that fractions such as 1.5 take.
- `account.settings.density.sg.example` stays in English until the language goes live, when a script fills it: ignore it.
- "not fully" is not "not at all": "may not melt fully" must not become "may not melt at all". Check where the negation falls in every "not fully", "not completely", "not always".
- Every negation survives: a wave-4 safety guide lost the "never" in "never use compressed air", so a prohibition read as an instruction. Check each never, not, no, don't and without in your English, and each comparison of two things (the less toxic of two materials must not read as the other).
- "HSE" in the guides is the UK's Health and Safety Executive. Where a country has its own HSE (Ireland's Health Service Executive), name it as the UK's at its first mention in each section.
- The app's guides and a kiln's own manual must not be the same bare word. Where another translator of your language has already written a guide (client/public/i18n/guides/*/{CODE}.md), use its front-matter title, the same in every link, page title and list.

Your files:
{FILES}

If an earlier attempt at your files was cut off, it may have left a partial translation file, or scratch files in {SCRATCH} (folders named after the part and language). You may use that work only after checking each piece against the English; otherwise start over. Keep your own scratch files in a new folder there named {CODE}-<part>-2.

How to work:

- Translate segment by segment (a message, or a paragraph), knowing where it appears. When a key's meaning is unclear, find where the app uses it (grep the key, or its last part, in client/app) and read the template around it.
- Translate the meaning, in natural {LANGUAGE} for a potter, not word for word; keep the English's plain, short-sentence voice. Never add or drop information, warnings or hedges ("about", "usually", "never"). Safety text must say exactly what the English says, no softer and no stronger.
- JSON files: the same keys in the same order as the English, two-space indentation, UTF-8, a final newline. Write them in a few parts if they are long (for example, build the object in a Node script reading the English file and a table of your translations), but make sure nothing is left out. Markdown files: the same sections, paragraphs, lists and tables as the English, in the same order.
- Run `npx prettier --write` on each file you write.
- Then run `node scripts/i18n-check.mjs --language {CODE}` and fix every problem it reports in your files (it also reports other files of {CODE} that other translators are still writing: ignore those). Repeat until your files have no problems. A "numbers differ" problem means a figure, unit or link is not the English's: fix the translation, never the figure.
- Finally read your translation through once against the English, looking for anything missed, mistranslated, or in the wrong register, and fix it.

Report back in under 150 words: the files written, terms you chose that the glossary lacks (English → {LANGUAGE}), and anything in the English that seemed wrong or unclear. Do not paste the translation.
