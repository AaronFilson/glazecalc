# 13. Translations: Transloco with ICU messages, the language in the URL

Accepted, 2026-10-08. Follows the plan in [docs/i18n-plan.md](../i18n-plan.md).

## Context

Glazecalc is to be translated into the EU's 24 official languages, then into languages of Asia,
the Indian subcontinent and Africa: 60 to 80 in all, several of them right to left. The owner
chose a runtime library over Angular's built-in i18n. Angular's own system builds one copy of
the app per language, so 80 languages would mean 80 builds in the Docker image. Phase 1 already
writes numbers, dates and lists through `Intl`, as the reader's language and region write them.

Before converting the app, a trial had to show four things work together: messages in a
zoneless app built on signals; ICU plurals for hard cases; the language taken from the URL; and
a right-to-left page with its layout mirrored.

## Decision

**Transloco 8.4** (`@jsverse/transloco`), with messages in **ICU MessageFormat run by FormatJS's
`intl-messageformat`**, through a transpiler of our own (`client/app/i18n/icu-transpiler.ts`).
Transloco's own ICU plugin is built on `@messageformat/core`, which has had no release since
October 2024. `intl-messageformat` is the most used ICU implementation, with CLDR's plural rules
for every language.

- **Plural forms follow the page's language. Numbers inside a message follow Settings.** The
  transpiler gives `intl-messageformat` its own formatters: plural rules for the page's
  language, and number and date formats in the reader's chosen format (`shared/format.ts`). A
  Czech page picks Czech's form for 1,5 litru, and writes "1.5" for a potter who chose a decimal
  point.
- **Messages are never HTML.** A link or emphasis in a sentence is a tag:
  `Lead is off in <settings>Settings</settings>.`. The transpiler keeps tags, marking their
  edges with private-use characters. `gc-rich` (`i18n/rich-text.ts`) then turns them into
  router links, web links, buttons or emphasis. Whole sentences translate with their links in
  place, and text a potter typed, such as a material called `<b>`, stays text.
- **English keeps the plain paths, and other languages live under a path of their own:**
  `/recipe` and `/de/recipe`. This departs from the plan, which put English under `/en/` as
  well. Keeping the plain paths for English means every link made before translations still
  works: in emails, bookmarks and other sites. English is also the `x-default` for search
  engines.
- **The router's base is the language's path** (`APP_BASE_HREF` is `/de/`). So every
  `routerLink="/recipe"` in the app stays as written and opens `/de/recipe`.
- **A page's language is fixed while it is open.** Changing language opens the same page under
  the other path, which the owner accepted.
- **Messages are grouped by part of the app** (Transloco scopes): `en.json` for the menu and
  shared parts, then `recipe/en.json` and so on. Each route lists its scope with
  `provideTranslocoScope` and loads it before it opens (`scopeTranslations`). So every message,
  in templates and in code (`translate()`), is there from the first draw.
- **A missing message:**
  - A key with no English stops the page while developing and in tests (`i18n/missing.ts`).
  - In other languages, a message not yet translated shows the English.
  - The keys manager finds keys used but missing, and keys present but unused, in CI.
- **Pseudo-locales, made from the English in the browser** (`i18n/pseudo.ts`):
  - `en-XA` accents and lengthens every message, so text not marked for translation stands
    out.
  - `ar-XB` sets every message right to left, on a mirrored page.
  - Both are code loaded only when used.
- **The languages** are listed in `lib/regions/languages.js`, shared with the server. A language
  is offered once its files are complete (`live`).
- **Guides are whole documents**, one Markdown file per language. Whole documents translate
  better than scattered keys. `marked` reads them into tokens, and Angular's templates draw
  those tokens, so no Markdown becomes HTML. Values that change with the reader are tokens:
  temperatures in both scales, as the sources give them (`{{2232 °F; 1222 °C}}`), and glaze
  densities (`{{SG 1.45}}`). Parts for one way of firing are fenced (`:::orton`).
