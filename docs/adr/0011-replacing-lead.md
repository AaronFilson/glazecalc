# 11. Replacing lead: rebuild the flux, with lead off unless chosen

Accepted, 2026-10-07. The choice of base frit and of the other materials is replaced by
[ADR 12](0012-choosing-materials.md).

## Context

Old recipes use raw lead (red lead, white lead, litharge) and lead frits. Lead is poisonous to
breathe and swallow, builds up in the body, and can leach from fired ware into food. Potters want
those recipes without lead, but nothing lead-free supplies PbO, so Suggest amounts (ADR 10), which
aims at the old recipe's oxides, cannot do it: with lead-free frits it put in no frit at all.

Research for this decision (notes on replacing lead in old glazes, and a report; both kept
outside the repository) found no published rule converting PbO mole for mole. Lead is often the only flux in an
old honey or slipware glaze, so deleting it leaves nothing to scale against. What potters and
references do is give lead's work to boron (from calcium-borosilicate frits) and other fluxes,
with boron set by the firing: Matt Katz's rule of at least 0.1 B₂O₃ for every 50 °C below
1300 °C, about 0.5 at cone 04 and 0.6 at cone 06, near Digitalfire's "0.5 molar parts" at cone 06.
No other glaze program found hides or blocks lead.

## Decision

- **A Lead setting, off unless chosen.** Off, materials with lead are not listed to add and are
  never suggested; recipes that already have lead still open, with a warning. Turning it on asks
  once, with the handling and food-contact warning.
- **Replace lead,** on any recipe with lead, asks the cone (04 to start), how, and which lead-free
  frit to build on:
  - **Rebuild the glaze** (`leadFreeTarget` in `lib/chemistry/lead.js`): silica kept, alumina kept
    but at least 0.2, lead's share of the fluxes handed to soda and potash up to 0.3 together, then
    calcium up to 0.6, then at most 0.1 each of zinc, strontium and magnesium (no zinc or magnesia
    with chrome), and boron at least Katz's for the cone. The fluxes keep their total, so alumina
    and silica keep their unity values.
  - The amounts are fitted to that by the solver of ADR 10, with boron, alumina, soda and potash
    together and the fluxes' total matched closely and the calcium group loosely. The lines are the
    recipe's other materials, the chosen base frit, one alkali frit sold where the base is, kaolin
    and silica if the recipe has none, and raw whiting and zinc oxide at most 5% each (they barely
    melt at low fire). The result is scaled to the old batch's total, since lead is heavy.
  - **Keep the colour on a lead-free base:** the frit and kaolin, 85 to 15, with the recipe's
    colorants, which is how documented conversions were done.
  - Base frits are lead-free borosilicates (10 to 35% B₂O₃, at least 40% silica) sold in the
    chosen region, ranked by how near a rebuild on each comes; calcium borate frits are boron
    supplements, not bases.
- **The note says what to expect:** colours that need lead (Naples yellow, chrome reds), copper
  turning bluer, manganese plum, iron honey glazes less warm, possible clouding, crazing and
  "boron blue" haze, and that having no lead does not by itself make ware safe with food. Wording
  never calls fired ware "food-safe" or "lead-free".

## Consequences

- With lead off by default, the four raw lead records keep their lead frit substitutes for anyone
  who turns lead on, and Replace lead is the lead-free route for everyone.
- The rebuilt glaze matches the target formula closely (within 0.03 on each main oxide in the
  tests), but it will not look like the lead glaze: less gloss and clarity, and expansion that can
  differ. Compare now shows each recipe's calculated thermal expansion (lib/chemistry/expansion.js:
  weight percent times Digitalfire's coefficients, as Insight and Glazy calculate it), and the note
  says when it rises, since crazing is the commonest failure of a converted glaze.
- The split of lead's share (0.3, 0.6, 0.1) and the base frit limits are judgment from the limit
  formulas in the research, not a published rule; they live in `lib/chemistry/lead.js` and
  `client/app/pages/recipe/lead.ts`, with tests.
