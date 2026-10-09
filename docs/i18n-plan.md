# Plan: Glazecalc in the 24 official EU languages

Status: decided in outline, 2026-10-08; revised the same day after the owner's decisions. The research behind it is in
`reports/Internationalizing glazecalc for EU languages.md`, with notes in `research_notes/` under the same name. Once
the library trial is done, the approach is recorded as ADR 13.

## The goal

A potter anywhere in the EU picks their language and their region in Settings, and gets Glazecalc in their own
language with information that is right for where they work:

- numbers, dates and temperatures written their way (12,5 g; 8.10.2026; 1240 °C), and typed their way;
- the words potters there use for materials, glazes and firing (Kreide, émail, szkliwo, Segerformel);
- firing instructions for the cones they use, or by temperature alone;
- their poison line and emergency number, safety limits, food-contact rules and suppliers.

Visitors who are not signed in get the same choices from a language link on every page, kept in the browser.

## The owner's decisions

1. **Library:** a runtime library if it helps the résumé; a reload when the language changes is fine. (Below: Transloco.)
2. **Translation:** no paid translation or review. Claude translates. Every translated page says at the top that
   Glazecalc is open source and machine-translated, and links to GitHub for suggestions. That is enough for version 1,
   safety text included.
3. **First wave:** German, French, Spanish, Italian, Polish and Portuguese (pt-PT).
4. **Address:** formal.
5. **Cones:** where a cone system is used, explain how to use it; where it is not, leave it out.
6. **Settings:** language and region are separate, and others are welcome where they help, such as typing numbers in a
   style other than the language's (an English decimal point, with German text, for a potter in France).
7. **After the EU:** Asian languages next, then the Indian subcontinent, then Africa. The EU work is built so that these
   need no change to the approach (see "After the EU", below).

## The library: Transloco

The market evidence is thin, but it points one way.

