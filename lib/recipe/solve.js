'use strict';

const { MOLAR_MASS, OXIDE_GROUPS, newMeter } = require('../chemistry');
const { pastLimits, sizeNotes } = require('./checks');
const { expansionOf, fluxesOf, unityOf } = require('./materials');
const { RecipeError } = require('./messages');
const { addingUp, explain, lastResort, recipeFrom, scaled, selectHoldingClay } = require('./pool');

/**
 * @typedef {import('./library').MaterialRecord} MaterialRecord
 * @typedef {import('./library').TryMaterial} TryMaterial
 * @typedef {import('./solve').SolveFiring} SolveFiring
 * @typedef {import('./solve').SolveTarget} SolveTarget
 */

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
const TOGETHER = ['KNaO', 'R2O', 'NaKO'];
/** Loss on ignition, which an analysis may give and the target leaves out. */
const LOI = 'LOI';

const isFlux = (oxide) => OXIDE_GROUPS[oxide] === 'R2O' || OXIDE_GROUPS[oxide] === 'RO';

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
function targetOf({ kind, oxides }) {
  /** @type {Record<string, number>} */
  const given = {};
  for (const [name, value] of Object.entries(oxides ?? {})) {
    const oxide = String(name).trim();
    if (oxide.toUpperCase() === LOI) continue;
    if (TOGETHER.some((together) => together.toLowerCase() === oxide.toLowerCase()))
      throw new RecipeError('solve.together');
    if (!Object.hasOwn(OXIDE_GROUPS, oxide)) throw new RecipeError('solve.unknownOxide', { oxide });
    const amount = Number(value);
    if (value === null || value === '' || !Number.isFinite(amount) || amount < 0)
      throw new RecipeError('solve.badAmount', { oxide });
    if (amount > 0) given[oxide] = (given[oxide] ?? 0) + amount;
  }
  const molesGiven =
    kind === 'analysis'
      ? Object.fromEntries(Object.entries(given).map(([oxide, percent]) => [oxide, percent / MOLAR_MASS[oxide]]))
      : given;
  const fluxes = Object.entries(molesGiven).reduce((sum, [oxide, moles]) => (isFlux(oxide) ? sum + moles : sum), 0);
  if (!(fluxes > 0)) throw new RecipeError('solve.noFlux', { of: 'target' });
  const unity = unityOf(molesGiven);
  const fired = Object.entries(unity).reduce((sum, [oxide, moles]) => sum + moles * MOLAR_MASS[oxide], 0);
  // Fluxes so slight against the rest (CaO 5e-324 with SiO2 3) that the unity formula is past any number.
  if (!Number.isFinite(fired)) throw new RecipeError('solve.noFlux', { of: 'target' });
  const moles = Object.fromEntries(Object.entries(unity).map(([oxide, value]) => [oxide, (value * BATCH) / fired]));
  return { moles, unity, fluxes: kind === 'analysis' ? 1 : fluxes };
}

/**
 * The cautions for a solved recipe, as the recipe page's checks give them: past
 * a limit for the firing (the app's own limits unless another set is given),
 * and amounts too small or materials too many for a test batch.
 *
 * @param {MaterialRecord[]} materials
 * @param {Record<string, number>} unity
 * @param {SolveFiring} [firing]
 */
