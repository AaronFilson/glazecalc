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
| `amounts.js`     | Amounts as saved (`amountOf`, `plainNumber`), rescaling (`rebase`), grams to weigh         |
| `numbers.js`     | Typed numbers by decimal mark and locale (`parseNumber`, `toPlain`, `forTyping`)           |
| `temperature.js` | °C and °F, and a temperature in the reader's scale                                         |
| `limits.js`      | The figures the checks warn at, as data (`CHECK_LIMITS`, `FIRING`)                         |
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
- **The translations stay where they are.** The messages are not moved to a code-sourced scope as
  the chemistry's are; their 24 translations and fingerprints are untouched. The app keeps a typed
  table from code to key (`client/app/pages/recipe/recipe-messages.ts`), which TypeScript checks
  is complete and the keys manager reads, so `npm run check:i18n` still sees every key. The server
  reads the same JSON files to word a message (`server/test/recipe_tests.ts` does so in English).
- **The app's files are thin.** `checks.ts`, `pool.ts`, `suggest.ts`, `shelf.ts`, `lead.ts`,
  `rebase.ts` and `shared/format.ts` keep their exports and call the library, putting what it says
  into words. Their tests did not change, which is the check that nothing a potter sees did.
- **The first page loads only what it needs.** `shared/format.ts` and `shared/library-info.ts` are
  in the initial bundle, so they import `lib/recipe/numbers`, `temperature`, `amounts` and
  `library`, none of which needs the chemistry.

## For what comes next

- **Limit sets.** `limits.js` holds the app's own figures. Published sets (Hesselberth & Roy as
  the default, and others to choose from) belong beside them as `LIMIT_SETS`: per set, its source,
  and per firing band, a range for each oxide or ratio in the unity formula. One function, given a
  unity formula, a set and a band, returns a row per limit (`{ oxide, value, min, max }`) and
  cautions in the shape above; live warnings and the `check_limits` tool both call it.
- **Analysis.** A Stull chart point, LOI, expansion and mole percent are functions of the unity
  formula and analysis that `lib/chemistry` already works out; they go in `lib/recipe` as pure
  functions of a `UmfResult`, with no words.
- **Batches.** SG and water, and cost per batch, build on `batchWeights`; a blend generator on
  `rebase`; paste-in import on `parseNumber` and the library's `findNamed`-style lookup.
- New sentences get a code in `messages.js`, a key in the recipe messages, and a line in the app's
  table; the server test fails if a code has no English.

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