- **Few job postings name an i18n library.** In two searches, one current posting asked for Transloco, alongside
  Signals, NgRx Signal Store, Nx and WCAG 2.2 ([Kortext](https://careers.kortext.com/Kortext/JobDescription/4dHjLE0170A)).
  Another, from 2025, listed ngx-translate as mandatory ([Dogtronic](https://justjoin.it/job-offer/dogtronic-angular-frontend-developer-lublin-javascript)).
  None named Angular's built-in i18n. Senior postings mostly ask for Angular depth, RxJS or NgRx, testing and
  architecture instead.
- **Use, by npm downloads** (5 September to 4 October 2026):

  | Package                                     | Downloads a month |
  | ------------------------------------------- | ----------------- |
  | `@angular/localize`                         | 5.78M             |
  | `@ngx-translate/core`                       | 5.67M             |
  | `@jsverse/transloco` (+ old `@ngneat` name) | 1.49M             |

  `@angular/localize` is also pulled in by other libraries (ng-bootstrap needs it), so its figure overstates direct use.

- **What it means for the résumé.** You already have the built-in system. A runtime library adds the other half of the
  field. Transloco is the one modern-stack postings name, and it has more to show:
  - signal-based APIs and lazy-loaded scopes;
  - a keys manager that can fail CI on missing or unused keys;
  - switching language in place.

  ngx-translate is the most installed and the one older codebases use, so it is equally defensible. Either way, the
  stronger résumé line is the whole system: separate language and region, verified country data, and an LLM
  translation pipeline with automated quality gates.

**Recommendation: Transloco 8.4** (the stable line; Kavita runs it on Angular 22 without zone.js). Version 9 is still
alpha, so watch it but do not adopt it yet.

The later regions make a runtime library the clearly better fit, not only the better résumé line. With Asia, the
Indian subcontinent and Africa, Glazecalc heads for 60–80 languages. Angular's built-in system would mean as many
builds and as many copies of the app in the Docker image. Transloco keeps one build and loads one JSON file per
language and page.

**Plurals and other ICU messages go through FormatJS's `intl-messageformat`, as a custom Transloco transpiler.** It is
the most used ICU implementation (about 83 million downloads a month, released 5 October 2026), with CLDR plural rules
for every language, Arabic's six forms included. Transloco's own ICU plugin is built on `@messageformat/core`, which
has had no release since October 2024.

Keep the one-day trial, now on Transloco alone, to prove four things before converting the app:

- a signal-based message inside a zoneless component;
- an ICU plural with a Czech decimal, and one with Arabic's six forms, through `intl-messageformat`;
- the language set from the URL;
- a right-to-left page (Arabic) with the layout mirrored.

What Transloco does not give for free, the plan adds:

- per-language URLs for search engines (`/de/guides/firing`);
- `<html lang>` updates;
- the hreflang links the server puts in each page;
- locale-aware number and date formatting through `Intl` rather than Angular's fixed `LOCALE_ID`.

One build serves every language, and the translations load as JSON per language and page.

## Settings: what a potter can choose

Language and region are the two main choices; the rest default from them and can be changed. Today's weight and gram
settings stay.

| Setting                  | Choices                                                       | Default                                                               | Why it is separate                                                                                                                                                         |
| ------------------------ | ------------------------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Language                 | 24 EU languages                                               | From the URL, else the browser, else English                          | The words on the page.                                                                                                                                                     |
| Region                   | Each EU country, plus US, UK, Ireland, Australia, New Zealand | Asked once; none until chosen                                         | Poison lines, safety rules, suppliers and the material library follow the country. German is official in four member states.                                               |
| Number and date format   | "As my language and region" or a named format, with examples  | Language plus region (de with AT gives de-AT)                         | A potter may read German but want French dates, or English numbers.                                                                                                        |
| Decimal mark when typing | Either (comma or point), comma, point                         | Either                                                                | Settles "1,250": with "either", the format decides. Covers English typing with German text in France.                                                                      |
| Temperature              | °C, °F                                                        | °F in the US, °C elsewhere                                            | Guides and firing logs show one, with the other in brackets.                                                                                                               |
| Cones                    | Orton, Seger, temperature only                                | Orton in the US, UK, Australia and New Zealand; asked elsewhere       | The guides explain the chosen system and leave out the other. Seger and Orton numbers differ by 44–52 °C at 05 and 04.                                                     |
| Glaze density            | Specific gravity, Baumé, pint weight                          | Baumé in Italy, pint weight nowhere by default, else specific gravity | Italians measure in Baumé; older UK books use pint weight.                                                                                                                 |
| Weights, gram precision  | As now                                                        | As now                                                                | Already in Settings.                                                                                                                                                       |
| Show English terms       | On, off                                                       | Off                                                                   | Puts the English term in brackets after key words ("Fritte (frit)"), for potters who also read English sources such as Digitalfire.                                        |
| Translation notice       | Shown, hidden                                                 | Shown                                                                 | The notice can be closed; it stays in the safety guides.                                                                                                                   |
| Digits                   | As the language, or 0–9                                       | As the language                                                       | Arabic, Persian, Bengali, Marathi and Nepali write their own digits by default (١٢٣, ১২৩, १२३); many potters there use 0–9 for technical work. Added with those languages. |
| Calendar                 | As the region, or Gregorian                                   | As the region                                                         | Thai dates default to the Buddhist year (2569) and Persian to the Persian calendar. Firing logs and dates follow this. Added with those languages.                         |

Everything is stored with the account (like the theme and lead today), with a copy in the browser so the first paint
is right. Visitors keep theirs in the browser only.

The library's region filter (`chosenRegion()`) follows the region setting. EU countries keep the EU material set and
add local trade names as aliases.

## Phase 1: groundwork, in English (about 2–3 weeks)

**Done, 2026-10-08, on branch `i18n-phase1`:** the region, format, decimal-mark, temperature and
cone settings (and a language setting, English only for now); formatting through `Intl`
(`client/app/shared/format.ts`); typed amounts in any style and any script's digits; whole
sentences and `Intl.ListFormat` lists; codes on server messages; email templates by language;
who-to-call data by region (`lib/regions/safety.js`); logical CSS and isolated formulas, names and
phone numbers. **Moved to Phase 2**, where the guides become Markdown: the guides switching between
cone systems and temperature scales, and the glaze-density, English-terms and translation-notice
settings, which have nothing to change until then. **Moved to Phase 4:** silica, food-contact and
supplier data by region. Digits and calendar settings come with the languages that need them.

None of this needs a translation, and all of it makes the English app better. It removes most of the risk, so it comes
first.

1. **The settings above** on the account, the server, `preferences.service.ts` and the Settings page. Until other
   languages exist, language offers only English.
2. **One formatting service.** It gives the format locale to `Intl.NumberFormat`, `DateTimeFormat`, `PluralRules`,
   `ListFormat` and `Collator`.
   - Replace the display uses of `toFixed` (about 31) and `DatePipe` (15).
   - Format temperatures as a number in a pattern, "{t} °C", with a no-break space.
   - Sort lists with `Intl.Collator`.
3. **Typed amounts.**
   - Amount fields become `type="text"` with `inputmode="decimal"`.
   - One strict parser, in `rebase.ts`, follows the decimal-mark setting, ignores spaces in large numbers and rejects
     anything else. It echoes back what it read, in the user's format.
   - Recipes keep storing a plain "12.5", so a recipe saved in German opens correctly in English.
4. **Whole sentences.** Where English pieces are glued together, each becomes one message with named values, with ICU
   plurals and `Intl.ListFormat` for lists:
   - what each material supplies (`pool.ts`);
   - the past-limit warnings (`checks.ts`);
   - the swap notes (`recipe-page.ts`);
   - the report and the comparison.

   Title Case becomes sentence case.

5. **Codes on server messages.** Each of the 39 `msg` responses also carries a stable `code`. The client shows its own
   text for a known code and the server's text otherwise.
6. **Emails** (password reset, password changed) render from a template in the account's language.
7. **Country data with sources and dates.** One file per country holds:
   - poison lines (numbers, hours, whether the public may call, animals) and the emergency number;
   - the national silica limit, the food-contact rules and the safety agency;
   - suppliers.

   Each entry has its source URL, the date checked and a status, and only verified entries show. In the EU, 112 always
   shows. The home-safety guide's table reads from this data. A test fails when an entry is more than a year past its
   last check.

8. **Firing by cone system.** The cone setting chooses what the guides and the app show:
   - **Orton:** the current chart and the reading guide.
   - **Seger:** the SK chart from a sourced table, how SK cones are set and read, and a warning that cones sold as
     "Segerkegel" are often Orton cones, so check the box. The only SK table found dates from 2004, so this section
     needs a current maker's chart before it goes live.
   - **Temperature only:** firing as controller segments (rate, target, hold) in °C or °F.

   Nowhere equates a Seger number with an Orton one, and every cone mention names its system.

9. **`translate="no"`** on oxide formulas, trade names and units, so browser translation leaves them alone too.
10. **Ready for right-to-left now, while it is cheap.** Arabic and Urdu come later, and retrofitting is painful.
    - The stylesheet moves to logical properties (`margin-inline-start` rather than `margin-left`, `text-align: start`).
    - Oxide formulas, amounts and trade names sit in `<bdi>` or `unicode-bidi: isolate`, so "SiO₂ 2.5" reads the
      same inside Arabic text.
    - Bootstrap's right-to-left stylesheet is checked on one page.
11. **A parser and formatter for every script.** The typed-amount parser accepts any Unicode decimal digit and the
    Arabic separators (٫ ٬), not only 0–9, comma and point. Formatting already comes from `Intl`, which handles Indian
    grouping (12,34,567.5) and native digits.

## Phase 2: the translation machinery (about 2 weeks)

**Done, 2026-10-08, on branch `i18n-phase2`** ([ADR 13](adr/0013-translations.md),
[docs/translating.md](translating.md)). All of the items below, with these changes from the plan:

- **English keeps the plain paths** (`/recipe`), and other languages have their own (`/de/recipe`).
  So no existing link breaks, and English is the `x-default`.
- **Guides** live at `client/public/i18n/guides/<guide>/<language>.md`. The page draws them with
  Angular's templates, never as HTML. Temperatures and glaze densities are written as tokens and
  shown in the reader's scale and unit.
- **Words from the app's data** have their English written out for translators, each under a key
  made from that English, so a changed note never shows an old translation: the standard
  materials' notes and hazards, the standard advice, and who to call. The server's and the
  chemistry's messages are written out by their codes.
- **Settings added:** language, glaze density, English terms and the translation notice. A
  translation marks a key term's English with `<en>` in a message, or `{{en: …}}` in a guide.
- **Local trade names as aliases** stay with Phase 4's region content.

1. **The Transloco trial**, then ADR 13.
2. **Marking the interface.** Templates use Transloco's structural directive and signal API; TypeScript messages use
   the service. Keys are grouped by page (Transloco scopes), so each page loads only its own translations.
   - The keys manager extracts the English, and CI fails on a key used but missing, or present but unused.
3. **URLs and serving.**
   - Every page lives under `/<lang>/`. The router sets the active language from the URL.
   - Express sets `lang`, the title, the canonical link and the full set of hreflang links in the HTML it serves.
   - The sitemap lists every language.
   - `/` is an English page with visible language links, marked `x-default`. Visitors are never redirected by a
     guessed language; signed-in users land on their own.
4. **Changing language** saves the setting and opens the same page under the new path. Transloco could switch without
   a reload, but going through the URL keeps links and search engines honest, and a reload is fine.
5. **Guides in Markdown.** Each guide's body becomes `guides/<lang>/<guide>.md`, rendered with the same contents list,
   callouts and accessible tables as today. Whole documents translate better than scattered keys, and 24 copies stay
   out of the app's code.
6. **Material notes per language**, in files keyed by each record's `_id`. Names stay as they are; local trade names
   are added as aliases per region.
7. **The translation notice.** At the top of every page in a language other than English, in that language, with
   `role="note"`:

   > "This page was translated from English by AI. Glazecalc is open source: if something reads wrong, please suggest
   > a correction on GitHub." [Suggest a correction] [Read the English]
   - The link opens a GitHub issue form with the language and page filled in.
   - "Read the English" shows the English original, marked `lang="en"`.
   - The notice can be closed, except in the two safety guides, where a one-line version stays.

8. **Checks in CI.**
   - Each language's plural forms are checked against CLDR.
   - Every placeholder and ICU construct survives translation.
   - Romanian files reject cedilla ş and ţ.
   - Browser tests run in English, German (decimal comma) and a pseudo-locale that lengthens and accents every string.

## Phase 3: translating with Claude (from week 5)

**Wave 1 done, 2026-10-09, on branch `i18n-phase3`:** German, French, Spanish, Italian, Polish and European
Portuguese, offered in Settings and to search engines. As planned, with these details:

- **Glossaries and style sheets** in `docs/translations/<code>.md`, 258 terms each from `docs/translations/terms.md`,
  researched in suppliers' catalogues and potters' sources in each language. Each lists the choices a native potter
  should check. The brief every translator follows is `docs/translations/README.md`.
- **Each language in nine parts**, translated by separate agents, then **reviewed** part by part by another, which
  changed about 390 segments in all: meaning, terms, register, inches and feet, French spacing.
- **Back-translation of the safety text**, strictly blind (the English opened only after the back-translation was
  written): both safety guides and the app's warnings (who to call, every hazard, the lead setting, the recipe
  checks). It found about twenty differences in meaning, all fixed. Some recurred across languages and came from
  ambiguous English, which was made plain: a kiln room that can be "secured" (read as merely closed; it means
  locked), a respirator "under a hood or outdoors" (read as outdoors only), "some fine quartz" read as "a little".
- **The automatic gates:** each translation keeps the English's numbers with their units and its links, read the
  language's way (1,5; 20 Uhr for 8pm; codes such as 29 CFR 1910.1053 kept as written), and each guide section its
  structure. Fingerprints (`client/i18n-fingerprints/`) record the English each translation was made from:
  `npm run i18n:sources` takes out a translation whose English has changed, so the page shows the English until it
  is translated again, and `npm run check:i18n` counts what is still in English per language.
- **The emails** about a password are in every language, as templates with named values.
- **Plural rules** follow the page's own language: European Portuguese counts 0 as plural, unlike Brazil's.
- **A browser test** opens every page in each language at a phone's width and fails if anything is wider.

### What Claude produces, per language

- **A glossary of 150–250 terms**, built from the research notes and the suppliers' catalogues in that language, never
  from a dictionary alone. It records the false friends (Steingut is not Steinzeug; Polish glazura is wall tile) and
  what is never translated: formulas, cone numbers, trade names.
- **A style sheet:**
  - the formal register;
  - number and quotation conventions;
  - the local name for the unity formula (Segerformel and its equivalents) beside "UMF".
- **The translations:** interface JSON, guide Markdown, material notes, email templates and the server-code messages.

### How each language is made

1. **Translate in segments** (a message, or a paragraph of a guide), with the glossary, the style sheet and a note on
   where the text appears.
2. **Review independently.** A second Claude pass reads the English and the translation side by side. It checks
   meaning, omissions, register and terms, and corrects them.
3. **Run the automatic gates.** These catch the errors that hurt most, and they cost nothing:
   - **Numbers, units, phone numbers and links are identical** to the English, allowing for the decimal comma. This
     catches a changed temperature, limit or phone number.
   - The Markdown structure matches: headings, tables, lists, links.
   - ICU syntax and placeholders are intact, and the plural forms are complete.
   - Lengths are flagged when they would overflow; the pseudo-locale and real-language screenshots check the layout.
4. **Back-translate the safety sections.** The two safety guides, and the warnings in the app, are translated back to
   English by a separate pass and compared with the original. Any change in meaning is fixed before release.

### Keeping it current

- Each English segment has a fingerprint. When the English changes, only the changed segments are translated again.
- A segment whose translation is out of date shows in English until it is redone. CI reports how many there are.

### Corrections from people

- The GitHub issue form asks for the language, the page, the current text and the suggested text.
- Translations are plain JSON and Markdown, so a contributor can also send a pull request.
- A suggestion is checked against the English by Claude before it is merged.
- `CONTRIBUTING.md` gets a short section on this.

### Waves

| Wave | Languages                                                                                                  |
| ---- | ---------------------------------------------------------------------------------------------------------- |
| 1    | German, French, Spanish, Italian, Polish, Portuguese                                                       |
| 2    | Dutch, Romanian, Czech, Hungarian, Greek, Swedish, Danish, Finnish, Slovak, Slovenian, Croatian, Bulgarian |
| 3    | Lithuanian, Latvian, Estonian                                                                              |
| 4    | Irish, Maltese                                                                                             |

- **Wave 1** proves the pipeline, the gates and the layout.
- **Wave 2** can follow in a batch, since money is no longer the limit.
- **Wave 3 and Irish and Maltese last:** machine translation is weakest for them, and over 90% of Irish and Maltese
  respondents read English, so their notice says so more plainly.
- Region data for every country comes in Phase 1, whatever its language wave.

### What it costs

Translation costs tokens and time, not money. By rough estimate, the first pass is about 1.3 million output tokens for
all 23 languages. The review, back-translation and fixes take perhaps three to five times that, so 5–8 million tokens
in all, spread over several sessions. Running the languages in parallel needs Claude Code's multi-agent workflow,
which you opt into by asking for a workflow.

## Phase 4: region content

For each region, before its language goes live:

- **Claude checks on official pages what the research could not:**
  - Malta's poison-line hours and Portugal's numbers;
  - Bulgaria, Lithuania and Cyprus;
  - Belgium's food-contact figures and the 2024 national silica table.

  Anything still unverifiable shows 112 and a link to the national health ministry, never a guessed number.

- **Suppliers:** two to four for each country where they exist. None were found for Croatia, Lithuania, Latvia,
  Estonia, Luxembourg, Malta or Cyprus, so those say so.
- **Material notes:** say which US materials are not sold there, and name local equivalents by the shop's own codes.
- **Food safety:** the section follows the region's rules. The Benelux limits are about 130 times lower than the EU's
  since 2026.

## The plan, reviewed critically

Taking paid review out changes what can be promised. These are the weak points, and what covers each:

1. **Safety text without a human reviewer.** Accepted for version 1, on your call. What protects it:
   - the numbers gate (a changed figure or phone number cannot ship);
   - back-translation of the safety sections;
   - the notice that stays in the safety guides;
   - "Read the English" one click away;
   - short, plain English sentences in the source.

   The biggest dangers (emergency numbers, limits, cone temperatures) are data, not translated text.

2. **Irish and Maltese.** The weakest machine translation, and few people to correct it. They come last, with the
   plainest notice. Leaving them in English with region data only is also defensible; decide when wave 3 is done.
3. **Formal address where it sounds stiff.** The formal pronoun is almost unused in Swedish, Danish and Finnish
   software, and reads oddly there. The style sheets meet "formal" by avoiding the pronoun (impersonal phrasing) in
   those languages, and use Sie, vous, usted, Lei and their equivalents elsewhere. Polish uses impersonal forms rather
   than Pan/Pani, which would need the user's gender.
4. **A glossary without potters.** Terms come from suppliers' own catalogues, which is better than a dictionary but not
   as good as a potter. The "show English terms" setting and the GitHub form are the safety net. Corrections from
   native potters should be welcomed loudly in the notice and in the README.
5. **Seger cones need a current source.** Only a 2004 SK table was found. The Seger option stays off until a current
   maker's chart is found; until then those users choose Orton or temperature only.
6. **Search engines and machine translation.** Google accepts machine-translated pages when they are useful, and the
   per-language URLs, hreflang and the notice keep things honest. No noindex is planned; revisit if Search Console
   complains.
7. **Effort moves from money to engineering.** About 4–5 weeks of development before the first translation, then
   token-time per wave. Phases 1 and 2 are where the work is, and Phase 1 pays off in English even if translation
   stops there.
8. **One build, many languages.** Transloco keeps one build and one Docker image, so CI and deploys stay as they are.
   The browser tests run in three locales, not 24; a screenshot run in all 24 checks the layouts before each wave.

## After the EU: Asia, the Indian subcontinent and Africa

The EU plan is built so that later regions add languages and data, not a new approach. What they add:

- **Scale.** 60–80 languages in the end, which is why the library is a runtime one: one build, one file per language.
- **Language tags with scripts.** Chinese needs `zh-Hans` and `zh-Hant`, and Punjabi `pa-Guru` (India) and `pa-Arab`
  (Pakistan). URLs and settings use BCP 47 tags as they are. hreflang is mapped to the codes Google accepts (for
  example `zh-CN` and `zh-TW`), which needs checking against Google's current rules first.
- **Right-to-left.** Arabic (North Africa) and Urdu (Pakistan, India). `dir="rtl"` is set with `lang`, the layout
  mirrors through the logical properties added in Phase 1, and icons with a direction (arrows) flip.
- **Digits and calendars:** the two settings added above.
- **Fonts.** System fonts cover Chinese, Japanese, Korean, the Indic scripts (Windows' Nirmala UI) and Ethiopic
  (Ebrima) on current systems. Where they do not, a Noto font for that script loads only for that language.
  - Indic scripts need more line height.
  - Chinese, Japanese and Korean should not be set in synthesized italics.
  - Thai, Lao, Khmer and Burmese have no spaces between words, so line breaking relies on the browser's dictionaries;
    check them in the screenshot run.
- **Cones.** Japan, and much of East Asia, use SK cones made to the Japanese standard (JIS R 8101), so the Seger option
  becomes essential there. It needs a sourced SK chart, which the EU work was already waiting for.
- **Machine translation quality.** Strong for Chinese, Japanese and Korean, middling for the larger Indian languages,
  and weak for many African ones (Hausa, Yoruba, Igbo, Zulu, Amharic, Somali). Those get the plainest notice, as Irish
  and Maltese do.
- **Africa is often a region before it is a language.** Much of Africa reads French, English, Portuguese or Arabic. A
  potter in Senegal can use French with Senegal's region data as soon as the region exists. Swahili, Amharic and
  Hausa follow as languages.
- **Region data.** Many countries have no poison centre, and the data model already handles that: the emergency
  number, and a link to the health ministry. Emergency numbers vary (India 112, China 120 for an ambulance), so they
  are always data.
- **Reaching people.** Baidu does not use hreflang, and GitHub is unreliable from mainland China, so the correction
  link there also needs a route that works in China, such as an email address.
- **The language picker.** At 60–80 languages it becomes a searchable list grouped by region, each language in its own
  name, never flags.

What the EU work should do now so this is cheap later: the right-to-left groundwork and the any-script parser (Phase 1),
`intl-messageformat` for plurals, BCP 47 tags with room for scripts, and the region list as data rather than a fixed
set of EU countries.

## What stays the same

- English is the source and the fallback.
- Material names in recipes stay as they are, so saved recipes and comparisons work in every language.
- Recipes store plain numbers.
- Users' own notes, recipes and materials are never translated.
