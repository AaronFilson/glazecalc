# 22. The chemistry is checked against the stated cone, by boron and one other signal

Accepted, 2026-10-19. From the research report "Chemistry against the stated cone" (2026-10-19,
kept out of the repository in `reports/`) and the owner's decisions of 2026-10-19.

## Context

A recipe now states its firing (docs/adr/0021). A glaze stated for the wrong cone is a common
mistake: a cone 08 recipe recorded as cone 8, a low-fire glaze copied into a cone 10 notebook. At
the wrong cone a glaze runs off the pot, or comes out underfired, dry and not fully sealed, and
underfired glazes leach more. The limits panel compares the unity formula with a limit set for the
stated firing, but does not say when the formula as a whole looks like another firing's.

The published evidence for reading the cone from the chemistry is thin:

- **Boron is the one strong signal.** Matt Katz, "Boron in Glazes" (_Ceramics Monthly_, September
  2012, pp. 14–15): "an additional 0.1 mole (via UMF) of boron for every 50 °C below cone 10
  (1305 °C)", for cone 06 to 10, from boron added to one standard glaze, worked out with Bill
  Carty at Alfred; "Boron is not required for a cone 10 glaze". Seger's own cones follow the same
  slope (the 1910 series: B2O3 0.026 at 1200 °C to 0.407 at 1020 °C, about 0.11 per 50 °C, as
  printed in Burgess & Le Chatelier, _The Measurement of High Temperatures_, 1912), and
  Digitalfire's B2O3 page says the same ("At cone 06, 0.5 molar parts ... at cone 6, only around
  0.1-0.2").
- **Silica and alumina rise with the cone but overlap.** John Hesselberth and Ron Roy's stable
  glaze limits (_Ceramics Monthly_, September 2000; already the panel's default set) give cone 6
  SiO2 2.5–4.0 and Al2O3 0.25–0.40, cone 10 SiO2 3.0–5.0 and Al2O3 0.3–0.6. In Glazy's public
  export (`glazy_20260531.yaml.gz`, CC BY-NC-SA 4.0) the median silica is 2.5 / 2.9 / 3.1 and
  alumina 0.29 / 0.36 / 0.41 for low, mid and high fire, with wide quartiles; the Si:Al ratio is
  about 8 in all three.
- **Predictors are weak.** Glazy's own cone model is off by 1.6 cones on average (silica alone,
  2.6); Digitalfire has "been very hesitant to build temperature prediction into" its software.

## Decision

- **A note only when two signals agree** (`lib/recipe/cone-fit.js`, `coneFit`): boron against
  Katz's need for the firing, and silica or alumina against a published figure, on a band outside
  every band the stated firing covers.
  - _Looks cooler_ (stated mid or high fire): B2O3 at least Katz's need + 0.30, and SiO2 or Al2O3
    under Hesselberth & Roy's least for the band (cone 6: 2.5 / 0.25; cone 10: 3.0 / 0.30).
  - _Looks hotter_ (stated low or mid fire): B2O3 at most Katz's need − 0.15, and SiO2 over the
    band's most: at low fire the UK traditional limits' cone 04–02 figure, 3.0 (as Digitalfire
    gives them in "Limit formulas and target formulas"; Hesselberth & Roy have no low-fire
    column), at cone 6 Hesselberth & Roy's 4.0. Alumina is not used for "hotter": mattes are
    often high in it, and testing it raised false notes at cone 6 to 6% in the report.
  - The margins (0.30, 0.15) are the report's, chosen on Glazy's glazes; a "cooler" margin of
    0.20 tripled false notes at cone 10. Values are compared at the two decimals they are shown
    with, as the limits are (`pastSide`).
- **Fixed figures, whatever limit set the panel shows.** The check always uses Katz's,
  Hesselberth & Roy's and the UK figure above, so changing the set changes the table, not the
  note. Nothing else is added.
- **What it is judged against.** The band chosen by hand in the limits panel, read at the cone
  its figures are for (low fire at cone 04, mid at cone 6, high at cone 10), with the stated
  firing's processes; else the recipe's stated firing (`firedAt`). A cone's temperature comes from
  the existing helpers (`approxCelsius`): Orton's chart at 60 °C an hour, Kyoto's measured bends
  for SK 8 and 10, SK 12 by its stated Orton equivalent (cone 10), a temperature as given.
  Bands are drawn as Hesselberth & Roy's set draws them: low below 1150 °C, mid below 1250 °C.
- **A range is judged at its ends.** Cooler than its coolest cone, or hotter than its hottest, is
  a note. A range across two bands (cone 6–10) whose chemistry points to one band only, judged at
  the other end, gets no note but one line: it "looks closer to the cone 6 end".
- **Soft words for cone 6 against cone 10.** The check tells low fire from the rest well and
  cone 6 from cone 10 only roughly (it catches 5–15% of those mix-ups), so a note between mid and
  high fire "leans toward" the other firing and says chemistry tells them apart only roughly.
