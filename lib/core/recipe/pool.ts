import { idOf, labelOf } from '../identity.ts';
import type { Identity } from '../identity.ts';
import { closeness, newMeter, selectMaterials } from '../chemistry/index.ts';
import { amountOf, formatAmount } from './amounts.ts';
import { isRawClay, rawClayHigh } from './checks.ts';
import { CHECK_LIMITS } from './limits.ts';
import { say, plainFigure, upTo } from './messages.ts';
import type { Oxides, SelectLine, SelectOptions } from '../types.ts';
import type { Selection } from '../chemistry/select.ts';
import type { Closeness } from '../chemistry/closeness.ts';
import type { MaterialRecord, TryMaterial } from './library.ts';
import type { Figure, RecipeMessage } from './messages.ts';
import type { Host } from '../host.ts';

/** What one chosen material does. */
export interface Use {
  /** labelOf the material. */
  name: unknown;
  amount: Figure;
  /** The oxides it supplies, and its share of each, largest first. */
  supplies: Array<{ oxide: string; share: number }>;
  /** Whether the match gets noticeably worse without it. */
  needed: boolean;
  /** Whether the app requires it (the base frit in place of lead, the clay that keeps a glaze suspended). */
  fixed: boolean;
}

/** A substitution's explanation: what each material does, and what else could have been. Names are labelOf's. */
export interface Report {
  uses: Use[];
  /** Materials offered but not used that would bring the match closer, and by how much. */
  couldHelp: Array<{ name: unknown; helps: number }>;
  /** Near-identical pairs: the one used, and another that could stand in for it. */
  alike: Array<{ used: unknown; other: unknown }>;
  /**
   * Caps that cost match, as percents of the batch; a shared cap names its group and all its members.
   * A shared cap the recipe could not keep is broken, its wouldBe what the members come to.
   */
  capped: Array<{
    name: unknown;
    most: number;
    wouldBe: number;
    group?: string;
    members: unknown[];
    why?: RecipeMessage;
    broken?: true;
  }>;
  /** Oxides the old recipe has that nothing offered supplies. */
  unreachable: string[];
  /** How much worse the match is for the limit on new materials, if it cost anything. */
  countCost: number;
  /** How near the result comes: the miss, and the best the materials could do. */
  miss: number;
  best: number;
  /** And oxide by oxide, in the unity formula, when the target was given. */
  closeness?: Closeness;
  /** Present when the work allowed ran out before every choice was tried: the best found by then. */
  cutShort?: true;
}

/** A line a selection was made from, as the recipe tools give it: fixed, a held cap's why, added. */
export interface PoolLine extends SelectLine {
  material: MaterialRecord;
  fixed?: boolean;
  why?: RecipeMessage;
  added?: boolean;
}

// How a substitution explains what it chose, and the recipe it makes
// (docs/adr/0012-choosing-materials.md).

/**
 * Rounding for new amounts: about four figures of the batch, one decimal place for a recipe of about 100,
 * and for a batch under 0.1 as many as keep 1% of it, the least a material brought in is given, from being
 * written as 0. Without them a batch of 0.0005 came to 0 of every amount that changed.
 */
const placesFor = (total: number): number =>
  Math.max(total >= 50 ? 1 : total >= 5 ? 2 : 3, total > 0 ? Math.ceil(-Math.log10(total)) + 2 : 0);

/** A change to the recipe, for its notes: "China Clay 20 → 5.8", "Niter 10 → 0". */
const changed = (name: Identity | undefined, from: Figure | string, to: Figure | string): RecipeMessage =>
  say('pool.changed', { name, from, to });

/** A material new to the recipe, for its notes: "G-200 EU Feldspar 33, new". */
const added = (name: Identity | undefined, amount: Figure | string): RecipeMessage =>
  say('pool.added', { name, amount });

/** A material taken out of the recipe: "Niter 10 → 0". */
const removed = (name: Identity | undefined, amount: number, places: number): RecipeMessage =>
  changed(name, upTo(amount, places), upTo(0, 0));

/**
 * Whether a material offered is a last resort for the choosing (lastResort in
 * lib/chemistry/select.js), used only where nothing else comes as near: a
 * fluorine source (fluorspar, cryolite) or a soluble one (borax, boric acid,
 * soda ash), which Suggest and the famous glazes' versions leave out
 * (suggestable, library.js), unless the potter marked it "must use". Offered
 * with whiting, fluorspar does not bring a glaze's calcium.
 */
const lastResort = (tried: TryMaterial): boolean =>
  !tried.must && !!(tried.material.fluorine || tried.material.soluble);

/** The share cap raw clay is held to. */
const RAW_CLAY = 'raw clay';
// Raw clay kept, at least: 10% of the batch, or what the recipe had if less,
// so the glaze stays suspended (as Replace lead keeps it, lead.js).
const CLAY_LEAST_SHARE = 0.1;
// Holding raw clay may cost the match this much at most (half of one oxide
// off by "near", lib/chemistry/fit.js): enough for a calcined clay on hand,
// or another source of alumina, to take up the rest; not alumina a sixth short.
const CLAY_HOLD_COST = 0.5;

