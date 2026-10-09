import { translate } from '@jsverse/transloco';
import { marker } from '@jsverse/transloco-keys-manager/marker';
import { MOLAR_MASS, Selection, formatFormula, molesPerGram } from '../../../../lib/chemistry';
import { Material, RecipeMaterial } from '../../core/models';
import { hasLead, inRegion } from '../../shared/library-info';
import { LibraryMaterial } from './compare';
import { amountOf, formatAmount } from './rebase';
import { formatPlain, listOf, upTo } from '../../shared/format';

// What a substitution may offer, and how it explains what it chose
// (docs/adr/0012-choosing-materials.md).

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

/** A material's weight percent of an oxide, as fired out of the raw material: G-200 EU Feldspar has 11% K₂O. */
export const oxidePercent = (material: Material, oxide: string): number => {
  try {
    return (molesPerGram(material)[oxide] ?? 0) * MOLAR_MASS[oxide] * 100;
  } catch {
    return 0;
  }
};

/**
 * A mineral as a formula (Orthoclase, China Clay, Spodumene (theoretical)), not
 * something to buy: the real feldspars and clays are offered instead. Pure
 * chemicals such as whiting and the carbonates are offered as they are.
 */
export const isIdealMineral = (material: Material): boolean =>
  material.source?.kind === 'theoretical' &&
  (material.category === 'feldspar' || material.category === 'clay' || material.name.includes('(theoretical)'));

export interface PoolOptions {
  region: string;
  allowLead?: boolean;
}

/**
 * Whether the app may suggest a material: current, sold in the region, not a
 * formula-only mineral, not water-soluble (borax, boric acid, soda ash), not a
 * fluorine source (fluorspar, cryolite), and without lead unless lead is on.
 * The potter can still add any material to try.
 */
export function suggestable(material: LibraryMaterial, { region, allowLead = false }: PoolOptions): boolean {
  return (
    (!material.status || material.status === 'current') &&
    inRegion(material, region) &&
    !isIdealMineral(material) &&
    !material.soluble &&
    !material.fluorine &&
    (allowLead || !hasLead(material))
  );
}

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

/** A selection's explanation, for the lines it chose from. */
export function explain(
  selection: Selection,
  lines: Array<{ material: Material; fixed?: boolean; why?: string }>,
  places: number
): Report {
  const name = (i: number) => lines[i].material.name;
  const used = new Set(selection.chosen);
  const total = selection.amounts.reduce((sum, amount) => sum + amount, 0);
  const percent = (amount: number) => (total > 0 ? (100 * amount) / total : 0);
  return {
    uses: selection.contributions.map((c) => ({
      name: name(c.index),
      amount: upTo(selection.amounts[c.index], places),
      supplies: suppliesText(c.supplies),
      needed: c.missWithout - selection.miss >= 0.1,
      fixed: !!lines[c.index].fixed
    })),
    couldHelp: selection.unused
      .filter((u) => u.helps >= 0.05)
      .sort((p, q) => q.helps - p.helps)
      .slice(0, 3)
      .map((u) => ({ name: name(u.index), helps: u.helps })),
    alike: selection.alike
      .filter((pair) => used.has(pair.used))
      .slice(0, 3)
      .map((pair) => ({ used: name(pair.used), other: name(pair.other) })),
    capped: selection.capped.map((c) => ({
      name: name(c.index),
      most: percent(c.most),
      wouldBe: percent(c.wouldBe),
      ...(c.group ? { group: c.group } : {}),
      members: (c.members ?? [c.index]).map(name),
      why: lines[c.index].why ?? ''
    })),
    unreachable: selection.unreachable,
    countCost: selection.countCost,
    miss: selection.miss,
    best: selection.best
  };
}

/** A change to the recipe, for its notes: "China Clay 20 → 5.8", "Niter 10 → 0". The amounts are written already. */
export const changeText = (name: string, from: string, to: string): string =>
  translate('recipe.pool.changed', { name, from, to });

/** A material new to the recipe, for its notes: "G-200 EU Feldspar 33, new". */
export const newText = (name: string, amount: string): string => translate('recipe.pool.added', { name, amount });

/** Rounding for new amounts: about four figures of the batch, one decimal place for a recipe of about 100. */
export const placesFor = (total: number): number => (total >= 50 ? 1 : total >= 5 ? 2 : 3);

/**
 * The recipe a selection makes: its materials with amounts as text (an amount
 * left as it was keeps its text), and what changed, for the new recipe's notes.
 * `replacements` are swapped-in materials: one the fit has no use for is "not
 * needed" rather than a change. A line marked `added` is new to the recipe
 * even if it starts with an amount (a base frit in place of the lead).
 */
export function recipeFrom(
  selection: Selection,
  lines: Array<{ material: RecipeMaterial; start: number; added?: boolean }>,
  replacements: Set<string>,
  places: number
): { materials: RecipeMaterial[]; changes: string[]; unused: string[] } {
  const materials: RecipeMaterial[] = [];
  const changes: string[] = [];
  const unused: string[] = [];
  lines.forEach((line, i) => {
    const amount = selection.amounts[i];
    const unchanged = amount === line.start && line.start > 0;
    const text = unchanged ? (line.material.amount ?? '') : formatAmount(amount, places);
    const name = line.material.name;
    const fresh = line.added || !(line.start > 0);
    if (amountOf(text) === 0) {
      if (!fresh) {
        if (replacements.has(name)) unused.push(name);
        else changes.push(changeText(name, upTo(line.start, places), upTo(0, 0)));
      }
      return;
    }
    materials.push({ ...line.material, amount: text });
    if (fresh) changes.push(newText(name, formatPlain(text)));
    else if (amountOf(text) !== line.start) changes.push(changeText(name, upTo(line.start, places), formatPlain(text)));
  });
  return { materials, changes, unused };
}
