'use strict';

const { newMeter } = require('../chemistry');
const { amountOf, plainAmount, totalOf } = require('./amounts');
const { pastLimits, rawClayPercent, sizeNotes } = require('./checks');
const { expansionOf, fluxesOf, molesOf, unityOf } = require('./materials');
const { RecipeError } = require('./messages');
const { addingUp, explain, lastResort, placesFor, recipeFrom, removed, scaled, selectHoldingClay } = require('./pool');

// Match with what I have (docs/adr/0012): a recipe made again from only the
// materials the potter has on hand, as few of them as come near its fired
// oxides. A material the recipe already uses stays near its amount, and raw
// clay is held within 20% of the batch (or the recipe's own share) where the
// match allows it.

/** A material brought in is worth at least 1% of the batch, or nothing; one the recipe has, at least its own amount if less. */
const LEAST_SHARE = 0.01;

/**
 * The recipe made from the materials on the shelf only, on the old batch's
 * total, so colorants keep their share of it. Materials marked "must use"
 * stay in; names in `avoid` are left out; raw clays named in `uncapped` are
 * not held back (selectHoldingClay). With nothing on the shelf it throws a
 * RecipeError, 'shelf.empty'; when nothing on it has any of the recipe's
 * oxides, 'solve.noMatch'; and 'solve.noFlux' when the recipe has no flux
 * (of: 'recipe': no unity formula to match) or nothing on the shelf it may use
 * has one (of: 'offered'). `meter` bounds the work (lib/chemistry newMeter; a
 * new one, with the library's own bound, if not given).
 *
 * @param {import('./library').MaterialRecord[]} lines
 * @param {import('./library').TryMaterial[]} shelf
 * @param {{ avoid?: string[], additives?: import('./library').AdditiveRecord[], uncapped?: string[],
 *   meter?: import('../chemistry').Meter }} [options]
 */
function matchFromShelf(lines, shelf, { avoid = [], additives = [], uncapped = [], meter } = {}) {
  if (!shelf.length) throw new RecipeError('shelf.empty');
  const target = molesOf(lines);
  // A unity formula needs a flux: a recipe with none has none to match (the chemistry's no-flux, "Recipe
  // contains no flux oxides", said so of the recipe and of a shelf with no flux alike).
  if (!(fluxesOf(target) > 0)) throw new RecipeError('solve.noFlux', { of: 'recipe' });
  const oldTotal = totalOf(lines.map((line) => line.amount));
  const places = placesFor(oldTotal);
  const old = new Map(lines.map((line) => [line.name, amountOf(line.amount)]));
  const oldClay = rawClayPercent(lines);
  // The materials on the shelf, each worth at least 1% of `batch` (the recipe's own, at least its amount).
  const offeredOn = (batch) =>
    shelf.map((tried) => {
      const start = old.get(tried.material.name) ?? 0;
      return {
        material: {
          ...structuredClone(tried.material),
          // Written plainly: an amount kept as it was keeps this text, and String(4e-7) is "4e-7", read as 0.
          amount: old.has(tried.material.name) ? plainAmount(old.get(tried.material.name)) : ''
        },
        start,
        must: tried.must,
        // A material the recipe has is worth what it has, if that is less: its 0.5 of lithium carbonate
        // comes back as 0.5, not as 1 or nothing.
        least: start > 0 ? Math.min(LEAST_SHARE * batch, start) : LEAST_SHARE * batch,
        avoid: avoid.includes(tried.material.name),
        // The recipe's own fluorspar is the recipe's: only one brought in is a last resort.
        lastResort: !(start > 0) && lastResort(tried)
      };
    });
  // One meter for the choosing, and for choosing again below.
  const work = meter ?? newMeter();
  const choose = (batch) => {
    try {
      return selectHoldingClay(offeredOn(batch), target, { oldClay, batch: oldTotal, uncapped, meter: work });
    } catch (error) {
      // Every material dropped as no help at all: none has any of the recipe's oxides (as solveTarget says it).
      if (error?.code === 'no-materials') throw new RecipeError('solve.noMatch');
      throw error;
    }
  };
  const rawTotal = (chosen) => chosen.selection.amounts.reduce((sum, amount) => sum + amount, 0);
  let chosen = choose(oldTotal);
  let newTotal = rawTotal(chosen);
  // On the old batch's total, a material brought in at its least (1% of the old batch) is under 1% of the
  // new where the new weighs more: then the choosing is done again with the least on the new, if the
  // work allows.
  const under = chosen.selection.amounts.some(
    (amount, i) => !(chosen.lines[i].start > 0) && amount > 0 && amount < LEAST_SHARE * newTotal * (1 - 1e-9)
  );
  if (under && !chosen.selection.cutShort) {
    const again = choose(newTotal);
    const againTotal = rawTotal(again);
    if (againTotal > 0 && !again.selection.cutShort) [chosen, newTotal] = [again, againTotal];
  }
  const { selection, lines: pool } = chosen;
  // None of the materials it may use has a flux: no glaze can be made of them.
  if (!(fluxesOf(selection.moles) > 0)) throw new RecipeError('solve.noFlux', { of: 'offered' });
  // On the old batch's total, the amounts as shown adding up to it: one that did not change is shown as it was.
  const scaledTo = scaled(selection, newTotal > 0 ? oldTotal / newTotal : 1);
  const unchanged = (i) => scaledTo.amounts[i] === pool[i].start && pool[i].start > 0;
  const least = (i) => (pool[i].start > 0 ? Math.min(LEAST_SHARE * oldTotal, pool[i].start) : LEAST_SHARE * oldTotal);
  const onTotal = addingUp(scaledTo, places, oldTotal, unchanged, least);
  const { materials, changes } = recipeFrom(onTotal, pool, new Set(), places);
  const onShelf = new Set(shelf.map((tried) => tried.material.name));
  for (const line of lines) {
    if (!onShelf.has(line.name) && amountOf(line.amount) > 0) {
      changes.push(removed(line.name, amountOf(line.amount), places));
    }
  }
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
  return { materials, changes, report: explain(onTotal, pool, places, target, oldTotal), cautions };
}

module.exports = { matchFromShelf };
