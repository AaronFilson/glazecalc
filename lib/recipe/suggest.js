'use strict';

const { bestFit, fitAmounts, molesPerGram, selectMaterials } = require('../chemistry');
const { amountOf } = require('./amounts');
const { pastLimits, rawClayPercent, sizeNotes } = require('./checks');
const { suggestable } = require('./library');
const { expansionOf, fluxesOf, molesOf, oxidePercent, unityOf } = require('./materials');
const { explain, placesFor, recipeFrom } = require('./pool');
const { modernMaterials } = require('./swaps');

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
function setUp(lines, find, region, options) {
  const { materials, swaps } = modernMaterials(lines, find, region, options);
  const target = molesOf(lines);
  const modern = materials.map((material) => ({ material, start: amountOf(material.amount) }));
  return { target, modern, swaps };
}

/** Oxides the old materials gave that come out well short, with what came out. */
function shortOf(target, moles, old) {
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
function planSuggestion(lines, find, standard, region, { allowLead = false } = {}) {
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
function suggestAmounts(
  lines,
  find,
  bringIn,
  region,
  { allowLead = false, tries = [], avoid = [], additives = [] } = {}
) {
  const { target, modern, swaps } = setUp(lines, find, region, { allowLead });
  const total = modern.reduce((sum, line) => sum + line.start, 0);
  const places = placesFor(total);
  const inRecipe = new Set(modern.map((line) => line.material.name));
  const added = (material, must) => ({
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
  ).map((short) => short.oxide);
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

module.exports = { planSuggestion, suggestAmounts };
