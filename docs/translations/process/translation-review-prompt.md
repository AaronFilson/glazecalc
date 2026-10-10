You are the independent second pass on the {LANGUAGE} ({CODE}) translation of part of Glazecalc, a free, open source glaze chemistry web app for potters (repo C:\Users\bellows\gh\glazecalc, branch i18n-phase3). Another translator made it from the English; you did not. Readers are potters, many of them beginners, in {COUNTRY}.

Ground rules:

- Do not run git commands that change anything (no add, commit, checkout, stash, reset, restore). `git diff` and `git status` are fine.
- Edit only the translation file(s) named under "Your files". Other reviewers are working on other files at the same time; never touch theirs, and never edit an English file.
- In Git Bash, Node is on PATH after `export PATH="/c/nvm4w/nodejs:$PATH"`.
- Never put the user's name, email address or other personal details in a web request (headers such as User-Agent, URLs, form data).

Read first:

1. docs/translations/README.md: the rules every translation follows.
2. docs/translations/{CODE}.md: the {LANGUAGE} style sheet and glossary.

Your files (English → translation; `<code>` is {CODE}): the section(s) {SECTIONS} of
C:\Users\bellows\AppData\Local\Temp\claude\C--Users-bellows-gh-glazecalc\fe37625a-51db-4239-bee8-4e00779ae983\scratchpad\chunks.md.

Read the English and the translation side by side, every segment (a message, a paragraph, a table row, a list item), and check:

1. **Meaning.** Nothing added, dropped or changed: negations, conditions, quantities, comparisons ("less than", "at least"), hedges ("usually", "about", "never"), and who does what. Safety text must say exactly what the English says, no softer and no stronger: an earlier review found "may contain some fine quartz" turned into "a little fine quartz", and "should be tested" into "must be tested".
2. **Completeness.** Every sentence of the English is there; nothing is left in English that should not be.
3. **Terms.** The glossary's term every time, the same thing always called the same; material and product names untranslated.
4. **Register and style.** The style sheet's address, button and heading conventions, quotation marks, number style.
5. **Language.** Grammar, agreement (in every plural form, each form agreeing with its number), spelling, punctuation; natural to a potter in {COUNTRY}, not translated word for word.
6. **Fit.** Labels, buttons, column heads and tab names short enough to sit where the English sits; page titles short.
7. **Units.** Inches and feet as the language's word (the README says so; some translators kept "in" and "ft"), the same in every file of the language.
8. **Values in the guides.** {{SG 1.45}} shows as the language's guides.density.sg message ("spez. Gewicht 1,45", "densidad 1,45"), and {{2232 °F; 1222 °C}} as both scales: the words around them must read naturally with that, never repeating the word ("density of density 1,45").
9. **Mechanics.** Placeholders, tags, plural forms, `{{…}}` values, ids and marks as the README says.

Across files: the app names the guides (`titles` in client/public/i18n/<code>.json, `list` in guides/<code>.json) and links to the library's buttons by name; make those match the translated guides' front-matter titles (client/public/i18n/guides/<guide>/<code>.md) and the translated buttons, where they are among your files.

Fix what is wrong, directly in the translation file. Do not rewrite what is right: a different but equally good wording is not an error. When a problem recurs, fix every occurrence. Then run `npx prettier --write` on each file you changed, and `node scripts/i18n-check.mjs --language {CODE}`; fix any problem it reports in your files (ignore other files of {CODE}, which others are reviewing).

Report back in under 200 words: how many segments you changed, by kind (meaning, omission, term, register, language, fit, mechanics), the most serious ones quoted briefly (English → before → after), and any term the glossary should change or add.
