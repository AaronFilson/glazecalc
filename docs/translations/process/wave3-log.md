# Wave 3 queue (branch i18n-wave3, from master 052f638)

Languages: lt lv et. Prompts: scratchpad wave3-glossary/, wave3-translate/ (27), wave3-review/ (18); bt via node wave3-bt-make.js <code> (L list there still wave 2: fix before use).

## 1. Glossaries

- DONE: lt (263 rows + 23 in 2.9; check first: piroskopas vs kūgis, Segerio formulė, santykinis tankis, išlaikymas vs pertraukėlė, žemo degimo keramika, užmaišas, plastiškas molis, defect names, leather-hard)
- DONE: lv (287 rows; 84/500 LV says "no more than 3 L": glossary says follow English; RCS = legal "ieelpojamais" + explain once "respiratorā frakcija": review; check: māla keramika, blāvotājs, defects, konuss 6, porcija), et (286; check: Segeri valem, suhteline tihedus, respireeritav vs law sissehingatav, Toiduvalmistamisnõud, juhend vs kasutusjuhend)

## 3. Reviews (6 per language; translators flags appended by wave3-review-notes.js)

- et: CONSISTENCY DONE (9 files; H-statements official per Terviseamet; no we; headings). BT DONE safe-mixing (1 fixed: closed-off condition applied to any kiln place; 125 seg); DONE home-safety (0 diff, 125 seg); RUNNING warnings. DONE basics-making (5: even SG same; Unity = ühele viimine), safety-guides (6: 2 meaning: SDS attribution, CO alarm weakened; 4 language "we"), app-parts (10: region labels singular riigis, Kontrollitud:, sign-in token = sisselogimisluba; 84/500 cat 3 kept Toiduvalmistamisnõud), firing (5: trigger plate term; 4 language incl. "põletage ahju" safety line), recipe (6: headings noun phrases; {oxide} case; 5-10% amount), records (4: halloysite contains; silty plain; stock = müüma); (notes appended)
- lv: COMMITTED 38c6643 (local; density rel. blīvums 1,45; README twenty-one; CHANGELOG Latvian and Lithuanian). Worktree wt-lv: all tests RUNNING (wt-lv-all.log). CONSISTENCY DONE (5 files; H-statements official Annex III; dissolve vs melt checked OK). BT DONE safe-mixing (0 diff, 123 seg); DONE home-safety (0 diff, 91 seg); DONE warnings (369; 2 minor fixed: EU lead frits; boronMidFire "too high"). DONE basics-making (6: even SG = equal; gum = saistviela), safety-guides (3: RCS respiratorā frakcija note; seal check = user check not fit test; nuisance dust mask term), firing (2: maturity wording fits bisque now; 1 language), app-parts (15: 6 register yes/no "vai", 8 language dates colon, 1 term 3 L punctuation), records (4: bone ash "may" hedge; Laguna/Boraq "kept only" note; H360 term), recipe (14: 6 meaning incl. "not fully" x3, possible-scope, compare.balance = Rādītāji); (notes appended)
- lt: READY. GO-LIVE RUN (languages.js live, emails, density 1,45, 1252 fingerprinted); COMMITTED 891f03d (local, not pushed; README twenty, CHANGELOG). worktree wt-lt: check:i18n lint format typecheck OK; server 281+5 pending; client 392; e2e Win 137/137; Linux 137/137. lt DONE (worktree removed). CONSISTENCY DONE (8 files; backups scratchpad/lt-backup; even SG ok). BT: DONE safe-mixing (0 differences, 177 segments); DONE home-safety (2 fixed: "not look into a kiln at all" softened to generally; pet rule scope); DONE warnings (369; 1 meaning: "ES švino fritai" read as lead frits from the EU; 1 ambiguity rim). DONE safety-guides (7: 1 meaning "likeliest" comparison; SDS unified angl. SDS; 3 imperative headings -> noun phrases per style sheet, as pl; accepted, bt to check), firing (18: 17 mechanics {{en:}} markers, 1 language; trigger = paleidimo plokštelė both), basics-making (5 style: JK -> Jungtinė Karalystė in running text), app-parts (8 changed), records (4 changed; safety ok), recipe (7 changed: "may not melt fully" read as "not at all" x3 -> lesson added to all queued prompts);

## 2. Translation (9 parts)

- lt: ALL 9 DONE (check: 1 msg = density example, expected). DONE firing, glazing-basics, recipe, app, making-a-glaze, safe-mixing, parts (glossary nits: "Parduotuvės šiose šalyse:" plural for one country; shelf-invalid reads as label), home-safety (new terms: augintinis, SDL for SDS, dirbtuvė, school kiln guide = leidinys (vadovas kept for app guides))

## Notes

