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
names SK 12 as the replacement for Orton 10. (Its table measured more than those two: its own
cones SK 7 to 14, at 1183, 1198, 1211, 1232, 1253, 1290, 1311 and 1331 °C, beside Orton cones 4 to
12 bent in the same kiln. This was noted in review on 2026-10-18; the owner then chose to match
SK and Orton by that same-kiln table, see the amendment of 2026-10-19 below.)

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
  to °C by Orton's large-cone chart at 60 °C an hour (022–14; none above 14; a half cone halfway;
  the amendment of 2026-10-20 found these figures are the older chart's at 150 °C an hour, and
  takes the chart to cone 15).
  SK to °C **only** by Kyoto's measured bends for SK 8 and 10 (1198 °C and 1232 °C, at 100 °C an
  hour), labelled approximate; every other SK cone shows no temperature at all (owner's decision,
  review 2026-10-17); Kyoto measured SK 7 to 14 in the same table (see Context), but only these two
  are shown as a temperature. The JIS figures are never shown as a conversion: beside the measured ones they put
  the cones out of order (SK 7 1230 °C above SK 8 1198 °C, SK 9 1280 °C above SK 10). An SK cone
  gets an Orton equivalent, and the other way, only by Kyoto's same-kiln columns, see the amendment
  below (SK 12 ≈ Orton 10 is Kyoto's own). A range is converted only when both ends have a figure and they run low to high, so no
  page shows half a range or one backwards. A shared recipe shows the author's own scale first,
  the conversion into the reader's beside it.
- **The limits panel takes its bands from the firing.** Each cone maps to a band: Orton and
  temperatures by Hesselberth & Roy's edges (below 1150 °C low, below 1250 °C mid, else high, at
  the Orton chart's 60 °C/h figures, so cone 1–7 is mid and 8 up high); SK by a table, 022–4a low,
  5a–10 mid, 11 up high, from Kyoto's equivalents (SK 8 near Orton 5, SK 10 near Orton 7, SK 11 near
  Orton 8, SK 12 for Orton 10). A range across bands (cone 6–10) shows **both bands' checks side by side**; a set
  that reads two bands by the same figures shows them once. The wave-2 band picker stays and, when
  set, overrides. The MCP `get_recipe` checks the same way, with `checksAtOtherBands`. The recipe
  help (`recipe.help.numbers.limits`) says so.
- **Food surface.** A recipe flag, `foodSurface`, brings a plain note: food safety depends on
  firing to the cone it was tested at; with a range, test at the low end; only a leach test of the
  fired pots shows it is safe. It is printed and shared.
- **Firing logs.** A recipe keeps `firings`, a list of `{ firing, result }` (a firing log's id and
  a result note of at most 500 characters). The links live on the recipe only. A saved recipe's
  links change **one at a time** on the server (`POST /api/recipe/firings/:id`, `PUT` and
  `DELETE /api/recipe/firings/:id/:firing`, `server/lib/firing_links.ts`), from the recipe page
  and the firing log page alike, and each answers with the links as they are now; a recipe save
  never sends the list, so two pages open at once never wipe each other's links. A new recipe's
  links go with it when it is created; **Save as copy** and Duplicate for another cone start with
  none. A link to a log in the Trash stays on the recipe but is hidden (pages show only logs that
  are there; `get_recipe` gives none of them), so putting the log back brings it back; deleting
  the log for good (from the Trash, or emptying it) takes its links off every recipe. At most 100
  links to logs that are there; hidden ones do not count (at most 200 are stored). The cones a
  linked log names in its cone columns can fill the tested ticks within the range, after asking
  when ticks are set. A shared recipe never carries its links.
- **Sharing.** A shared recipe always shows the cone, the range and tested cones, the atmosphere
  and process and the food-surface note; the firing's **schedule note** only when the owner ticks
  Show the recipe's notes (owner's decision): it is the author's own words, like the notes
  (ADR 0020).
- **Rates.** A rate is stored in °C an hour to a tenth, so one typed in °F comes back as typed
  (100 °F an hour is 55.6 °C, shown as 100).
