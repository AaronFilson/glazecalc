# 19. The recipe tools are shared by the app and the server, and speak in codes

Accepted, 2026-10-16. Item 6 of [the integrations plan](../integrations-plan.md), ahead of the
public MCP tools (its Phase 2), which call these from the server.

## Context

[ADR 4](0004-shared-chemistry.md) put the arithmetic (unity formulas, fitting amounts) in
`lib/chemistry/`. What the app does with it stayed in the recipe page's code: the limit checks,
substitutions, matching with the materials on hand, replacing lead, scaling amounts, reading typed
numbers and writing temperatures. Those files called Transloco's `translate()` as they went, so
they ran only in the browser, and their results were English (or German) sentences. The MCP
tools (`check_limits`, `suggest_substitutes`, `convert_cone_temperature`) and the next features
(live limit warnings, cost per batch, a blend generator, paste-in import) need the same answers
on the server, in the language the caller asks for.

## Decision

The recipe tools move to `lib/recipe/`, beside the chemistry and in the same form: CommonJS that
Node and the Angular build both load, typed by hand-written declarations, one per module.

| Module           | What it does                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------ |
| `amounts.js`     | Amounts as saved (`amountOf`, `totalOf`), rescaling (`rebase`), grams to weigh             |
| `numbers.js`     | Saved and typed numbers (`plainNumber`, `parseNumber`, `toPlain`, `forTyping`)             |
| `temperature.js` | °C and °F, and a temperature in the reader's scale                                         |
| `limits.js`      | The figures the checks warn at, as data (`CHECK_LIMITS`, `FIRING`), and limit sets         |
| `checks.js`      | `pastLimits` and `sizeNotes`: cautions for a recipe                                        |
| `library.js`     | `hasLead`, `inRegion`, `suggestable`: what the library says, without the chemistry         |
| `materials.js`   | Oxide percents, how alike two materials are, a frit's role, a recipe's moles and expansion |
| `swaps.js`       | `modernMaterials`: discontinued materials swapped for their substitutes                    |
| `pool.js`        | A selection's explanation and the recipe it makes                                          |
| `suggest.js`     | `planSuggestion` and `suggestAmounts`                                                      |
| `shelf.js`       | `matchFromShelf`                                                                           |
| `lead.js`        | `leadFreeBases`, `replaceLead`, `leadIn`                                                   |
| `messages.js`    | Message codes, figures, and writing them for a locale                                      |

- **They return codes, not words.** A sentence is `{ code, params }`, where the code is its key in
  the app's recipe messages (`client/public/i18n/recipe/<lang>.json`: `checks.alkali` is the app's
  `recipe.checks.alkali`). A caution is the check that raised it (`'alkali'`, `'clay-low'`) and its
  sentences in order. A number in a message is a figure, `{ value, places }`, so each reader's
  locale writes it (0,30 in German) while a program still gets the number.
- **A caution is data as well as sentences.** Beside `check` and `sentences` it has `severity`
  (`'likely'` past the published ceiling, `'caution'` past the app's limit, `'note'`), and where the
  check measures something, `quantity` (`'B2O3'`, `'K2O+Na2O'`, `'SiO2:Al2O3'`,
  `'raw-clay-percent'`, `'expansion'`...), its `value`, the `limit` where a caution starts and the
  `direction` past it (`'above'` or `'below'`); one about a material names it in `material`. A
  program need not read the codes.
- **A tool that cannot do what it was asked throws a `RecipeError`,** whose `message` is a code and
  which carries `code` and `params` as a sentence does: `matchFromShelf` with nothing on hand
  throws `'shelf.empty'`. The app words it (`shelf.ts`); the server or an MCP tool can return the
  code or word it in the caller's language.
- **The translations stay where they are.** The messages are not moved to a code-sourced scope as
  the chemistry's are; their 24 translations and fingerprints are untouched. The app keeps a typed
  table from code to key (`client/app/pages/recipe/recipe-messages.ts`), which TypeScript checks
  is complete and the keys manager reads, so `npm run check:i18n` still sees every key. The server
  reads the same JSON files to word a message (`server/test/recipe_tests.ts` does so in English).
- **The app's files are thin.** `checks.ts`, `pool.ts`, `suggest.ts`, `shelf.ts`, `lead.ts`,
  `rebase.ts` and `shared/format.ts` keep their exports and call the library, putting what it says
  into words. Their tests did not change, which is the check that nothing a potter sees did.
- **The app imports each module, never the barrel.** `lib/recipe/index.js` is CommonJS, which
  esbuild cannot tree-shake: importing it pulls in every module, and the chemistry with them,
  wherever it is imported. So the app's files import the module they use (`lib/recipe/amounts`,
  `lib/recipe/checks`...); `index.js` is for the server and its tests. The initial bundle has
  only `library` (in `shared/library-info.ts`), `numbers` and `temperature` (in
  `shared/format.ts`), about 3.5 kB, none of which needs the chemistry. `amounts` and `materials`
  are a small shared chunk; the rest of `lib/recipe` is in the recipe page's chunk, and
  `lib/chemistry` in its own chunk, loaded with the pages that use it.

