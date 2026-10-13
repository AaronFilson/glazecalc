# Wave 4 queue (branch i18n-wave4, from wave4-prep 386a2db)

**2026-10-12: weekly usage limit stopped both consistency passes (and 2 mt helper agents they spawned). Owner meanwhile merged i18n-wave4 mid-review into master (PR #16 ce03ef0, + fingerprints 8ea69aa, mt firing format 53bb2d6, README c176e98). ga/mt NOT live. Now on branch i18n-wave4-finish from master; README prettier fix (uncommitted). Consistency agents RESUMED via SendMessage.**

Languages: ga mt. Owner decisions 2026-10-10: translate both; plainer notice, short line stays on every page after Close; wave-2 English items wait until after wave 4.
CAP: 6 agents at once.

## 0. Plainer notice (before translate prompts, so the app part includes its keys)

- DONE cde7953: plainNotice flag (ga, mt), notice.plain / notice.plainBrief / account settings.notice.hidden.savedPlain; brief line on every page after Close; fingerprints don't count them for other languages. server 287, client 394, check:i18n 0/0. E2E at go-live.
- Fonts: Lora latin-ext covers ċ ġ ħ ż (U+0100-02BA).

## 1. Glossaries

- ga: DONE (258 terms.md rows + 11 extra + 2.9; 790 lines). Sources: téarma.ie TBX export (Ceramics ~290), IATE API, CLP + 2017/2398 Irish, HSA silica leaflet, MS style guide, Caighdeán 2017. Not reached: téarma search, EUR-Lex pages; no Irish 84/500. Check first: foirmle Seger, glass former, satin, clear glaze, kiln-sitter + firing-log labels, shivering, `other` plural (unmutated singular compromise for 11-19). SG = sainmheáchan. Decimal point.
  - CHECK FIX 0353376: numbersIn now reads decimal mark from Intl (ga/mt point). ga.md numbers section updated.
- mt: DONE (290 rows: 258 + 32). Sources: EU Maltese texts (CN: glejż, fritta, engobe, fuħħar), 84/500/KEE, CLP, REACH, LS 646.14/646.16, IATE, MS style guide. Not reached: KNM, gov.mt, poisons centre (Cloudflare), Ġabra. Check first: glejż, kon, bisque, fuħħar, stoneware (English), fluss, slip, whiting, should/must, -il plurals 11-19. SG = gravità speċifika. Plurals verified vs Intl. Decimal point.
- COMMITTED b6eacda (both glossaries + README decimal rule).

## 2. Translation (9 parts)

- Prompts made: translate/ga-_.md, mt-_.md (18). Lesson added to ga-app, mt-app: plainer notice messages.
- Queue (longest first): records, firing, glazing-basics, recipe, making-a-glaze, safe-mixing, home-safety, app, parts; interleave ga/mt.
- ga DONE: making-a-glaze, recipe, firing, glazing-basics, records, safe-mixing, home-safety, app, parts = ALL 9 (check clean; notes in review-notes.json).
- mt DONE: records, glazing-basics, firing, recipe, making-a-glaze, home-safety, safe-mixing, app, parts = ALL 9.
- ga translations ALL DONE. ga REVIEW prompts made (review/ga-*.md); notes added for basics-making, firing, recipe, records + safety-guides + app-parts (all ga notes applied). ga REVIEWS DONE; ga CONSISTENCY RUNNING. mt translations ALL DONE. QUEUED mt: none. mt REVIEW prompts made; notes applied for basics-making, firing, recipe, records + safety-guides + app-parts (all mt notes applied). Lessons added to all mt reviews + ga-firing: negation check; buff/tan clash. mt REVIEWS DONE; mt CONSISTENCY RUNNING.

## 3. Reviews (6 per language)

- mt app-parts: DONE (11 term: email wording x9 server/regions, reset-sent plural minutes (like ro; server sends a number), seizure = aċċessjoni). Issejvjat kept (MS). GLOSSARY: Uriha, email terms, skjerat to decide.
- mt ALL 6 REVIEWS DONE.

- mt firing: DONE (3: 2 meaning = L&L quote lost MAY, later version; 1 language fit-2). Negations kept. Cone pack wording -> consistency point 7; hedges added to consistency point 1.

- mt basics-making: DONE (6 language: matti agreement x2, prodott separat x2, minerall naturali, ċċekkja). Buff/tan applied. GLOSSARY: buff = bejġ, tan = kannella ċar, madmiet tal-prova (counted plural), twebbis fil-qiegħ, ermetiku.

- mt safety-guides: DONE (10: 6 language bl-imgħarfa, Ferra’, mgħottijin; 4 term school kiln guide = pubblikazzjoni għall-iskejjel, scoop = mgħarfa, kejbil tal-estensjoni, plagg). Negations all kept; SDS titles per Maltese REACH 2020/878. GLOSSARY: mgħarfa (scoop), kejbil tal-estensjoni, pubblikazzjoni.

- mt records: DONE (10: 2 meaning halloysite contains, ivory buff dropped; 2 term buff = bejġ; 5 language; 1 ratio 1 : 1). H-statements vs Maltese CLP Annex III ok. SETTLED buff = bejġ, tan = kannella ċar (sent to running reviews; lesson in mt-firing, mt-app-parts). GLOSSARY: mineral (ore; pl. minerali), buff/tan.
- mt recipe: DONE (3 language: m’fihx -> ma fihx x2; U ttestja). Flags kept (pool.supplies, analysis.parts, Tips/Pariri). Glossary: none.

- ga firing: DONE (5 language: tilting shelf ambiguity fixed; genitives; 13 huaire). Negations, should/must, cones hotter/cooler all ok. GLOSSARY: lid = clár clashes with program clár -> consistency point 13.
- ga ALL 6 REVIEWS DONE.

- ga app-parts: DONE (2 changed: meta.description genitive oidis ghlónra; cart = tralaí siopadóireachta). Dismiss = Ruaig kept (téarma computing). Emails ok. GLOSSARY: Cé air a nglaofar (not leis); Ar díol sa réigiún for filter label; shopping cart = tralaí siopadóireachta; GP = dochtúir teaghlaigh.

- ga basics-making: DONE (9 changed: 2 meaning = strontium 'less toxic stand-in for barium' could read barium less toxic, fixed; even SG = an sainmheáchan céanna; 3 term = HSE na RA x2, dím; 3 language; 1 register). GLOSSARY: silica = silice as material, grianchloch only for quartz; Cornish stone English allowed where names compared; add dím, steallaire, sorcóir tomhais, taifeach, meáchan calabraithe, cuingmheá le trí bhíoma, meascthóir liáin, aerdhíonach, tráidire oighinn.

- ga recipe: DONE (9 changed: 4 mechanics in áit an ábhair {used}; 3 language incl. help.scale.text missing second term; 1 meaning pinholed = le poill bhioráin; 1 register compare.heading verbal noun). GLOSSARY: Compare two recipes heading verbal-noun form; add nítear, antamón, fluairín, treoirlíne, scagaire, béal (rim) vs imeall (edge).

- ga safety-guides: DONE (9 changed: 7 meaning = 6x HSE na Ríochta Aontaithe at first mention per section + 'never use compressed air' had lost NEVER (fixed); 1 term fean iora-cháis; 1 pronoun agreement barium row). GLOSSARY: HSE (UK) rule, fean iora-cháis, aisréadóir, ceochán. making-a-glaze HSE lines 61/82 -> lesson added to ga basics-making/firing/app-parts reviews.

- ga records: DONE (4 changed: 1 meaning nearly iron-free; 3 lenition). H412 díobhálach confirmed from Irish CLP Annex III (Annex I tables wrong). CONSISTENCY/GLOSSARY: calcined alumina = alúmana cailcínithe (glossary row contradicts m4); add sourced terms snámhacht, aerfholuana, cré thine, maisealaca, breac-chlaochlaithe (altered), dath breaclaithe, íogróir craicinn/riospráide, aicmiú comhchuibhithe; potter to check leath-neamhlonrach, builcíní cré, monashileacáit luaidhe, stánóis.

## 4. Consistency

- mt: DONE, COMMITTED aed643c (2 misplaced 'only' fixed; spelling rules; one word per term; 58 en marks; glossary).

- ga: DONE, COMMITTED acd04bb on i18n-wave4-finish (with README format fix). 0 negations/hedges lost; 4 comparisons fixed; lid = clúdach (24), rim = béal; 30 headings verbal nouns; 72 en marks. (was: consistency/ga.md, 14 points: negations, HSE, flip comparisons, silica, calling ar, alúmana cailcínithe, one-word list, headings, Sold in, cones, en marks, glossary, lid, genitives).

## 5. Back-translation (safe-mixing, home-safety, warnings)

- mt: prompts made (369 warnings). home-safety DONE (91 seg, 1: "damaged or worn" had narrowed to "broken", fixed). safe-mixing DONE (184 seg, 1: barium row 'a barium frit or strontium' read as strontium frit, fixed: SAME misreading as ga). warnings DONE (369, 0 safety differences; 1 wording: glejż ratb = soft, not softer).

- ga: prompts made (369 warning segments). safe-mixing DONE (125 seg, 1 minor: "a barium frit or strontium" had narrowed to strontium frit, fixed; negations, must/should all ok). home-safety DONE (96 seg, 1 minor: "especially hazardous" had become "extremely", fixed). warnings DONE (369, 0 differences). BT fixes COMMITTED 0310ac0 (+ go-live.mjs handles options line).

## 6. Go live

- mt: LIVE COMMITTED 771fd6c (live, emails, density 1.45, recipe BT fix, CHANGELOG 'In Irish and Maltese'). NEXT: full suite at 771fd6c in worktree glazecalc-wt-ga after the ga run ends (ga-tests2.log).

- ga: LIVE COMMITTED 578dd1a (live: true, emails, density example 1.45 — go-live.mjs now fills an example left in English; CHANGELOG 'In Irish'). Worktree D: FAILED (cross-drive junction breaks esbuild paths: D:\..\C:\..); removed (empty D:\glazecalc-wt\ga left: Remove-Item blocked). Worktree now C:/Users/bellows/gh/glazecalc-wt-ga (junction, same drive). check:i18n, lint, format, typecheck OK; server 282 + 5 pending. client + e2e Win + e2e Linux RUNNING (ga-tests2.log).

## Notes

- LIVE-LANGUAGE CHECK DONE (live-check/barium.md): only pt-PT changed (strontium first); 20 fine; strontium 'less toxic' fine in all 21. COMMITTED ec06271 with mt home-safety + safe-mixing BT fixes. (was: safe-mixing barium carbonate row 'A barium frit or strontium where the recipe allows' was misread as 'a barium or strontium frit' in BOTH ga and mt: check the 22 live languages (one agent, like wave3-live-notfully.md). ENGLISH FOR AFTER WAVE 4: reword e.g. 'Strontium, or a barium frit, where the recipe allows'.

- DONE (uncommitted): negation + HSE lessons in translate-prompt.md and translation-review-prompt.md.
- END OF WAVE (was): add the negation lesson (never/not survived) to translate-prompt.md and translation-review-prompt.md templates; HSE-in-Ireland note to the process README.

- ENGLISH FOR AFTER WAVE 4 (owner): English pages are read in Ireland too: 'HSE' (UK Health and Safety Executive) reads as Ireland's Health Service Executive; consider 'the UK's HSE' at first mention per section in safe-mixing and making-a-glaze en.md.
- ENGLISH FOR AFTER WAVE 4 (owner): advice.saved 'Success in adding to the advice records' (known wave 2).
- ENGLISH FOR AFTER WAVE 4 (owner): safe-mixing table 'Directive 2017/2398' vs text 'Directive (EU) 2017/2398'; IARC 2A 'probably carcinogenic' lacks 'to humans' (and the wave-2 IARC Group 3 item).
- ENGLISH FOR AFTER WAVE 4 (owner): recipe Title Case 'Expand to View', 'Unity Formula'.
- ENGLISH FOR AFTER WAVE 4 (owner): firing 'not the clock or the dial' (which dial?); Orton quote 'next higher cone number' (known wave 2).
- ENGLISH FOR AFTER WAVE 4 (owner): glazing-basics 'A triaxial blend varies three on a grid' (three what?).
- ENGLISH FOR AFTER WAVE 4 (owner): records H334 omits 'or breathing difficulties' (check CLP); 1742 F (950 C) lacks degree signs.
- ENGLISH FOR AFTER WAVE 4 (owner): records '1–2 tablespoons to 20 lbs.' (20 lb of what?); 'In stock at Potterycrafts in October 2026' will date; halloysite 'parent rock' = contains (known since wave 3).
- ENGLISH FOR AFTER WAVE 4 (owner): firing/en.md 244 + 251: 'halfway, at 3 o'clock' beside 'end point is a 90° bend ... 5 o'clock' confused the ga firing translator (90° from 12 reads as 3). Orton's own wording (wave 3 settled, F-022-14); maybe say the bend is measured as Orton does, not as a clock angle.
