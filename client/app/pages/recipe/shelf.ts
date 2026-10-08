import { OXIDE_GROUPS, calculateUMF, oxideMoles, selectMaterials } from '../../../../lib/chemistry';
import { Additive, RecipeMaterial } from '../../core/models';
import { pastLimits, rawClayPercent, sizeNotes } from './checks';
import { Report, TryMaterial, explain, placesFor, recipeFrom } from './pool';
import { amountOf, formatAmount, totalOf } from './rebase';

// Match with what I have (docs/adr/0012): a recipe made again from only the
// materials the potter has on hand, as few of them as come near its fired
// oxides. A material the recipe already uses stays near its amount.

/** A material brought in is worth at least 1% of the batch, or nothing. */
const LEAST_SHARE = 0.01;

export interface ShelfMatch {
  materials: RecipeMaterial[];
  /** What changed, for the new recipe's notes: "Whiting 20 → 18.1", "Minspar 200 31.2, new", "Niter 10 → 0". */
  changes: string[];
  report: Report;
  cautions: string[];
}

const fluxesOf = (moles: Record<string, number>): number =>
  Object.entries(moles).reduce(
    (sum, [oxide, amount]) => (OXIDE_GROUPS[oxide] === 'R2O' || OXIDE_GROUPS[oxide] === 'RO' ? sum + amount : sum),
    0
  );
const unityOf = (moles: Record<string, number>): Record<string, number> => {
  const fluxes = fluxesOf(moles);
  return Object.fromEntries(Object.entries(moles).map(([oxide, amount]) => [oxide, fluxes > 0 ? amount / fluxes : 0]));
};
const expansionOf = (lines: RecipeMaterial[]): number | null => {
  try {
    return calculateUMF(lines.map((line) => ({ material: line, amount: amountOf(line.amount) }))).expansion;
  } catch {
    return null;
  }
};

/**
 * The recipe made from the materials on the shelf only, on the old batch's
 * total, so colorants keep their share of it. Materials marked "must use"
 * stay in; names in `avoid` are left out.
 */
export function matchFromShelf(
  lines: RecipeMaterial[],
  shelf: TryMaterial[],
  { avoid = [], additives = [] }: { avoid?: string[]; additives?: Additive[] } = {}
): ShelfMatch {
  if (!shelf.length) throw new Error('There are no materials on hand to match with');
  const target = oxideMoles(lines.map((line) => ({ material: line, amount: amountOf(line.amount) })));
  const oldTotal = totalOf(lines.map((line) => line.amount));
  const places = placesFor(oldTotal);
  const old = new Map(lines.map((line) => [line.name, amountOf(line.amount)]));
  const pool = shelf.map((tried) => ({
    material: {
      ...structuredClone(tried.material),
      amount: old.has(tried.material.name) ? String(old.get(tried.material.name)) : ''
    },
    start: old.get(tried.material.name) ?? 0,
    must: tried.must,
    least: LEAST_SHARE * oldTotal,
    avoid: avoid.includes(tried.material.name)
  }));
  const selection = selectMaterials(pool, target);
  // On the old batch's total.
  const newTotal = selection.amounts.reduce((sum, amount) => sum + amount, 0);
  const scale = newTotal > 0 ? oldTotal / newTotal : 1;
  const scaled = {
    ...selection,
    amounts: selection.amounts.map((amount) => amount * scale),
    capped: selection.capped.map((c) => ({ ...c, most: c.most * scale, wouldBe: c.wouldBe * scale }))
  };
  const { materials, changes } = recipeFrom(scaled, pool, new Set(), places);
  const onShelf = new Set(shelf.map((tried) => tried.material.name));
  for (const line of lines) {
    if (!onShelf.has(line.name) && amountOf(line.amount) > 0) {
      changes.push(`${line.name} ${formatAmount(amountOf(line.amount), places)} → 0`);
    }
  }
  const cautions = [
    ...pastLimits({
      lines: materials.map((material) => ({ material, amount: material.amount })),
      unity: unityOf(selection.moles),
      old: unityOf(target),
      oldClay: rawClayPercent(lines),
      additives,
      expansion: { was: expansionOf(lines), now: expansionOf(materials) }
    }),
    ...sizeNotes(materials.map((material) => ({ material, amount: material.amount })))
  ];
  return { materials, changes, report: explain(scaled, pool, places), cautions };
}
