# Wave 2 queue (branch i18n-wave2, from project-review c9a6251; max 20 agents at once)

Languages: nl ro cs hu el sv da fi sk sl hr bg

## 1. Glossaries (docs/translations/<code>.md), prompts wave2-glossary-<code>.md

- DONE: sk (281 rows; web search ran out partway: "No source" rows), el (281), cs (281), da (280), sv (281), hu (280; found HU poison-line name, fixed d6d1d88), fi (280), ro (281), sl (280), nl (281), bg (281), hr (281). ALL 12 DONE
- RUNNING: none

## 2. Translation: 9 parts per language (wave2-chunks.md: app, parts, recipe, records, glazing-basics, making-a-glaze, safe-mixing, home-safety, firing)

- sk: ALL 9 DONE (check 0/0) (NOTE: glossary "leach test" term names lead+cadmium only; translators used "vylúhovania kovov": settle at review)
- el: ALL 9 DONE
- cs: ALL 9 DONE (kept "SG" in density.sg: review)
- da: ALL 9 DONE (kept "SG": review)
- sv: ALL 9 DONE (check 0/0)
- hu: ALL 9 DONE (records + firing written but translator stopped before read-through: reviews told)
- fi: ALL 9 DONE (check 1 = density example)
- ro: ALL 9 DONE (check 0/0)
- sl: ALL 9 DONE (check 0/0)
- nl: ALL 9 DONE
- bg: ALL 9 DONE (list titles of making-a-glaze, glazing-basics differ from guides: review)
- bg: READY (back-translation: home-safety 4, warnings 1, safe-mixing 2)
- hr: ALL 9 DONE (UK name: Ujedinjeno Kraljevstvo vs Ujedinjena Kraljevina -> review/consistency)
- hr: ALL 6 REVIEWS DONE; consistency DONE; back-translation DONE home-safety (2: gender, cats); RUNNING warnings safe-mixing
- prompt: make wave2-translate-prompt.md from translate-prompt.md (branch i18n-wave2; FILES = the part "<part>" of wave2-chunks.md)
- emails to scratchpad/emails/<code>.json, then into server/lib/account_mail.ts (emails-into-code.js)

## 3. Reviews (6 per language: wave2-review/<code>-<group>.md; groups app-parts records recipe basics-making firing safety-guides)

- sv: READY FOR GO-LIVE (back-translation: home-safety 2, safe-mixing 1, warnings 0)
- hu: READY FOR GO-LIVE (back-translation: warnings 1, safe-mixing 2, home-safety 1)
- fi: READY FOR GO-LIVE (back-translation: warnings 2, safe-mixing 2, home-safety 3)
- ro: READY (back-translation: warnings 0, home-safety 1, safe-mixing 3)
- sl: READY (back-translation: home-safety 1, safe-mixing 1, warnings 0)
- nl: READY (back-translation: safe-mixing 2, home-safety 4, warnings 1)
- sk el cs da: COMMITTED a4a2f29 (live; worktree check:i18n clean, lint clean, e2e Win 118+a11y rerun, Linux 117+a11y rerun 9/9 after 90s timeout)
- el: ALL 6 REVIEWS DONE; consistency DONE; back-translation DONE safe-mixing (2) home-safety (1 + split); RUNNING warnings
- cs: READY FOR GO-LIVE (back-translation: safe-mixing 1, warnings 2, home-safety 2 fixed)
- da: READY FOR GO-LIVE (back-translation: safe-mixing 1, home-safety 2+1, warnings 3)

## 4. Blind back-translation (safety guides, warnings, region safety text)

- prompts: node wave2-bt-make.js <code> (extracts warnings fresh; run AFTER reviews+consistency) -> wave2-bt/<code>-{safe-mixing,home-safety,warnings}.md

## 5. Go live: live: true, i18n:sources, check:i18n, e2e Windows + Linux, docs

## Never: run npm run i18n:sources while any agent is writing; use check:i18n --language

