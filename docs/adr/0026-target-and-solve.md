# 26. Target & Solve: a recipe for a typed target, on the matching engine

Accepted, 2026-10-20.

## Context

Potters work from a unity formula or an oxide analysis as often as from a recipe: one from a book or
a paper, one from another app, one they want to move toward. They want a recipe for it from the
materials they have, and to know how near it comes. Glazy charges for this; the owner asked for it
free, in the app and as an MCP tool.

Glazecalc already chooses materials and amounts for a target ([ADR 12](0012-choosing-materials.md)):
`selectMaterials` picks the fewest that come near, `selectHoldingClay` keeps raw clay where the check
wants it, and `explain` with `closeness` says how near each oxide comes. Match with what I have aims at
an old recipe's oxides. Only the target and the absence of an old recipe are new.

## Decision

**One engine.** `solveTarget` (`lib/recipe/solve.js`) is Match with what I have with the target in
place of the old recipe: the same selection, clay hold, report and closeness. No second solver.

- **The target as moles.** A unity formula is taken per mole of its own fluxes; fluxes that do not
  add up to 1 are scaled to 1, and the answer says what they came to. An analysis (percent by weight
  of the fired glaze) is turned into moles by each oxide's molar mass; loss on ignition is left out.
  Either is put on 100 g of fired glaze, so each material's least (1% of the batch) and the clay
  hold's share mean what they mean for a recipe of about 100.
- **No old recipe to stay near.** Every material starts at nothing, so there is no pull toward old
  amounts and no "recipe's own" to keep; the selection's tie break settles equal matches. The clay
  hold uses the check's 20% (there is no old share), and there is no main clay to keep.
- **In percent.** The amounts are scaled to add up to 100, one decimal place.
- **Potash and soda apart.** A target with KNaO (or R2O) is refused with a sentence asking for them
  apart: the fit matches them together closely and apart loosely, and an even split would be a guess
  presented as the target.
- **Refusals in codes**, as the other recipe tools give them ([ADR 19](0019-shared-recipe-tools.md)):
  an oxide the app does not know, KNaO, an amount that is not a number of 0 or more, no flux, no
  materials, and none of the materials with any of the target's oxides.
- **The cautions the recipe page gives**: `pastLimits` (the app's own limits, for the firing chosen)
  and `sizeNotes`, as for a match; on the page, the limits panel and the hazards as the recipe page
  shows them.
- **Pasting from another app** (`parseTarget`): oxide and number pairs, one or several to a line, with
  a colon or equals sign, subscripts, any case and a decimal comma; or a row of oxides over a row of
  numbers, as a spreadsheet copies a table. Words that look like an oxide's formula but are not one are
  named; LOI is left out. Anything else is not guessed at.

**The page** (`/solve`, signed in or a trial, as the recipe page): the target in fields grouped as a
unity formula's columns, each labelled with its name and formula, the fluxes' sum shown as it is
typed; the materials on hand to start with (changes there are for this target only, not saved to the
shelf); then the recipe, how near each oxide comes, what each material does with Leave out, Add and
Allow more, the cautions, the limits panel and the hazards. A change to the target or the materials
after solving marks the recipe as out of date rather than solving again at each keystroke.
**"Open as a new recipe"** hands the recipe to the recipe page through a service held in memory for
that one move (`PendingRecipeService`): it opens there as a new recipe, not saved yet, its notes naming
the target and how near it came. A reload does not bring it back; the URL carries nothing.

**The MCP tool** `solve_target` is public, as the other calculators are: the target, the materials by
library name, a must, allowMore and a firing. With `onHand`, a caller whose token or connected app may
read the shelf (`shelf:read`) has the shelf's materials offered too; without that the tool refuses in
words. It counts against the fits a minute like the other tools that fit amounts.

## Consequences

- Any improvement to the matching engine improves Solve too, and the tests of both pin it: a glaze's
  own unity formula and fired analysis solved back from its materials, an unreachable oxide named.
- A unity formula says nothing of which materials a potter would choose: the fewest that come near
  are chosen, as a match chooses them, and the report offers others.
- A target that the materials cannot reach is still answered, with a recipe that comes as near as
  they allow, "poor" and the oxides nothing supplies, rather than a refusal.
- The page and the tool's sentences are English for now; the page's words are in the recipe
  messages for translation, the tool's are English as the other tools' notes are.
