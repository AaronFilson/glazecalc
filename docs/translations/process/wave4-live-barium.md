You are checking two table cells in every live translation of Glazecalc, a free, open source glaze chemistry web app for potters (repo C:\Users\bellows\gh\glazecalc, branch i18n-wave4-finish). The fourth wave's back-translations found that two translators, independently, misread the same English cell, and a review found a comparison that could be read the wrong way round. The languages already live may have the same slips.

Ground rules:

- Do not run git commands that change anything. `git diff` is fine.
- Edit only client/public/i18n/guides/safe-mixing/<code>.md and client/public/i18n/guides/glazing-basics/<code>.md for these codes: bg cs da de el es et fi fr hr hu it lt lv nl pl pt-PT ro sk sl sv. Never English, never ga or mt (other agents may be working on mt).
- Never run `npm run i18n:sources` or scripts/i18n-sources.mjs.
- In Git Bash, Node is on PATH after `export PATH="/c/nvm4w/nodejs:$PATH"`.
- Never put the user's name, email address or other personal details in a web request.

The cells (read the English first):

1. client/public/i18n/guides/safe-mixing/en.md, the materials table, row "Barium carbonate", column Precaution: "A barium frit or strontium where the recipe allows; respirator; labeled container." It offers two stand-ins for raw barium carbonate: **a barium frit**, or **strontium** (strontium carbonate), where the recipe allows. Irish and Maltese both made it "a barium or strontium frit", which narrows the second to a strontium frit. The translation must offer a barium frit, or strontium itself.
2. client/public/i18n/guides/glazing-basics/en.md, the materials table, row "Strontium carbonate": "The less toxic stand-in for barium". Strontium is the less toxic of the two. The translation must not be readable as barium being the less toxic one.

For each of the 21 languages, read both cells against the English as a native reader would take them, and fix only what is wrong: a different but equally clear wording is not an error. Keep each file's register and terms (docs/translations/<code>.md), and the table's structure. Then run `npx prettier --write` on each file you changed and `node scripts/i18n-check.mjs`, which must show no problems.

Report back in under 150 words: for each language you changed, the cell and before → after (briefly, with a back-translation), and the count of languages that needed nothing.
