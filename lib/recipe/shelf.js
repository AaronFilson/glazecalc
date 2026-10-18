'use strict';

const { selectMaterials } = require('../chemistry');
const { amountOf, totalOf } = require('./amounts');
const { pastLimits, rawClayPercent, sizeNotes } = require('./checks');
const { expansionOf, molesOf, unityOf } = require('./materials');
const { RecipeError } = require('./messages');
const { explain, placesFor, recipeFrom, removed, scaled } = require('./pool');

// Match with what I have (docs/adr/0012): a recipe made again from only the
// materials the potter has on hand, as few of them as come near its fired
// oxides. A material the recipe already uses stays near its amount.

/** A material brought in is worth at least 1% of the batch, or nothing. */
const LEAST_SHARE = 0.01;

/**
 * The recipe made from the materials on the shelf only, on the old batch's
 * total, so colorants keep their share of it. Materials marked "must use"
 * stay in; names in `avoid` are left out. With nothing on the shelf it
 * throws a RecipeError, 'shelf.empty'.
 */
function matchFromShelf(lines, shelf, { avoid = [], additives = [] } = {}) {
  if (!shelf.length) throw new RecipeError('shelf.empty');
  const target = molesOf(lines);
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
      oldClay: rawClayPercent(lines),
      additives,
      expansion: { was: expansionOf(lines), now: expansionOf(materials) }
    }),
    ...sizeNotes(materials.map((material) => ({ material, amount: material.amount })))
  ];
  return { materials, changes, report: explain(onTotal, pool, places), cautions };
}

module.exports = { matchFromShelf };
