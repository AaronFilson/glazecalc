import { idOf, labelOf, IDS } from '../identity.ts';
import { bestFit, fitAmounts, molesPerGram, newMeter } from '../chemistry/index.ts';
import { spent } from '../chemistry/fit.ts';
import { amountOf } from './amounts.ts';
import { pastLimits, rawClayPercent, sizeNotes } from './checks.ts';
import { suggestable } from './library.ts';
import { expansionOf, fluxesOf, molesOf, oxidePercent, unityOf } from './materials.ts';
import { RecipeError } from './messages.ts';
import { addingUp, explain, placesFor, recipeFrom, selectHoldingClay } from './pool.ts';
import { modernMaterials } from './swaps.ts';
import type { Meter, Oxides } from '../types.ts';
import type { AdditiveRecord, MaterialRecord, TryMaterial } from './library.ts';
import type { Caution, RecipeMessage } from './messages.ts';
import type { Report } from './pool.ts';
import type { Swap } from './swaps.ts';

/** A material that could bring a short oxide back (labelOf), with its weight percent of the oxide. */
export interface Choice {
  name: unknown;
  percent: number;
}

/** An oxide the old materials gave that the swap leaves well short. */
export interface Shortfall {
  oxide: string;
  /** The old materials that gave it (labelOf), and what replaces them. */
  from: unknown[];
  instead: unknown[];
  /** In the unity formula: in the old recipe, and with the swap. */
  was: number;
  now: number;
  choices: Choice[];
}

export interface Plan {
  swaps: Swap[];
  shortfalls: Shortfall[];
}

export interface Suggestion<M extends MaterialRecord = MaterialRecord> {
  materials: M[];
  /** What changed, for the new recipe's notes. */
  changes: RecipeMessage[];
  /** Replacements the fit had no use for (labelOf). */
  unused: unknown[];
  /** Oxides (formulas) still well short after all. */
  stillShort: string[];
  report: Report;
  /** What to watch for: limits newly crossed, many materials, small amounts. */
  cautions: Caution[];
}

/** An oxide come out short, with the old materials that gave it: labels, and their ids (idOf) not enumerable. */
interface Short {
  oxide: string;
  was: number;
  now: number;
  from: unknown[];
  readonly [IDS]: { from: unknown[] };
}

/** How swaps are found: a record's library record, or a substitute's by its reference (modernMaterials). */
type Find<M> = (wanted: M | string) => M | undefined;

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

/** The old recipe's oxides, the modern materials one for one, and the swaps. */
function setUp<M extends MaterialRecord>(lines: M[], find: Find<M>, region: string, options: { allowLead?: boolean }) {
  const { materials, swaps } = modernMaterials(lines, find, region, options);
  const target = molesOf(lines);
  const modern = materials.map((material): { material: M; start: number; least?: number } => ({
    material,
    start: amountOf(material.amount)
  }));
  return { target, modern, swaps };
}

/** Oxides the old materials gave that come out well short, with what came out. */
function shortOf(target: Oxides, moles: Oxides, old: MaterialRecord[]): Short[] {
  const fluxes = fluxesOf(target);
  if (!(fluxes > 0)) return [];
  const result: Short[] = [];
  for (const [oxide, amount] of Object.entries(target)) {
    const was = amount / fluxes;
    const now = (moles[oxide] ?? 0) / fluxes;
    if (was < SMALLEST_ASKED || now >= SHORT * was) continue;
    // Only what the swapped-out materials gave: the rest of the recipe is still there.
    const from = old.filter((material) => {
      const given = (molesPerGram(material)[oxide] ?? 0) * amountOf(material.amount);
      return given >= 0.1 * amount;
    });
    if (from.length) {
      const short = { oxide, was, now, from: from.map(labelOf) };
      Object.defineProperty(short, IDS, { value: { from: from.map(idOf) } });
      result.push(short as Short);
    }
  }
  return result;
}

/**
 * What a suggestion needs to ask first: for each oxide the old materials gave
 * that the modern ones leave well short (once the amounts are worked out), the
 * current standard materials sold in the region that could bring it back,
 * best first (ranked on the plain best match, which is fast). No shortfalls:
 * nothing to ask. Its work is counted on one meter (lib/chemistry newMeter),
 * the caller's if given; once it is spent, the ranking stops, and those not
 * yet ranked follow the ones that were, in the order given. The amounts are
 * worked out on a meter of their own (suggestAmounts), on the page and in the
 * MCP tools alike, so both give the same answer.
 */
