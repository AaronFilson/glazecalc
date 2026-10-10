# Translating Glazecalc

Glazecalc is translated from English by AI (Claude), then checked by a second pass and by the automatic checks below
([the plan](../i18n-plan.md), Phase 3). Corrections from potters who read the language are welcome: see
[CONTRIBUTING.md](../../CONTRIBUTING.md). This page is for whoever translates, person or AI. Developers adding English
text read [translating.md](../translating.md) instead.

## What there is to translate

For a language with the code `<code>` (`de`, `fr`, `es`, `it`, `pl`, `pt-PT`), each English file has a translation
beside it with the same name but the code:

| English                                   | What it is                                                                             |
| ----------------------------------------- | -------------------------------------------------------------------------------------- |
| `client/public/i18n/en.json`              | The menu, page titles and the parts every page shares                                  |
| `client/public/i18n/<scope>/en.json`      | One part of the app each: `site`, `account`, `library`, `notebook`, `recipe`, `guides` |
| `client/public/i18n/server/en.json`       | The server's messages (errors, field checks), shown as plain text                      |
| `client/public/i18n/chemistry/en.json`    | The chemistry's errors and warnings, shown as plain text                               |
| `client/public/i18n/safety/en.json`       | The words of who to call in an emergency, shown as plain text                          |
| `client/public/i18n/regions/en.json`      | Notes in the region data (silica limits, food-contact rules, shops), as plain text     |
| `client/public/i18n/records/en.json`      | The standard materials' notes and hazards, and the advice page, shown as plain text    |
| `client/public/i18n/guides/<guide>/en.md` | The five guides, whole documents in Markdown                                           |
| `server/lib/account_mail.ts`              | The two emails about a password, in code                                               |

A translation file has the same keys as the English, nothing more. A message left out shows in English, so a file
can be translated in parts.

Each language has a style sheet and glossary in `docs/translations/<code>.md`. **Use its terms every time**: a potter
should meet one word for one thing across the app and the guides. The glossary was built from suppliers' catalogues and
potters' sources in the language, and records the false friends.

## Rules for every message

Messages are [ICU MessageFormat](https://formatjs.github.io/docs/core-concepts/icu-syntax).

- **Placeholders stay exactly as they are**: `{name}`, `{count}`. Move them where the language needs them; never
  translate their names.
- **Plural forms** are the language's own, from CLDR: German `one`, `other`; French, Spanish, Italian and Portuguese
  `one`, `many`, `other`; Polish `one`, `few`, `many`, `other`. Write every form the language has, even where two read
  the same. `=0 {…}` and `#` stay as the English has them.
- **Tags stay**, around the words that mean the same: `<settings>Settings</settings>` becomes
  `<settings>Einstellungen</settings>`. Never rename a tag or add one, with one exception: a message whose English has a
  tag may give the English for a key term after it, `Fritte<en>frit</en>`, which readers who ask for English terms see
  in brackets. Only in such messages, and only for the terms the glossary marks "show English".
- **The files `server`, `chemistry`, `safety`, `regions` and `records` are plain text**: no tags at all.
- **Apostrophes**: the typographic `’` is always safe, and the style sheet says which to use. A straight `'` is fine in
  text (`l'émail`) except just before `{`, `}` or `#`, where ICU reads it as a quote: write `''` there. (The `safety`,
  `regions` and `records` files write every straight apostrophe as `''`; either way shows one.) A literal brace is `'{'`.
- **Never translated**: oxide formulas (SiO₂, Al₂O₃, B₂O₃), cone numbers (06, 04, 6), mesh numbers, units (°C, °F, g,
  kg, %, ml, lb, oz), product and trade names (Ferro 3134, Gerstley borate, Custer, Orton, Skutt), the name Glazecalc,
  web addresses, and anything a person typed. An EU directive or regulation takes its official form in the language
  (84/500/CEE in French, Italian, Spanish and Portuguese, 84/500/EWG in German, 84/500/EWG in Polish).
- **Numbers keep their digits** and are written the language's way: `1,5` for 1.5 in every language here, thousands
  with the language's separator or none (`1222 °C`). A number in the English is a number in the translation, never a
  word, and the same unit follows it. A unit symbol keeps its symbol: 100 g stays `100 g`, never `100 Gramm`. Inches
  and feet are the exception: write the language's word for them (Zoll, pouces, pollici, cale, polegadas, pulgadas;
  Fuß, pieds, piedi, stopy, pés, pies), the same in every file, with the metric figure in brackets as the English gives
  it.
