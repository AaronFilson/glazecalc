You are making the Maltese (mt) translation of Glazecalc consistent after its review (repo C:\Users\bellows\gh\glazecalc, branch i18n-wave4). Glazecalc is a free, open source glaze chemistry web app for potters. The Maltese files were translated and reviewed part by part; the reviewers found words used two ways across files, slips that may recur in files they did not read, and corrections the glossary should carry.

Ground rules:

- Do not run git commands that change anything. `git diff` is fine.
- Edit only Maltese files: client/public/i18n/**/mt.json, client/public/i18n/guides/*/mt.md, and docs/translations/mt.md. Never an English file, never another language's. Other agents may be working on Irish files at the same time.
- Never run `npm run i18n:sources` or scripts/i18n-sources.mjs.
- In Git Bash, Node is on PATH after `export PATH="/c/nvm4w/nodejs:$PATH"`.
- Never put the user's name, email address or other personal details in a web request (headers such as User-Agent, URLs, form data).

Read docs/translations/README.md and docs/translations/mt.md first.

1. **Negations in safety text.** The Irish safe-mixing translation lost a "never" (a prohibition read as an instruction); the Maltese reviews found none lost, but they read their own files only. For every safety sentence in every Maltese file (safety/, regions/, records hazard and handling lines, recipe lead and food checks, account settings.lead, guides/mt.json poison/silica/food, and the five guides), find each never, not, no, don't, without and only in the English and confirm the Maltese keeps it, in the same place. Also "should" is not "must", "some" is not "a little", and "not fully" is not "not at all". Check every comparison of two materials (less toxic, safer, cooler…) cannot read the other way round. **Hedges too**: the firing review found a quote that had lost its "may" (a possibility read as a fact); check may, can, might, about, usually, often and up to in the guides and records.
2. **Spelling rules the reviews fixed in one file** — check every Maltese file for the same slip:
   - the euphonic i: "ttestja", "ċċekkja", "pprova" after a vowel (never "U ittestja", "iżda iċċekkja"); "bl-imgħarfa" (the article takes i before mgħ-, mgħ-…);
   - "ma" shortens to "m’" only before a vowel or a silent għ/h: "ma fihx", never "m’fihx";
   - the apostrophe on imperatives and words that end in a lost għ: "Ferra’", "tferra’", "Erġa’";
   - agreement of adjectives and participles with plural nouns ("uċuħ matti", "akkwarji mgħottijin", "l-istokk jiswa").
3. **One word for one thing** across files, as the reviews settled:
   - buff = "bejġ", tan = "kannella ċar"; scoop = "mgħarfa" (tablespoon "mgħarfa kbira"); extension cord = "kejbil tal-estensjoni"; plug = "plagg"; shopping cart = "karrettun tax-xiri"; GP = "tabib tal-familja"; seizure: "aċċessjoni" (home-safety) or "konvulżjoni" (parts): choose one;
   - a school's or maker's published guide = "pubblikazzjoni", never the bare "gwida" (the app's guides) nor "manwal" (a kiln's manual). The five guide titles must match in the guides' front matter, client/public/i18n/mt.json `titles`, guides/mt.json `list` and every link that names a guide;
   - safety data sheet, poison line / poison centre, fire extinguisher, respirator, dust mask: one term each across safety/, guides/mt.json, records/mt.json and the five guides;
   - Tips = "Suġġerimenti"; the Advice page = "Pariri"; the button "Add the oxide to the list" = "Żid l-ossidu mal-lista" wherever a text names it.
4. **Cones** are one number hotter or cooler (aktar sħun / aktar kiesaħ), never higher or lower, up or down: check glazing-basics, firing, recipe, records and guides/mt.json.
5. **`{{en: …}}` marks**: the English term in brackets at the first use in each section for the glossary's "show English" terms, in all five guides alike.
6. **The glossary (docs/translations/mt.md)**: carry what the reviews decided:
   - buff / tan, scoop, extension cord, pubblikazzjoni, seizure (point 3);
   - the food-contact cooking category with a semicolon, as the Maltese text of 84/500 punctuates it;
   - add: mineral (ore; pl. minerali), madmiet tal-prova (the counted plural after a figure), twebbis fil-qiegħ (hard-panning), ermetiku (airtight), and the new terms the reviews accepted;
   - the spelling rules in point 2, in the style sheet;
   - whatever you settle in points 1–5.
7. **Cone packs**: "one number apart" reads best as "b’differenza ta’ numru wieħed" ("numru wieħed bejn kull wieħed" can read as a gap of one cone between them): use it in firing, glazing-basics and the glossary.
8. **Email**: "indirizz elettroniku" for an address, "posta elettronika" for the service, "messaġġ elettroniku" (or "messaġġ") for one message, everywhere, never "l-email" or "indirizz tal-email" (the app-parts review fixed nine in server/ and regions/: check the guides, account/ and site/).
9. **Seizure** = "aċċessjoni" (konvulżjoni is a convulsion): settled; check every file.
10. **"Show it"** = "Uriha" where it refers to a guide (f); check each such message for what "it" is.
11. **"skjerat" (deploy)**: IATE's "skjerament" is the military sense; for software use what Microsoft's Maltese terminology or IATE gives ("varar" or "implimentazzjoni"), and make the glossary say it.
12. Glossary additions from the app-parts review: indirizz elettroniku, posta elettronika, messaġġ elettroniku, aċċessjoni, IA (IATE), firxa (array), fornitur, apparat, tabib tal-familja, plattin, qolla, briek tat-te; and "{minutes}" messages use a plural message (as `reset-sent` now does), except the password email, whose placeholders are plain text.

Then run `npx prettier --write` on every file you changed, and `node scripts/i18n-check.mjs --language mt`, which must show no problems (one message, `account.settings.density.sg.example`, stays in English until go-live).

Report back in under 150 words: what you changed in how many files (say how many negations or comparisons you had to fix), and anything you left and why.
