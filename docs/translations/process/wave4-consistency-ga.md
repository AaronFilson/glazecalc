You are making the Irish (ga) translation of Glazecalc consistent after its review (repo C:\Users\bellows\gh\glazecalc, branch i18n-wave4). Glazecalc is a free, open source glaze chemistry web app for potters. The Irish files were translated and reviewed part by part; the reviewers found words used two ways across files, slips that may recur in files they did not read, and corrections the glossary should carry.

Ground rules:

- Do not run git commands that change anything. `git diff` is fine.
- Edit only Irish files: client/public/i18n/**/ga.json, client/public/i18n/guides/*/ga.md, and docs/translations/ga.md. Never an English file, never another language's. Other agents are working on Maltese files at the same time.
- Never run `npm run i18n:sources` or scripts/i18n-sources.mjs.
- In Git Bash, Node is on PATH after `export PATH="/c/nvm4w/nodejs:$PATH"`.
- Never put the user's name, email address or other personal details in a web request (headers such as User-Agent, URLs, form data).

Read docs/translations/README.md and docs/translations/ga.md first.

1. **Negations in safety text.** The safe-mixing review found "never use compressed air" translated without its "never" (a prohibition read as an instruction). For every safety sentence in every Irish file (safety/, regions/, records hazard and handling lines, recipe lead and food checks, account settings.lead, guides/ga.json poison/silica/food, and the five guides), find each never, not, no, don't, without and only in the English and confirm the Irish keeps it, in the same place. Also "should" is not "must", "some" is not "a little", and "not fully" is not "not at all".
2. **HSE.** In Ireland "HSE" means the Health Service Executive. The UK's Health and Safety Executive is "HSE na Ríochta Aontaithe" at its first mention in each section of every guide (safe-mixing and making-a-glaze are done; check the other three guides, records/ga.json and guides/ga.json). Link texts in a Sources list may stay as they are.
3. **Comparisons that can flip.** The glazing-basics review found "the less toxic stand-in for barium" worded so that barium could read as the less toxic. Check every comparison of two materials (less toxic, safer, cooler, more fluid, stiffer…) in records/ga.json, recipe/ga.json and the guides, so the Irish cannot be read the other way round.
4. **Silica, quartz, flint.** "silice" for silica as a material (the app's category name); "grianchloch" only where the English says quartz; flint as the glossary gives it. Fix the glossary row so "flint, quartz and silica mean the same" is not circular.
5. **Calling.** "glaoigh ar" / "cuir glao ar", never "le": "Who to call in {region}" = "Cé air a nglaofar: {region}" (or the label form the parts file uses), in safety/, guides/ga.json and the guides.
6. **Calcined alumina** = "alúmana cailcínithe" (alúmana is masculine: no lenition), everywhere.
7. **One word for one thing** across files, choosing the form a review settled:
   - dime = "dím, bonn deich gcent SAM"; syringe = "steallaire"; scoop = "scúp"; squirrel-cage fan = "fean iora-cháis"; sprinkler = "aisréadóir"; mist = "ceochán"; shopping cart = "tralaí siopadóireachta"; GP = "dochtúir teaghlaigh";
   - safety data sheet, poison line / poison centre, fire extinguisher, respirator, dust mask: one term each across safety/, guides/ga.json, records/ga.json and the five guides;
   - the app's guides = "treoirleabhar" in every link, page title and list; a kiln's own manual and a school's kiln booklet ("treoirlínte") never the bare guide word. The five guide titles must match in the guides' front matter, client/public/i18n/ga.json `titles`, guides/ga.json `list` and every link that names a guide.
8. **Headings.** The style sheet gives headings as verbal nouns or noun phrases; the recipe review made "Compare two recipes" "Dhá oideas a chur i gcomparáid" on the page and in help. Make every heading of the five guides and the app follow one rule; where an imperative heading becomes a noun phrase, the section text must still give the instruction plainly (safety advice must not lose its force).
9. **"Sold in"**: "Ar díol sa réigiún" for the region filter label (its first option is "Gach réigiún"); "Ar díol i" where a list of equivalents names a region.
10. **Cones** are one number hotter or cooler, never higher or lower, up or down: check glazing-basics, firing, recipe, records and guides/ga.json.
11. **`{{en: …}}` marks**: the English term in brackets at the first use in each section for the glossary's "show English" terms, in all five guides alike.
12. **The glossary (docs/translations/ga.md)**: carry what the reviews decided:
    - H412 = "Díobhálach don saol uisceach, le héifeachtaí fadtréimhseacha" (the Irish CLP's Annex III; its Annex I tables copy H411 by mistake);
    - calcined alumina "alúmana cailcínithe"; silica / quartz (point 4); calling (point 5); HSE (point 2); headings (point 8); "Sold in" (point 9);
    - add: nítear, antamón, fluairín, treoirlíne, scagaire, béal (rim, as distinct from imeall, edge), dím, steallaire, sorcóir tomhais, taifeach, meáchan calabraithe, cuingmheá le trí bhíoma, meascthóir liáin, aerdhíonach, tráidire oighinn (baking sheet; not "tráidire bácála", as bácáil is firing), fean iora-cháis, aisréadóir, ceochán, tralaí siopadóireachta, dochtúir teaghlaigh, snámhacht, aerfholuana, cré thine, maisealaca, breac-chlaochlaithe (altered), dath breaclaithe, íogróir craicinn / riospráide, aicmiú comhchuibhithe;
    - Cornish stone may stay in English where a text compares its names;
    - mark for a potter to check: leath-neamhlonrach (satin-matte), builcíní cré (wadding), monashileacáit luaidhe, stánóis, taobh lúbtha (a cone's bending face), hipirfhrithluaileacht;
    - whatever you settle in points 1–11.
13. **Kiln lid.** The firing guide wrote "clár" for a kiln's lid, which is also its word for a firing program ("clár bácála"). Choose one word for the lid (téarma's term for a kiln lid if it has one, else "clúdach"), use it in every Irish file, and add the row to the glossary.
14. **Genitives after time and program words** (the firing review fixed "tar éis ama shocraithe", "de réir cláir bhácála", "tar éis na staide ‘Low’") and numbers 11–19 before uair ("13 huaire an chloig"): check the same phrases in the other files.

Then run `npx prettier --write` on every file you changed, and `node scripts/i18n-check.mjs --language ga`, which must show no problems (one message, `account.settings.density.sg.example`, stays in English until go-live).

Report back in under 150 words: what you changed in how many files (say how many negations or comparisons you had to fix), and anything you left and why.
