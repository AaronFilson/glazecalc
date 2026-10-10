You are making the Estonian (et) translation of Glazecalc consistent after its review (repo C:\Users\bellows\gh\glazecalc, branch i18n-wave3). Glazecalc is a free, open source glaze chemistry web app for potters. The Estonian files were translated and reviewed part by part; the reviewers found words used two ways across files, and corrections the glossary should carry.

Ground rules:

- Do not run git commands that change anything. `git diff` is fine.
- Edit only Estonian files: client/public/i18n/**/et.json, client/public/i18n/guides/*/et.md, and docs/translations/et.md. Never an English file, never another language's. Other agents may be working on Latvian files at the same time.
- Never run `npm run i18n:sources` or scripts/i18n-sources.mjs.
- In Git Bash, Node is on PATH after `export PATH="/c/nvm4w/nodejs:$PATH"`.
- Never put the user's name, email address or other personal details in a web request (headers such as User-Agent, URLs, form data).

Read docs/translations/README.md and docs/translations/et.md first.

1. **"token"** = „sisselogimisluba“ (the sign-in token) everywhere; never „tõend“.
2. **Region pickers** label a select showing one country: singular „… riigis:“ (Poed riigis:, Numbrid riigis:, …) and „Kontrollitud:“ for "Checked on", everywhere they appear.
3. **No "we"**: the style sheet avoids the first person; "we suggest / in our view / we would not" = „see juhend soovitab / selle juhendi hinnangul / selle juhendi hinnangul ei tasu …“. The safety review fixed a wording that read as the guide itself using a mask. Check every guide and JSON file for „me“, „meie“, „soovitame“ and similar, and for wordings that make the guide the actor.
4. **"not fully" is not "not at all"**: other languages' reviews found "may not melt fully" made "may not melt at all". Search every file for "not fully", "not completely", "not always" in the English and check where the negation falls in the Estonian.
5. **Respirable crystalline silica**: „respireeritav“ everywhere (guides, records, guides/et.json silica, regions/et.json), with the plain explanation (dust fine enough to reach deep into the lungs) at its first use in each guide.
6. **Hazard statements**: each H-statement in records/et.json, recipe/et.json and the guides uses the official Estonian wording of Regulation (EC) No 1272/2008, Annex III, the same every time; what the English attributes to a safety data sheet stays attributed to it.
7. **"leach test"** = the general wording for a test of the metals a fired piece releases, everywhere the English does not name lead and cadmium.
8. **Cones hotter and cooler**: one number hotter / cooler, never higher / lower, up / down. The trigger of a Kiln-Sitter and its trigger plate are one part: „päästikplaat“ everywhere.
9. **Guides and manuals**: „juhend“ for the app's guides only; a kiln's manual „kasutusjuhend“; a school's kiln booklet „ahjukäsiraamat“. The five guide titles must be the same in the guides' front matter, every link that names a guide, client/public/i18n/et.json `titles` and guides/et.json `list`.
10. **Headings** are noun phrases (the style sheet): "Compare two recipes" as a heading = „Kahe retsepti võrdlemine“; check the recipe page, the help and the guides' headings follow one rule.
11. **A shop's "stock"** = „müüma“, never „pidama“ (which reads as "must"); check records, guides/et.json and the guides.
12. **Poison line and poison centre, fire extinguisher, safety data sheet, dust Class M**: one term each across safety/et.json, guides/et.json, records/et.json and the five guides (the guides write „tolmuklass M“, the glossary „M-klass“: settle one).
13. **"should" and "must"** in safety text: check the safety text of every Estonian file (safety/, regions/, records hazard lines, recipe lead and food checks, account settings.lead, guides/et.json poison/silica/food, and the five guides) against the English.
    13a. **Unity**: the scaling step ("Unity", "unification", "in unity") = „ühele viimine“, never „Segeri valem“, which is the formula; the review fixed the worked example. Check glazing-basics, recipe/et.json (the unity heads and help) and site/et.json.
    13b. **"even SG"** in line blends means the end glazes have the same SG as each other („millel on sama suhteline tihedus“); check nothing else reads it as uniform.
14. **The glossary (docs/translations/et.md)**: carry what the reviews decided:
    - sign-in token = „sisselogimisluba“; the singular picker labels and „Kontrollitud:“;
    - food-contact category 3: „Toiduvalmistamisnõud (mis tahes suurusega)“ kept, though the directive writes „Toidunõud“ (everyday „toidunõud“ covers plates and cups too);
    - "Compare two recipes" as a heading = „Kahe retsepti võrdlemine“; "Bring back what the old materials gave" = „Taastage see, mida andsid vanad toorained“;
    - "silty" = „palju liivast peenemaid teri (aleuriiti) sisaldav“; a shop's "stock" = „müüma“;
    - trigger (Kiln-Sitter) = „päästikplaat“; school kiln guide = „ahjukäsiraamat“; fail-safe „töökindel“ (a potter might prefer „rikkekindel“);
    - unity (the scaling) = „ühele viimine“;
    - whatever you settle in points 1–13b.

Then run `npx prettier --write` on every file you changed, and `node scripts/i18n-check.mjs --language et`, which must show no problems (one message, `account.settings.density.sg.example`, stays in English until go-live).

Report back in under 150 words: what you changed in how many files, and anything you left and why.
