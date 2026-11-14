# 12. Choosing materials: the fewest that come near, said in words, with limits explained

Accepted, 2026-10-08. Replaces the solver and the ranking in [ADR 10](0010-suggested-amounts.md),
and the frit choice and fixed extras in [ADR 11](0011-replacing-lead.md). Amended 2026-10-20: a
match says how near it comes, holds raw clay where its own check wants it, and makes up a flux
nothing offered supplies (see [Amended: how near a match comes](#amended-how-near-a-match-comes)).
Amended 2026-11-13: a search does at most a set amount of work (see
[Amended: the work a search may do](#amended-the-work-a-search-may-do)), and the famous glazes'
versions are worked out at build with no bound on it (see
[Amended: the famous glazes' versions at build](#amended-the-famous-glazes-versions-at-build)).

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
for lead free glazes", with their notes, kept outside the repository.

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

## Amended: how near a match comes

2026-10-20, the owner's request after a staging test ("definitely find out what is up").

**What happened.** An assistant asked to replace Gerstley Borate in nepheline syenite 40, silica
25, Gerstley Borate 15, EPK 20 (cone 6), with Custer Spar, silica, whiting, EPK, Frit 3134 and
talc on hand, called `match_from_materials`. It got Custer Spar 43.9, silica 11.4, EPK 26.6, Frit
3134 16.5 and talc 1.7, with `miss: 20.456` and a caution for 27% raw clay. It said the match
"missed the original formula by a wide margin" and built Custer Spar 45, silica 17, Frit 3134 17,
EPK 18, whiting 1 and talc 2 by hand. In the unity formula (old, tool, hand):

|            | old         | tool        | hand        |
| ---------- | ----------- | ----------- | ----------- |
| SiO2       | 6.15        | 6.07 (−1%)  | 5.80 (−6%)  |
| Al2O3      | 1.04        | 1.02 (−2%)  | 0.77 (−26%) |
| B2O3       | 0.35        | 0.32 (−10%) | 0.30 (−15%) |
| CaO        | 0.32        | 0.36 (+11%) | 0.39 (+21%) |
| KNaO       | 0.60        | 0.56 (−6%)  | 0.53 (−12%) |
| Na2O / K2O | 0.46 / 0.14 | 0.28 / 0.28 | 0.27 / 0.26 |

The tool's match was the nearer on every oxide, about twice as near overall (0.24 against 0.50,
the root of the summed squares). Two things made it look poor:

- **The score.** The miss is the fit's weighted sum of squares, in units of how near each oxide
  should come. Most of the 20.5 is the soda and potash split, which no mix of these materials can
  bring back: Custer Spar has a third of nepheline syenite's soda. A bare 20.5 read as a wide miss,
  and the tool gave nothing else to judge by.
- **The clay.** Nepheline syenite carries more alumina than Custer Spar, and the frit's soda
  replaces some of the feldspar, so only kaolin can bring the alumina back: 27%, which the app's
  own check says will probably crack and crawl.

The engine's objective, weights and selection were not at fault here. Its answer was the near one.

**Decision.**

- **Closeness, oxide by oxide** (`lib/chemistry/closeness.js`). A report given the target now has
  `closeness`: each oxide of the two unity formulas (each per its own fluxes, as a potter compares
  two glazes), potash and soda together as KNaO, the difference, and a verdict against the fit's own
  "near" (0.02, or 5% of a large amount; 0.06 for soda and potash apart): close within it, off
  within three times it, far beyond. The whole is close, fair (something off) or poor (something
  far). The MCP tools that fit amounts (`match_from_materials`, `match_with_what_i_have`,
  `suggest_substitutes`) answer it with each oxide's old and new value, difference and percent, and
  a sentence: what is off or far, what nothing given supplies, and whether these materials could
  come nearer. They also answer the caps that cost match (`capped`), which they left out before.
- **Raw clay held where the check wants it** (`selectHoldingClay`, `lib/recipe/pool.js`, for Match
  with what I have and Suggest amounts). Where the match would raise the clay caution (over 20% of
  the batch, and more than the recipe had), it is worked out again with raw clay capped at 20% (or
  the recipe's own share); and where it would leave less than 10% of the batch (or the recipe's
  clay, if less) of the recipe's main raw clay, that clay is kept to it, as Replace lead keeps it.
  The held match is used when it costs at most 0.5 of miss: then a calcined kaolin on hand, or
  another source of alumina, takes up the rest, and a calcined kaolin does not take the place of
  all the raw clay. Where only raw clay can bring the alumina back (the staging case: holding it
  would leave alumina 15% short), the chemistry comes first and the caution says to swap part of it
  for calcined kaolin, which a potter can also make by bisque-firing raw kaolin. A cap that costs
  0.1 or more is reported with what lifting it gives; Allow more (or `allowMore`) lifts it.
- **Caps on a share of the batch** (`shares` in `lib/chemistry/fit.js`): the members of a group at
  most a share of all the lines together, kept by the same price as an amount cap, with a rebate on
  the other lines. An amount tried back at its start, or a token dropped, may no longer break a cap
  the match keeps (an amount cap could be broken that way before).
- **A flux nothing offered supplies is made up by the others.** The fit counts moles per mole of the
  target's fluxes, but a unity formula is per mole of its own; with lithia a fifth of the fluxes and
  no lithium on hand, the match kept the other oxides' moles and its own unity formula came out
  with silica 26% high. When a flux of the target's can be had from no line, a row holds the fluxes
  together as near as any oxide (0.02, not 5%), so the other fluxes make up most of it and silica
  comes out about 5% high. Where every flux can be had, nothing changes.
- **The clay caution is not news when the recipe had as much** (to rounding, or 10% more), as
  ADR 12 says of every limit; a match that keeps a 20% clay at 20.02% no longer warns.

**Consequences.**

- An assistant can now judge a match by what it is: for the staging case, "fair", with silica,
  alumina and magnesia close, boron, calcium and potash and soda together off, and "These materials
  cannot come much nearer." Tests pin it and five other substitutions
  (`server/test/substitution_tests.ts`): Gerstley Borate for Frit 3134 in a cone 6 clear, Custer
  Spar for G-200 EU and Minspar 200, a cone 10 celadon base with wollastonite for whiting, and
  lithia and boron with nothing to supply them.
- Holding raw clay can run the selection twice; a match still takes about 10 to 25 ms.
- The closeness verdicts and the 0.5 the clay hold may cost are judgment, like the other thresholds
  here. The sentences are English, as the MCP tools' other notes are.

## Amended: the work a search may do

2026-11-13, from the 1.0 security review.

**What happened.** The time a search takes grows fast with the materials offered and the oxides
aimed for. For each material not used, the report chooses again with it a must; swaps try every
material chosen against every other; and a target many materials can make spreads stage A's
match over dozens of them (78 of 100), each one dropped in turn. With a 13-oxide target, 60 of
the library's materials took 7 seconds, 80 took 93, and a 40-line recipe's suggestion 30, all on
the one thread the server answers everyone with (or the page's). The MCP tools are open to anyone.

**Decision.**

- **A meter.** The solver counts its multiply-adds (`lsq.js`), and a search may do at most `WORK`
  of them (`fit.js`, 1.5 x 10^8: about a second on a 2015 laptop). The steps that only refine
  what is found stop once it is spent, keeping what they have: dropping and swapping (B), adding
  back (`closer`), trying unused materials for the report (the likeliest first), and putting
  amounts back at their starts (`fitAmounts`). So does stage A's first match over every material
  offered, between its steps, as near as the materials it has taken up by then bring it (amended
  for 1.0, below: it was not bounded). The potter's limit on new materials and each line's least
  are kept all the same. A search cut short with more in use than the target has oxides keeps the
  musts and, up to that many: for each oxide aimed at, the material that gives the match most of it,
  then those the match uses most, before C. The selection says `cutShort`; the MCP tools say so in
  words. Counted, not timed, so the same request gives the same answer on the server and in the
  browser, however busy either is.
- **Less work for the same answer.** A^T A is worked out once for each problem rather than for
  each of its thousands of solves, and `fitAmounts` tries amounts back at their starts one at a time
  until one is allowed, rather than every one each round. Results are unchanged, bit for bit: over
  1,200 random matches, solves, suggestions, fits and lead rebuilds, and every famous glaze's version.
- **Where it is set.** One meter for a match or a solve, its clay hold included
  (`selectHoldingClay`). A suggestion's plan has its own, and stops ranking what could bring a
  short oxide back once it is spent; its amounts have their own, on the page (worked out once the
  potter has chosen) and in the MCP tools alike, so both give the same answer. When the work runs out
  in the clay hold's choosing and the free one is kept, the selection still says `cutShort`: the
  hold may have lost for being cut, not for the clay. The largest search the
  app makes itself, a famous glaze's version from a region's base materials (shino from the EU's 66),
  takes about half of `WORK`; a test holds it under 0.7. The recipes and shelves in the tests take
  under a hundredth.
- **However many materials.** Stage A was the one step not bounded: over 364 materials it alone
  took the work allowed, a whole search up to nine times it, and over a shelf at its most (500,
  `SHELF_MOST`) twenty times. It now stops with the rest, so a search from 500 materials does about
  the work one from 60 does (a test holds it to that, and to `WORK` and a quarter), and the page and
  the MCP tools take a whole shelf. When the bound cuts stage A, B starts from what it found, and
  the cut search keeps the materials as above. Keeping, for each oxide, its best source, rather than
  only the largest amounts, also made the cut answers nearer: of ten random solves from 60 to 364
  materials, eight cut short, the largest miss went from 2,142 to 63, and six over 60 became one.

**Consequences.**

- A worst case now takes about a second; the event loop is free again after it.
- A search past the bound gives a good recipe, not always the nearest or the simplest: the MCP
  tools ask for a shorter list, and take as many materials as a shelf holds
  ([ADR 17](0017-mcp-server.md)). The page does not say yet when a search was cut short; the lists
  potters make stay well within it.

## Amended: the famous glazes' versions at build

2026-11-13, the owner's decision after the 1.0 review.

**What happened.** The amendment above left the famous glazes' versions, the largest searches the
app made itself, to each reader's browser, within `WORK`. The largest published one, Shino from the
UK's 49 base materials, took 0.55 of it, but the tests' celadon, which is never published, was
already cut short from the EU's 66 (at 1.003 times `WORK`; the whole search takes 9.5 times). A glaze
published later could have come out different from what the whole search makes, and nothing would
have said so.

**Decision.**

- **At build, with no bound.** `scripts/famous-glazes.mjs` works out every published glaze's
  versions (`lib/famous-versions.js`): from each region's base materials (US, UK, EU, AU, JP) and,
  for a lead glaze, from its proposal's own, with the target, the materials and the solver the page
  used, on a meter that never cuts. Each language's file carries them, each line as
  `[material name, percent]`, with the closeness verdict ([docs/famous-glazes.md](../famous-glazes.md)).
- **The page solves nothing.** It shows the version for the reader's region, and reads the standard
  materials in only to open a region's lead-free version as a recipe.
- **The build stops** for a published glaze with a version it cannot make, or whose search would be
  cut short, naming the glaze, the materials and why, as it does for a glaze that fails the publish
  bar.

**Consequences.**

- Every page shows what it showed: none of the 16 versions was cut short in the browser, and the
  build's are the same, line for line. A test compares the shipped versions with a fresh search and
  with the browser's bounded one on every run (`server/test/famous_glazes_tests.ts`).
- The famous glazes' versions no longer run under `WORK`, and the test that held them under 0.7 of
  it is gone. `WORK` still bounds every search a person or an AI assistant asks for.
- The build takes about 3 seconds more for the 16 searches, and each language's file about 2.5 kB
  more (0.8 kB gzipped). A famous glaze's page no longer reads in the standard materials (every
  record of the library) or solves when it opens.
