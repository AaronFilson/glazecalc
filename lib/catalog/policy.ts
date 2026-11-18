// The app's own choices the core is given in its host (host.policy) and never holds
// (docs/adr/0031-functional-core.md): which markets a region's library lists, and cone fit's margins and
// cut-offs. With them, the range a recipe's target SG is kept in, which the app checks a record against.

import type { Policy } from '../core/host.ts';

/**
 * The other markets whose materials a region's library lists beside its own. Japan's lists the US
 * set too: Japanese potters picked from it before Japan had materials of its own, and none of those
 * should go missing now that it has (the owner's decision, 2026-11-12; docs/asia-plan.md, decision 5).
 */
const ALSO_LISTS: Readonly<Record<string, ReadonlyArray<string>>> = Object.freeze({ JP: Object.freeze(['US']) });

/**
 * Cone fit's margins and cut-offs (lib/core/recipe/cone-fit.ts). Boron's margins around Katz's need are
 * the research report's, chosen on Glazy's glazes: a smaller margin for "cooler" (0.20) tripled the false
 * notes at cone 10, and testing alumina for "hotter" raised them at cone 6 to 6%, as mattes are often high
 * in it. Silica's most at low fire is the UK traditional limits' cone 04–02 figure (Hesselberth & Roy
 * have none).
 */
const CONE_FIT_POLICY = Object.freeze({
  boronOver: 0.3,
  boronUnder: 0.15,
  lowFireSilicaMost: 3.0,
  lead: 0.05,
  lithium: 0.1,
  alkali: 0.45,
  zinc: 0.3,
  silica: Object.freeze({ min: 1, max: 8 }),
  colorants: 0.5
});

/** The choices as the core's host takes them (host.policy). */
const POLICY: Policy = Object.freeze({ alsoLists: ALSO_LISTS, coneFit: CONE_FIT_POLICY });

/** The SG a recipe may keep as its target (`sgTarget`): water is 1, no slurry is thicker than 2.5. */
const SG_TARGET_RANGE = Object.freeze({ min: 1, max: 2.5 });

export { ALSO_LISTS, CONE_FIT_POLICY, POLICY, SG_TARGET_RANGE };
