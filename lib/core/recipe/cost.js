'use strict';

const { batchWeights } = require('./amounts');

/**
 * What a batch costs, from the potter's own prices: each material's price per
 * kilogram, in the account's one currency (there is no conversion). A line
 * with no price is named in `missing`, never guessed: the cost is then of the
 * priced lines only, and `complete` is false, so no cost per kilogram is given.
 * A line weighing nothing needs no price.
 */

const GRAMS_PER_KG = 1000;

/** A price as kept: a finite number of 0 or more. */
function isPrice(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

/** The prices by key, from a list of { key, perKg } or a Map; a price that is not one is left out. */
function priceMap(prices) {
  const map = new Map();
  const entries = prices instanceof Map ? prices.entries() : (prices ?? []).map((p) => [p.key, p.perKg]);
  for (const [key, perKg] of entries) if (typeof key === 'string' && isPrice(perKg)) map.set(key, perKg);
  return map;
}

/** The cost of weighed lines ({ key, grams }) at the prices. */
function batchCost(lines, prices) {
  const byKey = priceMap(prices);
  const missing = [];
  let cost = 0;
  let grams = 0;
  const costed = lines.map(({ key, grams: weight }) => {
    const g = weight > 0 ? weight : 0;
    grams += g;
    const perKg = byKey.has(key) ? byKey.get(key) : null;
    if (perKg === null) {
      if (g > 0 && !missing.includes(key)) missing.push(key);
      return { key, grams: g, perKg: null, cost: g > 0 ? null : 0 };
    }
    const lineCost = (g / GRAMS_PER_KG) * perKg;
    cost += lineCost;
    return { key, grams: g, perKg, cost: lineCost };
  });
  const complete = missing.length === 0;
  return {
    cost,
    grams,
    perKg: complete && grams > 0 ? (cost / grams) * GRAMS_PER_KG : null,
    complete,
    missing,
    lines: costed
  };
}

/**
 * The cost of a recipe made as a batch whose base (the materials) weighs
 * `baseGrams`, colorants and additives on top as batchWeights weighs them;
 * the lines are the materials, then the additives. Null when there is no
 * batch to weigh (no amounts, or no batch size).
 */
function recipeCost(recipe, baseGrams, prices) {
  const materials = recipe.materials ?? [];
  const additives = recipe.additives ?? [];
  const weights = batchWeights(
    materials.map((m) => m.amount),
    additives,
    baseGrams
  );
  if (!weights) return null;
  return batchCost(
    [
      ...materials.map((m, i) => ({ key: m.key, grams: weights.materials[i] })),
      ...additives.map((a, i) => ({ key: a.key, grams: weights.additives[i] }))
    ],
    prices
  );
}

module.exports = { GRAMS_PER_KG, isPrice, batchCost, recipeCost };