function solveCautions(materials, unity, { celsius, band, limitSet } = {}) {
  const lines = materials.map((material) => ({ material, amount: material.amount }));
  return [
    ...pastLimits({ lines, unity, celsius, band, limitSet, expansion: { was: null, now: expansionOf(materials) } }),
    ...sizeNotes(lines, band === 'low')
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
 *
 * @param {SolveTarget} target
 * @param {TryMaterial[]} offered
 * @param {SolveFiring & { avoid?: string[], uncapped?: string[], meter?: import('../chemistry').Meter }} [options]
 */
function solveTarget(target, offered, { avoid = [], uncapped = [], celsius, band, limitSet, meter } = {}) {
  const { moles, unity: aim, fluxes } = targetOf(target);
  if (!offered.length) throw new RecipeError('solve.noMaterials');
  // One meter for the choosing, and for choosing again below.
  const work = meter ?? newMeter();
  const choose = (least) => {
    const lines = offered.map((tried) => ({
      material: { ...structuredClone(tried.material), amount: '' },
      start: 0,
      must: tried.must,
      least,
      avoid: avoid.includes(tried.material.name),
      lastResort: lastResort(tried)
    }));
    try {
      return selectHoldingClay(lines, moles, { batch: BATCH, uncapped, meter: work });
    } catch (error) {
      // Every material dropped as no help at all: none has any of the target's oxides.
      if (error?.code === 'no-materials') throw new RecipeError('solve.noMatch');
      throw error;
    }
  };
  const rawTotal = (chosen) => chosen.selection.amounts.reduce((sum, amount) => sum + amount, 0);
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
  if (!(fluxesOf(selection.moles) > 0)) throw new RecipeError('solve.noFlux', { of: 'offered' });
  const places = 1;
  const onTotal = addingUp(scaled(selection, BATCH / total), places, BATCH, undefined, () => LEAST_SHARE * BATCH);
  const { materials } = recipeFrom(onTotal, pool, new Set(), places);
  const unity = unityOf(selection.moles);
  return {
    materials,
    target: aim,
    unity,
    fluxes,
    report: explain(onTotal, pool, places, moles, BATCH),
    cautions: solveCautions(materials, unity, { celsius, band, limitSet })
  };
}

// Reading a target pasted from another app: "SiO2 3.20", "SiO₂: 3,2", one per
// line or several on one, or a row of oxides over a row of numbers.

/** Subscript digits as plain ones: SiO₂ is SiO2. */
const SUBSCRIPTS = {
  '₀': '0',
  '₁': '1',
  '₂': '2',
  '₃': '3',
  '₄': '4',
  '₅': '5',
  '₆': '6',
  '₇': '7',
  '₈': '8',
  '₉': '9'
};
/**
 * A word that may be an oxide's formula, whole, then perhaps a colon or equals
 * sign, then a number: "SiO2 3.20", not "SiO" and 2.
 */
const PAIR = /(?<![A-Za-z0-9])([A-Za-z][A-Za-z0-9]*)(?![A-Za-z0-9])[ \t]*[:=]?[ \t]*(\d+(?:[.,]\d+)?|[.,]\d+)/g;
const FORMULA = /^[A-Z][A-Za-z0-9]*$/;
const NUMBER = /^(\d+(?:[.,]\d+)?|[.,]\d+)$/;

/** The oxide a pasted name stands for, as the app writes it, ignoring case: "sio2" is SiO2. */
const knownName = (name) => {
  const wanted = name.toLowerCase();
  if (wanted === LOI.toLowerCase()) return LOI;
  return (
    Object.keys(OXIDE_GROUPS).find((oxide) => oxide.toLowerCase() === wanted) ??
    TOGETHER.find((together) => together.toLowerCase() === wanted)
  );
};
const numberOf = (text) => Number(text.replace(',', '.'));
/** Whether a word reads as an oxide's formula: a capital first and oxygen last (Xx2O3, CO2), not "Total" or "UMF". */
const formulaLike = (word) => FORMULA.test(word) && /O\d*$/.test(word) && word.length <= 8;

/**
 * The oxides in pasted text: { oxides: { oxide: amount }, unknown: [names that
 * look like formulas the app does not know], together: whether potash and
 * soda came together (KNaO) }. LOI is read and left out. An oxide given twice
 * keeps the first.
 */
function parseTarget(text) {
  const plain = String(text ?? '').replace(/[₀-₉]/g, (digit) => SUBSCRIPTS[digit]);
  const oxides = {};
  const unknown = [];
  let together = false;
  const take = (name, value) => {
    const oxide = knownName(name);
    if (!oxide) {
      if (formulaLike(name) && !unknown.includes(name)) unknown.push(name);
      return;
    }
    if (oxide === LOI) return;
    if (TOGETHER.includes(oxide)) {
      together = true;
      return;
    }
    if (!(oxide in oxides)) oxides[oxide] = numberOf(value);
  };
  for (const [, name, value] of plain.matchAll(PAIR)) take(name, value);
  // A row of oxides over a row of numbers, as a spreadsheet copies a table.
  if (!Object.keys(oxides).length && !together) {
    const rows = plain
      .split(/\r?\n/)
      .map((row) => row.split(/[\t;]|\s+/).filter(Boolean))
      .filter((row) => row.length);
    for (let r = 0; r + 1 < rows.length; r++) {
      const [names, values] = [rows[r], rows[r + 1]];
      if (names.length > 1 && names.every((word) => FORMULA.test(word)) && values.length >= names.length) {
        const numbers = values.slice(values.length - names.length);
        if (numbers.every((value) => NUMBER.test(value))) names.forEach((name, i) => take(name, numbers[i]));
      }
    }
  }
  return { oxides, unknown, together };
}

module.exports = { solveTarget, solveCautions, targetOf, parseTarget, SOLVE_BATCH: BATCH };