- **Words that live in data or code are keyed by code or by their English.** The server's and
  the chemistry's messages keep their English in code with a code each. Words in data (the
  standard records' notes and hazards, who to call) are keyed by a slug and hash of their English
  (`textKey`). So a translation shows only for exactly the English it was made from: a changed
  hazard shows in English until it is translated again. `npm run i18n:sources` writes all of that
  English for translators, and CI checks it is current.

## The trial

All four held, with tests that stay in the suite:

| Question                                 | Result                                                                                                                                                                                                                                  | Test                               |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| Messages in a zoneless, signal-based app | `*transloco` and `translate()` update as signals change, with no zone.js                                                                                                                                                                | `client/app/i18n/i18n.spec.ts`     |
| ICU plurals                              | Czech gives 1 litr, 3 litry, 1,5 litru, 5 litrů. Arabic has all six forms (zero, one, two, few, many, other), with Arabic digits where its format uses them                                                                             | `i18n.spec.ts`                     |
| The language from the URL                | `/de/example` loads the German messages of its own part of the app before it opens, and its links stay under `/de/`                                                                                                                     | `i18n.spec.ts`, `e2e/i18n.spec.js` |
| A right-to-left page                     | `/ar/guides` has `lang="ar" dir="rtl"`. The menu is mirrored (the name of the app on the right, the account links on the left), and links stay under `/ar/`. The Arabic messages come from a test file, since Arabic is not offered yet | `e2e/i18n.spec.js`                 |

Phase 1's logical CSS (margin-inline-start and the like) is what made the mirrored layout work
without changes to the stylesheets.

## Alternatives

- **Angular's built-in i18n** (`@angular/localize`): messages are compiled into each build,
  with no runtime cost. But it means one build and one copy of the app per language, which is
  80 copies later on.
- **ngx-translate**: the most installed runtime library, and the one older codebases use.
  Transloco has scopes, a keys manager that can fail CI, and signal APIs, and it is the one
  current job postings name (see the plan).
- **Transloco's own ICU plugin**: built on `@messageformat/core`, with no release since
  October 2024.
- **`/en/` for English**: consistent, but it breaks every existing link, and all of them would
  need a redirect.

## Consequences

- **The first load is about 64 kB larger before compression, 18 kB over the network.** FormatJS
  is 43 kB, most of it the ICU parser; Transloco is 20 kB. The initial bundle budget goes from
  600 kB to 650 kB. Compiling messages ahead of time would drop the parser, but translators and
  reviewers would then work on syntax trees instead of text.
- **Every piece of text in the interface becomes a key with its English in a JSON file.**
  Components wrap their templates in `*transloco="let t; prefix: 'recipe'"`; code uses
  `translate('recipe.key')`.
- **Messages are remembered per language while a component is on the page.** A number written
  by a message itself (`#` in a plural) keeps the old format until the page is next opened
  after a change in Settings. Messages that show measured amounts take them already written by
  `shared/format.ts`, so they always follow Settings.
- **The server writes each page's `lang`, `dir` and language links**, since the HTML it sends
  is the same app for every language.
- **Pages in a language not yet offered can still be opened by URL**, and are marked
  `noindex`.

## Later decisions (Phase 3, 2026-10-09)

- **Each translation records the English it was made from.** `client/i18n-fingerprints/<language>.json`
  holds a fingerprint of the English of every translated message and guide section.
  `npm run i18n:sources` takes out a translation whose English has since changed (a guide
  section becomes the English, marked `lang=en`, with a note), so a page never shows a
  translation of words the English no longer says; `--keep` keeps translations through a change
  that leaves the meaning as it was. The served files stay plain JSON and Markdown that a
  contributor can edit, and the browser does no extra work. Messages keyed by their English
  (the standard records, who to call) need no fingerprint: new English is a new key.
- **Plural rules and the names of regions follow the page's own language**, where it has its
  own rules (`textLanguage`): European Portuguese counts 0 as plural, unlike Brazil's
  Portuguese. Number formats still add the reader's region to the bare language.
- **A message names a kind of record by a code** that each language words in its own phrase
  (ICU `select`), never by an English word put into the sentence, since German and French need
  gender and case to agree.
