You are carrying a correction to the English firing guide of Glazecalc into its translations (repo C:\Users\bellows\gh\glazecalc, branch i18n-wave3). Glazecalc is a free, open source glaze chemistry web app for potters. Two sentences of client/public/i18n/guides/firing/en.md were wrong and have been corrected in English; every translation must now say what the corrected English says.

Ground rules:

- Do not run git commands that change anything. `git diff` is fine (it shows the English change: `git diff client/public/i18n/guides/firing/en.md`).
- Edit only client/public/i18n/guides/firing/<code>.md for these codes: {CODES}. Never English, never another language's file.
- Never run `npm run i18n:sources` or scripts/i18n-sources.mjs.
- In Git Bash, Node is on PATH after `export PATH="/c/nvm4w/nodejs:$PATH"`.
- Never put the user's name, email address or other personal details in a web request.

The two corrections (old English → new English):

1. Section "The cone chart" ({#cone-chart}), the sentence on working out a rate. It divided the temperature a kiln reaches by the hours, where the rule just before it says to divide the temperature climbed; in °C the figures did not agree (482 ÷ 3 is not 167).
   - Old: "a kiln that reaches {{900 °F; 482 °C}} in 3 hours is heating at about {{300 °F/h; 167 °C/h}}."
   - New: "a kiln that climbs {{900 °F; 500 °C}} in 3 hours is heating at about {{300 °F/h; 167 °C/h}}." (900 °F climbed is 500 °C climbed: a difference, not a temperature.)
2. Section "Reading cones" ({#reading-cones}), the paragraph after the heading "After the firing". Orton's chart puts the end point at a 90° bend, the 5 o'clock position; 6 o'clock is a cone touching the shelf.
   - Old: "The end point is 6 o'clock, the tip level with the base: the point the chart's temperatures are measured at. Between 4 o'clock and touching the shelf the difference is small, "usually 1 or 2 degrees"."
   - New: read the corrected paragraph in client/public/i18n/guides/firing/en.md.

For each language: find the two sentences in its firing guide, change them to say what the new English says (only those sentences: the value `{{900 °F; 500 °C}}` exactly as in the English, the clock positions and the 90° as figures), in the language's own words and terms (docs/translations/<code>.md: the glossary's word for "cone", "end point", "bend", "climb"; the style sheet's number style). Keep everything else in the file as it is.

Then run `npx prettier --write` on each file you changed and `node scripts/i18n-check.mjs --language <code>` for each; a "numbers differ" problem in these two sections means your figures are not the English's: fix the translation.

Report back in under 120 words: the files changed, and any language where the sentence was not where you expected or you were unsure of the wording.
