# Writing text the app can translate

Every piece of text the app shows comes from a messages file, so it can be translated
([ADR 13](adr/0013-translations.md)). This page says how to add or change text. The English
is the source: translations are made from it (see [the plan](i18n-plan.md)).

## Where messages live

| File                                      | What is in it                                                                                                |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `client/public/i18n/en.json`              | Text on every page: the menu, page titles, shared parts (lists, forms, buttons, field checks)                |
| `client/public/i18n/<scope>/en.json`      | One part of the app: `site`, `account`, `library`, `notebook`, `recipe`, `guides`                            |
| `client/public/i18n/server/en.json`       | The server's messages, written from `server/lib/messages.ts` by `npm run i18n:sources`                       |
| `client/public/i18n/chemistry/en.json`    | The chemistry library's errors and warnings, written from `lib/chemistry/messages.js` likewise               |
| `client/public/i18n/safety/en.json`       | The words of who to call (`lib/regions/safety.js`), each under a key made from its English, written likewise |
| `client/public/i18n/regions/en.json`      | Likewise the words of the other region data: silica limits, food-contact rules and shops (`lib/regions`)     |
| `client/public/i18n/records/en.json`      | Likewise the standard records' words (`data/`): materials' and additives' notes and hazards, the advice      |
| `client/public/i18n/guides/<guide>/en.md` | Each guide, a whole document in Markdown                                                                     |

A route names the scope it needs (`providers: [provideTranslocoScope('recipe')]` in
`app.routes.ts`), and its messages load before it opens. A new scope also goes in
`client/app/testing/i18n.ts`, so component tests have it. A group of keys in `en.json` must not
share a name with a scope.

## Keys

- **Always the full key**, in templates and in code: `t('recipe.print.title')`,
  `translate('recipe.checks.noFlux')`. The key is the file's path to the message, with the scope
  first.
- **Named for what the text is for**, in camelCase, grouped by component or section:
  `recipe.compare.heading`, not `recipe.compareTwoRecipesText`.
- **Changing the English of a key** sends it back to be translated: run `npm run i18n:sources`,
  which takes out every translation made from the old English, so those pages show the English
  until it is translated again ([translations/README.md](translations/README.md)). A change that
  keeps the meaning (a typo, plainer wording) can keep its translations:
  `npm run i18n:sources -- --keep recipe:page.itTakenOut` (a guide section:
  `--keep guides/firing:bisque`). Change the key too when the meaning changes.

## In templates

Wrap the template in the structural directive, and import `TranslocoDirective`:

```html
<ng-container *transloco="let t">
  <h2>{{ t('recipe.library.heading') }}</h2>
  <button type="button" [attr.aria-label]="t('recipe.removeLine', { name: line.name })">...</button>
</ng-container>
```

Attributes people read are messages too: `aria-label`, `title`, `placeholder` and `alt`.

## In code

```ts
import { translate } from '@jsverse/transloco';
this.notices.success(translate('library.saved', { name }));
```

A label kept in data, such as an option list, is a key wrapped in `marker()` so the keys
manager finds it, and is translated where it is shown:

```ts
import { marker } from '@jsverse/transloco-keys-manager/marker';
const PALETTES = [{ value: 'tenmoku', label: marker('palettes.tenmoku') }];
// template: {{ t(palette.label) }}
```

## Writing messages

Messages are [ICU MessageFormat](https://formatjs.github.io/docs/core-concepts/icu-syntax).

- **Whole sentences.** Never build a sentence from pieces, because other languages order them
  differently. One message holds the whole sentence with placeholders: `"Removed {name}."`
- **Placeholders** are named for what they hold: `{name}`, `{count}`, `{date}`.
- **Measured numbers** (amounts, weights, temperatures) are written by `shared/format.ts`
  before they go in, so they follow Settings: `{ amount: fixed(total, 2) }`. **Counts** go in as
  numbers, for plural forms: `"{count, plural, one {# recipe} other {# recipes}}"`.
- **Lists** are joined by `listOf()` before they go in: "potash, soda and alumina" is joined
  differently in each language.
- **Links and emphasis inside a sentence** are tags, shown with `gc-rich`:

  ```html
  <gc-rich [text]="t('recipe.leadOff')" [links]="{ settings: '/settings' }" />
  ```

  with `"leadOff": "Lead is off in <settings>Settings</settings>."`. A tag named in `links` is a
  link: a path in the app, a web address, or a function for a button. `<b>`, `<em>` and `<code>`
  are emphasis. A message is never HTML.

- **Apostrophes** need nothing: `"Don't"` is fine. A literal brace is quoted: `'{'`.
- **Not translated:** material and product names, oxide formulas, units (g, %, °C) and what
  people typed. Give formulas `translate="no"`, so browser translation leaves them alone too.

## Guides

A guide is a Markdown file per language: `client/public/i18n/guides/firing/de.md` beside
`en.md`. A language without its own shows the English, with a note saying so. Whole documents
translate better than scattered keys. The page draws the Markdown with Angular's templates
(`pages/guides/guide-document.ts` and `guide-view.ts`), never as HTML. Beyond GitHub's
Markdown:

| Write                                                                    | For                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `title:` and `lead:` between `---` lines, at the top                     | The page's title and the line under it                                                                                                                                                                                   |
| `## Cones {#cones}`                                                      | A section, with the id that links and the contents list use; keep the id                                                                                                                                                 |
| `Table: caption`, then `Label: short name`, before a table               | The caption, and a shorter name for its scrolling box if needed                                                                                                                                                          |
| `---:` under a column's heading                                          | A column of numbers                                                                                                                                                                                                      |
| `> [!NOTE]` or `> [!WARNING]` starting a quote                           | A callout, or a warning                                                                                                                                                                                                  |
| A term, then a line starting `: `                                        | A definition, as in the glossary                                                                                                                                                                                         |
| `{{2232 °F; 1222 °C}}`                                                   | A temperature, rate or difference in both scales, as the source gives them. The reader sees their scale first and the other in brackets, with numbers written their way. Translate the words around it, never inside it. |
| `:::orton` … `:::` and `:::temperature` … `:::`, with blank lines around | Parts only for those who fire to cones, or by temperature (Settings). The page offers the other version.                                                                                                                 |
| `::poison-lines`                                                         | Who to call, for the reader's region                                                                                                                                                                                     |
| `::shops`                                                                | Shops that sell glaze materials, for the reader's region                                                                                                                                                                 |
| `::local-equivalents`                                                    | The closest materials sold in the reader's region to those sold elsewhere                                                                                                                                                |
| `::silica-limit`                                                         | The workplace limit for silica dust, for the reader's region                                                                                                                                                             |
| `::food-limits`                                                          | The limits on lead and cadmium from glazed ware, for the reader's region                                                                                                                                                 |

A quotation keeps its temperatures as the source wrote them, not as `{{…}}`.

## Checks

- `npm run check:i18n` fails on a key used with no English, or English no key uses. It also
  checks each translation against the English: the same placeholders and tags, the plural
  forms its language needs, the same numbers (with their units) and links, each guide section's
  structure, and that each was made from the English as it is now. It counts, per language, what
  is still in English. CI runs it.
- The browser tests open every page in each language offered at a phone's width
  (`e2e/languages.spec.js`), so a word too long for its place shows.
- Component tests load every English file (`testing/i18n.ts`). A key with no English stops the
  test, and stops the page while developing.
- `/en-XA/` shows any page with every message accented and lengthened: text left unmarked stays
  plain, and a layout that cannot take longer words shows it. `/ar-XB/` shows it right to left.
