'use strict';

const { amountOf, totalOf } = require('./amounts');
const { pastLimits, rawClayPercent, sizeNotes } = require('./checks');
const { expansionOf, molesOf, unityOf } = require('./materials');
const { RecipeError } = require('./messages');
const { explain, placesFor, recipeFrom, removed, scaled, selectHoldingClay } = require('./pool');

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
 * RecipeError, 'shelf.empty', and when nothing on it has any of the recipe's
 * oxides, 'solve.noMatch'. `meter` bounds the work (lib/chemistry
 * newMeter; a new one, with the library's own bound, if not given).
 *
 * @param {import('./library').MaterialRecord[]} lines
 * @param {import('./library').TryMaterial[]} shelf
 * @param {{ avoid?: string[], additives?: import('./library').AdditiveRecord[], uncapped?: string[],
 *   meter?: import('../chemistry').Meter }} [options]
 */
function matchFromShelf(lines, shelf, { avoid = [], additives = [], uncapped = [], meter } = {}) {
  if (!shelf.length) throw new RecipeError('shelf.empty');
  const target = molesOf(lines);
  const oldTotal = totalOf(lines.map((line) => line.amount));
  const places = placesFor(oldTotal);
  const old = new Map(lines.map((line) => [line.name, amountOf(line.amount)]));
  const oldClay = rawClayPercent(lines);
  const offered = shelf.map((tried) => {
    const start = old.get(tried.material.name) ?? 0;
    return {
      material: {
        ...structuredClone(tried.material),
        amount: old.has(tried.material.name) ? String(old.get(tried.material.name)) : ''
      },
      start,
      must: tried.must,
      // A material the recipe has is worth what it has, if that is less: its 0.5 of lithium carbonate
      // comes back as 0.5, not as 1 or nothing.
      least: start > 0 ? Math.min(LEAST_SHARE * oldTotal, start) : LEAST_SHARE * oldTotal,
      avoid: avoid.includes(tried.material.name)
    };
  });
  let chosen;
  try {
    chosen = selectHoldingClay(offered, target, { oldClay, batch: oldTotal, uncapped, meter });
  } catch (error) {
    // Every material dropped as no help at all: none has any of the recipe's oxides (as solveTarget says it).
    if (error?.code === 'no-materials') throw new RecipeError('solve.noMatch');
    throw error;
  }
  const { selection, lines: pool } = chosen;
  // On the old batch's total.
  const newTotal = selection.amounts.reduce((sum, amount) => sum + amount, 0);
  const onTotal = scaled(selection, newTotal > 0 ? oldTotal / newTotal : 1);
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
  return { materials, changes, report: explain(onTotal, pool, places, target), cautions };
}

module.exports = { matchFromShelf };
