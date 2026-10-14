# Plan: Glazecalc in East and Southeast Asia

Status: drafted 2026-10-13 from the Asia research report and its three notes, for the owner's review. It follows docs/i18n-plan.md ("After the EU") and reuses its machinery. Nothing here changes the EU approach.

Progress, 2026-10-14 (branch asia-japan): **Phase A is merged** (the three groundwork branches: locales, checks, fonts). **Phase B items 1–4 and the data half of item 6 are done**: the third cone system, the guides' three-way version choice, the SK chart as data (lib/cones) and the English SK section of the firing guide. Item 6 is done too: the SK chart was checked row by row against Yuko Trading's PDF, and all 42 rows match. Item 5 (translating the new section) remains.

**Phase D: Japanese is live** (2026-10-14, branch asia-japan): the 25th live language, translated, reviewed, made consistent, back-translated and gone live with `go-live.mjs`; the full test suites passed. zh-Hans, zh-Hant and ko are still to do (zh-Hans waits on the owner's decision on the Chinese representative question).

**Phase C for Japan is done** (2026-10-14, English only): the JP region (SK cones, Baumé, the US library) with its poison lines, silica, food-contact rules, dust mask classes and three shops, each with its source, check date and status. The model gained a `control` silica kind with the law's formula and a recommended value beside it (JSOH), respirator classes, food limits in µg/cm² and Japan's own categories (`jpFlat`, `jpSmall`, `jpLarge`, `jpStorage`, `jpCooking`), and `atMost` for 以下. A snapshot test and a data hash prove the earlier regions show exactly what they did. Japanese materials (item 6) and the ja translation (Phase D) remain. Korea, Taiwan, Singapore and Malaysia are next.

Japan, could not verify (not shipped as fact):

- each-item or average judging of ceramic ware (not stated in the 2025 text);
- the exact in-force date of the 2025 revision (2026-06-01, seen only in Osaka's copy), so no in-force date is shown; the limits are unchanged since 2008;
- 丸二陶料's town (the notes give 蒲郡市, which may be another shop's) and an https address for its site (it is linked over http); pack sizes at 陶芸百貨店 and ヤマニ;
- JSOH's 2026 list (members only) and a 濃度基準値 for crystalline silica (a FY2026 candidate);
- #7119 (not nationwide), so it is not listed; who answers #8000 and its cost;
- how large cones are set (depth and angle), as above.

Corrections from the Japan research (docs from research_notes/Asia/japan-verification-2026-10-14.md):

- The cone seller is **有恒商事 (Yuko Trading)**, not ユーコー商事. Its table PDF prints no heating rate, and does not mention JIS itself; the standard's status is from the JSA listing.
- **釉果 and 釉灰 are Chinese (Jingdezhen) materials, not Japanese**, so they are not Japanese material entries (Phase C item 6).
- The SK large-cone table has **42 rows** (SK 022 to SK 20), not 39 as the brief said.
- **How large cones are set** ("sunk about 10 mm, leaned at 80°") is in no source we read, neither the seller's PDF nor the notes, so the firing guide no longer gives the two numbers. Could not verify: check in JIS R 8101 or a maker's instructions before adding them back.
- The owner's choices for Japan: Japanese only for now; JIS SK cones only (no Kyoto table); SK as Japan's default cones, Orton and temperature one tap away; Baumé as the density default; the 24-hour clock; system fonts first.

## The goal

A potter in Japan, Korea, China, Taiwan, Hong Kong or Southeast Asia picks their region and gets their poison line, emergency number, silica limit, food-contact rules and, where they exist, shops, in English at first. Japan's potters can fire by SK (JIS R 8101) cones. Then Japanese, Chinese (Simplified and Traditional) and Korean readers get Glazecalc in their language, followed by Thai, Vietnamese, Indonesian and perhaps Turkish.

## The owner's decisions so far

1. **Asia next**, after the EU's four waves (all done).
2. **Regions before languages.**
3. **No unverified safety value goes live.** As in the EU's Phase 4, anything not read on an official page shows the emergency number and a link to the health ministry, never a guessed figure.

## Phase A: groundwork (about 2 weeks)

Everything in Phase A helps the English app or is invisible to it, and it can run in parallel with Phase C's verification.

1. **Script-aware locales.** In `lib/regions/index.js`, `formatLocaleFor` keeps the script subtag (`zh-Hant` + CN gives `zh-Hant-CN`, not `zh-CN`). Use `Intl.Locale` rather than `baseLanguage`, and keep the `pt-PT` rule. Extend `FORMAT_LOCALES` with ja-JP, ko-KR, zh-Hans-CN, zh-Hans-SG, zh-Hans-MY, zh-Hant-TW, zh-Hant-HK, th-TH, vi-VN, id-ID, tr-TR, en-SG, en-HK, en-MY and en-PH.
2. **Routing and head tags** (`server/lib/pages.ts`):
   - a 301 from other casings (`/zh-hans/…`) to the canonical code;
   - a `Content-Language` header per page, for Baidu and Bing;
   - `og:locale`.

   hreflang stays as the URL code (`zh-Hans`, `zh-Hant`), and the sitemap matches. Correct the hreflang bullet in docs/i18n-plan.md ("After the EU"), since Google documents script subtags as of 2026-09-21.

3. **Browser-tag mapping** for the language links and the picker's suggestion: `Intl.Locale(tag).maximize()` gives `zh-TW`/`zh-HK`/`zh-MO` → `zh-Hant` and `zh-CN`/`zh-SG` → `zh-Hans`. There is still no redirect by guess (ADR 13).
4. **Typing** (`client/app/shared/format.ts`, `parseNumber`): `normalize('NFKC')` first, and accept `。` as a decimal point between digits (see decisions). Audit `(input)` handlers that save or validate for `event.isComposing` (start from `recipe-library.ts:74`).
5. **Sorting and search:**
   - `library-info.ts:106` and `material-page.ts:51` call `localeCompare` with the page language;
   - the search in `library-info.ts` (lines 99–101) NFKC-normalizes and case-folds both sides.
6. **The numbers gate** (`scripts/i18n-check.mjs`, `numbersIn`):
   - `UNIT_AFTER` and `DEGREES_AFTER` exclude only Latin, Greek and Cyrillic letters;
   - NFKC both texts;
   - read Turkish prefix percent `%5`;
   - clock times by the 24-hour rule (see decisions).

   Re-run on all 24 live languages and confirm nothing changes there.

7. **Script check** in the same script: no Traditional-only characters in zh-Hans files and the reverse, from a short list of pairs including 硅/矽; no simplified-only hanzi in ja; no hanja in ko unless glossaried. Confirm the plural check accepts `other`-only messages.
8. **Styles** (`client/styles.scss`):
   - per-language font stacks under `:lang(ja)`, `:lang(zh-Hans)`, `:lang(zh-Hant)`, `:lang(ko)` and `:lang(th)`;
   - `font-synthesis: none`, with `em` as bolder, for CJK and Thai;
   - `line-break: strict` (ja), `word-break: keep-all` (ko), `word-break: auto-phrase` on Japanese headings;
   - no `letter-spacing` on CJK;
   - about 1.4 heading line height for Thai;
   - `lang="en"` on English material names inside translated text.
9. **A CJK pseudo-locale** (code to choose, for example `ja-XC`) beside `en-XA` and `ar-XB`: every message in CJK characters with no spaces.
10. **Linux CI fonts:** install `fonts-noto-cjk` and a Thai font in the container behind `npm run test:e2e:linux` (`scripts/test-e2e-linux.mjs`) and in CI, so screenshots show glyphs and not empty boxes.
11. **A correction route that works from China:** a small feedback form posting to the server, emailed through SES, shown beside the GitHub link in `translation-notice.ts` and the footer. mailto is the fallback.
12. **Keep China reachable:** a CI check that fails on third-party hosts in client or server (`googleapis`, `gstatic`, `recaptcha`, CDNs).

Tests:

- parser unit tests: `１２．５`, `１２，５`, `12。5`, `１，２３４．５`;
- `formatLocaleFor` tests: `zh-Hant` + CN, `zh-Hans` + TW;
- server tests: `/zh-Hans/…` gets `lang` and hreflang `zh-Hans`, and `/zh-hans/…` redirects;
- `i18n-check` fixtures with the Japanese, Chinese, Korean, Thai, Indonesian and Turkish sentences from the report;
- the pseudo-locale in the phone-width screenshot run;
- `npm run check:i18n`, `npm test`, `npm run test:client`, `npm run test:e2e`, `npm run test:e2e:linux`.

## Phase B: the SK cones option (about 3–5 days)

1. **A third cone system**, `'sk'`, alongside `'orton'` and `'temperature'`:
   - `client/app/core/preferences.service.ts` (the `ConeSystem` type and the choices at lines 42 and 57);
   - `server/models/user.ts:42`;
   - `lib/regions/index.d.ts:11`;
   - `client/app/core/locale.service.ts:46`;
   - the Settings choice in `client/app/pages/password/settings-section.ts`.

   It is labelled "SK (JIS R 8101)", never "Seger".

   _Done 2026-10-14._ A recipe's cone is an Orton number and is never turned into an SK number, so a potter who sets SK cones sees firing temperatures on the recipe page (`byCones` is true for Orton only).

2. **Guides.** _Done 2026-10-14._ `forConeSystem` in `client/app/pages/guides/guide-document.ts` learns `:::sk` blocks. The two-way toggle in `guide-page.ts` and `byCones` in `recipe-page.ts:414` handle three systems.
3. **The SK chart as data,** _done 2026-10-14: lib/cones/index.js, frozen in server/test/cones_tests.ts, and the table in the firing guide is checked against it,_ SK 022–20, large cones, from Yuko Trading's table, with the source, the JSA listing (reconfirmed 2023-10-20) and the check date. Every figure is labelled "nominal (JIS)". It carries the note: "The standard gives reference temperatures; at a potter's rate of about 100 °C/h, cones have been measured bending 40–70 °C cooler (Kyoto's institute, Kyoto cones). Set a witness cone and compare."
4. **English firing guide** (`client/public/i18n/guides/firing/en.md`), an `:::sk` section, _done 2026-10-14 (`#sk-cones`):_
   - how large cones are set (in a plaque, leaning toward the bending face) and read;
   - guide, firing and guard cones;
   - the Kyoto note: Kyoto cones are no longer made and run about two numbers cooler, so Kyoto's institute substitutes Orton 10 for its SK 12;
   - Orton self-supporting cones are sold in Japan as 立つゼーゲル.

   No conversion anywhere.

5. **Translate the new section** into the 24 live languages with the wave scripts, as Phase 4's new text was.
6. _Done 2026-10-14: all 42 rows match the PDF._ **Before it goes live:** a person opens Yuko Trading's PDF table in a browser and checks every figure against the data file. Optionally, ask Yuko Trading who makes the cones now.

Tests:

- the three-way setting round-trips (server and client);
- `forConeSystem` keeps only the chosen system's blocks;
- `server/test/regions_tests.ts:23` accepts `'sk'`;
- a check that no guide text pairs an SK number with an Orton number ("≈", "equals"), and that every cone mention names its system.

## Phase C: regions, one country at a time (about 1–2 days each once data is verified)

Each country goes through the same steps, and none goes live with an unverified safety value.

1. **Verification pass.** A person in a browser, or a fresh research session with a search budget, reads the official pages the notes could not, from each country's "Could not verify" list. In particular:
   - **CN:** 120/119/110, GB 4806.4-2016, the hours of China CDC's line and whether the public may call it, KN95 names, GBZ 2.1 amendment 2;
   - **HK:** 999 in words, the silica pairing by eye, any food-ware rule;
   - **TW:** the silica limit before 2027, the body text of the 119/110 pages;
   - **KR:** a public poison line, KF94;
   - **TH:** 1669/191/199 on an official page, the silica limit, the Thai original of MOPH No. 92 and any later amendment;
   - **VN:** 113/114/115, Bạch Mai's hours and public status, QCVN 02:2019 and QCVN 12-4:2015;
   - **ID:** HALOBPOM's poison role, BPOM 11/2026's ≥1100 mL sign, promulgation date and the 0.5 mg/L lead figure;
   - **PH:** the DOLE silica table, NPMCC hours;
   - **JP:** _done 2026-10-14_ (the 作業環境評価基準 text read; JSOH's 2025–2026 list read; its 2026 list is members only).

   Plus suppliers everywhere. Record each status as the brief does (verified, secondary, extract, unverified).

2. **The region** in `lib/regions/index.js`: languages (most used first), `temperature: 'C'`, `cones`, `density`, `library`.
3. **Data:**
   - `safety.js`: emergency numbers, poison lines with hours and who may call, the ministry;
   - `workplace.js`: silica and the agency;
   - `food.js`;
   - `suppliers.js`.

   Each entry has a source, a check date and a status.

4. **Model extensions** where Asian law does not fit _(inferred)_:
   - food categories and message keys `guides.food.category.*` for small, large, cups, pitchers, storage (≥3 L) and infant;
   - a note field for "third extraction" (Indonesia) and for flat ware in mg/L (Thailand);
   - a silica entry banded by free-silica content (China);
   - a limit with a start date (Taiwan, 2027-01-01);
   - Japan's control concentration marked as an area yardstick;
   - a scope note on Japan's poison centre (acute only).
5. **Library mapping:** the US set for all Asian regions to start, with local names as aliases later. Add `JP` to `LIBRARY_REGIONS` in `client/app/pages/guides/local-equivalents.ts` only when Japanese materials exist.
6. **Materials** (Japan first, separate from the safety data):
   - ~~釉果 and 釉灰 from the 2010 paper~~: these are Chinese (Jingdezhen) materials, not Japanese; leave them out of the Japanese set;
   - 天草陶石, 福島長石, 釜戸長石 and 三雲長石 as "typical, verify", with a substitution warning for the feldspathic rocks;
   - editable ash entries with a range note.

Order of batches (see decisions): JP, KR, TW, SG, MY first; then CN, HK, ID, TH; then VN and PH.

Tests:

- `server/test/regions_tests.ts` for each new region;
- the existing stale-check test (an entry a year past its check fails);
- the guide blocks (`::poison-lines`, `::silica-limit`, `::food-limits`, `::shops`) render for each new region at phone width;
- a test that no unverified entry is shown.

## Phase D: language wave 1, ja, zh-Hans, zh-Hant, ko (token time, as an EU wave)

Run as docs/translations/process/README.md describes, at most six agents at a time.

1. Add the four languages to `LANGUAGES` in `docs/translations/process/wave.js`, and to `lib/regions/languages.js` with `live: false`. Give each its own name (日本語, 简体中文, 繁體中文, 한국어) and the standard notice, not the plain one.
2. **Glossaries and style sheets** (`make-glossary-prompts.js`). The prompt adds:
   - terms from manufacturers' catalogues;
   - ゼーゲル式 / 塞格式 (and Korean, to confirm);
   - SK cones named as SK;
   - 24-hour times;
   - no numbers in words;
   - counters inside `other`;
   - half-width digits and units;
   - register: Japanese です/ます; Korean 합쇼체 for notices and 해요체 for the interface, to confirm;
   - zh-Hans and zh-Hant written separately (硅/矽).
3. **Translate** in nine parts, **review** in six groups, **make consistent**, and **back-translate blind** the safety text, as in waves 1–4.
4. **Privacy page** per language: what is collected, stored in the USA, how to delete it, and the non-GitHub contact from Phase A.
5. **Go live one language at a time** with `go-live.mjs`, Japanese first. Then, in a worktree: `npm run check:i18n`, lint, `npm test`, `npm run test:client`, `npm run test:e2e`, `npm run test:e2e:linux` (with the CJK fonts). Update the README's language count and the changelog.

Prerequisites: Phase A, and Phase B for Japanese. The owner's decision on the Chinese representative question must come before zh-Hans goes live.

## Phase E: language wave 2, th, vi, id (and tr)

1. **The Calendar setting** from docs/i18n-plan.md "Settings": "as the region" or Gregorian. It goes on the account, `preferences.service.ts` and Settings, and appends `-u-ca-gregory` to the format locale. Firing logs show which calendar is in use. A test checks that a Thai firing log date is Gregorian when chosen.
2. **Thai:** heading line height, and `<wbr>` or U+200B only where a technical word breaks badly. Check this in the Linux screenshot run.
3. **Data-law checks before go-live:** Thailand's representative, Vietnam's transfer assessment, Indonesia's PDP Law, and Turkey's KVKK/VERBIS, none of them researched yet.
4. **Waves and go-live** as in Phase D, Indonesian first (the best-scored), Thai last.

## Decisions for the owner

1. **Turkey in or out of wave 2.** _Recommend in, last of wave 2,_ once KVKK is checked and Turkey's region data is researched. It is technically cheap (only the prefix percent, fixed in Phase A) and has 77.5 m people online.
2. **Local representatives in China and Thailand (and Vietnam's assessment).** _Recommend: do not hold back the regions,_ which collect nothing new. Offer the languages without representatives, with a privacy page in each language, minimal data and no marketing aimed at China (no Baidu ads, no WeChat account). Revisit if those countries' account numbers grow, or if advice is taken. The fallback, if the owner prefers caution, is to leave accounts for those regions out of scope while the calculator stays open. This is a judgement, not legal advice.
3. **Kyoto vs JIS SK.** _Recommend JIS only,_ named "SK (JIS R 8101)", with a note on Kyoto cones and no Kyoto table. Kyoto cones are no longer made, and only partial measured data exist.
4. **The first region batch.** _Recommend JP, KR, TW, SG and MY,_ whose data is mostly verified. CN, HK, ID and TH follow after their verification pass, then VN and PH, which have the most gaps.
5. **Hong Kong.** _Recommend zh-Hant (written for Taiwan) and English, with Hong Kong's own region data_ and the `zh-Hant-HK` format locale. Add a Hong Kong translation only if people ask.
6. **Japan's default cones and density.** _Recommend SK as Japan's default,_ with Orton and temperature one tap away, since institutions are moving to Orton. Use temperature for China, Korea and Taiwan until their practice is checked. Make Baumé Japan's density default _(inferred from the hydrometers sold)_.
7. **Clock times and `。`.** _Recommend_ the 24-hour rule in every Asian style sheet rather than teaching the gate 午後/下午/오후. _Recommend_ accepting `。` between digits as a decimal point.
8. **Fonts.** _Recommend system font stacks first,_ checked in Windows screenshots. Self-host Noto Serif slices only if SimSun and MingLiU read badly, or if CI screenshots diverge.
9. **Which stay English.** _Recommend_ Singapore, Malaysia and the Philippines in English with region data. Malay and Filipino only on request. West and Central Asia wait for the right-to-left and Russian waves.

## What stays the same

- English is the source and the fallback.
- Material names in recipes stay as they are.
- Recipes store plain numbers.
- Only verified safety data is shown, each entry with its source and check date, and a test fails a year after the check.
- No guessed numbers, and no cone number equated across systems.