- **Can't judge, said in one line**, where the published figures do not reach: PbO over 0.05
  (lead melts without boron), Li2O 0.10 or more, K2O + Na2O 0.45 or more (alkaline low fire,
  Egyptian paste, shinos), ZnO 0.30 or more (crystalline glazes), SiO2 under 1 or over 8 or
  MnO + CuO + CoO + Fe2O3 + FeO over 0.5 (not a usual glaze's formula), raku, salt, soda, wood or
  pit firings, wood or plant ash among the materials (not bone ash, pearl ash or soda ash), the
  cones between low and mid fire (01 to 3, which neither band's figures fit), cones below 06
  (Katz's chart starts there), and an SK cone with no measured temperature. Gerstley borate is
  judged, and a "cooler" note says its boron varies from lot to lot.
- **Never a pass.** With nothing pointing away, the line says the boron, silica and alumina "do
  not point away" from the firing and that this says nothing about whether the glaze is stable or
  food safe. Every note ends that it is a guide, not a test ("if it has fired well for you at this
  cone, trust your tiles"), and shows its sources. A "hotter" note at low fire says to test before
  using the glaze where food or drink will touch.
- **Where it shows.** One line at the top of the recipe page's limits panel, and `coneFit` in the
  MCP tools: `get_recipe` (for the firing asked about, else the band chosen on the recipe, else
  the stated firing) and `check_limits` when a firing is given. Not on the print page or a shared
  page (the owner's decision). Its sentences are message codes (`coneFit.*`), English first.
- **Katz's 1305 °C.** `boronFor` used 1300 °C, from a paraphrase; Katz's article says cone 10,
  1305 °C. It now uses 1305 °C. Its other uses (the "too little boron" check at low fire and the
  boron target when replacing lead) ask for 0.01 more B2O3 than before: 0.49 at cone 04 rather
  than 0.48. ADR 0011 keeps its words as written then.

## Measured

On Glazy's export (measurement only; none of it is shipped), recipes whose stated range sits in
one band, judged with the rule as built (each range at its ends, ash from the material names,
processes from Glazy's atmospheres):

| Stated band | Recipes | Judged | False notes | Production records only |
| ----------- | ------- | ------ | ----------- | ----------------------- |
| Low (06–02) | 1,830   | 788    | 1.65%       | 2.30% (7 of 305)        |
| Mid (1–7)   | 16,386  | 12,548 | 1.61%       | 2.05% (61 of 2,978)     |
| High (8–13) | 8,048   | 5,633  | 0.36%       | 0.25% (4 of 1,576)      |

A note on a recipe stated at its own cone counts as false, so Glazy's own mislabels count against
the rule: these are upper bounds. Read at another band's cone, the rule catches 63% of low-fire
glazes stated as high fire, 50% of high-fire ones stated as low, 35% of mid-fire ones stated as
low, 27% of low-fire ones stated as mid, and only 15% and 5% of the mid/high mix-ups.

The test set (`scripts/cone-fit-test-set.json`, run by `node scripts/cone-fit-check.mjs`) is the
report's 51 recipes, deliberately loaded with edge cases, and 12 random Glazy "Production" glazes
per band. Glazy's rows keep their ids, names, authors, cones, material names and computed unity
formulas, with attribution, under Glazy's CC BY-NC-SA 4.0. Digitalfire's recipes are All Rights
Reserved and Katz's are in a magazine, so their rows keep only a code, a name and a cone; their
lines can be entered at run time (`--lines`). On 2026-10-19 the rule gave 3 false notes in 57
judged recipes (5.3%) with the Digitalfire rows entered, 3 in 48 (6.3%) on the stored rows alone:
low fire 1 of 14, mid 2 of 23, high 0 of 20. The three: Linda Bloomfield's low-fire transparent
(Glazy #197276, a "Testing" record the report flagged to check against her book), Behrens Spinach
Green (#5775, 50% Gerstley borate, which runs at cone 5–6) and Broken Blue (#351604, a Gillespie
borate cone 6 glaze with alumina 0.21). The owner's bar is 5% on correctly labelled recipes; the
set is small (57 judged), so one note moves it by almost 2 points, and the rule was not tuned to it.

## Consequences

- A potter with a mislabelled low-fire recipe at cone 10 is told, with figures and sources;
  most correctly labelled glazes get the plain "does not point away" line.
- About half of low-fire recipes get "can't judge". That is honest: low fire is where lead,
  lithium and alkaline glazes live.
- Fluid, boron-heavy cone 6 glazes with little alumina can get a "looks cooler" note; its advice
  (fire a test tile on a catch plate) fits them anyway.
- The thresholds are a synthesis from cited figures, not a published rule. Changing one is a
  change to this record; the test set's notes are pinned in `server/test/cone_fit_tests.ts`, so
  a change shows there.
- Translations of the new messages come with the next translation wave; until then they show in
  English, as does the limits help, which now mentions the check.