- **Import and export.** Paste-in reads "Cone 6 ox", "^6", "C/6", "Δ6", "cone 5-6", "SK8",
  "1240°C", "2232°F", "06", "6½" and "ox/red" from the notes into the block; the text stays in the
  notes. Weak words ("red", "wood", "soda", "salt", "pit") count only beside a cone or another
  firing word, so "a deep red" or "wood ash" is not a firing. A title gives a firing only when it
  names a cone or a temperature ("Cone 6 Red"; never "Red", "Salt", "Wood" or "Pit" alone). A line
  that is clearly a firing ("Cone 6", "C/6", "^6", "6 ox", "oxidation") is a note of the recipe it
  is in and never starts a new one, unless set off by a blank line with materials straight under
  it, when it is the next recipe's title; a number alone ("06", "5.5") stays what it was, a total
  set aside. SK written without its letter ("SK6", "SK5") is the chart's cone: JIS R 8101 has one
  cone per number, and from 015 to 6 it is the "a" cone, so "SK6" can only be SK 6a; an SK number
  the chart lacks (SK 26) stays a firing note and is not read into the block. "cone 4,5" is a list,
  cones 4 and 5 (the range 4–5, both tested); it is cone 4½ only for a reader who writes decimal
  commas and only when it is the text's one number. Firing-log cells are read the same way. The
  recipes CSV adds Glazy's "Cone" string and "Atmospheres" list, and the food-surface flag. The
  Cone cell marks each Orton cone with the cone sign ("Δ06", "Δ9 - Δ10"; "SK 8" and "1240°C"
  where Glazy's Orton field cannot hold them): a spreadsheet reads a bare 06 as the number 6,
  turning cone 06 (about 1000 °C) into cone 6 (about 1220 °C), and quoting the cell does not stop
  it. Glazy shows its cones with the same sign; a reader of Glazy's bare strings drops it, and
  Glazecalc's paste-in reads it as it is. Versions, Undo, the JSON export, the Trash and a
  trial's records joining an account carry the fields as part of the record.
- **Assistants match a cone across scales** (`list_recipes`, `matchesCone`): in the same scale,
  anywhere in the range; between Orton and SK, the recipe's range put into the asked scale by the
  same-kiln equivalents only (a cone with none matches recipes in its own scale only); a
  cone against a temperature firing (either way) when the cone's figure (Orton's chart at 60 °C an
  hour, Kyoto's measured SK bends) is within 15 °C of the stated temperature or range.
- **Duplicate for another cone** copies a saved recipe into the editor, unsaved, with the firing,
  band and links cleared, and says that moving cones usually needs reformulating.

- **SK and Orton by Kyoto's same-kiln columns (amended 2026-10-19; owner's decision, from the
  overnight review sci-data-04).** The institute's table measures its own cones SK 7 to 14 (1183,
  1198, 1211, 1232, 1253, 1290, 1311, 1331 °C) and Orton cones 4 to 12 (1179, 1207, 1211, 1232,
  1252, 1271, 1290, 1301, 1324 °C) in one kiln at 100 °C an hour. The first version compared
  Kyoto's SK bends with Orton's own chart at 60 °C an hour, a different rate, which put Orton 4 at
  SK 8 and Orton 6 at SK 10. Now an SK cone is given the Orton cone nearest it in Kyoto's Orton
  column, and an Orton cone the SK cone nearest it in Kyoto's SK column, each within 15 °C or none
  (`KYOTO_SK` and `KYOTO_ORTON` in `lib/cones/firing.js`; the table labels Orton 4 to 6 "4a" to
  "6a" and the figure sits in the Orton column). So SK 7 to 14 are Orton 4, 5, 6, 7, 8, 10, 11 and
  12; Orton 4, 5, 6, 7, 8, 10, 11 and 12 are SK 7, 9, 9, 10, 11, 12, 13 and 14; Orton 9, half
  cones and cones outside 4 to 12 have none. (Orton 5 and 6 are 4 °C apart in the table, so both
  are SK 9, and SK 8 is Orton 5: the match is approximate in both directions.) SK 12 for Orton 10
  is still the institute's own statement. What is shown as a temperature is unchanged (SK 8 and
  10 only), as are the bands. Conversions stay display only and say they are approximate.
