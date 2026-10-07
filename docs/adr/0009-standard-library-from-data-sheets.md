# 9. The standard library comes from manufacturers' data sheets, and keeps the old entries

Accepted, 2026-10-07.

## Context

Glazecalc's first standard materials and colorants (2017) came from a well-regarded ceramics book.
Checked in 2026 against chemistry handbooks, manufacturers' data sheets and safety data sheets,
several entries had drifted from what potters buy:

- black cobalt oxide is sold as Co₃O₄ and black iron oxide as magnetite, Fe₃O₄;
- several temperatures matched no measurement;
- Custer, Oxford, G-200, Kona F-4 and Albany slip are no longer made;
- the library held 36 materials, where established calculators ship 230 to 700.

Glazy's data is licensed CC BY-NC-SA and Digitalfire's is all rights reserved, so neither can be
copied wholesale. Old recipes still name the discontinued materials, and people want to compare
them with recipes made from today's.

## Decision

- **Analyses come from the manufacturer's data sheet where one exists.** Otherwise they come
  from a supplier's published analysis, then Digitalfire or Glazy (named as the source), then a
  theoretical formula. Every record names its source, with a link and date where there is one.
- **Each record says what it is:**
  - a category, the regions it is sold in, and other names it goes by;
  - its status: current, scarce, discontinued (with the year) or historical;
  - the records to use instead;
  - its hazards, from a current safety data sheet.
- **Old entries stay**, marked discontinued or historical and pointing to their modern
  substitutes, for comparison with old recipes. Every such entry must name a substitute: a test
  enforces it, and checks that every name referred to exists.
- **Colorants and additives carry their chemistry** as materials do: fired oxides, LOI and
  weights. That lets a recipe choose whether its unity formula counts them, since calculators
  differ on this.
- **Regions grow one at a time.** The US and UK are first; the EU, then Australia, come next.
- `npm run seed` replaces standard records by id and removes those no longer in `data/`, so a
  deploy that changes the data updates the database.

## Alternatives

- **Copy Glazy's or Digitalfire's library:** large and convenient, but the licences rule it out,
  and it would bring others' choices and errors with it.
- **Replace the old entries with current ones:** a smaller list, but old recipes could no longer
  be read or compared.
- **Store additives without chemistry:** simpler, but then a carbonate and an oxide of the same
  metal look the same, and no recipe could count its colorants.

## Consequences

- The library is now 109 materials and 34 additives. The pages filter by name or alias, kind and
  region, and remember the region chosen.
- Data sheets change and suppliers come and go, so each record's source and date show how old it
  is. Updating an entry means finding a newer sheet, not copying another tool.
- Some entries rest on Digitalfire or Glazy because the maker publishes nothing, notably the Fusion
  frits and some legacy materials. They say so in their source.
