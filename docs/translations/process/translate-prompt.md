You are translating part of Glazecalc, a free, open source glaze chemistry web app for potters (repo C:\Users\bellows\gh\glazecalc, branch i18n-phase3), from English into {LANGUAGE} ({CODE}). Readers are potters, many of them beginners, in {COUNTRY}. Every translated page carries a notice that it was translated by AI, with a link to suggest corrections; the aim is still a translation a native potter would not stumble over.

Ground rules:

- Do not run git commands that change anything (no add, commit, checkout, stash, reset, restore).
- Create or edit only the file(s) named under "Your files". Other translators are working in the same folder at the same time on other files and other languages; never touch theirs, and never edit any English file.
- In Git Bash, Node is on PATH after `export PATH="/c/nvm4w/nodejs:$PATH"`.
- Never put the user's name, email address or other personal details in a web request (headers such as User-Agent, URLs, form data).

Read first, in full:

1. docs/translations/README.md: the rules every translation follows. They are not optional: placeholders, tags, plural forms, numbers, links, guide marks.
2. docs/translations/{CODE}.md: the {LANGUAGE} style sheet and glossary. Use its register and its terms every time, so a potter meets one word for one thing everywhere. Where you need a term it lacks, choose the one {COUNTRY} potters and suppliers use, and list it in your report.
3. docs/translations/terms.md only where you need the English meaning of a term.

Your files:
{FILES}

If an earlier attempt at your files was cut off, it may have left a partial translation file, or scratch files in the scratchpad folder (C:\Users\bellows\AppData\Local\Temp\claude\C--Users-bellows-gh-glazecalc\fe37625a-51db-4239-bee8-4e00779ae983\scratchpad, folders named after the part and language). You may use that work only after checking each piece against the English; otherwise start over. Keep your own scratch files in a new folder there named {CODE}-<part>-2.

How to work:

- Translate segment by segment (a message, or a paragraph), knowing where it appears. When a key's meaning is unclear, find where the app uses it (grep the key, or its last part, in client/app) and read the template around it.
- Translate the meaning, in natural {LANGUAGE} for a potter, not word for word; keep the English's plain, short-sentence voice. Never add or drop information, warnings or hedges ("about", "usually", "never"). Safety text must say exactly what the English says, no softer and no stronger.
- JSON files: the same keys in the same order as the English, two-space indentation, UTF-8, a final newline. Write them in a few parts if they are long (for example, build the object in a Node script reading the English file and a table of your translations), but make sure nothing is left out. Markdown files: the same sections, paragraphs, lists and tables as the English, in the same order.
- Run `npx prettier --write` on each file you write.
- Then run `node scripts/i18n-check.mjs --language {CODE}` and fix every problem it reports in your files (it also reports other files of {CODE} that other translators are still writing: ignore those). Repeat until your files have no problems. A "numbers differ" problem means a figure, unit or link is not the English's: fix the translation, never the figure.
- Finally read your translation through once against the English, looking for anything missed, mistranslated, or in the wrong register, and fix it.

Report back in under 150 words: the files written, terms you chose that the glossary lacks (English → {LANGUAGE}), and anything in the English that seemed wrong or unclear. Do not paste the translation.