- **Result cards (amended 2026-10-19).** A recipe keeps the potter's summary of how it came out
  for each **cone and atmosphere** (owner's decision: cone 6 oxidation and cone 6 reduction are
  separate cards), as `coneResults: [{ cone, atmosphere?, summary }]` (`lib/cones/results.js`):
  the cone as the firing block writes it, read in the recipe's scale (or, for a cone that is not
  one of that scale, the scale it is a cone of), an atmosphere of the three, and at most 1000
  characters, at most 100 results. The server cleans the list on every write as it does `firedAt`
  (unknown fields dropped, summaries trimmed, an empty one left out, one for each cone and
  atmosphere); versions, Undo, the Trash, the JSON export and a trial joining an account carry it
  with the record. Save as copy and Duplicate for another cone start with none. Each firing log
  link may have a `cone` and an `atmosphere` too: set when the log is linked if exactly one cone
  the log names in its cone columns is within the stated range, and if every cell of its
  Atmosphere column that names an atmosphere ("ox", "body reduction", "red", "neutral") names the
  same one, which the recipe states (or any, when it states none); otherwise the potter places the
  log from its card, through the link's `PUT`, which now changes only the fields it is given.
  A log that goes from "ox" to "reduction" is not read: it is left to the potter. The cards are
  keyed by the atmospheres the firing states:
  - **none**: a card for each cone, with no atmosphere; a log's own atmosphere shows on its line;
  - **one**: a card for each cone at that atmosphere; a log or result with none is taken to be at it;
  - **several**: a card for each cone and atmosphere with a summary or a log, and one for a cone
    whose logs have no atmosphere yet; any other cone of the range at any stated atmosphere can be
    added.

  With none or one stated, each tested cone has a card from the start. A card gives the cone, its
  approximate temperature, its limits band and how many limit cautions the glaze has in that band
  (the account's limit set), the summary, and the logs there with title, date, atmosphere and
  result note; logs not placed have a card of their own. More than one card, and they start
  collapsed. A summary or log at a cone or atmosphere outside a firing stated later is kept, and
  its card says it is outside. The print view shows the summaries; a shared page shows them only
  when the owner ticks Show the recipe's notes (they are the author's own words) and never the
  logs; `get_recipe` gives `coneResults` and each firing's `cone` and `atmosphere`, read-only.
  No photos yet. The card has a place for a one-line "cone fit" note (chemistry against the
  cone), filled by later work.

