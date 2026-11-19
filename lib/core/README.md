# The chemistry core

Glaze chemistry with no state, no tables and no words (docs/adr/0030-nameless-chemistry-core.md,
docs/adr/0031-functional-core.md). It works out unity formulas, fits and selects materials, checks a recipe
against limits and its cone, finds swaps, solves for a target, blends, and works out density, cost and slurry.
It knows no material by name and keeps nothing between calls: what it needs comes with each call.

## Importing

Import from an index, never a file inside the library (an ESLint rule holds Glazecalc to this):

| Index                             | What it has                                                                                                                                                                    |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `lib/core/index.ts`               | the host's shape, identities, problems, traits and record types; each area as a namespace (`chemistry`, `recipe`, `cones`), since a name such as `unityOf` is in more than one |
| `lib/core/chemistry/index.ts`     | unity formulas, fitting and selecting, oxides, lead, expansion                                                                                                                 |
| `lib/core/recipe/index.ts`        | everything about recipes                                                                                                                                                       |
| `lib/core/recipe/basics/index.ts` | a finer index: plain numbers, the record shape, amounts, a recipe's materials, density                                                                                         |
| `lib/core/cones/index.ts`         | firing blocks and the cone charts' order, bands and conversions                                                                                                                |

A CommonJS `require` of an index takes all of it into a bundle, so the finer indexes let a page take only what
it needs.

## The host argument

Every function that reads a table or a record takes a `Host` first (`host.ts`). The same host and the same
arguments always give the same answer, in any realm: a page, a worker, a test.

- **Readers** (all optional): `idOf`, `labelOf`, `keyOf` and `traitsOf`. A reader left out is the default: the
  record's own `id`, its identity as its label, its identity and chemistry as the same-material key, and its own
  `traits`.
- **Tables**: `oxides`, `cones`, `limits`, `stull`, `densities`, `expansion`.
- **Policy**: the markets each region's library also lists, and cone fit's margins and cut-offs.

The catalog (`lib/catalog`) has Glazecalc's tables; a host may bring its own.

## Records

A record is its identity and its chemistry (`types.ts`): a molar formula, a weight-percent analysis, or the
stored `{ fields, percentmole, loi }` shape. The core never reads a name. A host's records may carry anything
else, and the core passes back the records it was given.

## Ids and labels

An identity is a string or a number that the core only compares and passes back (`identity.ts`). A label is
what a result calls a record: by default its identity; Glazecalc's is the name. Swaps keep the ids beside the
labels as a property that is not enumerable (`IDS`).

## Codes as API

The core says what it found as a code and its values, never a sentence (`problem.ts`): a `Problem` (an `Error`
with `code` and `params`) when it cannot go on, and a `Warning` (`{ code, params }`) beside a result. The
values are numbers, oxides, flags and ids. The codes are the API: the catalog words every one of them in
English, and a test holds that none is left out.

## Units

- Oxide amounts are moles, a unity formula, or weight percent, as each type says.
- Temperatures are °C.
- Recipe amounts are the host's own, with a basis: percent, parts or grams.
- Densities are g/cm³.

## Runtime

ES modules in erasable TypeScript (ES2024, `strict`, no Node or DOM types), with no dependencies. It runs as it
is in Node 24, and in any bundler that strips types. Its own tests are in `test/` (`npm run test:core`), at 98%
of branches or more.
