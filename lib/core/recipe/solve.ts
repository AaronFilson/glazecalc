import { idOf } from '../identity.ts';
import { newMeter } from '../chemistry/index.ts';
import { pastLimits, sizeNotes } from './checks.ts';
import { expansionOf, fluxesOf, unityOf } from './materials.ts';
import { RecipeError } from './messages.ts';
import { addingUp, explain, lastResort, recipeFrom, scaled, selectHoldingClay } from './pool.ts';
import type { Meter, Oxides } from '../types.ts';
import type { MaterialRecord, TryMaterial } from './library.ts';
import type { FiringBand, LimitSet } from './limits.ts';
import type { Caution } from './messages.ts';
import type { Report } from './pool.ts';
import type { Host } from '../host.ts';

/** A target as typed: a unity formula (moles, per mole of fluxes) or an oxide analysis (weight percent). */
export interface SolveTarget {
  kind: 'unity' | 'analysis';
  oxides: Record<string, number | string | null>;
}

/** The firing and limit set the cautions are for. */
export interface SolveFiring {
  celsius?: number;
  band?: FiringBand;
  limitSet?: LimitSet;
}

export interface Solved<M extends MaterialRecord = MaterialRecord> {
  /** The recipe, its amounts in percent as text. */
  materials: M[];
  /** The target's unity formula, and the recipe's. */
  target: Oxides;
  unity: Oxides;
  /** What a unity formula's fluxes added up to as given (1 for an analysis). */
  fluxes: number;
  report: Report;
  cautions: Caution[];
}

// Target & Solve (docs/adr/0026-target-and-solve.md): a recipe made from the
// materials given (those on hand, or any chosen) whose unity formula comes as
// near as they allow to a target the potter types, a unity formula or an oxide
// analysis. The same choosing as Match with what I have (selectMaterials, raw
// clay held where the check wants it, docs/adr/0012), with no old recipe to
// stay near: the target alone.

/** The recipe comes out in percent: its amounts add up to this. */
const BATCH = 100;
/** A material brought in is worth at least 1% of the batch, or nothing. */
const LEAST_SHARE = 0.01;
/** Names for potash and soda together, which the target needs apart. */
const TOGETHER: ReadonlyArray<string> = ['KNaO', 'R2O', 'NaKO'];
/** Loss on ignition, which an analysis may give and the target leaves out. */
const LOI = 'LOI';

const isFlux = (host: Host, oxide: string): boolean =>
  host.oxides.groups[oxide] === 'R2O' || host.oxides.groups[oxide] === 'RO';

/**
 * The target as oxide moles for the solver: the unity formula (per mole of its
 * fluxes; scaled to them when they do not add up to 1) or the analysis (weight
 * percent of the fired glaze) in moles, on 100 g of fired glaze, so the
 * amounts come out about a percent of the batch each. Throws a RecipeError
 * for an oxide the app does not know ('solve.unknownOxide'), potash and soda
 * given together ('solve.together'), an amount that is not a number of 0 or
 * more ('solve.badAmount'), or no fluxes, or fluxes too slight to make a unity
 * formula of ('solve.noFlux', of: 'target').
 *
 * Returns { moles, unity, fluxes }: fluxes is what a unity formula's fluxes
 * added up to as given (1 for an analysis).
 */
function targetOf(host: Host, { kind, oxides }: SolveTarget): { moles: Oxides; unity: Oxides; fluxes: number } {
  const given: Oxides = {};
  for (const [name, value] of Object.entries(oxides ?? {})) {
    const oxide = String(name).trim();
    if (oxide.toUpperCase() === LOI) continue;
    if (TOGETHER.some((together) => together.toLowerCase() === oxide.toLowerCase()))
      throw new RecipeError('solve.together');
    if (!Object.hasOwn(host.oxides.groups, oxide)) throw new RecipeError('solve.unknownOxide', { oxide });
    const amount = Number(value);
    if (value === null || value === '' || !Number.isFinite(amount) || amount < 0)
      throw new RecipeError('solve.badAmount', { oxide });
    if (amount > 0) given[oxide] = (given[oxide] ?? 0) + amount;
  }
  const molesGiven =
    kind === 'analysis'
      ? Object.fromEntries(
          Object.entries(given).map(([oxide, percent]) => [oxide, percent / host.oxides.molarMass[oxide]])
        )
      : given;
  const fluxes = Object.entries(molesGiven).reduce(
    (sum, [oxide, moles]) => (isFlux(host, oxide) ? sum + moles : sum),
    0
  );
  if (!(fluxes > 0)) throw new RecipeError('solve.noFlux', { of: 'target' });
  const unity = unityOf(host, molesGiven);
  const fired = Object.entries(unity).reduce((sum, [oxide, moles]) => sum + moles * host.oxides.molarMass[oxide], 0);
  // Fluxes so slight against the rest (CaO 5e-324 with SiO2 3) that the unity formula is past any number.
  if (!Number.isFinite(fired)) throw new RecipeError('solve.noFlux', { of: 'target' });
  const moles = Object.fromEntries(Object.entries(unity).map(([oxide, value]) => [oxide, (value * BATCH) / fired]));
  return { moles, unity, fluxes: kind === 'analysis' ? 1 : fluxes };
}