- NOTE: the HU poison line's name changed (new safety key); translators of safety/<code>.json who started before may have the old key: add the new name at review
- sk NOTE: guides/sk.json says ručné spínače, the firing guide prepínače: settle at review
- REVIEW RULE (all languages): "leach test" = a test of the metals a fired piece releases; the glossaries that say "lead and cadmium" narrow it: use the general wording unless the English names lead and cadmium
- cs NOTE: glossary 'měrná hmotnost' for SG is density in kg/m3 in Czech physics; translator suggests relative density: review
- sk glossary fix for later: calcium borate frit = vápenato-boritá frita (not vápenato-borokremičitá)
- AT THE END: fix every wave-2 glossary's 'leach test' row to the general wording (metals released), keep lead+cadmium only where the English names both; sk page titles ' - ' vs ' – ' check
- sk glossary for later: Ring {n} = Krúžok {n}; add guide = návod; infinite switch regulátor výkonu vs prepínač (firing guide)
- sk DECIDE in a consistency pass: guide = príručka (keep návod for the kiln manual), everywhere (nav, titles, list, notebook tile, guides' self-references, links); controller regulátor vs infinite switch regulátor výkonu clash (energoregulátor?); tyčinka = bar cone vs snímacia tyč
- el: titles.firing vs guide title (Ψήσιμο σε ένα απλό καμίνι): check consistent at go-live; style sheet: should=θα πρέπει, must=πρέπει
- cs consistency pass needed after reviews: guides call themselves průvodce vs návod; Ring {n}=Kroužek {n}; leach test row; guide=návod row; SG měrná hmotnost doubt
- cs glossary: add Fusion (Ferro data sheet) = bod tání (not fúze)
- CODE FIX at first go-live (when running i18n-sources): settings-section.ts density sg example is hard-coded SG 1.45; make it a message account.settings.density.sg.example (= guides density.sg with 1,45/1.45 per language) for en + all live + wave-2 languages
- sv glossary: weigh in = Väg i (not Väg in); raw whiting okalcinerad krita odd
- REPORT TO OWNER (not done): English hazard lines gloss H-statements briefly (H410/H411 without "long-lasting effects"); codes are given; changing them would re-key every language
- sv: making-a-glaze title Blanda en glasyr (style sheet example): check guides/sv.json list + sv.json titles at review
- ENGLISH CHANGED (uncommitted): guides/en.json food.category.cooking -> "Cooking ware of any size, and ..."; at go-live pass keep guides:food.category.cooking to updateTranslations (all languages keep their translation)
- prompts regenerated with lessons (must be tested, some, cooking 3 L, guide vs manual, titles) for translate + review
- ENGLISH CHANGED (uncommitted): home-safety/en.md the-kiln section (children/pets sentence split; heading Be there when the firing ends) -> keep guides/home-safety:the-kiln at go-live
- CODE FIX DONE (uncommitted): settings-section.ts density sg example = message account.settings.density.sg.example (en SG 1.45; spec checks it); go-live script fills it per language from guides density.sg
- NOTE for agent prompts from now: account settings.density.sg.example is 1 message in English for every non-live language until go-live fills it; tell agents to ignore it
- 2026-10-09 ~12:40: usage limit stopped ~19 agents; relaunched all. Waste on a limit hit grows with agents running.
- LIVE LANGUAGES EDITED (uncommitted): home-safety kiln heading fr es it pt-PT sk sv -> be there at the end; de pl children/pets sentence split in two (comma-before-every-relative-clause languages)
- COOKING LINE: added of any size to de es pl sv fi (uncommitted); el TODO after el warnings bt finishes
- density example: repeats label in it cs da ro -> number alone (fixed it cs da; ro at go-live via script)
- REPORT: IARC Group 3 simplified as weaker evidence in English (not wrong; left)
- ENGLISH CHANGED: making-a-glaze testing section (kiln-washed shelf); KEEP list in go-live script has guides/making-a-glaze:testing; rerun go-live for batch 1 before commit
- LIVE pl EDITED: glazing-basics cone pack o numer niższy/wyższy -> o jeden stożek chłodniejszy/gorętszy (uncommitted)
- CONE DIRECTION: FIXED de 17 es 21 pt-PT 18 cs 21 da 18 (+da koldere->køligere); translate prompts carry the rule
- REPORT: English "put it in the trash (it goes to landfill)" is US/UK-centric; DK/NL burn most household waste (translated as written)
- REPORT: official BG text of 84/500 says not more than 3 L (mistranslation); bg follows the English and BG regulation
- NEXT GO-LIVE batch 2: sv hu (+fi ro when bt done): node wave2-go-live.mjs <all live> sv hu fi ro; docs (README count, CHANGELOG, plan); tests; commit (exclude other wave-2 glossaries)
- BATCH 2 sv hu fi ro: COMMITTED 0aecf16 (e2e 127/127 Windows and Linux; worktree check:i18n + lint clean)
- END-OF-WAVE ENGLISH FIX (after nl/bg/sl/hr safe-mixing agents finish): safe-mixing respirators: "Shave the same day ... Shaving on the day you work meets both" is false for the 8 h / 12 h rules -> "Shave shortly before you work ... Shaving shortly before you work meets both"; one agent updates the bullet in ALL 22 translations; then go-live keep guides/safe-mixing:respirators
- END-OF-WAVE pass also: safe-mixing "sealed containers" (wet scraps) rendered as merely "closed" in cs, sl (fixed); check all languages
- REPORT: recipe analysis.parts with fractional counts takes CLDR "other" (hr "1,5 dijelova" where grammar wants "dijela"); needs a code/design change (show amount as a label); left
- hr CONSISTENCY DECISION: UK = "Ujedinjeno Kraljevstvo" (what the region picker shows via Intl.DisplayNames/CLDR), everywhere; app-parts reviewer had set Ujedinjena Kraljevina in account/guides/safety: revert those
- END-OF-WAVE pass also: safe-mixing "ready-mixed glaze" must mean wet, already-mixed glaze (bg had ready-made = often powder); "powder" must cover powdered commercial glazes too, not only raw materials (bg fixed; sl has surovine v prahu): check all languages
- END-OF-WAVE PASS RUNNING: English safe-mixing shave bullet changed (uncommitted); safe-mixing-pass-{a,b,c,d}.md agents running; e (hr) after hr bts; then go-live final batch sl nl bg hr with KEEP + guides/safe-mixing:respirators
- ENGLISH CHANGED: home-safety pets "keep cats out of the studio"; home-safety-pass-{a,b}.md agents; KEEP list now has safe-mixing:respirators and home-safety:pets
- WAVE 2 DONE: 4320418 (nl sl hr bg + end-of-wave fixes), e2e 135/135 Windows and Linux, server 286, client 392, check:i18n clean, tree clean