- master fix: pushed branch ci-format-fix (052f638 lint + ff456e9 prettier); user merges on GH. i18n-wave3 is on ff456e9. AT WAVE END: git pull master (fetch origin, merge origin/master) before go-live commit
- go-live script: KEEP list from wave 2 still applies? check at go-live
- lv: ALL 9 DONE (check: 1 msg = density example). DONE safe-mixing, home-safety, making-a-glaze, glazing-basics, records, firing, recipe, app, parts (3 L checked: pärsniedz = exceeds, OK)
- et: ALL 9 DONE
- CAP: 6 agents at once (user, 2026-10-09)

## Review notes to append to review prompts (per language)

- lt app-parts: "Use instead:" = „Vietoj to naudokite:“ (glossary had „Naudoti vietoj:“); Seger formula phrase changed to give English name: check meaning kept
- lt app-parts: glossary „Parduotuvės šiose šalyse:“ plural for a one-country list; shelf-invalid reads as label
- lt: token = žetonas (app) vs prieigos raktas (parts): consistency pass
- lt basics-making: style sheet wants a temperature with first "mid-fire" (fails numbers check): style sheet rule wrong; left out
- lt safety-guides: "Utah" = Jutos universitetas; HSE glossed at first use
- lt recipe: pool.oxideNames in genitive (kalio, aliuminio oksido) for the messages inserting them; check each insertion reads; quotes around "Must use" dropped per style sheet
- REPORT (code): library.standard "Standard ({count})" labels both materials and additives tabs; gendered languages need a {noun} select (lt Standartinės f vs priedai m)
- lt GLOSSARY FIXED: litio -> ličio (glossary + home-safety, making-a-glaze, recipe); mid-fire temperature rule removed. records/firing translators may still write litio: consistency pass
- lt firing: Orton nominative Ortonas; soak kept in English after išlaikymas; trigger vs trigger plate (review)
- lv app-parts review: emails capitalise Jūs (letter exception), app lower case; *-choices add code in brackets gaišs (light) like pl; token = marķieris; "Elements" column lists oxides (English nit)
- lv app: owner's name Latvianised "Ārons Filsons (Aaron Filson)" (copyright keeps Aaron Filson) - told user; Seger phrase replaced by "(angļu valodā unity molecular formula, UMF)"; date placeholders after colons; sign in/out = pierakstīties/izrakstīties
- LESSON "not fully" != "not at all": wave3-lesson.js added to 27 queued prompts; ADD to make scripts before copying process files to repo
- lv recipe: compare.balance = Attiecība but rows include LOI/expansion (not ratios); headings as nouns per style sheet; pool.supplies* "{oxide} – viss daudzums"; removeLine/takenOut/amountOf/notANumber label form
- lt glossary: "Žaliavos išbandyti" stiff (reviewer: Bandomosios žaliavos); add match = atitikimas
- lv firing review: cone-pack "The ware is nearing maturity" = glossary "tuvu pilnīgai izkušanai" (near full melting) wrong for bisque; {{en: kiln sitter}} dropped (term is Kiln-Sitter); Low/Medium/High kept in English explained once; preheat = izžāvēšana krāsnī
- lt glossary adds: soft/hard frit = minkštas/kietas fritas; satin-matte = pusiau matinė; halloysite haluazitas vs haloizitas (unsettled)
- lt CONSISTENCY must do: "Litio" (capital) left in safe-mixing/lt.md -> Ličio (case-insensitive grep all lt); glossary updates from app-parts review: Use instead = Vietoj to naudokite; shopsIn = Parduotuvės šioje šalyje:; shelf = Turimų žaliavų gali būti ne daugiau kaip {most}.; token = žetonas (done in files); owner name about.who = Aaronas Filsonas (lt) - user told
- lt glossary: UK rule explicit: JK only in brackets, tables, abbreviation lists; running text Jungtinė Karalystė
- lt glossary adds: trigger (Kiln-Sitter) = paleidimo plokštelė; plaque = stovelis
- lv records review: "keep only for old recipes" (Laguna Borate, Plainsman) made an instruction: check; halloysite parent rock = contains (2 languages tripped: REPORT English loose, records keyed by English hash so not changed mid-wave); bisque/bisc tags collapse to 2
- ENGLISH CONTRADICTION (end-of-wave fix, all 22 languages): glazing-basics/en.md:60 "A cone is done when its tip has bent through 90°, which Orton calls the 5 o'clock position" vs firing/en.md:251 "The end point is 6 o'clock, the tip level with the base". Check Orton's own page; fix English; one agent per batch updates the sentence in every language; go-live KEEP guides/glazing-basics:<section>
- CONE END POINT SETTLED (Orton): cone chart PDF F-022-14 "endpoint ... 90° bend, or in the 5 o'clock position"; FAQ: 6 o'clock = tip touching the shelf, 5 or 6 both properly fired. So glazing-basics (90°, 5 o'clock) is RIGHT; firing/en.md:251 "The end point is 6 o'clock, the tip level with the base" is the slip -> fix firing English at end of wave, all languages (KEEP not possible: meaning changes)
- lv, et glossaries: mid-fire temperature rule removed (as lt)
- lv basics-making review: making-a-glaze en.md:256 "ends of even SG" means the end glazes have the SAME SG as each other (so volume = weight); lv wrote vienmērīgu (uniform): fix. Check et too; check lt line after consistency
- lv home-safety: spilled = izbēris vai izlējis (powder or liquid); fire extinguisher = ABC tipa ugunsdzēsības aparāts; crazing tiles washing ambiguity kept
- lv safe-mixing: SDS sections = REACH LV headings; (ES) 2017/2398 official form; ball clay brackets only
- ENGLISH FIX 2 (firing/en.md:83, same end-of-wave pass as the cone end point): "a kiln that reaches {{900 °F; 482 °C}} in 3 hours is heating at about {{300 °F/h; 167 °C/h}}" divides a temperature reached, not climbed (482/3 = 161). Fix: "a kiln that climbs {{900 °F; 500 °C}} in 3 hours ..." (a difference: 900 °F = 500 °C). Check how {{}} values are rendered/checked first
- et firing: soak = hoideaeg; switch positions printed Off/Low/Medium/High explained once; "our suggestion" avoids we
- lv glossary (consistency): compare Balance = Rādītāji (not Attiecība); pitfall not fully = neizkust līdz galam
- END-OF-WAVE CHECK not fully: DONE, none needed
- et recipe: match = vaste; instructions = juhised (juhend = guides); Compare page heading Võrdle kaht retsepti vs help heading Kahe retsepti võrdlemine; {oxide} (suurem osa) bracket form
- lv CONSISTENCY: verify H330 and H360 against the official LV CLP text (file has 'Ieelpojot iestājas nāve' for H330 - I believe that IS official; reviewer guessed otherwise, did not check)
- et app: Notes feature Märkmed vs column Märkused; Seger phrase -> (inglise keeles unity molecular formula, UMF); 'Add the oxide to the list' = Lisa oksiid loendisse (library must match: app-parts review); advice.saved reworded
- et app-parts review: region labels '… riikides:' plural for one-country select (lt fixed same: use singular); token = tõend; Checked on = Kontrollitud veebilehtedelt (lt: plural wrong, single site); record-* trash branch 'prügikasti üksus'
- et records: silty = aleuriidirikas (obscure?); keep only for old recipes = kept in library (right); vent kiln = juhtige ahjuaurud välja
- lv CONSISTENCY: 'Elements' column (lists oxides) = Ķīmiskie elementi -> consider Oksīdi (check English UI first); style sheet: long dates need a colon before them
- lv glossary (consistency): maturity row: nearing maturity (ware) = tuvojas vajadzīgajai apdedzināšanas pakāpei
- et safe-mixing: we -> see juhend soovitab (no me); SDS REACH headings; ready-mixed = kasutusvalmis glasuur (check: wet, not powder); hood = kubu
- et home-safety: spilled = endale peale ajada (on themselves: check English); school kiln guide = ahjukäsiraamat; SDS (ingl. SDS: …)
- lv CONSISTENCY add: user seal check (not fit test) = pēc ražotāja norādījumiem pārbaudīt, vai tā cieši pieguļ; glossary row
- et glossary (consistency): silty = palju liivast peenemaid teri (aleuriiti) sisaldav; shop stock = müüma never pidama
- et glossary (consistency): Compare two recipes heading = Kahe retsepti võrdlemine; Bring back... = Taastage see, mida andsid vanad toorained; fail-safe töökindel (rikkekindel alt)
- LIVE-LANGUAGE CHECK DONE: all 18 live languages fine on the 5 recipe messages; no changes
- FIRING FIX: ENGLISH EDITED (uncommitted, firing/en.md 83 + 251); ALL 21 TRANSLATIONS DONE (verified 500 °C token; fr NBSP). Then: go-live with KEEP guides/firing:cone-chart + guides/firing:reading-cones (add to wave3-go-live.mjs KEEP). Was: 4 agents over 21 codes (all live + lv et) with {CODES}; then go-live KEEP guides/firing:cone-chart and guides/firing:reading-cones; new English for 251: 'The end point is a 90° bend, the tip level with the base, which Orton calls the 5 o'clock position: the point the chart's temperatures are measured at. A cone touching the shelf is at 6 o'clock; between 4 o'clock and touching the shelf the difference is small, "usually 1 or 2 degrees".'
- REPORT: regions note latvia-s-law-gives-this-limit ("inhalable fraction") is literally what MK 803 says (Latvian text of 2017/2398 mistranslates respirable); a limit on inhalable would be stricter, not looser. Left; user to judge