/**
 * The cautions for a solved recipe, as the recipe page's checks give them: past
 * a limit for the firing (the app's own limits unless another set is given),
 * and amounts too small or materials too many for a test batch.
 */
function solveCautions(
  host: Host,
  materials: MaterialRecord[],
  unity: Oxides,
  { celsius, band, limitSet }: SolveFiring = {}
): Caution[] {
  const lines = materials.map((material) => ({ material, amount: material.amount }));
  return [
    ...pastLimits(host, {
      lines,
      unity,
      celsius,
      band,
      limitSet,
      expansion: { was: null, now: expansionOf(host, materials) }
    }),
    ...sizeNotes(host, lines, band === 'low')
  ];
}

/**
 * A recipe in percent from the materials offered ([{ material, must }]) whose
 * unity formula comes as near the target as they allow: the fewest that come
 * near, as Match with what I have chooses them, raw clay held to 20% of the
 * batch where that costs the match little (but for clays named in
 * `uncapped`), names in `avoid` left out. The firing (`celsius`, `band`) and
 * `limitSet` are for the cautions. `meter` bounds the work (lib/chemistry
 * newMeter; a new one, with the library's own bound, if not given).
 *
 * Throws a RecipeError as targetOf does, 'solve.noMaterials' with nothing
 * offered, 'solve.noMatch' when no amount of them brings any of the target's
 * oxides, and 'solve.noFlux' (of: 'offered') when none of them has a flux.
 *
 * Returns { materials, target, unity, fluxes, report, cautions }: target is the
 * target's unity formula and unity the recipe's; report (lib/recipe/pool.js
 * explain) says what each material does and, in closeness, how near each
 * oxide comes; unreachable names the oxides nothing offered supplies.
 */
function solveTarget<M extends MaterialRecord>(
  host: Host,
  target: SolveTarget,
  offered: TryMaterial<M>[],
  {
    avoid = [],
    uncapped = [],
    celsius,
    band,
    limitSet,
    meter
  }: SolveFiring & { avoid?: unknown[]; uncapped?: unknown[]; meter?: Meter } = {}
): Solved<M> {
  const { moles, unity: aim, fluxes } = targetOf(host, target);
  if (!offered.length) throw new RecipeError('solve.noMaterials');
  // One meter for the choosing, and for choosing again below.
  const work = meter ?? newMeter();
  const choose = (least: number) => {
    const lines = offered.map((tried) => ({
      material: { ...structuredClone(tried.material), amount: '' },
      start: 0,
      must: tried.must,
      least,
      avoid: avoid.includes(idOf(host, tried.material)),
      lastResort: lastResort(tried)
    }));
    try {
      return selectHoldingClay(host, lines, moles, { batch: BATCH, uncapped, meter: work });
    } catch (error) {
      // Every material dropped as no help at all: none has any of the target's oxides.
      if ((error as { code?: unknown } | null)?.code === 'no-materials') throw new RecipeError('solve.noMatch');
      throw error;
    }
  };
  const rawTotal = (chosen: { selection: { amounts: number[] } }) =>
    chosen.selection.amounts.reduce((sum, amount) => sum + amount, 0);
  let chosen = choose(LEAST_SHARE * BATCH);
  let total = rawTotal(chosen);
  if (!(total > 0)) throw new RecipeError('solve.noMatch');
  // The target is on 100 g of fired glaze, and the raw materials weigh more than they fire to: one at
  // its least there can be under 1% of the batch in percent (0.8% where they weigh a quarter more).
  // Where one is, the choosing is done again with the least on the raw batch, if the work allows.
  const under = chosen.selection.amounts.some((amount) => amount > 0 && amount < LEAST_SHARE * total * (1 - 1e-9));
  if (under && !chosen.selection.cutShort) {
    const again = choose(LEAST_SHARE * total);
    const againTotal = rawTotal(again);
    if (againTotal > 0 && !again.selection.cutShort) [chosen, total] = [again, againTotal];
  }
  const { selection, lines: pool } = chosen;
  // None of the materials it may use has a flux, though the target has: no glaze can be made of them.
  if (!(fluxesOf(host, selection.moles) > 0)) throw new RecipeError('solve.noFlux', { of: 'offered' });
  const places = 1;
  const onTotal = addingUp(scaled(selection, BATCH / total), places, BATCH, undefined, () => LEAST_SHARE * BATCH);
  const { materials } = recipeFrom(host, onTotal, pool, new Set(), places);
  const unity = unityOf(host, selection.moles);
  return {
    materials,
    target: aim,
    unity,
    fluxes,
    report: explain(host, onTotal, pool, places, moles, BATCH),
    cautions: solveCautions(host, materials, unity, { celsius, band, limitSet })
  };
}

export { solveTarget, solveCautions, targetOf, BATCH as SOLVE_BATCH, LOI, TOGETHER };