- **Higher cones (amended 2026-10-20; owner's decision, round 6: "go higher, some people need
  cone 14–16 for porcelain").** A staging test found the MCP tools knew Orton cones 06 to 6 only
  (they read the lead-replacement chart in `lib/chemistry/lead.js`). Everything now takes every
  Orton cone to 42 and every SK large cone to SK 20, and says plainly where no figure or limit
  reaches.
  - **What Orton publishes** (read 2026-10-19). Orton's own chart, "Temperature Equivalents for
    Orton Pyrometric Cones (°C), Cone Numbers 022-14" (©2016, on ortonceramic.com), gives
    self-supporting cones at 15, 60 and 150 °C an hour and large cones at 60 and 150, over the
    last 100 °C. The chart on Orton's site today stops at cone 12 with the same figures, and its
    pages for each cone give 13 and 14 as the 2016 chart does. Cone 14: self-supporting 1351,
    1365 and 1384 °C; large 1388 °C at 60 °C an hour and 1366 °C at 150 (large 13 and 14 are
    marked "different compositions and different temperature equivalents", and 14 is printed
    hotter at the slower rate). Orton sells large cones 15 to 21, 23 and 26 to 42, self-supporting
    ones to 32 (with 13½, 14½ and 15½) and PCE cones for refractories, but publishes no temperature for
    any cone above 14: those charts are "available (by request)". So cones 15 and 16 exist as
    large and self-supporting cones; only one figure for them was found, below.
  - **What Glazecalc's figures are.** The chart this record called "large cones at 60 °C an hour"
    is, from cone 06 to 14, the large-cone column at **150 °C an hour** of Orton's older chart
    "as determined at the National Bureau of Standards", as kiln makers reprint it (W P Dawson
    Inc ©2000, hosted by L&L Kiln; FireRight Controls ©1994; the two agree figure for figure),
    and from 022 to 07 Orton's current self-supporting column at 60 °C an hour. Katz's cone 10,
    1305 °C (ADR 0022), is the older chart's figure. The figures from cone 06 up are kept, so no
    band, check or cone note changes; the label now says what they are ("Orton's older chart for
    large cones at 150 °C an hour"), cones 022 to 07 take the same column (600 to 984 °C, all low
    fire), and the column goes on to **cone 15, 1431 °C**, the only figure above 14 any Orton
    chart we found prints (at 150 °C an hour, large cones only). Cones from 16 up, and 15½, have no
    figure anywhere: they are shown with none and convert to nothing. Orton's current figures
    sit beside them as data (`ORTON.published` in `lib/cones/index.js`, given by the MCP cone
    tool and `glazecalc://cones`); they differ from the older column by up to 19 °C at 150 °C an
    hour. Both are frozen in `server/test/cones_tests.ts`.
  - **The picker** adds cone 21 (Orton sells it) and the half cones 13½, 14½ and 15½ (Orton sells
    them self-supporting); 14½ is shown halfway between 14 and 15, as every half cone is.
  - **A fourth band, `top`: cone 12 and up, 1320 °C and hotter, SK 14 and up.** The published
    limits we found stop at cone 10: Hesselberth & Roy's cone 10 column, and the UK traditional
    (cone 8–10) and Green & Cooper (cone 10) sets as Digitalfire gives them; we found none for
    hard-paste porcelain at cone 12–16. Glazecalc reads cone 6's figures one cone past it (to
    cone 7) and cone 10's one cone past it, to cone 11, which the band's name already said
    ("High fire, cone 9–11"). Past that, checking a cone 14 glaze against cone 10 figures would be
    extrapolation dressed as a finding, so both limit sets have no figures in the `top` band and
    the panel says so ("has no figures for this firing ... figures for another firing would
    mislead", and that the published limits stop at cone 10). The checks that do not hang on the
    firing (clay, expansion, small amounts, materials) still run. SK 13 is near Orton 11 and SK 14
    near Orton 12 by Kyoto's columns, so SK 14 up is `top`. The band can be chosen by hand too;
    `recipe.firing` and the MCP `create_recipe` and `update_recipe` band take `top`.
  - **The MCP tools read a cone as the recipe page does.** `check_limits`, `get_recipe` and
    `blend_recipes` take an Orton cone 022–42 (a half cone as "5.5" or "5½") or an SK cone
    SK 022–20, and a temperature to 1600 °C (2912 °F), as a recipe's firing does. A cone is checked
    in its band (`coneBand`), not by a temperature converted from it: before, SK 8 was checked by
    its JIS 1250 °C as high fire by Hesselberth & Roy's set, though the recipe page has it as mid
    fire. Its temperature is given only where Glazecalc shows one (Orton's chart to 15, Kyoto's
    SK 8 and 10). In the `top` band the answer carries `limitsNote`. `convert_cone_temperature` gives Glazecalc's figure, Orton's
    current figures beside it where Orton publishes them, and for a cone with none says so instead
    of failing; it no longer claims SK cones to 42 (the large cones end at SK 20; SK 26 to 42 are
    the small cones for refractories, 2種).
  - **Open for the owner.** Orton's current chart is the primary source; the older chart is
    reprinted, not hosted by Orton. Moving to Orton's current self-supporting column at 60 °C an
    hour (the one the guides use) would change mid-fire figures (cone 10 1305 → 1285 °C, cone 8
    1263 → 1249 °C) and so which band cones 1, 2 and 8 fall in under today's edges, and Katz's
    cone 10 anchor: a decision of its own, not made here.

## Consequences

- A glaze's firing can be searched, filtered (the saved list and `list_recipes` match a cone
  anywhere in a range, tested ones first, and an atmosphere or process), printed and shared
  without reading the notes.
- The band edges and SK table are judgements, documented here and tested; changing them changes
  which limits a recipe is checked against, never the stored cone.
- The Orton chart above 15 (14 before 2026-10-20) and SK cones other than 8, 10 and 12 have no
  measured cross-scale equivalent: the page shows nothing rather than a guess or a nominal figure.
- From cone 12 up no limits are checked by band, in any set, until a published limit set for
  those firings is found and added.
- Not done yet: chemistry-against-cone warnings ("stated cone 6, fluxes look like cone 10") and test
  plans (the report's phases 2 and 3); result cards are done (above), without photos.
