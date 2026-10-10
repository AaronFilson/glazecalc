You are making the Lithuanian (lt) translation of Glazecalc consistent after its review (repo C:\Users\bellows\gh\glazecalc, branch i18n-wave3). Glazecalc is a free, open source glaze chemistry web app for potters. The Lithuanian files were translated and reviewed part by part; the reviewers found words used two ways across files, and corrections the glossary should carry.

Ground rules:

- Do not run git commands that change anything. `git diff` is fine.
- Edit only Lithuanian files: client/public/i18n/**/lt.json, client/public/i18n/guides/*/lt.md, and docs/translations/lt.md. Never an English file, never another language's. Other agents are working on Latvian and Estonian files at the same time.
- Never run `npm run i18n:sources` or scripts/i18n-sources.mjs.
- In Git Bash, Node is on PATH after `export PATH="/c/nvm4w/nodejs:$PATH"`.
- Never put the user's name, email address or other personal details in a web request (headers such as User-Agent, URLs, form data).

Read docs/translations/README.md and docs/translations/lt.md first.

1. **Lithium**: the genitive is „ličio“ (litis → ličio), never „litio“. Search every Lithuanian file case-insensitively (safe-mixing/lt.md still has „Litio karbonatas“) and fix each.
2. **"token"** = „žetonas“ everywhere („prisijungimo žetonas“ where it is the sign-in token); never „prieigos raktas“.
3. **The UK**: „Jungtinė Karalystė“ (in its case) in running text; „JK“ only in brackets, tables and lists of abbreviations beside JAV and ES. The making-a-glaze review fixed six; check the other guides and the JSON files.
4. **"not fully" is not "not at all"**: the recipe review found "may not melt fully" made „gali visiškai neišsilydyti“ (may not melt at all) three times. Search every file for „visiškai ne…“ and „ne visiškai“, and for "not fully", "not completely", "not always" in the English, and check where the negation falls.
5. **"leach test"** = the general wording for a test of the metals a fired piece releases, everywhere the English does not name lead and cadmium.
6. **Cones hotter and cooler**: one number hotter / cooler, never higher / lower, up / down. Check glazing-basics, firing, recipe, records and guides/lt.json.
7. **Guides and manuals**: „vadovas“ for the app's guides and a different word for a kiln's own manual or a school's kiln booklet, everywhere. The five guide titles must be the same in the guides' front matter, every link that names a guide, client/public/i18n/lt.json `titles` and guides/lt.json `list`.
8. **Poison line and poison centre, fire extinguisher, safety data sheet**: one term each across safety/lt.json, guides/lt.json, records/lt.json and the five guides (the home-safety translator wrote „ABC klasės gesintuvas“: check the others match).
9. **`{{en: …}}` marks**: the firing review found them only in the guide's first section and added them at the first use in each section, as the README asks. Check the other four guides do the same for the glossary's "show English" terms.
10. **"should" and "must"** in safety text: check the safety text of every Lithuanian file (safety/, regions/, records hazard lines, recipe lead and food checks, account settings.lead, guides/lt.json poison/silica/food, and the five guides) against the English.
    10a. **Guide headings**: the style sheet makes headings noun phrases; the safety review turned three imperative headings into noun phrases („Miltelių vengimas, kur įmanoma“, „Drėgnas valymas“, „Buvimas šalia degimo pabaigoje“), as Polish does. Make the five guides follow one rule: check every heading of each guide, and where an imperative heading is turned into a noun phrase, make sure the section text still gives the instruction plainly (safety advice must not lose its force).
    10b. **Safety data sheet**: „saugos duomenų lapas“ in running text, with „(angl. SDS)“ at its first use in each guide; never „SDL“. Check all five guides, records/lt.json and recipe/lt.json.
11. **The glossary (docs/translations/lt.md)**: carry what the reviews decided:
    - lithium „ličio“ (all rows);
    - "Use instead" = „Vietoj to naudokite“ (the old „Naudoti vietoj“ reads as "use in place of");
    - shopsIn = „Parduotuvės šioje šalyje:“; poison.checkedOn = „Patikrinta:“;
    - the shelf's limit = „Turimų žaliavų gali būti ne daugiau kaip {most}.“;
    - token = „žetonas“;
    - the UK rule in point 3;
    - "trigger" (Kiln-Sitter) = „paleidimo plokštelė“ (Dawson's trigger and Ceramics Monthly's trigger plate are one part); plaque (cone holder) = „stovelis“; Orton as a subject „Ortonas“;
    - soft / hard frit = „minkštas / kietas fritas“; satin-matte = „pusiau matinė“; match (a substitution's result) = „atitikimas“;
    - guide headings are noun phrases (point 10a), and the SDS rule (point 10b);
    - whatever you settle in points 1–10b.

Then run `npx prettier --write` on every file you changed, and `node scripts/i18n-check.mjs --language lt`, which must show no problems (one message, `account.settings.density.sg.example`, stays in English until go-live).

Report back in under 150 words: what you changed in how many files, and anything you left and why.
