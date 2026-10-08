import { MOLAR_MASS, Selection, formatFormula, molesPerGram } from '../../../../lib/chemistry';
import { Material, RecipeMaterial } from '../../core/models';
import { hasLead, inRegion } from '../../shared/library-info';
import { LibraryMaterial } from './compare';
import { amountOf, formatAmount } from './rebase';

// What a substitution may offer, and how it explains what it chose
// (docs/adr/0012-choosing-materials.md).

/** What potters call the oxides. */
const OXIDE_NAMES: Record<string, string> = {
  K2O: 'potash',
  Na2O: 'soda',
  Li2O: 'lithium',
  CaO: 'calcium',
  MgO: 'magnesium',
  BaO: 'barium',
  SrO: 'strontium',
  ZnO: 'zinc',
  PbO: 'lead',
  B2O3: 'boron',
  Al2O3: 'alumina',
  SiO2: 'silica',
  P2O5: 'phosphorus',
  Fe2O3: 'iron',
  TiO2: 'titanium',
  ZrO2: 'zirconium'
};

/** "potash (K₂O)", or the formula alone for an oxide without a common name. */
export const oxideLabel = (oxide: string): string =>
  OXIDE_NAMES[oxide] ? `${OXIDE_NAMES[oxide]} (${formatFormula(oxide)})` : formatFormula(oxide);

/** "potash", or the formula for an oxide without a common name. */
export const oxideName = (oxide: string): string => OXIDE_NAMES[oxide] ?? formatFormula(oxide);

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

const share = (part: number): string =>
  part >= 0.97 ? 'all the' : part >= 0.75 ? 'most of the' : `${Math.round(part * 100)}% of the`;

/** The words for what a material supplies: "all the potash and 71% of the alumina". */
function suppliesText(supplies: Array<{ oxide: string; share: number }>): string {
  if (!supplies.length) return 'a little of the glaze';
  const parts = supplies.slice(0, 3).map((part) => `${share(part.share)} ${oxideName(part.oxide)}`);
  return parts.length > 1 ? parts.slice(0, -1).join(', ') + ' and ' + parts.at(-1) : parts[0];
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
      amount: formatAmount(selection.amounts[c.index], places),
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
        else changes.push(`${name} ${formatAmount(line.start, places)} → 0`);
      }
      return;
    }
    materials.push({ ...line.material, amount: text });
    if (fresh) changes.push(`${name} ${text}, new`);
    else if (amountOf(text) !== line.start) changes.push(`${name} ${formatAmount(line.start, places)} → ${text}`);
  });
  return { materials, changes, unused };
}
