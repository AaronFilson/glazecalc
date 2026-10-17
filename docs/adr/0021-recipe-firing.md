# 21. A recipe states its firing: the cone as given, the range claimed, the cones tested

Accepted, 2026-10-17. From the research report "Recipe cone field" (2026-10-17, kept out of the
repository in `reports/`) and the owner's decisions on its open questions.

## Context

A glaze is rarely described by one number. Potters write "cone 6 ox", "^10 reduction", "cone
5-6", "SK8" or "1240 °C", and a commercial label's range is often a marketing anchor rather than
the range the glaze was tested over. "Works at 6–10" can mean underfired (and leachable) at 6 or
running at 10, and moving a glaze between cone 6 and cone 10 usually means reformulating it.
Cones measure heatwork, not temperature, and an SK cone is not the Orton cone of the same number:
Glazecalc's SK chart gives the JIS nominal figures (SK 8 1250 °C, SK 10 1300 °C), while the Kyoto
municipal institute measured its own cones bending at 1198 °C and 1232 °C at 100 °C an hour, and
names SK 12 as the replacement for Orton 10.

Wave 2 added `recipe.firing` as a band, `low`, `mid` or `high`, picked by hand for the limits
panel. Recipes so far say their firing only in the notes, if at all.

## Decision

- **A new subdocument, `firedAt`,** beside the wave-2 `firing`, which keeps its name and meaning
  as the limits band chosen by hand. A migration that renamed `firing` would touch every saved
  recipe, its versions and exports, and the MCP tool's answer, for no gain; the new name avoids
  the clash. `firedAt` holds (`lib/cones/firing.js`):
  - `scale`: `orton`, `sk` or `temperature`, defaulting in the editor to the account's cone
    setting (or its region's);
  - `low` and an optional `high`: the cone **exactly as entered** in its scale ('06', '6', '5.5'
    for 5½, SK '6a'), or for `temperature` the peak in °C as text. Nothing converted is stored;
  - `tested`: the cones of the range actually fired, a subset of the range's whole cones and its
    two ends. A single cone counts as tested, and the tested cone is shown first, the claimed range
    after it;
  - `atmospheres` (oxidation, reduction, neutral) and `processes` (wood, soda, salt, raku, pit),
    each a list: a recipe can be fired in both oxidation and reduction;
  - for a temperature firing, an optional `rate` over the last hour (°C an hour) and `hold`
    (minutes), stored in °C and typed and shown in °F where the account reads °F;
  - a `schedule` note and a `witness` tick (confirmed by a witness cone).

  The server validates and cleans the block on every write (unknown fields dropped, lists in a
  fixed order). An empty or absent block is "not stated"; existing recipes are not migrated.

- **Order by ordinal, never text or number.** Orton runs 022 … 01 (−22 … −1), then 1 … 42; a half
  cone sits halfway. SK follows its chart's order, letter cones included. Ranges, filters and
  ticks use the ordinal. The picker offers Orton 022–13 first, then half cones (1½–12½), then 14–42
  (rare in pottery, last but there); SK offers its chart.
- **Conversions are display only, labelled approximate, and say what they rest on.** Orton cones
  to °C by Orton's large-cone chart at 60 °C an hour (022–14; none above 14; a half cone halfway).
  SK to °C by Kyoto's measured bends where it measured (SK 8, SK 10), otherwise the JIS figure,
  marked "kilns usually bend it cooler". An SK cone gets an Orton equivalent only where Kyoto
  measured it or named the replacement (SK 12 ≈ Orton 10); never from a nominal figure. A shared
  recipe shows the author's own scale first, the conversion into the reader's beside it.
- **The limits panel takes its bands from the firing.** Each cone maps to a band: Orton and
  temperatures by Hesselberth & Roy's edges (below 1150 °C low, below 1250 °C mid, else high, at
  the Orton chart's 60 °C/h figures, so cone 1–7 is mid and 8 up high); SK by a table, 022–4a low,
  5a–10 mid, 11 up high, from Kyoto's equivalents (SK 8 near Orton 5, SK 10 near Orton 6–7, SK 12
  for Orton 10). A range across bands (cone 6–10) shows **both bands' checks side by side**; a set
  that reads two bands by the same figures shows them once. The wave-2 band picker stays and, when
  set, overrides. The MCP `get_recipe` checks the same way, with `checksAtOtherBands`.
- **Food surface.** A recipe flag, `foodSurface`, brings a plain note: food safety depends on
  firing to the cone it was tested at; with a range, test at the low end; only a leach test of the
  fired pots shows it is safe. It is printed and shared.
- **Firing logs.** A recipe keeps `firings`, a list of `{ firing, result }` (a firing log's id and
  a result note, at most 100 links of 500 characters). The links live on the recipe only; the
  firing log page picks recipes by writing to them. The cones a linked log names in its cone
  columns can fill the tested ticks within the range, after asking when ticks are set. A shared
  recipe never carries its links.
- **Import and export.** Paste-in reads "Cone 6 ox", "^6", "C/6", "Δ6", "cone 5-6", "SK8",
  "1240°C", "2232°F", "06", "6½" and "ox/red" from the notes into the block; the text stays in the
  notes. Weak words ("red", "wood", "soda", "salt", "pit") count only beside a cone or another
  firing word, so "a deep red" or "wood ash" is not a firing. The recipes CSV adds Glazy's
  "Cone" string ("9 - 10"; "SK 8" and "1240°C" where Glazy's Orton field cannot hold them) and
  "Atmospheres" list, and the food-surface flag. Versions, Undo, the JSON export, the Trash and a
  trial's records joining an account carry the fields as part of the record.
- **Duplicate for another cone** copies a saved recipe into the editor, unsaved, with the firing,
  band and links cleared, and says that moving cones usually needs reformulating.

## Consequences

- A glaze's firing can be searched, filtered (the saved list and `list_recipes` match a cone
  anywhere in a range, tested ones first, and an atmosphere or process), printed and shared
  without reading the notes.
- The band edges and SK table are judgements, documented here and tested; changing them changes
  which limits a recipe is checked against, never the stored cone.
- The Orton chart above 14 and SK cones other than 8, 10 and 12 have no measured cross-scale
  equivalent: the page shows a temperature or nothing rather than a guess.
- Not done yet: chemistry-against-cone warnings ("stated cone 6, fluxes look like cone 10"), per-cone
  result cards and test plans (the report's phases 2 and 3).
