# 12. Choosing materials: the fewest that come near, said in words, with limits explained

Accepted, 2026-10-08. Replaces the solver and the ranking in [ADR 10](0010-suggested-amounts.md),
and the frit choice and fixed extras in [ADR 11](0011-replacing-lead.md).

## Context

ADR 10 worked out amounts for a fixed set of materials, and ADR 11 rebuilt a lead glaze from a base
frit with a fixed handful of others. Three things were missing:

- **Choosing among many.** A potter with a cupboard of materials, or the whole library, wants the
  fewest that come near, not every one that helps a little. A lead rebuild often needs a partner
  frit and a calcium source the fixed set did not have.
- **Saying why.** A new recipe with a new feldspar at 33.1 says nothing about what that feldspar is
  for, whether the match needs it, or what else would have done.
- **Limits that explain.** Potters asked that the app may set limits on what it suggests, but should
  "paint the picture" for someone going past them, rather than refuse.

The research behind this is in the reports "Extra materials in glaze substitution" and "Base frits
for lead free glazes" (reports/, with notes in research_notes/).

## Decision

**An exact solver.** `boundedLeastSquares` in `lib/chemistry/lsq.js`, an active-set method,
replaces ADR 10's coordinate descent under `fitAmounts`. The problem is unchanged: weighted misses
in the unity formula, amounts within their bounds, a pull toward the starting amounts. It now also
takes shared caps (`groups`). Twenty lines take about 13 ms (they took 300 to 950 ms). Ranking 130
candidate materials for a niter swap takes 8 ms with `bestFit`, the plain best match. With the old
solver it took 1.75 s, not the 50 ms ADR 10 says.

**`selectMaterials` in `lib/chemistry/select.js` chooses the fewest that come near:**

- A: the best match over every material offered, leaving out any the potter ruled out.
- B: drop one at a time, the removal that matters least each time, while the match stays good
  enough. Good enough is a miss of 1, or half a unit above the best if the best is worse. New
  materials go before the recipe's own; with `keepOwn`, the recipe's own never go. Then swap a
  chosen new material for one not chosen while that improves the match. A limit on new materials
  (`extras`) drops the least useful, and reports what that costs.
- C: amounts by `fitAmounts`, changing as few as it can. A must stays in, at its least from the
  start of A, so the choice is made around it.

**It says what it did.** For each material used:

- what it supplies, as shares of the new recipe's oxides ("all the potash and 71% of the
  alumina": the largest share always, others from 20%, oxides under 0.02 in the formula left
  unsaid);
- whether the match gets at least 0.1 worse without it.

Then:

- materials offered but not used that would bring it at least 0.05 closer;
- near-identical pairs, compared in the fit's own weighted terms (so flint and a feldspar, both
  mostly silica, are not "alike");
- caps that cost match, a line's own or a shared one, with what lifting each would give;
- oxides the target has that nothing offered supplies.

**What the app suggests, and what the potter may add.** Suggestions are current materials sold in
the chosen region. These are left out:

- minerals as formulas only;
- materials that dissolve in water (`soluble`: borax, boric acid, soda ash, pearl ash, niter,
  sodium nitrate, potassium bichromate);
- fluorine sources (`fluorine`: fluorspar, cryolite, lepidolite);
- lead, unless it is on.

**Materials to try** can be added to Suggest amounts and Replace lead from the library or the
potter's own, any number, each perhaps a must.

**Frits have roles** (`fritRole`), from the maker's stated use: base, base-alkaline, alkali,
boron, low-expansion, opacified, zinc, matte, stoneware or lead. A test holds every library base
to the research's oxide window: boron 10 to 30%, silica 40% or more, calcium 8% or more, soda,
potash and lithia 3 to 13%, and at most 3% of each minor oxide. A frit a potter enters is classed
by that window.

**Replace lead builds on a base frit by role,** and the solver picks up to four more materials from
a curated set sold with it:

- alkali frits;
- low-expansion frits, at most 10%;
- calcium borate frits, at most 15%;
- feldspars and wollastonite;
- whiting and dolomite, sharing a 5% cap at low fire;
- zinc oxide, at most 5%, and none with chrome, iron or copper or below cone 03.

It also:

- keeps at least 10% raw clay (or what the recipe had) so the glaze stays suspended;
- leaves magnesia out with chrome or below cone 03, and strontium out when nothing offered has it;
- wants alumina of at least 0.25 from cone 1, as against 0.2 below;
- says when the base frit ends up under 20% of the batch.

To keep the colour, it offers only bases whose 85:15 mix with kaolin has alumina of at least 0.2,
nearest the old glaze's expansion first. A pull toward the old glaze's expansion was tried. It
moved the expansion by 0.2 to 0.3 at a large cost to the match, since the lead-free formula's
soda and potash set it, so the rise is reported instead.

**Past a limit, it says what the glaze will likely do.** There are two strengths: "tends to" from
the app's caution, and "will probably" past the published ceiling. The limits depend on the
firing where it is known. With an old recipe to compare, only a limit newly crossed, or made
worse, is news. The wording and thresholds are the research report's tables:

- boron, by firing, high or too low to melt;
- alumina, and silica to alumina;
- soda and potash;
- magnesia at low fire;
- zinc with colorants and below cone 03;
- raw whiting at low fire (5% is the app's own guideline, as no published limit gives one);
- fluorine, soluble materials, and raw clay over 20% or none at all;
- a frit doing the wrong job;
- expansion against the old recipe;
- 7 or more materials at low fire (8 otherwise);
- amounts under 1% of the batch.

**The report's buttons work it out again from the recipe as it was:** leave a material out (and
allow it again), add one, use an alike one instead, allow more past a cap, or try other materials.

**Match with what I have** makes a recipe from only the materials on hand. The list is kept with
the account (`GET` and `PUT /api/shelf`, a trial too) as library keys. One the recipe already uses
stays near its amount.

## Consequences

- It still matches chemistry, not behavior. The cautions cover the behavior research could pin
  down, in words a potter uses, but a test batch is still the answer.
- The report can run long for a lead rebuild. It is a list a potter can skim, and each part is
  there only when it has something to say.
- The thresholds (a miss of 1 as good enough, 0.1 as needed, 0.05 as helping, 0.98 as alike, the
  caps) are judgment, set against the research and the test recipes, and pinned by tests.
- Reruns start from the recipe as it was, so changes do not pile up on a result. Each rerun is
  fast enough (about 20 to 150 ms) to feel immediate.
- The shelf holds library ids. A renamed standard material keeps its place; a deleted one of the
  potter's drops off the list.
