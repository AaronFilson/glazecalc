# What each note becomes, field by field

Ids come from the list tools: `list_recipes`, `list_firings`, `list_my_materials`, `list_notes`. Leave out a
field the person did not give; never fill one in.

## A new recipe: `create_recipe`

- **title**: the name they gave. No name: ask.
- **lines**: each base material and its amount, `{ material, amount }`. Check each name with
  `search_materials` first. All amounts in one unit: see numbers-and-units.md.
- **colorants**: colorants and opacifiers added on top ("plus 1 percent cobalt carbonate"),
  `{ name, amount, unit }`, the unit percent, parts or grams.
- **notes**: anything else they said about it, in their words.
- **firing**: the band (low, mid, high or top) only when the cone is clear: low is cone 06 to 02, mid cone 4
  to 6, high cone 9 to 11, top cone 12 up.
- **foodSurface**: only when they say it is meant for a food surface (a liner). It is not a claim that it is
  safe.

Glazecalc works out the unity formula and answers with it. It refuses a recipe with no flux, or a material it
does not know: say so, and ask.

## A note: `add_notebook_entry`

- **content**: their words.
- **title**: short, from their words ("Floating blue: runs on the lower third").
- **about**: `{ kind, id }` for a note on a saved record, the kind recipe, material or firing. Leave it out for
  a general note.

Every note shows on the Notebook page. `list_notes` with the record's id finds the notes about it.

## A firing log: `create_firing_log`

- **title**: as they name it. Not named: suggest one ("Glaze firing, cone 6, 21 October") and read it back.
- **date**: the day it was fired, as 2026-10-21. Work out "today" or "last night" and read back the date.
- **kiln**: as they name it.
- **columns**: the columns kept, by the Firing page's names: Time, Temperature F or Temperature C (the scale
  they spoke), Cone, Atmosphere, Ramp, Hold, Damper, Comments and the rest the tool lists. Only the columns
  they use.
- **rows**: one row for each reading, one cell for each column, in column order, `""` for a cell not said. At
  most 500 rows in a log.
- **notes**: anything else about the firing, in their words.

## More readings: `add_firing_rows`

- **id**: the log, from `list_firings`.
- **rows**: in the log's own columns, which `get_firing` gives. A reading that needs a column the log has not
  got goes in its Comments column if it has one; otherwise ask.

## A test tile result: `link_firing`

- **recipeId** and **firingId**: the recipe, and the firing log it went through.
- **result**: their words, at most 500 characters. Longer: agree a short version for the result, and save all
  of it as a note about the recipe (`add_notebook_entry` with about).
- **cone** and **atmosphere**: only when said, and only when they differ from what the log says. The cone as
  the recipe page writes it: "6", "06", "5.5", SK "6a", or "1240" for °C. The atmosphere: oxidation, reduction
  or neutral.

A recipe linked to the log already keeps the link: only what is given changes.

## Materials on hand: `add_to_shelf`

- **materials**: the names, each checked with `search_materials`.

Glazecalc keeps which materials are on hand, not how much. "20 kilos of silica left" can be a note.

## Their own material: `add_my_material`

- **name**: as on the bag or sheet.
- **analysis**: each oxide and its weight percent, from the data sheet, read back figure by figure.
- **loi**: the loss on ignition in percent, when the sheet gives it.
- **notes**: where the figures came from ("Bag sheet, lot 2241").
