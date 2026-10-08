# 10. Suggested amounts: the nearest unity formula, with the fewest changes

Accepted, 2026-10-07. The solver and the ranking are replaced by
[ADR 12](0012-choosing-materials.md), which also corrects the timing below.

## Context

Old recipes name materials that are no longer made. When the replacement gives the glaze much the
same oxides gram for gram (Custer Spar and G-200 EU), swapping one for one works. When it does not
(niter for a soda frit, red lead for a lead frit, lepidolite for spodumene), the amounts have to be
worked out again, which is the calculation potters find hardest and the reason to use a
calculator at all.

Potters asked for two things: change whatever amounts need changing, but change as few as
possible; and when a replacement cannot bring back what the old material gave (a soda frit has
almost no potash), ask which material should, rather than pick one for them.

## Decision

- **A second button, Suggest amounts and compare,** offered only when a swap is not like for like.
  Try modern materials still swaps one for one.
- **The target is the old recipe's fired oxides.** `fitAmounts` in `lib/chemistry/fit.js` finds
  amounts, none below zero, whose oxides come nearest them. Each oxide's miss is measured in the
  unity formula, against how near it should come: within 0.02, or 5% of a large amount such as
  silica's. Potash and soda are matched together (KNaO) and only loosely apart, as potters count
  them.
- **Then as few changes as that allows.** The amounts are pulled back toward the recipe as it was
  for as long as the match stays within about a third of "near" on one oxide of the best one. A
  token amount the fit leaves (0.2 of a frit) is dropped, and an amount that moved under 5% goes
  back to what it was, each only where the match still allows. Nothing is rescaled, so what did not
  need changing reads exactly as before.
- **When an oxide the old material gave comes out more than 10% short,** the page asks what should
  bring it back: up to three current standard materials sold in the chosen region with at least 3%
  of it, ranked by how near the whole recipe then comes, or "Leave it out". Ideal minerals
  (Orthoclase, China Clay) and anything with lead are not offered.
- **The result is a new recipe, compared with the old one,** with a note of what changed and that
  only the fired oxides were matched; Undo the swap puts the old one back.

## Consequences

- The solver is a weighted non-negative least squares with a pull toward the starting amounts,
  solved by coordinate descent: a few milliseconds for a recipe. Ranking every candidate material
  in the library was first written here as about 50 ms; measured later, it took about 1.75 s for
  130 candidates (ADR 12).
- It matches chemistry, not behavior. Niter dissolves and feldspar does not; a frit melts
  differently from the raw materials of the same oxides; lepidolite's fluorine is not in the
  unity formula. The note says to test a small batch first.
- The tolerances (0.02, 5%, the 10% that triggers the question) are judgment, set so that the
  test recipes (red lead, niter, lepidolite) come back within about 2% on every main oxide. They
  live in one file, with tests that pin those three cases.
