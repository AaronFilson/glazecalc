You are making the Latvian (lv) translation of Glazecalc consistent after its review (repo C:\Users\bellows\gh\glazecalc, branch i18n-wave3). Glazecalc is a free, open source glaze chemistry web app for potters. The Latvian files were translated and reviewed part by part; the reviewers found words used two ways across files, and corrections the glossary should carry.

Ground rules:

- Do not run git commands that change anything. `git diff` is fine.
- Edit only Latvian files: client/public/i18n/**/lv.json, client/public/i18n/guides/*/lv.md, and docs/translations/lv.md. Never an English file, never another language's. Other agents are working on Lithuanian and Estonian files at the same time.
- Never run `npm run i18n:sources` or scripts/i18n-sources.mjs.
- In Git Bash, Node is on PATH after `export PATH="/c/nvm4w/nodejs:$PATH"`.
- Never put the user's name, email address or other personal details in a web request (headers such as User-Agent, URLs, form data).

Read docs/translations/README.md and docs/translations/lv.md first.

1. **"not fully" is not "not at all"**: the recipe review found "may not melt fully" made „var pilnībā neizkust“ (may not melt at all) three times. Search every file for „pilnībā ne…“ and similar, and for "not fully", "not completely", "not always" in the English, and check where the negation falls („neizkust līdz galam“).
2. **Hazard statements (H-phrases)**: each H-statement in records/lv.json, recipe/lv.json and the guides must use the official Latvian wording of Regulation (EC) No 1272/2008, Annex III, the same every time. The records review was unsure about H330 („Ieelpojot iestājas nāve“) and plain H360; read the official Latvian text (EUR-Lex or the Publications Office copy the glossary cites) and fix only what differs from it.
3. **Respirable crystalline silica**: one form everywhere (the glossary's legal term), with the explanation that it means dust fine enough to reach the alveoli given once per guide where the English explains respirable dust. Check safe-mixing, home-safety, glazing-basics, records, guides/lv.json silica, regions/lv.json.
4. **"token"** = „marķieris“ everywhere.
5. **Dates**: a `{date}` arrives as a long nominative („2026. gada 8. oktobris“), so it always follows a colon or stands as a label („pārbaudīts: {date}“, „Spēkā stāšanās datums: {date}“). Check every file.
6. **Yes/no questions** start with „vai“ (the style sheet); "Or …" at the start of an instruction is „Vai arī …“, never a bare „Vai …“ that reads as a question. Check every file.
7. **"leach test"** = the general wording for a test of the metals a fired piece releases, everywhere the English does not name lead and cadmium.
8. **Cones hotter and cooler**: one number hotter / cooler, never higher / lower, up / down. Check glazing-basics, firing, recipe, records and guides/lv.json.
9. **Guides and manuals**: the glossary's word for the app's guides, a different one for a kiln's own manual, everywhere. The five guide titles must be the same in the guides' front matter, every link that names a guide, client/public/i18n/lv.json `titles` and guides/lv.json `list`.
10. **People's names**: Latvian form with the original in brackets at the first mention in each guide or page (Hermanis Zēgers (Hermann Seger)), the same way in every file.
11. **Poison line and poison centre, fire extinguisher, safety data sheet**: one term each across safety/lv.json, guides/lv.json, records/lv.json and the five guides.
12. **"should" and "must"** in safety text: check the safety text of every Latvian file (safety/, regions/, records hazard lines, recipe lead and food checks, account settings.lead, guides/lv.json poison/silica/food, and the five guides) against the English.
    12a. **A mask's seal check** (the wearer's own check, following the maker's instructions) is not a fit test (done by a trained tester at work): the safety review fixed one place („pēc ražotāja norādījumiem pārbaudīt, vai tā cieši pieguļ“). Check both safety guides and records keep the two apart.
    12b. **"gum"**: bare "gum" (CMC and the like) = „saistviela“; where the English names "a gum or binder" together, „līmviela vai saistviela“. Check the guides, recipe and records.
13. **The glossary (docs/translations/lv.md)**: carry what the reviews decided:
    - compare's "Balance" = „Rādītāji“ (its rows include loss on ignition and expansion, which are not ratios); "Balance" elsewhere as before;
    - "nearing maturity" (ware, not only glaze) = „tuvojas vajadzīgajai apdedzināšanas pakāpei“;
    - "not fully" = „… līdz galam“ in Pitfalls;
    - token = „marķieris“; dates after a colon; yes/no questions with „vai“;
    - the column the English calls "Elements" lists oxides: say which word the files use;
    - the seal check and the fit test (12a); "gum" (12b);
    - whatever you settle in points 1–12b.

Then run `npx prettier --write` on every file you changed, and `node scripts/i18n-check.mjs --language lv`, which must show no problems (one message, `account.settings.density.sg.example`, stays in English until go-live).

Report back in under 150 words: what you changed in how many files, and anything you left and why.
