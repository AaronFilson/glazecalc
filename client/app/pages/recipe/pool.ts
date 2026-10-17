import { translate } from '@jsverse/transloco';
import { marker } from '@jsverse/transloco-keys-manager/marker';
import { Selection, formatFormula } from '../../../../lib/chemistry';
import * as recipe from '../../../../lib/recipe';
import { Material, RecipeMaterial } from '../../core/models';
import { listOf, upTo } from '../../shared/format';
import { figureText, recipeText } from './recipe-messages';

// What a substitution may offer, and how it explains what it chose
// (docs/adr/0012-choosing-materials.md). The choosing is shared with the
// server (lib/recipe/pool.js); this puts its explanation in the page's language.

/** What potters call the oxides (their messages' keys). */
const OXIDE_NAMES: Record<string, string> = {
  K2O: marker('recipe.pool.oxideNames.K2O'),
  Na2O: marker('recipe.pool.oxideNames.Na2O'),
  Li2O: marker('recipe.pool.oxideNames.Li2O'),
  CaO: marker('recipe.pool.oxideNames.CaO'),
  MgO: marker('recipe.pool.oxideNames.MgO'),
  BaO: marker('recipe.pool.oxideNames.BaO'),
  SrO: marker('recipe.pool.oxideNames.SrO'),
  ZnO: marker('recipe.pool.oxideNames.ZnO'),
  PbO: marker('recipe.pool.oxideNames.PbO'),
  B2O3: marker('recipe.pool.oxideNames.B2O3'),
  Al2O3: marker('recipe.pool.oxideNames.Al2O3'),
  SiO2: marker('recipe.pool.oxideNames.SiO2'),
  P2O5: marker('recipe.pool.oxideNames.P2O5'),
  Fe2O3: marker('recipe.pool.oxideNames.Fe2O3'),
  TiO2: marker('recipe.pool.oxideNames.TiO2'),
  ZrO2: marker('recipe.pool.oxideNames.ZrO2')
};

/** "potash (K₂O)", or the formula alone for an oxide without a common name; in the page's language. */
export const oxideLabel = (oxide: string): string =>
  OXIDE_NAMES[oxide]
    ? translate('recipe.pool.oxideLabel', { name: translate(OXIDE_NAMES[oxide]), formula: formatFormula(oxide) })
    : formatFormula(oxide);

/** "potash", or the formula for an oxide without a common name; in the page's language. */
export const oxideName = (oxide: string): string =>
  OXIDE_NAMES[oxide] ? translate(OXIDE_NAMES[oxide]) : formatFormula(oxide);

// Whether the app may suggest a material, and how much of an oxide one brings (lib/recipe/materials.js).
export { isIdealMineral, oxidePercent, placesFor, suggestable } from '../../../../lib/recipe';

/** A material the potter added to try, perhaps marked "must use". */
export interface TryMaterial {
  material: Material;
  must: boolean;
}

/** What one chosen material does, in words. */
export interface Use {
  name: string;
  amount: string;
  /** "all the potash and 71% of the alumina", or "a little of the silica". */
  supplies: string;
  /** Whether the match gets noticeably worse without it. */
  needed: boolean;
  /** Whether the app requires it (the base frit in place of lead, the clay that keeps a glaze suspended). */
  fixed: boolean;
}

/** A substitution's explanation: what each material does, and what else could have been. */
export interface Report {
  uses: Use[];
  /** Materials offered but not used that would bring the match closer: "Redart, by 0.10". */
  couldHelp: Array<{ name: string; helps: number }>;
  /** Near-identical pairs: the one used, and another that could stand in for it. */
  alike: Array<{ used: string; other: string }>;
  /**
   * Caps that cost match, as percents of the batch: "a closer match needs 7%
   * whiting, more than the 5% suggested". A shared cap names its group and
   * all its members.
   */
  capped: Array<{ name: string; most: number; wouldBe: number; group?: string; members: string[]; why: string }>;
  /** Oxides the old recipe has that nothing offered supplies. */
  unreachable: string[];
  /** How much worse the match is for the limit on new materials, if it cost anything. */
  countCost: number;
  /** How near the result comes: the miss, and the best the materials could do. */
  miss: number;
  best: number;
}

/** How much of an oxide a material supplies: "all the potash", "most of the soda", "71% of the alumina". */
function shareOf({ oxide, share }: { oxide: string; share: number }): string {
  const name = oxideName(oxide);
  if (share >= 0.97) return translate('recipe.pool.suppliesAll', { oxide: name });
  if (share >= 0.75) return translate('recipe.pool.suppliesMost', { oxide: name });
  return translate('recipe.pool.suppliesShare', { oxide: name, percent: upTo(Math.round(share * 100), 0) });
}

/** The words for what a material supplies: "all the potash and 71% of the alumina". */
function suppliesText(supplies: Array<{ oxide: string; share: number }>): string {
  if (!supplies.length) return translate('recipe.pool.suppliesLittle');
  return listOf(supplies.slice(0, 3).map(shareOf));
}

/** A shared report (lib/recipe) in the page's language. */
export function reportText(report: recipe.Report): Report {
  return {
    ...report,
    uses: report.uses.map((use) => ({ ...use, amount: figureText(use.amount), supplies: suppliesText(use.supplies) })),
    capped: report.capped.map(({ why, ...cap }) => ({ ...cap, why: why ? recipeText(why) : '' }))
  };
}

/** A selection's explanation, for the lines it chose from. */
export function explain(
  selection: Selection,
  lines: Array<{ material: Material; fixed?: boolean }>,
  places: number
): Report {
  return reportText(recipe.explain(selection, lines, places));
}

/**
 * The recipe a selection makes: its materials with amounts as text (an amount
 * left as it was keeps its text), and what changed, for the new recipe's notes
 * (lib/recipe/pool.js).
 */
export function recipeFrom(
  selection: Selection,
  lines: Array<{ material: RecipeMaterial; start: number; added?: boolean }>,
  replacements: Set<string>,
  places: number
): { materials: RecipeMaterial[]; changes: string[]; unused: string[] } {
  const made = recipe.recipeFrom(selection, lines, replacements, places);
  return { ...made, changes: made.changes.map(recipeText) };
}