/**
 * The materials chosen (selectMaterials), raw clay held where that keeps the
 * match about as near: at most the share past which the app's check cautions
 * (20% of the batch, or the old recipe's share if it had more), and at least
 * 10% of the batch (or the recipe's clay, if less) from the recipe's own main
 * raw clay when it is on hand. Then a calcined clay, or another source of
 * alumina, takes up the rest, and calcined kaolin does not take the place of
 * all the raw clay, rather than the match suggesting a glaze its own check
 * says will crack and crawl, or settle in the bucket. Where only raw clay can
 * bring the alumina back, the chemistry comes first, and the check says to
 * swap part of it for calcined kaolin. A raw clay the potter lifted the cap
 * from with Allow more (`uncapped`, by name) is not capped.
 *
 *   lines    as selectMaterials', start > 0 for the recipe's own
 *   options  as selectMaterials', and { oldClay: the recipe's raw clay as a
 *            percent of its batch, batch: that batch's total (the lines'
 *            starts together if not given), uncapped }
 *
 * Returns the selection and the lines it chose from: a capped clay's line
 * names the cap and says why, for the report. Both choosings share one
 * meter, so holding the clay takes no more work than the match is allowed
 * (lib/chemistry/fit.js WORK), and the selection is cutShort if either was
 * cut short, whichever is kept.
 */
function selectHoldingClay<L extends PoolLine>(
  host: Host,
  lines: L[],
  target: Oxides,
  {
    oldClay = 0,
    batch,
    uncapped = [],
    ...given
  }: SelectOptions & { oldClay?: number; batch?: number; uncapped?: unknown[] } = {}
): { selection: Selection; lines: L[] } {
  const options = { ...given, meter: given.meter ?? newMeter() };
  const free = selectMaterials(host, lines, target, options);
  const most = Math.max(CHECK_LIMITS.clay.caution, oldClay) / 100;
  const size = batch ?? lines.reduce((sum, line) => sum + (Number(line.start) || 0), 0);
  const main = lines
    .filter((line) => isRawClay(host, line.material) && line.start > 0 && !line.avoid)
    .reduce((p: L | null, q) => (p && p.start >= q.start ? p : q), null);
  const least = main ? Math.min(main.start, CLAY_LEAST_SHARE * size) : 0;
  const why = say('pool.why.rawClay');
  const held = lines.map((line): L => {
    const capped = isRawClay(host, line.material) && !uncapped.includes(idOf(host, line.material));
    const kept = line === main ? { must: true, least: Math.max(Number(line.least) || 0, least) } : {};
    return capped || line === main ? { ...line, ...(capped ? { group: RAW_CLAY, why } : {}), ...kept } : line;
  });
  // Held only where the check would caution (over 20%, and more than the old
  // recipe had), or below the least kept.
  const total = free.amounts.reduce((sum, amount) => sum + amount, 0);
  const clay = (amounts: number[]) =>
    amounts.reduce((sum, amount, i) => (isRawClay(host, lines[i].material) ? sum + amount : sum), 0);
  const cappedClay = free.amounts.reduce((sum, amount, i) => (held[i].group === RAW_CLAY ? sum + amount : sum), 0);
  const tooMuch = total > 0 && rawClayHigh((100 * cappedClay) / total, oldClay);
  const tooLittle = size > 0 && clay(free.amounts) / total < (least / size) * (1 - 1e-6);
  if (!(total > 0) || !(tooMuch || tooLittle)) return { selection: free, lines };
  const holding = selectMaterials(host, held, target, { ...options, shares: { ...options.shares, [RAW_CLAY]: most } });
  if (holding.miss - free.miss <= CLAY_HOLD_COST) return { selection: holding, lines: held };
  // The free choosing kept. If the work ran out in the held one, it may have
  // lost for being cut rather than for the clay (a held choosing cut short can
  // be far from the target), so the free one is kept, but not as if the search
  // had finished: it says it was cut short, as the held one would have.
  return { selection: { ...free, cutShort: options.meter.cut }, lines };
}

/**
 * A selection's explanation, for the lines it chose from: what each material
 * does (the oxides it supplies, largest share first), what else could have
 * helped, near-identical pairs, caps that cost match and caps that could not
 * be kept (broken; as percents of the batch), and how near the result comes:
 * the fit's miss and, given the target, oxide by oxide in the unity formula
 * (lib/chemistry/closeness.js). `batch` is the total the percents are of: the
 * amounts' own if not given (rounded to add up to it, a few may not quite).
 */
