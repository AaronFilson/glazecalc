# Famous glazes

A public page for each famous glaze, such as `/famous-glazes/iznik` (and `/de/famous-glazes/iznik` in each live
language), so that people who search for the glaze find its recipe or historic analysis and can make it from the
materials sold where they live. Each page starts from the glaze's **native** materials, the traditional local ones.
**Nothing is published until the glaze's materials and claims are sourced.**

## Data

There is one file per glaze, `data/famous-glazes/<slug>.json`. It is read and checked by `lib/famous-glazes.js`,
whose types are in `lib/famous-glazes.d.ts`.

| Field                                   | What                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `slug`, `published`                     | The address part, and the owner's flag. The flag alone publishes nothing (see the bar).                                                                                                                                                                                                                                                                                                                                                                                                         |
| `names`, `native`                       | The usual name per language (`{ en, ja, tr, … }`), and the name in its own script with its language (`志野`, `ja`).                                                                                                                                                                                                                                                                                                                                                                             |
| `origin`, `period`, `summary`, `safety` | Prose, as `{ en, … }` per language. A missing language shows the English, marked `lang="en"`.                                                                                                                                                                                                                                                                                                                                                                                                   |
| `firing`                                | `cone` and/or `celsius` (a number or `[from, to]`), `atmosphere` (one of `ATMOSPHERES`), an optional `note`, and `sources`.                                                                                                                                                                                                                                                                                                                                                                     |
| `recipe`                                | `lines` and `additives` as `{ material, amount }`. A material is named from the standard library (`data/materials.ndjson`, `data/additives.ndjson`, by name or alias) **only**: the owner's decision is that there is no separate materials set. Native materials that are no longer sold go into the library as `historical`, with notes on how they were mined or made, and a glaze whose native materials are not there yet cannot be published. The recipe also has a `note` and `sources`. |
| `analysis`                              | A historic analysis, `{ oxides: { SiO2: 46, … } (weight %), note, sources }`.                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `history`, `leadFree`                   | For a lead glaze: history only, with a lead-free version. `leadFree` has `tested` (true or false), `note`, `celsius`, `additives` and `prefer` (the proposal's own materials).                                                                                                                                                                                                                                                                                                                  |
| `sources`                               | Full citations: `{ id, citation, url or isbn, opened: YYYY-MM-DD }`.                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `gaps`                                  | What blocks publication. `openQuestions` holds things that do not block it.                                                                                                                                                                                                                                                                                                                                                                                                                     |

Sourcing notes and downloads stay in the working folder (`scratch/round14/famous-glazes/sources.md`). Only the
claims a page makes, and their citations, go into the data file.

## The publish bar (`publishProblems`)

A glaze is on the site only when it is `published: true`, it is not the fixture, and it meets every one of these:

- at least **3 sources** with a citation, an address or ISBN, and the date they were actually **opened**
  (search snippets never count);
- every source the file cites is listed, and every material is in the standard library;
- a firing (a temperature or cone, and an atmosphere) that cites a source, and a recipe or analysis that cites one;
- origin, period, summary and safety in English;
- **no open `gaps`**;
- **lead** (owner's decision): a glaze whose recipe or analysis has PbO is shown as `history` only. It has no
  mixable recipe, only its analysis, and it must carry a `leadFree` version that says whether it was `tested`. While
  `tested` is false, the page labels that version **"Calculated, not yet test-fired."** and tells the reader to fire
  test tiles before using it (owner's decision).

`scripts/famous-glazes.mjs` (run by `npm run build`, `watch` and `dev`) writes the published glazes, with every
material resolved to its full record, to one file per language, `dist/i18n-generated/famous-glazes/<language>.json`,
served as `/i18n/famous-glazes/<language>.json`. Each file keeps every piece of the glazes' prose in English and that
language only (`glazeIn`), so the page shows the language's words or the English, marked as such. A page loads the
file of its own language (`PAGE_LANGUAGE`), and the prerender reads it the same way. Every prerendered page carries
the file it loads, so one file with all the languages made the pages too big for the prerender's limit. The script
**stops the build** if a glaze is marked published but fails the bar.

## Pages and addresses

- `/famous-glazes/<slug>`: one page per published glaze. Any other slug is the not-found page with status 404.
  The client's route has a `canMatch`, and the server's `isPage` follows `lib/pages.js FAMOUS_GLAZE_PAGES`.
- `/famous-glazes`: the index. **It is hidden (404) until at least one glaze is published.** Once one is, it lists
  them and says more are coming.
- Both are in `PUBLIC_PAGES` only while published, so they are prerendered, listed in the sitemap with hreflang, and
  given a lastmod (`lib/page-dates.js`: the `famous` scope, the glaze's file and the library) only then.
- Titles stay **short** (owner's decision): "İznik glaze - Glazecalc" and "Famous glazes - Glazecalc". The search
  terms go in the description, the headings and the native name.

## The glaze page

1. **About.** The summary, the native name (marked with its `lang`), where, when, and the firing.
2. **The traditional recipe**, with its unity formula and the recipe page's limits panel (`gc-recipe-limits`). For a
   lead glaze this section is replaced by the **historic analysis** and a "history only" notice.
3. **With your local materials** (the lead-free version, for a lead glaze). The target is the native recipe's unity
   formula. For a lead glaze it is the analysis with the colorants' oxides left out and the lead's share of the fluxes
   handed to other fluxes, with boron by Katz's rule for the version's firing (`leadFreeTarget`). The reader's region
   comes from Settings (`regionFor(region).library`) or the library filter, and can be changed on the page. The
   offered materials are the standard library's base materials sold there that are not lead, not soluble and still
   current (`suggestable`). The solver is the same one Target & Solve uses (`lib/recipe/solve.js solveTarget`). The
   recipe's colorants are kept as additives. With no region chosen, a lead-free version uses its proposal's own
   materials (`prefer`). The standard materials are loaded in the browser only, so the build's render leaves the
   version out.
4. **Try it.** The main button opens the recipe (or the lead-free version) on the recipe page, starting a trial
   first for a visitor, as a material page does. Below it is sign-up with `?next=` back to this page.
5. **Safety**, with links to the guides, and **Sources**, each with the date it was read.

## i18n and SEO

The English strings are in the `famous` scope (`client/public/i18n/famous/en.json`). The title and description
keys are in `en.json` (`titles.famousGlaze(s)`, `meta.famousGlaze(s)`). A glaze's own prose is in its data file,
per language. A page is offered to search engines in a language (`famousTranslatedIn`, used by `englishOnlyIn`)
only when that language has the whole scope translated **and** the glaze's prose. Otherwise the language's copy is
still prerendered for readers, shows a notice, names the English as canonical and is noindex. Translations follow
docs/translations/process: commit them before running `npm run i18n:sources`. The scope has not been translated
yet, so for now the pages are indexed in English only.

## Tests

- **Server** (`server/test/famous_glazes_tests.ts`): every file is sound. Published glazes meet the bar, and the
  build refuses a failing one. The drafts stay off the site. The fixture is never published. The lead rules hold,
  including `tested`. Materials resolve. Pages exist only while published, unpublished addresses get 404 and stay
  out of the sitemap, the hreflang and canonical rules apply, and page dates are set.
- **Client** (`famous-glazes.spec.ts`): the unity formula, the regional solve, the lead-free target (no PbO, no
  SnO2, with boron), opening the recipe, the route, the page (recipe, limits, sources, sign-up `next`, the history
  notice, the "not yet test-fired" label) and the index.
- **e2e** (`e2e/famous-glazes.spec.js`): the published İznik page renders, with its label and its lead-free
  version. An unpublished glaze, the fixture and an unknown slug get 404. The fixture page renders from a stubbed
  `en.json`.
- **Fixture**: `data/famous-glazes/fixtures/fixture-celadon.json` meets the bar with library materials. It is for
  tests only and is never published (`fixture: true`).
