You are making the Slovenian (sl) translation of Glazecalc consistent after its review (repo C:\Users\bellows\gh\glazecalc, branch i18n-wave2). Glazecalc is a free, open source glaze chemistry web app for potters. The Slovenian files were translated and reviewed part by part; the reviewers found a few words used two ways across files, and corrections the glossary should carry.

Ground rules:

- Do not run git commands that change anything. `git diff` is fine.
- Edit only Slovenian files: client/public/i18n/**/sl.json, client/public/i18n/guides/*/sl.md, and docs/translations/sl.md. Never an English file, never another language's.
- Never run `npm run i18n:sources` or scripts/i18n-sources.mjs.
- In Git Bash, Node is on PATH after `export PATH="/c/nvm4w/nodejs:$PATH"`.

Read docs/translations/README.md and docs/translations/sl.md first.

1. **"leach test"** = »(laboratorijski) preskus sproščanja kovin« everywhere the English does not name metals; lead and cadmium only where it does. Check every file.
2. **Cones hotter and cooler**: »za eno številko vročejši / hladnejši«, never »višji / nižji«: cone 05 is cooler than 04. The firing review fixed thirteen places; check the glazing-basics cone-pack note, the recipe, records and guides JSON files, and anything else that speaks of a cone up or down.
3. **Poison line and poison centre**: "poison line" = »linija za zastrupitve« (»… živali« for animals), "poison centre" = »center za zastrupitve«; check safety/sl.json, guides/sl.json and the home-safety guide use them so.
4. **Fire extinguisher**: one word in both safety guides and the firing guide (»gasilni aparat« or »gasilnik«, with "ABC" where the English says so).
5. **Ring {n}** (a Bullers ring in the firing log) = »Obroček {n}«.
6. **CLP hazard-class codes** (Repr. 1A, Carc. 2, STOT RE 1) stay as written, never made into Slovenian abbreviations; check records/sl.json.
7. **Titles**: the five guide titles must be the same in the guides' front matter, every link that names a guide, client/public/i18n/sl.json `titles` and guides/sl.json `list`; page titles separate with the en dash ("… – Glazecalc") everywhere, including recipe/sl.json's print and compare titles. Check.
8. **"should" and "must"** in safety text: "should" = »naj / bi morali«, "must" = »treba / morate«. Check the safety text of every Slovenian file (safety/, regions/, records hazard lines, recipe lead and food checks, account settings.lead, guides/sl.json poison/silica/food, and the five guides) against the English.
9. **The glossary (docs/translations/sl.md)**: carry these decisions: leach test as in point 1; one cone hotter/cooler as in point 2; poison line and poison centre; fire extinguisher; Ring {n} = Obroček {n}; CLP codes stay as written; respirable crystalline silica: the legal phrase and, after "dust", the short »respirabilni kristalni kremen«; dates arrive in the nominative, so labels read »(preverjeno: {date})«, »Začetek veljavnosti: {date}«; "Compare two recipes": the glossary's »Primerjaj dva recepta« for the page's button and heading, »Primerjava dveh receptov« for the help heading.

Then run `npx prettier --write` on every file you changed, and `node scripts/i18n-check.mjs --language sl`, which must show no problems.

Report back in under 150 words: what you changed in how many files, and anything you left and why.