function planSuggestion<M extends MaterialRecord>(
  lines: M[],
  find: Find<M>,
  standard: M[],
  region: string,
  { allowLead = false, meter = newMeter() }: { allowLead?: boolean; meter?: Meter } = {}
): Plan {
  const { target, modern, swaps } = setUp(lines, find, region, { allowLead });
  const replaced = new Set(swaps.map((swap) => swap[IDS].from));
  const old = lines.filter((line) => replaced.has(idOf(line)));
  const first = fitAmounts(modern, target, { meter });
  const inRecipe = new Set(modern.map((line) => idOf(line.material)));
  const shortfalls = shortOf(target, first.moles, old).map(({ oxide, was, now, from, [IDS]: ids }) => {
    const instead = swaps.filter((swap) => ids.from.includes(swap[IDS].from)).map((swap) => swap.to);
    const choices = standard
      .filter(
        (material) =>
          suggestable(material, { region, allowLead }) &&
          !inRecipe.has(idOf(material)) &&
          oxidePercent(material, oxide) >= LEAST_PERCENT
      )
      .map((material) => ({
        name: labelOf(material),
        percent: oxidePercent(material, oxide),
        // Once the work is spent, the rest are not fitted: after those that were, in the library's order.
        miss: spent(meter) ? Infinity : bestFit([...modern, { material, start: 0 }], target, { meter }).miss
      }))
      .sort((a, b) => (a.miss === b.miss ? 0 : a.miss - b.miss))
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
 * Raw clay is held as Match with what I have holds it (selectHoldingClay), but
 * for clays named in `uncapped`. `meter` bounds the work (lib/chemistry
 * newMeter; a new one, with the library's own bound, if not given). Throws a
 * RecipeError, 'solve.noFlux', when the recipe has no flux (of: 'recipe') or
 * none of the materials it may use has one (of: 'offered').
 */
function suggestAmounts<M extends MaterialRecord>(
  lines: M[],
  find: Find<M>,
  bringIn: M[],
  region: string,
  {
    allowLead = false,
    tries = [],
    avoid = [],
    additives = [],
    uncapped = [],
    meter = newMeter()
  }: {
    allowLead?: boolean;
    tries?: TryMaterial<M>[];
    avoid?: unknown[];
    additives?: AdditiveRecord[];
    uncapped?: unknown[];
    meter?: Meter;
  } = {}
): Suggestion<M> {
  const { target, modern, swaps } = setUp(lines, find, region, { allowLead });
  if (!(fluxesOf(target) > 0)) throw new RecipeError('solve.noFlux', { of: 'recipe' });
  const total = modern.reduce((sum, line) => sum + line.start, 0);
  const places = placesFor(total);
  const inRecipe = new Set(modern.map((line) => idOf(line.material)));
  const added = (material: M, must: boolean) => ({
    material: { ...structuredClone(material), amount: '' },
    start: 0,
    must,
    least: LEAST_SHARE * total
  });
  const offered = [
    ...bringIn.filter((m) => !inRecipe.has(idOf(m))).map((m) => added(m, true)),
    ...tries
      .filter((t) => !inRecipe.has(idOf(t.material)) && !bringIn.some((m) => idOf(m) === idOf(t.material)))
      .map((t) => added(t.material, t.must))
  ];
  const oldClay = rawClayPercent(lines);
  const { selection: chosen, lines: all } = selectHoldingClay(
    [...modern, ...offered].map((line) => ({ ...line, avoid: avoid.includes(idOf(line.material)) })),
    target,
    { keepOwn: true, oldClay, batch: total, uncapped, meter }
  );
  if (!(fluxesOf(chosen.moles) > 0)) throw new RecipeError('solve.noFlux', { of: 'offered' });
  // The amounts as shown add up to the new batch's total, as they come to (one that did not change shown as it was).
  const unchanged = (i: number) => chosen.amounts[i] === all[i].start && all[i].start > 0;
  const newTotal = chosen.amounts.reduce((sum, amount) => sum + amount, 0);
  const selection = addingUp(chosen, places, newTotal, unchanged, (i) => Number(all[i].least) || 0);
  const replacements = new Set(swaps.map((swap) => swap[IDS].to));
  const { materials, changes, unused } = recipeFrom(selection, all, replacements, places);
  const replaced = new Set(swaps.map((swap) => swap[IDS].from));
  const stillShort = shortOf(
    target,
    selection.moles,
    lines.filter((line) => replaced.has(idOf(line)))
  ).map((short) => short.oxide);
  const cautions = [
    ...pastLimits({
      lines: materials.map((material) => ({ material, amount: material.amount })),
      unity: unityOf(selection.moles),
      old: unityOf(target),
      oldClay,
      additives,
      expansion: { was: expansionOf(lines), now: expansionOf(materials) }
    }),
    ...sizeNotes(materials.map((material) => ({ material, amount: material.amount })))
  ];
  return {
    materials,
    changes,
    unused,
    stillShort,
    report: explain(selection, all, places, target, newTotal),
    cautions
  };
}

export { planSuggestion, suggestAmounts };
