import {
  OXIDE_GROUPS,
  bestFit,
  calculateUMF,
  fitAmounts,
  molesPerGram,
  oxideMoles,
  selectMaterials
} from '../../../../lib/chemistry';
import { Additive, Material, RecipeMaterial } from '../../core/models';
import { pastLimits, rawClayPercent, sizeNotes } from './checks';
import { LibraryMaterial, Swap, modernMaterials } from './compare';
import { Report, TryMaterial, explain, oxideLabel, oxidePercent, placesFor, recipeFrom, suggestable } from './pool';
import { amountOf } from './rebase';

export { oxideLabel, oxidePercent };

// Suggested amounts for swaps that are not like for like (docs/adr/0010 and
// 0012): the modern materials, the rest of the recipe and any materials the
// potter brings in or adds to try, at the amounts that bring the old recipe's
// unity formula back while changing it as little as they can. When a swap
// leaves an oxide the old material gave well short, the potter chooses what
// brings it back.

/** An oxide at less than this in the unity formula is a trace, not worth asking about. */
const SMALLEST_ASKED = 0.02;
/** Short means under 90% of what the old recipe had. */
const SHORT = 0.9;
/** A material that brings an oxide back has at least 3% of it by weight. */
const LEAST_PERCENT = 3;
/** Up to three choices for each, the ones that fit best. */
const CHOICES = 3;
/** A material brought in or tried is worth at least 1% of the batch, or nothing. */
const LEAST_SHARE = 0.01;

/** A material that could bring a short oxide back. */
export interface Choice {
  name: string;
  /** Its weight percent of the oxide: G-200 EU Feldspar has 11% K₂O. */
  percent: number;
}

/** An oxide the old materials gave that the swap leaves well short. */
export interface Shortfall {
  oxide: string;
  /** The old materials that gave it, and what replaces them. */
  from: string[];
  instead: string[];
  /** In the unity formula: in the old recipe, and with the swap. */
  was: number;
  now: number;
  choices: Choice[];
}

export interface Plan {
  swaps: Swap[];
  shortfalls: Shortfall[];
}

export interface Suggestion {
  materials: RecipeMaterial[];
  /** What changed, for the new recipe's notes: "China Clay 20 → 5.8", "G-200 EU Feldspar 33, new". */
  changes: string[];
  /** Replacements the fit had no use for: "Ferro Frit 3110". */
  unused: string[];
  /** Oxides still well short after all. */
  stillShort: string[];
  /** What each material does, and what else could have been. */
  report: Report;
  /** What to watch for: limits newly crossed, many materials, small amounts. */
  cautions: string[];
}

/** Whether materials with lead may be suggested: the account's lead setting. */
export interface LeadOption {
  allowLead?: boolean;
}

/** More to work with: materials the potter adds to try, and names to leave out. */
export interface Extras {
  tries?: TryMaterial[];
  avoid?: string[];
  additives?: Additive[];
}

interface Line {
  material: RecipeMaterial;
  start: number;
}

/** The fluxes of a set of oxide moles: the unity formula's one mole. */
function fluxesOf(moles: Record<string, number>): number {
  return Object.entries(moles).reduce(
    (sum, [oxide, amount]) => (OXIDE_GROUPS[oxide] === 'R2O' || OXIDE_GROUPS[oxide] === 'RO' ? sum + amount : sum),
    0
  );
}

/** The unity formula of oxide moles. */
const unityOf = (moles: Record<string, number>): Record<string, number> => {
  const fluxes = fluxesOf(moles);
  return Object.fromEntries(Object.entries(moles).map(([oxide, amount]) => [oxide, fluxes > 0 ? amount / fluxes : 0]));
};

/** The old recipe's oxides, the modern materials one for one, and the swaps. */
function setUp(
  lines: RecipeMaterial[],
  find: (name: string) => LibraryMaterial | undefined,
  region: string,
  options: LeadOption
) {
  const { materials, swaps } = modernMaterials(lines, find, region, options);
  const target = oxideMoles(lines.map((line) => ({ material: line, amount: amountOf(line.amount) })));
  const modern: Line[] = materials.map((material) => ({ material, start: amountOf(material.amount) }));
  return { target, modern, swaps };
}