function explain(
  host: Host,
  selection: Selection,
  lines: ReadonlyArray<{ material: unknown; fixed?: boolean; why?: RecipeMessage }>,
  places: number,
  target?: Oxides,
  batch?: number
): Report {
  const name = (i: number) => labelOf(host, lines[i].material);
  const used = new Set(selection.chosen);
  const total = batch ?? selection.amounts.reduce((sum, amount) => sum + amount, 0);
  const percent = (amount: number) => (total > 0 ? (100 * amount) / total : 0);
  return {
    uses: selection.contributions.map((c) => ({
      name: name(c.index),
      amount: upTo(selection.amounts[c.index], places),
      supplies: c.supplies,
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
      ...(lines[c.index].why ? { why: lines[c.index].why } : {}),
      ...(c.broken ? { broken: true as const } : {})
    })),
    unreachable: selection.unreachable,
    countCost: selection.countCost,
    miss: selection.miss,
    best: selection.best,
    ...(target ? { closeness: closeness(host, target, selection.moles) } : {}),
    ...(selection.cutShort ? { cutShort: true } : {})
  };
}

/**
 * The recipe a selection makes: its materials with amounts as text (an amount
 * left as it was keeps its text), and what changed, for the new recipe's notes.
 * `replacements` are swapped-in materials' ids (idOf): one the fit has no use for is "not
 * needed" rather than a change. A line marked `added` is new to the recipe
 * even if it starts with an amount (a base frit in place of the lead).
 */
function recipeFrom<M extends MaterialRecord>(
  host: Host,
  selection: { amounts: number[] },
  lines: ReadonlyArray<{ material: M; start: number; added?: boolean }>,
  replacements: Set<unknown>,
  places: number
): { materials: M[]; changes: RecipeMessage[]; unused: unknown[] } {
  const materials: M[] = [];
  const changes: RecipeMessage[] = [];
  const unused: unknown[] = [];
  lines.forEach((line, i) => {
    const amount = selection.amounts[i];
    const unchanged = amount === line.start && line.start > 0;
    const text = unchanged ? (line.material.amount ?? '') : formatAmount(amount, places);
    const name = labelOf(host, line.material);
    const fresh = line.added || !(line.start > 0);
    if (amountOf(text) === 0) {
      if (!fresh) {
        if (replacements.has(idOf(host, line.material))) unused.push(name);
        else changes.push(removed(name, line.start, places));
      }
      return;
    }
    materials.push({ ...line.material, amount: text });
    if (fresh) changes.push(added(name, plainFigure(text)));
    else if (amountOf(text) !== line.start) changes.push(changed(name, upTo(line.start, places), plainFigure(text)));
  });
  return { materials, changes, unused };
}

/**
 * A selection whose amounts, rounded to `places`, add up to `total` as shown:
 * each rounded as usual; then, while they come to more (or less), the amount
 * rounding moved furthest the other way goes a step down (or up), the largest
 * remainder first. A line `kept` (shown as it was, its own text, as recipeFrom
 * keeps an amount that did not change) counts as it is and is not moved, and
 * none is moved below its `least` (a material brought in, 1% of the batch).
 * Those it moves are given rounded; the rest are left as they are, so a recipe
 * that adds up already is unchanged.
 */
function addingUp<S extends { amounts: number[] }>(
  selection: S,
  places: number,
  total: number,
  kept: (i: number) => boolean = () => false,
  least: (i: number) => number = () => 0
): S {
  const step = 10 ** places;
  const { amounts } = selection;
  const units = amounts.map((amount) => Math.round(Number(amount.toFixed(places)) * step));
  const asTheyAre = amounts.reduce((sum, amount, i) => (kept(i) ? sum + amount : sum), 0);
  let left = Math.round((total - asTheyAre) * step) - units.reduce((sum, unit, i) => (kept(i) ? sum : sum + unit), 0);
  if (left === 0) return selection;
  // How far rounding moved each, in steps: above 0, rounded down.
  const moved = amounts.map((amount, i) => amount * step - units[i]);
  const order = amounts
    .map((_amount, i) => i)
    .filter((i) => units[i] > 0 && !kept(i))
    .sort((p, q) => (left > 0 ? moved[q] - moved[p] : moved[p] - moved[q]) || p - q);
  const given = amounts.slice();
  for (const i of order) {
    if (left === 0) break;
    const by = Math.sign(left);
    if (units[i] + by <= 0 || (by < 0 && units[i] + by < least(i) * step - 1e-9)) continue;
    units[i] += by;
    left -= by;
    given[i] = units[i] / step;
  }
  return { ...selection, amounts: given };
}

/** A selection on another batch total: amounts and caps scaled by `scale`. */
const scaled = (selection: Selection, scale: number): Selection => ({
  ...selection,
  amounts: selection.amounts.map((amount) => amount * scale),
  capped: selection.capped.map((c) => ({ ...c, most: c.most * scale, wouldBe: c.wouldBe * scale }))
});

export { placesFor, changed, added, removed, lastResort, selectHoldingClay, explain, recipeFrom, scaled, addingUp };
