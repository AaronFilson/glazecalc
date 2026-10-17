# Plan: Glazecalc in East and Southeast Asia

Status: drafted 2026-10-13 from the Asia research report and its three notes, for the owner's review. It follows docs/i18n-plan.md ("After the EU") and reuses its machinery. Nothing here changes the EU approach.

Progress, 2026-10-16 (branch w1-asia-langs): **Traditional Chinese, Korean and Simplified Chinese are live**, the 27th to 29th languages, translated, reviewed, made consistent, back-translated (the comparison's fixes: Korean as firm as the English in its safety text, 과다 소성 for overfiring, zh-Hant's liner glaze without an added "stable", the account notice's disclaimer as the English has it) and gone live with `go-live.mjs`, one language per commit. Only the password emails are translated for them; the other account emails fall back to English.

Progress, 2026-10-16: decisions 2–9 settled (2 as Turkish; 3–9 as recommended); Vietnam and Indonesia decided (Phase E item 3); Chinese and Korean style sheets on branch asia-wave1; Korea, Taiwan, Singapore and Malaysia region data on branch asia-regions1; China, Hong Kong, Indonesia, Thailand and the Philippines on branch w1-asia-regions.

Progress, 2026-10-14 (branch asia-japan): **Phase A is merged** (the three groundwork branches: locales, checks, fonts). **Phase B items 1–4 and the data half of item 6 are done**: the third cone system, the guides' three-way version choice, the SK chart as data (lib/cones) and the English SK section of the firing guide. Item 6 is done too: the SK chart was checked row by row against Yuko Trading's PDF, and all 42 rows match. Item 5 (translating the new section) remains.

**Phase D: Japanese is live** (2026-10-14, branch asia-japan): the 25th live language, translated, reviewed, made consistent, back-translated and gone live with `go-live.mjs`; every suite passed on Windows (server 370, client 434, e2e 161); Linux e2e passed too (161). zh-Hans, zh-Hant and ko are still to do (zh-Hans waits on the owner's decision on the Chinese representative question).

**Phase C for Japan is done** (2026-10-14, English only): the JP region (SK cones, Baumé, the US library) with its poison lines, silica, food-contact rules, dust mask classes and three shops, each with its source, check date and status. The model gained a `control` silica kind with the law's formula and a recommended value beside it (JSOH), respirator classes, food limits in µg/cm² and Japan's own categories (`jpFlat`, `jpSmall`, `jpLarge`, `jpStorage`, `jpCooking`), and `atMost` for 以下. A snapshot test and a data hash prove the earlier regions show exactly what they did. Japanese materials (item 6) and the ja translation (Phase D) remain. Korea, Taiwan, Singapore and Malaysia are next.

**Phase C for Türkiye is done** (2026-10-14, branch asia-turkey, English only): the TR region (temperature, specific gravity, the EU library) with 112, UZEM 114, the dust regulation's silica formula, FFP mask classes, the Tebliğ's food-contact limits and three shops; see "Türkiye's region data" under Phase C. The silica formula became general (E = numerator / (factor × Q + offset), with the law's decimals) without changing Japan's data or output; the data hash and the snapshot test now cover Japan as well as the 31 earlier regions. The Turkish translation is Phase E, live since the owner's KVKK decision (decision 10).

**Phase C for South Korea, Taiwan, Singapore and Malaysia is done** (2026-10-16, branch asia-regions1, English only): the KR, TW, SG and MY regions (temperature, specific gravity, the US library; SG and MY stay English, decision 9) with their emergency numbers, poison lines where one was confirmed, silica limits, food-contact rules, mask classes where read, and shops; see "Korea, Taiwan, Singapore and Malaysia's region data" under Phase C. The model gained a silica limit's start date (`from`, Taiwan's 2027-01-01), `ppm` as a food unit (said under the table as mg/L of the test solution), `pieces` for a law that judges other than six (Malaysia's four), and the kinds of piece `kr*`, `tw*` and `my*` (Singapore's are the US ones). The data hash and the snapshot test now cover Türkiye as well. CN, HK, ID and TH are next, after their verification pass.

**Phase C for China, Hong Kong, Indonesia, Thailand and the Philippines is done** (2026-10-16, branch w1-asia-regions, English only): the CN, HK, ID, TH and PH regions (temperature, specific gravity, the US library; HK reads zh-Hant and English, decision 5; PH stays English, decision 9) with their emergency numbers, poison lines where one was confirmed (Thailand's and the Philippines'), silica limits (none for the Philippines), food-contact rules for Indonesia and Thailand, and no shops (none found); see "China, Hong Kong, Indonesia, Thailand and the Philippines' region data" under Phase C. The model gained silica `bands` (China's GBZ 2.1 by free SiO2 content) and the kinds of piece `id*` and `th*`. Vietnam is not added: no official page for its emergency numbers could be read. The data hash and the snapshot test now cover Korea, Taiwan, Singapore and Malaysia as well.

**Phase C for Vietnam is done** (2026-10-17, branch w3-calendar-vietnam, English only): the owner decided on 2026-10-17 to add Vietnam with 113, 114 and 115, marked plainly as found on no official government page. The VN region (temperature, specific gravity, the US library, VND) with 115 and the others in its note, no poison line, QCVN 02:2019/BYT's silica limit and QCVN 12-4:2015/BYT's food-contact limits (both `secondary`, read in a legal database's copy), and no shops; see "Vietnam's region data" under Phase C. The model gained a `reported` status for an emergency number with no official page, shown with a plain caution. The data hash and the snapshot test now cover China, Hong Kong, Indonesia, Thailand and the Philippines as well.

**Phase E for Turkish is translated, reviewed, made consistent and live** (2026-10-14, branch asia-turkey): the owner decided Türkiye's data law, KVKK, by telling readers plainly what the system is (decision 10), and the sign-up page now says so before an account is made. Thai, Vietnamese and Indonesian remain.

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

A potter in Japan, Korea, China, Taiwan, Hong Kong or Southeast Asia picks their region and gets their poison line, emergency number, silica limit, food-contact rules and, where they exist, shops, in English at first. Japan's potters can fire by SK (JIS R 8101) cones. Then Japanese, Chinese (Simplified and Traditional) and Korean readers get Glazecalc in their language, followed by Thai, Vietnamese, Indonesian and Turkish. Türkiye's region data is in place too (added on the owner's request, 2026-10-14).

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
   - **CN:** _done 2026-10-16_ (120/119/110 on Shanghai's page; GBZ 2.1 amendment 2 read, silica unchanged); still open: GB 4806.4-2016, the China CDC line's hours and callers, KN95 names;
   - **HK:** _done 2026-10-16_ (999 in words; the silica pairing in two text orders; no food-ware rule of its own found);
   - **TW:** _done 2026-10-16_ (119 and 110 body text read; the limit before 2027 is still secondary only, so it is not shown);
   - **KR:** _done 2026-10-16_ (no national public poison line on any official page; KF94 read as MFDS's health mask);
   - **SG, MY:** _done 2026-10-16_ (see below);
   - **TH:** _done 2026-10-16_ (1669/191/199 on the MFA's page; the DLPW limit; MOPH No. 92's Thai original; no later ceramic rule listed);
   - **VN:** 113/114/115, Bạch Mai's hours and public status, QCVN 02:2019 and QCVN 12-4:2015;
   - **ID:** _done 2026-10-16_ (the ≥1100 mL sign and 0.5 mg/L lead read in the PDF); still open: HALOBPOM's poison role, BPOM 11/2026's promulgation date;
   - **PH:** _done 2026-10-16_ (NPMCC 24/7, free, in PGH's Citizen's Charter); still open: the DOLE silica table;
   - **JP:** _done 2026-10-14_ (the 作業環境評価基準 text read; JSOH's 2025–2026 list read; its 2026 list is members only).
   - **TR:** _done 2026-10-14_ (see "Türkiye's region data" below); still open: UZEM's cost and scope, TS EN 149 on TSE's site, the date of the announced dust-regulation revision.

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

Order of batches (see decisions): JP, KR, TW, SG, MY first; then CN, HK, ID, TH; then VN and PH. Türkiye was added out of turn, on the owner's request (2026-10-14), after Japan.

### Türkiye's region data (done 2026-10-14)

From research_notes/Asia/turkey-verification-2026-10-14.md (primary sources opened where it says so). Every value carries its source, the check date 2026-10-14 and a status.

| Fact         | Value                                                                                                                                                                                                                                                     | Source                                                                                                                                                                                                                | Status                            |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| Region       | `TR`, Türkiye, languages `['tr']`, °C, cones `temperature`, density `sg`, library `EU`                                                                                                                                                                    | MEB MEGEP "Sırlama ve Pişirim" (2007): firing by the controller's temperature, density as litre weight (g/L) and bome; shops quote °C                                                                                 | a judgement from verified sources |
| Emergency    | 112, one number for ambulance, fire, police, gendarmerie and coast guard                                                                                                                                                                                  | https://www.112.gov.tr/hakkimizda                                                                                                                                                                                     | verified                          |
| Poison line  | UZEM (Ulusal Zehir Danışma Merkezi), 114, 24 hours, every day; nothing said on cost or scope                                                                                                                                                              | https://divrigisadikozgurdh.saglik.gov.tr/TR-389626/alo-114.html (7/24); the ministry's UZEM page leads to tel:114                                                                                                    | verified                          |
| Ministry     | Sağlık Bakanlığı                                                                                                                                                                                                                                          | https://www.saglik.gov.tr/                                                                                                                                                                                            | verified                          |
| Silica       | binding 8-hour TWA, E = 10 / (Q + 2) mg/m³ respirable quartz (0.098 at Q = 100), cristobalite and tridymite half (0.049); a note that Türkiye has not adopted (EU) 2017/2398                                                                              | Tozla Mücadele Yönetmeliği (RG 05.11.2013/28812), Madde 9 and Ek-1, https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=18989&MevzuatTur=7&MevzuatTertip=5; the carcinogens regulation (MevzuatNo 18695) has no silica entry | verified                          |
| Agency       | Çalışma ve Sosyal Güvenlik Bakanlığı, İş Sağlığı ve Güvenliği Genel Müdürlüğü (ÇSGB İSGGM)                                                                                                                                                                | https://csgb.gov.tr/                                                                                                                                                                                                  | verified                          |
| Masks        | FFP2 for everyday glaze dust, FFP3 for more                                                                                                                                                                                                               | Kişisel Koruyucu Donanım Yönetmeliği (RG 01.05.2019/30761), following (EU) 2016/425, https://www.resmigazete.gov.tr/eskiler/2019/05/20190501-5.htm; the FFP classes (TS EN 149+A1) only in a secondary extract        | secondary                         |
| Food contact | Türk Gıda Kodeksi Gıda ile Temas Eden Seramik Malzemeler Tebliği (2012/30): the EU directive's figures (0.8/0.07 mg/dm², 4.0/0.3 mg/L, 1.5/0.1 mg/L), and a note on its rule (at least three samples, average within the limit, none more than 50 % over) | https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=16076&MevzuatTur=9&MevzuatTertip=5                                                                                                                                       | verified                          |
| Shops        | Pega Seramik (Tuzla, İstanbul; 250 g, 500 g, 1 kg), Tecnodieci Shopping (Bozüyük, Bilecik; no pack sizes shown), Seramiksir (100 g, 500 g, 1 kg; no town shown). Duygu Seramik left out.                                                                  | each shop's own raw materials page                                                                                                                                                                                    | verified                          |

Türkiye, could not verify (not shipped as fact): UZEM's cost (no "ücretsiz" on an official page), the unit that runs it (only the ministry is named) and any limit on who may call; TS EN 149+A1 on TSE's site; the date of the dust-regulation revision the ministry announced on 2025-08-07 (check again); any 2026 EU-level change to 84/500 that Türkiye might follow; Turkish producers' analyses (Esan, Kaltun, Polat, Şişecam, Eti Maden), so no Turkish materials yet; Seramiksir's town and Tecnodieci's pack sizes; forum practice on cones; whether the VERBIS exemption formally excludes foreign controllers; KVKK's transfer guide on direct collection; the current indexed fines; the TDK term dictionary.

Model changes for Türkiye: the silica `formula` gained optional `offset` (1 where not given) and `places` (the numerator's decimals, 1 where not given), so Japan's entry is unchanged; a binding limit may be a formula, labelled as a limit for respirable quartz, with its values at Q = 100 for all quartz and all cristobalite. The tridymite rule and "not adopted (EU) 2017/2398" are in the silica note, and the three-sample rule is the food note, since the model has no field for either.

### Korea, Taiwan, Singapore and Malaysia's region data (done 2026-10-16)

From research_notes/Asia/verification-KR-TW-SG-MY-2026-10-16.md, building on region-data.md (2026-10-12/13). Every value carries its source, its check date and a status; values carried from 2026-10-12/13 and not read again keep that date.

| Region                                                             | Emergency and poison                                                                                                                                                                            | Silica                                                                                                                                                            | Food contact                                                                                                                                    | Shops                                                                              |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `KR`, `['ko']`, temperature, sg, US library                        | 119 (Seoul's page); no national public poison line on any official page, so none is shown, the ministry (보건복지부) is linked and 119's 24-hour medical advice (MOHW, 2013) is the advice line | 0.05 mg/m³ quartz and cristobalite, 고용노동부고시 제2020-48호, `indicative` (a 노출기준); 방진마스크 1급 / 특급, verified, with KF94 named only as a health mask | MFDS 제2026-24호 III-7 나.: `krFlat` 8/0.7 µg/cm², `krSmall` 2/0.5, `krMedium` 1/0.25, `krStorage` 0.5/0.25, `krCooking` 0.5/0.05 mg/L          | 중앙도재, 클레이어                                                                 |
| `TW`, `['zh-Hant']`, temperature, sg, US library                   | 119 (內政部消防署); 臺北榮總毒藥物防治諮詢中心 02-2871-7121, 24 hours, free                                                                                                                     | 0.1 mg/m³ from 2027-01-01 (`from`), 勞工作業場所容許暴露標準 附表二 (2025); the earlier table is not shown; CNS 14755 D2 / D3, `secondary`                        | 食品器具容器包裝衛生標準 附表一: `twFlat` 17/1.7 µg/cm², `twSmall` 5/0.5 ppm, `twLarge` 2.5/0.25 ppm                                            | 太麟化工原料有限公司 (http only)                                                   |
| `SG`, `['en', 'zh-Hans', 'ms', 'ta']`, temperature, sg, US library | 995 (SCDF, read again); no public poison line on an official page, the Ministry of Health linked                                                                                                | 0.1 quartz, 0.05 cristobalite, binding, WSH (General Provisions) Regulations, First Schedule; no mask classes                                                     | Food Regulations 37(3): lead only, the US kinds of piece, each of six                                                                           | Sam Mui Kuang Pottery (http only), The Potters' Guilt (ready-made glazes and clay) |
| `MY`, `['ms', 'en']`, temperature, sg, US library                  | 999 (MERS); Pusat Racun Negara 04-6536 999, weekdays 8:00–22:00, weekends 8:00–17:00, Telegram; nothing said of cost                                                                            | 0.1 quartz, 0.05 cristobalite, binding, USECHH Regulations 2000, Jadual I; N95, or N99 / N100 (DOSH 2005)                                                         | P.U. (A) 48/2026, in force 2026-08-01: flatware 0.8/0.07 mg/dm² (average of 4), small and large hollowware and cooking ware in mg/L (each of 4) | none found; the page says so                                                       |

Singapore Statutes Online answered 403 on 2026-10-16, so Singapore's silica and food rules keep their check date of 2026-10-12 and status verified. Korea and Taiwan's cones follow decision 6 (temperature until practice is checked); Singapore and Malaysia's were not researched, so they fire by temperature too.

Could not verify (not shipped as fact):

- **KR:** an official page for the Seoul Poison Control Center (1855-2221, weekdays, Seoul only; journal report only) or any public poison line; the KF masks' legal class; a newer MoEL exposure notice than 제2020-48호; the MFDS ceramics test solution, each-or-average judging and "at most"; the exact 1,100 mL wording; 세라믹미네랄 as a shop for potters.
- **TW:** the silica limit in force until 2026-12-31 (only a university table, `10 / (%SiO2 + 2)`); D2/D3 percentages on a government page; the TFDA mask guideline; the extension of the second poison number (85500 or 85519); each-or-average judging; 釉藥堂 (an extract only).
- **SG:** any public poison line; NurseFirst 6262 6262; SS 548's class names and a MOM silica page; the food test method; Wei Chuan Pottery Studio; the statutes re-read on 2026-10-16.
- **MY:** 112 from mobiles; the poison centre's cost; the 1.1 L line between small and large hollowware and the test method (regulation 28 not read); whether newer USECHH rules replace the 2000 ones; any shop.

### China, Hong Kong, Indonesia, Thailand and the Philippines' region data (done 2026-10-16)

From research_notes/Asia/regions-CN-HK-ID-TH-VN-PH-2026-10-16.md, building on region-data.md (2026-10-12/13). Every value carries its source, its check date and a status; all were read again on 2026-10-16.

| Region                                                 | Emergency and poison                                                                                                                               | Silica                                                                                                                                                                 | Food contact                                                                                                                                                               | Shops                        |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `CN`, `['zh-Hans']`, temperature, sg, US library       | 120, with 119 and 110 in its note (Shanghai government's page); no poison line shown, no ministry linked (nhc.gov.cn unreadable)                   | GBZ 2.1—2019 表2, binding (强制性), by free SiO2 band (`bands`): 0.7 (10–50 %), 0.3 (over 50–80 %), 0.2 (over 80 %) mg/m³ respirable; amendment 2 adds acetochlor only | not shown: GB 4806.4-2016's official text could not be reached                                                                                                             | none found; the page says so |
| `HK`, `['zh-Hant', 'en']`, temperature, sg, US library | 999 (HK Talent Engage); the Poison Information Centre answers professionals only, so the Department of Health is linked                            | Labour Department silicosis guidance (2000): quartz 0.1, cristobalite 0.05, `indicative`; pairing checked in two text orders                                           | none of its own found; the page says the rules are not yet confirmed                                                                                                       | none found; the page says so |
| `ID`, `['id']`, temperature, sg, US library            | 119, with 118, 110/112 and 113 in its note (Ministry of Tourism); HALOBPOM not confirmed as a poison line, so Kementerian Kesehatan is linked      | Permenaker 5/2018: 0.025 quartz and cristobalite, binding (NAB), read on the gazette's annex page through a mirror                                                     | BPOM 11/2026 Lampiran I.D: `idFlat` 0.8/0.07 mg/dm², `idSmall` and `idLarge` 0.5/0.25 mg/L; the third of three extractions counts (note); no in-force date (blank in copy) | none found; the page says so |
| `TH`, `['th']`, temperature, sg, US library            | 1669, with 191 and 199 in its note (Ministry of Foreign Affairs); Ramathibodi Poison Center 1367, 24 hours, with its LINE link                     | DLPW notification on hazardous chemical limits (Royal Gazette 2017-08-03): 0.025 quartz and cristobalite, binding                                                      | MOPH No. 92 (1985), Thai original read: `thFlat` 7/0.7, `thSmall` 5/0.5, `thLarge` 2.5/0.25, `thInfant` 2.5/0.25, `thCooking` 5/0.5, all mg/L                              | none found; the page says so |
| `PH`, `['fil', 'en']`, temperature, sg, US library     | 911 (DILG page, free, 24/7); National Poison Management and Control Center (02) 8524 1078, 24 hours, free, lay persons too (PGH Citizen's Charter) | not shown: DOLE's sites answered 403                                                                                                                                   | none found                                                                                                                                                                 | none found; the page says so |

Model changes: a silica limit may give `bands` of free silica content (from, whether from is included, to, value), shown as one row each in place of the quartz row, with three messages (`guides.silica.bandFromTo`, `bandOverTo`, `bandAbove`); quartz holds the top band's value. The silica block outside the EU with no limit read (the Philippines) says none is confirmed instead of pointing to the EU's. Hong Kong is listed after Taiwan, so Traditional Chinese pages are still prerendered for Taiwan; Simplified Chinese pages are now prerendered for China (they were for Singapore), and Thai and Indonesian ones for Thailand and Indonesia.

Could not verify (not shipped as fact):

- **CN:** the China CDC poison line (83132345)'s hours, who may call and its area code; NHC's and MEM's own pages; GB 4806.4-2016's figures (lab articles disagree; one cites a "2023" edition no official page shows); GB 2626's class names; any shop.
- **HK:** the 2000 Code of Practice's OEL table (an image); respirator guidance (an image PDF); any ceramic food-ware law; any shop (one lead, undated).
- **ID:** HALOBPOM 1500533 as a 24-hour poison line today; PSC 119's hours; BPOM 11/2026's promulgation date and Berita Negara number; Permenaker 5/2018 on peraturan.go.id itself; SNI mask classes; any shop.
- **TH:** NIEMS's own page for 1669; the Siriraj centre; 1367's cost; mask classes; any shop.
- **PH:** the OSH Standards' silica table (DOLE 403); DOH's page; any shop; any mandatory food-ware rule.
- **VN (added 2026-10-17, below):** 113/114/115 on an official page (only law-firm and news pages; a merger into 113 is being prepared), Bạch Mai's hours and public access, QCVN 02:2019/BYT and QCVN 12-4:2015/BYT. A region needed a verified emergency number, so Vietnam waited until the owner's decision.

### Vietnam's region data (done 2026-10-17)

From research_notes/Asia/region-VN-2026-10-17.md. The owner decided (2026-10-17) to add Vietnam with its widely reported emergency numbers, marked plainly as found on no official government page.

| Region                                      | Emergency and poison                                                                                                                                                                                                                                       | Silica                                                                                                                                                                      | Food contact                                                                                                                                                                                                                                          | Shops                        |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `VN`, `['vi']`, temperature, sg, US library | 115, with 113 and 114 and the planned merger into 113 in its note (Tuổi Trẻ, 2026-04-17), status `reported`: the block says no official page lists them; no poison line (Bạch Mai's hours and callers not stated); no ministry (moh.gov.vn did not answer) | QCVN 02:2019/BYT Bảng 2: free silica in respirable dust 0.1 mg/m³ (total dust 0.3, in the note), binding, `secondary` (Caselaw Việt Nam's copy); no agency, no mask classes | QCVN 12-4:2015/BYT (Thông tư 35/2015/TT-BYT, in force 2016-05-01) II.1.2: `vnFlat` 0.8/0.07 mg/dm², `vnSmall` 2/0.5, `vnMedium` 1/0.25, `vnStorage` 0.5/0.25, `vnCooking` 0.5/0.05, `vnCups` 0.5/0.25 mg/L; test TCVN 7146-1:2002 (note); `secondary` | none found; the page says so |

Model changes: a safety line may be `reported` (widely reported, no official page found); `shownFor` shows reported emergency numbers only, and the poison-lines block then says under its table, "We could not find an official government page that lists these numbers; they are the ones widely reported." The regions test allows it for VN alone. Vietnamese pages, once live, would be prerendered for Vietnam.

Could not verify (not shipped as fact): an official page for 113/114/115; Bạch Mai's poison line hours, cost and callers; both QCVNs on an official site; the health ministry's page; the workplace agency; mask classes; how many pieces the food rule judges; any shop.

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

## Phase E: language wave 2, th, vi, id and tr

0. **Groundwork done** (2026-10-16, branch w1-asia-wave2, English only; the translations run in wave 3, after the English settles): `th`, `vi` and `id` are in `lib/regions/languages.js` (`live: false`, the standard notice) and in `wave.js`; their style sheets and glossaries are docs/translations/th.md, vi.md and id.md (330 rows each, with the sources read, the rows marked **Native check**, and their search terms); translate prompts are generated with `make-translate-prompts.js id vi th`. Thai dates are Gregorian by default (`formatLocaleFor` appends `-u-ca-gregory` to a Thai locale that names no calendar) until item 1 builds the setting; numbers stay Western. The numbers check already reads the 24-hour forms (pukul 20.00, 20:30, 20.00 น.) and the 12-hour ones as differences.
1. **The Calendar setting** from docs/i18n-plan.md "Settings". _Done 2026-10-17 (branch w3-calendar-vietnam), by the owner's decision: Gregorian by default everywhere, the Thai Buddhist era (2569) or Japanese eras (令和8年) for readers who choose them._ The `calendar` preference (`gregory`, `buddhist`, `japanese`; lib/regions `CALENDARS`) is kept with the account or trial like the others, checked by the server, and offered in Settings with each choice's sample date. `formatLocaleFor` names the calendar in the format locale (`th-TH-u-ca-buddhist`, `ja-JP-u-ca-japanese`; Thai keeps `-u-ca-gregory` when Gregorian), so every date the app shows follows it: firing logs, recipe dates, prints, the shared page, the account's and trash's dates. Numbers do not change. Dates are still typed in the browser's Gregorian date fields and saved as YYYY-MM-DD. Emails stay Gregorian (`mailDate` names the Gregorian calendar). The era in the date (2569, BE, Reiwa, 令和) shows which calendar is in use, so the firing log adds no label. Tests: lib (both eras, numbers unchanged), client (Thai Gregorian by default; Buddhist and Japanese dates), server (the preference), and e2e (a firing log's date after a change in Settings).
2. **Thai:** heading line height, and `<wbr>` or U+200B only where a technical word breaks badly. Check this in the Linux screenshot run.
   _Thai layout, checked 2026-10-16 (CSS read, not screenshots):_ no `text-align: justify`, no `hyphens` and no `word-break` rule touches Thai, so the browser's dictionary segmentation decides the breaks; Node's ICU splits a loanword such as เซรามิก as เซ|รา|มิก, so a technical word may break mid-word on a phone, and only the Linux screenshot run (with the Thai fonts) shows which. Risks found: (a) the landing page's `.eyebrow` letter-spacing (0.08em) separated Thai letters and tone marks: fixed, `:lang(th)` now resets it as for ja, zh and ko; (b) several small labels have `line-height` 1.2, 1.25 or 1 (`.account-text`, `.account-initial`, `.recipe-remove`; headings are 1.4 for Thai already), which may clip Thai tone marks: check them in the screenshots; (c) `white-space: nowrap` on `.btn` inside button groups, `.recipe-share`, `.library-mark` and badges cannot wrap a Thai label that has no spaces, so a long Thai label may overflow a phone: keep Thai button texts short and check the phone-width test with a long Thai pseudo-text; (d) `.account-email` clips with an ellipsis (Latin, no issue). The style sheet tells translators to put no zero-width spaces in by default.
3. **Data-law checks before go-live:** researched 2026-10-16 (research_notes/Asia/data-law-VN-ID-2026-10-16.md, from law-firm notes; the decree texts not read). _Decided 2026-10-16:_ **Vietnamese** goes live as Turkish did; if Vietnam's A05 ever asks, file the cross-border transfer assessment then. **Indonesian** goes live as Turkish did, accepting that Indonesia may block the site for not registering as a foreign electronic system operator (PSE); if Komdigi sends a notice, the owner decides then between registering and withdrawing Indonesian accounts. Thai follows decision 2. Türkiye's KVKK was researched on 2026-10-14 (below); decision 10 settled it.
4. **Waves and go-live** as in Phase D, Indonesian first (the best-scored), Thai last, Turkish live since decision 10 (2026-10-14).
5. **Turkish (tr).** Add `tr` to `wave.js` and to `lib/regions/languages.js` (`Türkçe`, `live: false`) with the standard notice. The region data is already in place in English (Phase C), so the translation brings its notes with it. Glossary sources: the MEB MEGEP modules (sır, astar, bisküvi, sırlı pişirim, litre ağırlığı, boumetre, daldırma, püskürtme), Arcasoy & Başkırkan's _Seramik Teknolojisi_, the shops' catalogues for sold names, and the regulations for legal terms (kurşun ve kadmiyum migrasyonu, solunabilir toz, kristal yapıda SiO2). The style sheet must say:
   - **sır** (glaze), **frit** (frit), **litre ağırlığı** (litre weight, g/L) for density as potters read it, **bome** for degrees Baumé;
   - **"Seger piramidi" is what Turkish shops call Orton cones** (Tecnodieci sells "Seger Piramidi (Orton)"). The glossary must not use it loosely for German Seger cones or for SK cones: Orton cones are named as Orton (the shops' "Seger piramidi" may stand beside it), SK cones are "SK (JIS R 8101)", and the Seger formula ("Seger formülü", the unity molecular formula) is a different thing;
   - Turkish casing (İ/i, I/ı) in any upper-cased text and in search (check `library-info.ts`'s case folding with `tr`);
   - the prefix percent (%5), which the numbers gate reads since Phase A.

### KVKK (Türkiye's data protection law), researched 2026-10-14

A judgement from the research notes, not legal advice. On a strict reading, offering accounts in Turkish to people in Türkiye means:

- **VERBIS registration:** Law 6698 Art. 16 requires controllers to register in the Veri Sorumluları Sicili before processing; a controller not established in Türkiye registers **through a representative** (a Turkish company or citizen; Sicil regulation, MevzuatNo 24276, Art. 5(1)(b)). The size exemption (under 50 employees and under 100 m TL) does not obviously cover foreign controllers; the Board's deadline decisions list foreign controllers separately, and law firms say there is no exemption.
- **Transfers abroad** (Art. 9 as amended by Law 7499, 2024): adequacy, then safeguards, where a **standard contract must be notified to the Authority within five working days** (fines 50,000 to 1,000,000 TL), then occasional derogations. Collecting directly into the US is arguably not a transfer; sharing with AWS or SES might be.
- Also: a Turkish privacy notice (aydınlatma metni, Art. 10), security (Art. 12), answers to requests within 30 days (Art. 13), breach notice in about 72 hours.

This blocked the Turkish language's go-live until decision 10, not the TR region data, which collects nothing new.

### Lessons from Japan, applied to Türkiye

1. **Prompts point at the worktree.** Prompts generated with the main checkout's path sent agents to the wrong files; generate the Turkish prompts in the worktree they run in, and check the paths in one before starting.
2. **Numbers written as words in the English stay words** in Turkish, so the numbers check matches; digits stay digits.
3. **Month names stay next to their years** ("14 Ekim 2026"), not turned into a numeric date the check cannot match.
4. **Official names with digits are names**, like 中毒110番: keep them whole (Alo 114, 112 Acil Çağrı Merkezi) and do not treat them as generic terms; a generic term ("the poison line") is translated as words.
5. **Source titles keep their dates** (RG 05.11.2013/28812, Tebliğ No: 2012/30) exactly as written.
6. **Keep the blind back-translation of the safety text.** In Japanese it caught 8 meaning slips that the reviews missed: softened warnings, scope widened or narrowed, and an added "must always".
7. **No added emphasis.** Agents added 必ず where the English had none; Turkish agents must not add "mutlaka", "kesinlikle" or "her zaman" where the English has no such word.

## Decisions for the owner

1. **Turkey in or out of wave 2.** _Decided 2026-10-14: in._ The region data is done (Phase C); the Turkish translation followed in wave 2, and went live with decision 10. It is technically cheap (only the prefix percent, fixed in Phase A) and has 77.5 m people online.
2. **Local representatives in China and Thailand (and Vietnam's assessment).** _Recommend: do not hold back the regions,_ which collect nothing new. Offer the languages without representatives, with a privacy page in each language, minimal data and no marketing aimed at China (no Baidu ads, no WeChat account). Revisit if those countries' account numbers grow, or if advice is taken. The fallback, if the owner prefers caution, is to leave accounts for those regions out of scope while the calculator stays open. This is a judgement, not legal advice. _Decided 2026-10-16: Chinese and Thai go live as Turkish did (decision 10): the sign-up notice, no representative, no marketing aimed there._
3. **Kyoto vs JIS SK.** _Recommend JIS only,_ named "SK (JIS R 8101)", with a note on Kyoto cones and no Kyoto table. Kyoto cones are no longer made, and only partial measured data exist.
4. **The first region batch.** _Recommend JP, KR, TW, SG and MY,_ whose data is mostly verified. CN, HK, ID and TH follow after their verification pass, then VN and PH, which have the most gaps.
5. **Hong Kong.** _Recommend zh-Hant (written for Taiwan) and English, with Hong Kong's own region data_ and the `zh-Hant-HK` format locale. Add a Hong Kong translation only if people ask.
6. **Japan's default cones and density.** _Recommend SK as Japan's default,_ with Orton and temperature one tap away, since institutions are moving to Orton. Use temperature for China, Korea and Taiwan until their practice is checked. Make Baumé Japan's density default _(inferred from the hydrometers sold)_.
7. **Clock times and `。`.** _Recommend_ the 24-hour rule in every Asian style sheet rather than teaching the gate 午後/下午/오후. _Recommend_ accepting `。` between digits as a decimal point.
8. **Fonts.** _Recommend system font stacks first,_ checked in Windows screenshots. Self-host Noto Serif slices only if SimSun and MingLiU read badly, or if CI screenshots diverge.
9. **Which stay English.** _Recommend_ Singapore, Malaysia and the Philippines in English with region data. Malay and Filipino only on request. West and Central Asia wait for the right-to-left and Russian waves.
10. **KVKK for Turkish (blocked the tr go-live, not the TR region data).** On a strict reading, an overseas controller must register in VERBIS through a Turkish representative, and a standard contract for transfers abroad must be notified to the Authority within five working days. The choices were: take advice; offer Turkish without targeting accounts at Türkiye; or accept the risk as for Thailand and China (decision 2), telling users plainly. _Decided 2026-10-14: the third, Turkish goes live._ The owner's words: "inform user about the nature of the system, that it is a free open source project, they can host it themselves if they want, it is in the USA and up to them to decide, and the project accepts no risk." What was built (for everyone abroad, not only Türkiye, and without naming any law): the sign-up page shows a short notice, near the button, to every reader whose region is not the US or is not known (the region chosen in Settings, else the browser's), saying that Glazecalc is a free, open-source project, accounts are kept on servers in the United States, the guides and a trial need no account, anyone can run their own copy, and whether to create an account is the reader's own decision, for which the project accepts no responsibility. It links to a new section of the privacy page, "Where your account is kept, and your choice" (`/privacy#your-choice`), shown to everyone, which adds the GitHub link and that Glazecalc is provided as is, without warranty, its maintainers accepting no responsibility or liability for the decision or for where the data is held. English, Turkish and Japanese now; the other languages show the English until their next pass. No VERBIS registration, representative or notified contract.

## What stays the same

- English is the source and the fallback.
- Material names in recipes stay as they are.
- Recipes store plain numbers.
- Only verified safety data is shown, each entry with its source and check date, and a test fails a year after the check.
- No guessed numbers, and no cone number equated across systems.