## For what comes next

- **Limit sets.** The limits on the unity formula that depend on the firing are a limit set
  (`LimitSet` in `limits.d.ts`): `id`, `name`, `source` (`{ title, url }`, for the link shown with
  the warnings), `bands` coolest first (`{ band, belowC }`, the last with no `belowC`), the band
  used when the firing is unknown (`whenUnknown`), and `unity[band][oxide]`, a range
  `{ min, max, minLikely, maxLikely }` in moles for each oxide or sum (`'B2O3'`, `'Al2O3'`,
  `'K2O+Na2O'`, `'SiO2'`...). Bands are `'low'` (cone 06-02), `'mid'` (cone 4-6) and `'high'`
  (cone 9-11); `bandOf(set, celsius)` finds a firing's band. The app's own set,
  `GLAZECALC_LIMITS`, has only low and mid, so cone 10 is checked as mid fire, as before. It is
  built from `CHECK_LIMITS`, which keeps the figures that are not ranges on the unity formula
  (clay and whiting shares, expansion, boron blue, the size notes). `pastLimits` takes the set as
  `input.limitSet`, the app's own by default, and reads boron, alumina, soda and potash and
  magnesia from it for the firing's band. Published sets (Hesselberth & Roy as the default, and
  others to choose from) go in `LIMIT_SETS` beside it, with their figures as published; none is
  there yet. Before a set with a high band is used, the boron caution needs cone 10 words (it uses
  the mid-fire sentences, which name cone 6, for any band above low), and magnesia is checked only
  in a low band because its sentence says it does not melt at cone 06-04. One more function, given
  a unity formula, a set and a band, returns a row per limit (`{ oxide, value, min, max }`); live
  warnings and the `check_limits` tool call it and `pastLimits`.
- **Analysis.** A Stull chart point, LOI, expansion and mole percent are functions of the unity
  formula and analysis that `lib/chemistry` already works out; they go in `lib/recipe` as pure
  functions of a `UmfResult`, with no words.
- **Batches.** SG and water, and cost per batch, build on `batchWeights`; a blend generator on
  `rebase`; paste-in import on `parseNumber` and the library's `findNamed`-style lookup.
- New sentences get a code in `messages.js` and in the `RecipeMessageCode` union in
  `messages.d.ts`, a key in the recipe messages, and a line in the app's table. Each is checked:
  the server test fails if a code has no English or the union and `CODES` differ, and TypeScript
  if the app's table misses a code.

## Alternatives

- **TypeScript in `lib/`:** better types, but Node needs `.ts` in imports and the Angular build
  does not take them without changing its compiler options; the chemistry's form is proven.
- **English in the library, as the chemistry's messages are:** the server would get words for
  free, but the recipe messages and their translations would have to move to a new scope.
- **Leave the client alone and write server copies:** two versions of each check to keep in step.

## Consequences

- The server, the MCP tools and later features run the same checks and substitutions as the app.
- The declarations are written by hand and must be kept in step with the code, as the chemistry's
  are; the server's type check and the app's build catch most drift.
- A caller that wants words needs the recipe messages for its language and an ICU formatter.
