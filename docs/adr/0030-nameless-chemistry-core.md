# 30. A nameless chemistry core, with names and words outside it

Accepted, 2026-11-15 (proposed 2026-11-14). Its readers come with each call since ADR 31.

## Context

The chemistry in `lib/chemistry`, `lib/recipe` and `lib/cones` is to become a library shared with Glaze Vault, as a
git submodule (see `reports/Chemistry library review.md`, the plan). Today it knows material names and writes
English:

- Rules branch on names: density classes keyed by name (`lib/recipe/density.js`), Replace lead's fallback to
  `'China Clay'` and `'Silica'` (`lib/recipe/lead.js`), whiting and dolomite recognized by
  `/^(whiting|dolomite)$/i` (`lib/recipe/checks.js`), built-in formula materials with names and aliases
  (`lib/chemistry/materials.js`).
- It finds materials by name: `calculateUMF` takes `material: 'Silica'`, `normalizeName` keys the library on a
  Unicode form of the name and refuses empty or duplicate names, `generic-names.js` maps words such as "kaolin" to
  names to offer, and `paste.js` reads names from text.
- It returns English beside its codes: `warnings` next to `warningCodes`, and `say(...)` in the checks.

So identity and meaning hang on strings a person typed. Two records under two names are two materials even when their
chemistry is the same (the duplicates that crowd the 40-material screen), and one name stands for different
materials in different apps. The owner's direction: the chemistry should not care about or know any particular
name. Keeping names clear is the job of the data and the apps.

## Decision

- **The core is nameless.** It takes records and returns numbers and codes. A record has an opaque `id` and what the
  chemistry needs: analysis or formula, LOI, and the properties its rules read (category, frit role, density class,
  flags such as soluble or fluorine, "a default clay"). No rule reads a name. A name, if a record has one, is passed
  through untouched as a label and never compared.
- **Identity is the id; sameness is the chemistry.** Two records are the same material when their ids are equal, and
  the same chemistry when their analyses agree. Duplicates are found by chemistry, never by name.
- **The core writes no words.** Every warning, caution and refusal is a code with its values (`{ code, params }`),
  where params hold numbers, oxides and ids, never a name or a sentence. The English, and every other language, is
  made outside from the code. `warnings` (English) and `say(...)` leave the core.
- **Facts move from code into data.** The density table, the fallback clay and silica, and the formula materials'
  defaults become fields of the records that carry them.
- **Names live outside the core,** in one of two places, to be settled in step 2:
  1. **A second module (a catalog),** possibly its own submodule, which the core never imports: the standard records
     with their names and ids, aliases, generic words, the name key, reading names from pasted text, "not found,
     perhaps…", and the English of the codes. Both apps could use it; Glaze Vault's clay library may belong here
     with its data, or in the core with its rules.
  2. **Each app,** for what only that app needs.
- **A user's material recognized by its name** (a "Whiting" with no category) is joined outside the core, if it is
  kept at all: the app or catalog sets the record's category before the core sees it. The core recognizes it by
  analysis only (`kindByAnalysis`).

## Consequences

- This is the base of the contract (step 2 of the plan) and comes before the TypeScript conversion: the types are
  simpler without `string | Material` and without English in results.
- Behaviour changes where a name used to decide: a user's "Whiting" with no category gets the whiting caution only if
  its analysis says whiting or the app sets its category. Each such change gets a test that shows the result is the
  same or better, or is listed as intended.
- The app gains an adapter: stored recipes and materials (by name today) to records with ids, and codes to text in
  the reader's language. Glazecalc's translations already work from codes; the English source moves with the
  messages.
- Glaze Vault's vendored copy changes shape: it calls the catalog to turn its names into records.
- Open in step 2: one library repo with two modules, or two repos; whether the English messages sit in the catalog or
  in each app; whether recognizing materials by name survives at all.

## As built (2026-11-15)

- **`lib/core`** holds the core: `chemistry/` (oxides, materials, the unity formula, the fit and the solver),
  `cones/` (the charts' figures and firing blocks) and `recipe/` (the recipe tools). It requires only itself; a test
  (`server/test/core_boundary_tests.ts`) holds it to that, to reading no names and to writing no words.
- **Three hooks the host sets once:** `identity.idOf` (which record a record is; `record.id` by default),
  `identity.keyOf` (which lines are the same material, to add up) and `traits.traitsOf` (what the core needs to
  know of a record beyond its chemistry; `record.traits` by default). A material given as a string is a reference
  the host's `lookup` resolves.
- **Problems and warnings are codes:** an error's message is its code; warnings are `{ code, params }`, with raw
  oxides, cones and ids.
- **Glazecalc's side stays at the old paths** (`lib/chemistry`, `lib/recipe`, `lib/cones`), so the app, the server
  and their tests are unchanged: it sets the identity to the name, the key to `sameKey`, and the traits from the
  names exactly as the code once read them (`lib/recipe/traits.js`, `density-names.js`); and it puts back the
  English, the subscripted oxides, cone labels, the limit sets' names and sources, and the warnings arrays.
- **Ids, labels and traits since (2026-11-15):** materials and additives carry a `uuid` (standard ones fixed in
  `data/`, a potter's own given one on save; a copy of another record gets its own), and recipe lines the uuid of
  the record they came from. Glazecalc's `idOf` is the uuid, the name for a record without one; a fourth hook,
  `labelOf`, names a record in results and messages (the name), so ids never reach a page. The standard records
  carry their `traits` in `data/`; a potter's own are read from the name. The app's names for what to avoid,
  which clays not to cap and the base frit become ids in `lib/recipe/ids.js`. The solver's work scales with the
  problem, to four times WORK.
- **Still to do:** the core's declarations re-export the app's (`lib/core/**/*.d.ts` point at `lib/recipe`), so
  `lib/core` does not yet type-check alone: it needs declarations of its own before it can be its own repository
  and submodule. Then the catalog (names, aliases, generic words, paste, traits from names, the English) becomes
  the second submodule. Merging the library's own duplicate chemistries is a task of its own.
