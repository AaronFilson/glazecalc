You are checking five messages in every live translation of Glazecalc, a free, open source glaze chemistry web app for potters (repo C:\Users\bellows\gh\glazecalc, branch i18n-wave3). The third wave's reviews found that two translators, independently, turned "may not melt fully" into "may not melt at all". The languages already live may have the same slip.

Ground rules:

- Do not run git commands that change anything. `git diff` is fine.
- Edit only client/public/i18n/recipe/<code>.json for these codes: bg cs da de el es fi fr hr hu it nl pl pt-PT ro sk sl sv. Never English, never lt, lv or et (other agents are working on lv and et).
- Never run `npm run i18n:sources` or scripts/i18n-sources.mjs.
- In Git Bash, Node is on PATH after `export PATH="/c/nvm4w/nodejs:$PATH"`.
- Never put the user's name, email address or other personal details in a web request.

The messages, in client/public/i18n/recipe/en.json (find each by its key name; read the English first):

1. `boronShortEffects`, `aluminaHighEffects`, `lowExpansionFrit`: each says a glaze "may not melt fully". The translation must say it may melt incompletely, not that it may not melt at all. Judge where the negation falls as a native reader takes it (German „nicht vollständig schmelzen“ is right; a wording that reads "fully not melt" is not).
2. `leadGloss`: "possible" covers both "clouding over red clay" and "crazing"; the translation must not make crazing certain.
3. `aluminaLowFix`: "usually fixes it": "usually" must stay.
4. `lowExpansionFrit` also: "used at about 5-10%" means used in amounts of about 5-10% of the glaze, not 5-10% of the frits.

For each of the 18 languages, read each message against the English and fix only what is wrong: a different but equally good wording is not an error. Keep each file's register, terms and plural forms. Then run `npx prettier --write` on each file you changed and `node scripts/i18n-check.mjs`, which must show no problems.

Report back in under 150 words: for each language you changed, the key and before → after (briefly, with a back-translation), and the count of languages that needed nothing.