/** Oxides the old materials gave that come out well short, with what came out. */
function shortOf(
  target: Record<string, number>,
  moles: Record<string, number>,
  old: RecipeMaterial[]
): Array<{ oxide: string; was: number; now: number; from: string[] }> {
  const fluxes = fluxesOf(target);
  if (!(fluxes > 0)) return [];
  const result = [];
  for (const [oxide, amount] of Object.entries(target)) {
    const was = amount / fluxes;
    const now = (moles[oxide] ?? 0) / fluxes;
    if (was < SMALLEST_ASKED || now >= SHORT * was) continue;
    // Only what the swapped-out materials gave: the rest of the recipe is still there.
    const from = old.filter((material) => {
      const given = (molesPerGram(material)[oxide] ?? 0) * amountOf(material.amount);
      return given >= 0.1 * amount;
    });
    if (from.length) result.push({ oxide, was, now, from: from.map((material) => material.name) });
  }
  return result;
}

/**
 * What a suggestion needs to ask first: for each oxide the old materials gave
 * that the modern ones leave well short (once the amounts are worked out), the
 * current standard materials sold in the region that could bring it back,
 * best first (ranked on the plain best match, which is fast). No shortfalls:
 * nothing to ask.
 */
export function planSuggestion(
  lines: RecipeMaterial[],
  find: (name: string) => LibraryMaterial | undefined,
  standard: LibraryMaterial[],
  region: string,
  { allowLead = false }: LeadOption = {}
): Plan {
  const { target, modern, swaps } = setUp(lines, find, region, { allowLead });
  const replaced = new Set(swaps.map((swap) => swap.from));
  const old = lines.filter((line) => replaced.has(line.name));
  const first = fitAmounts(modern, target);
  const inRecipe = new Set(modern.map((line) => line.material.name));
  const shortfalls = shortOf(target, first.moles, old).map(({ oxide, was, now, from }) => {
    const instead = swaps.filter((swap) => from.includes(swap.from)).map((swap) => swap.to);
    const choices = standard
      .filter(
        (material) =>
          suggestable(material, { region, allowLead }) &&
          !inRecipe.has(material.name) &&
          oxidePercent(material, oxide) >= LEAST_PERCENT
      )
      .map((material) => ({
        name: material.name,
        percent: oxidePercent(material, oxide),
        miss: bestFit([...modern, { material, start: 0 }], target).miss
      }))
      .sort((a, b) => a.miss - b.miss)
      .slice(0, CHOICES)
      .map(({ name, percent }) => ({ name, percent: Math.round(percent) }));
    return { oxide, from, instead: [...new Set(instead)], was, now, choices };
  });
  return { swaps, shortfalls };
}

/**
 * The suggested recipe: the modern materials and the rest of the recipe (all
 * kept, at amounts changed as little as possible), any materials brought in
 * (used), and any the potter added to try (used if they help, fewest first).
 * An amount that did not change keeps its text; others are rounded to about
 * four figures of the batch. A replacement the fit has no use for is left out.
 */
export function suggestAmounts(
  lines: RecipeMaterial[],
  find: (name: string) => LibraryMaterial | undefined,
  bringIn: Material[],
  region: string,
  { allowLead = false, tries = [], avoid = [], additives = [] }: LeadOption & Extras = {}
): Suggestion {
  const { target, modern, swaps } = setUp(lines, find, region, { allowLead });
  const total = modern.reduce((sum, line) => sum + line.start, 0);
  const places = placesFor(total);
  const inRecipe = new Set(modern.map((line) => line.material.name));
  const added = (material: Material, must: boolean): Line & { must: boolean; least: number } => ({
    material: { ...structuredClone(material), amount: '' },
    start: 0,
    must,
    least: LEAST_SHARE * total
  });
  const offered = [
    ...bringIn.filter((m) => !inRecipe.has(m.name)).map((m) => added(m, true)),
    ...tries
      .filter((t) => !inRecipe.has(t.material.name) && !bringIn.some((m) => m.name === t.material.name))
      .map((t) => added(t.material, t.must))
  ];
  const all = [...modern, ...offered].map((line) => ({ ...line, avoid: avoid.includes(line.material.name) }));
  const selection = selectMaterials(all, target, { keepOwn: true });
  const replacements = new Set(swaps.map((swap) => swap.to));
  const { materials, changes, unused } = recipeFrom(selection, all, replacements, places);
  const replaced = new Set(swaps.map((swap) => swap.from));
  const stillShort = shortOf(
    target,
    selection.moles,
    lines.filter((line) => replaced.has(line.name))
  ).map((short) => oxideLabel(short.oxide));
  const expansionOf = (recipe: RecipeMaterial[]) => {
    try {
      return calculateUMF(recipe.map((line) => ({ material: line, amount: amountOf(line.amount) }))).expansion;
    } catch {
      return null;
    }
  };
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
  return { materials, changes, unused, stillShort, report: explain(selection, all, places), cautions };
}