- **Formal address**, as each style sheet says: Sie, vous, usted, Lei. Polish and Portuguese use the forms their style
  sheet gives. Buttons and menu items follow the language's software conventions (often the infinitive).
- **Safety text says exactly what the English says**, no softer and no stronger: "may contain some fine quartz"
  is not "a little fine quartz", "should" is not "must", and every "never", "unless" and "at least" stays.
- **Keep it plain.** The English is short sentences in plain words; the translation should be the same, natural to a
  potter in that country, not word for word.

## Rules for the guides

The guides are Markdown with a few marks of their own (the table in [translating.md](../translating.md#guides)
describes them all). Translate the words, and keep everything else:

- **Front matter**: translate the values of `title:` and `lead:`, not the names.
- **Headings** keep their `{#id}` exactly: `## Cones: what they measure {#cones}` becomes
  `## Kegel: was sie messen {#cones}`.
- **`{{2232 °F; 1222 °C}}` and `{{SG 1.45}}` stay exactly as written**, dots and all: the page writes them in the
  reader's scale and number style. Translate the words around them.
- **`{{en: term}}`** after a key term gives its English to readers who ask for English terms:
  `die Fritte{{en: frit}}`. Add one at the first use of each glossary term marked "show English" in each section.
- **`:::orton`, `:::temperature`, `:::`, `::poison-lines`, `::shops`, `::local-equivalents`, `::silica-limit` and
  `::food-limits`** lines stay as they are, where they are.
- **Tables** keep their rows and columns, and `Table:` and `Label:` lines keep their names (translate what follows).
  `---:` alignment stays.
- **Callouts**: `> [!NOTE]` and `> [!WARNING]` stay in English; translate the text after them.
- **Definition lists** (the glossary in glazing-basics): a term line, then lines starting `: `. Keep the shape. The
  term may give its English in brackets after the translated term where the glossary does.
- **Links**: keep the address; translate the link text. Links within the app (`/guides/firing#cones`) stay as they
  are: the app adds the language.
- **Quotations** from a source are translated, in the language's quotation marks, and keep their figures exactly as
  the English writes them (Orton's "usually less than 40° F" keeps `40° F`).
- **Sources** at the end: titles of works stay in their own language; translate only the app's words around them.
- **Lists and paragraphs** keep their number: one paragraph in English is one in the translation, one list item one
  item. Never merge or split them.
- Run `npx prettier --write` on the file when done.

## Checks

`npm run check:i18n` must pass. For each translation it checks:

- the keys are the English's; placeholders, tags and plural forms are right;
- **the numbers, with their units, and the links are the English's**, numbers read the language's way;
- each guide keeps the English's section ids, `{{…}}` values and marks, and in every section the same structure:
  headings, tables (columns and rows), lists (items), callouts and captions;
- every translation is fingerprinted with the English it was made from (`npm run i18n:sources` does it).

`node scripts/i18n-check.mjs --language de` checks one language's translations only, leaving their fingerprints for
`npm run i18n:sources` once the translation is done.

When the English changes, `npm run i18n:sources` takes out the translations made from the old English, so the page
shows the English until they are translated again. A guide section waiting for its translation is the English, with
`lang=en` in its heading's braces (`{#cones lang=en}`); translate it and take the `lang=en` out. Then run
`npm run i18n:sources` again to record that the translation is current. `npm run check:i18n` says, language by
language, how many messages and guide sections are still in English.
