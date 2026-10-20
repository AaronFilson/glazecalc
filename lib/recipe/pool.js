'use strict';

const { closeness, selectMaterials } = require('../chemistry');
const { amountOf, formatAmount } = require('./amounts');
const { isRawClay, rawClayHigh } = require('./checks');
const { CHECK_LIMITS } = require('./limits');
const { say, plainFigure, upTo } = require('./messages');

// How a substitution explains what it chose, and the recipe it makes
// (docs/adr/0012-choosing-materials.md).

/** Rounding for new amounts: about four figures of the batch, one decimal place for a recipe of about 100. */
const placesFor = (total) => (total >= 50 ? 1 : total >= 5 ? 2 : 3);

/** A change to the recipe, for its notes: "China Clay 20 → 5.8", "Niter 10 → 0". */
const changed = (name, from, to) => say('pool.changed', { name, from, to });

/** A material new to the recipe, for its notes: "G-200 EU Feldspar 33, new". */
const added = (name, amount) => say('pool.added', { name, amount });

/** A material taken out of the recipe: "Niter 10 → 0". */
const removed = (name, amount, places) => changed(name, upTo(amount, places), upTo(0, 0));

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
 * names the cap and says why, for the report.
 */
function selectHoldingClay(lines, target, { oldClay = 0, batch, uncapped = [], ...options } = {}) {
  const free = selectMaterials(lines, target, options);
  const most = Math.max(CHECK_LIMITS.clay.caution, oldClay) / 100;
  const size = batch ?? lines.reduce((sum, line) => sum + (Number(line.start) || 0), 0);
  const main = lines
    .filter((line) => isRawClay(line.material) && line.start > 0 && !line.avoid)
    .reduce((p, q) => (p && p.start >= q.start ? p : q), null);
  const least = main ? Math.min(main.start, CLAY_LEAST_SHARE * size) : 0;
  const why = say('pool.why.rawClay');
  const held = lines.map((line) => {
    const capped = isRawClay(line.material) && !uncapped.includes(line.material.name);
    const kept = line === main ? { must: true, least: Math.max(Number(line.least) || 0, least) } : {};
    return capped || line === main ? { ...line, ...(capped ? { group: RAW_CLAY, why } : {}), ...kept } : line;
  });
  // Held only where the check would caution (over 20%, and more than the old
  // recipe had), or below the least kept.
  const total = free.amounts.reduce((sum, amount) => sum + amount, 0);
  const clay = (amounts) => amounts.reduce((sum, amount, i) => (isRawClay(lines[i].material) ? sum + amount : sum), 0);
  const cappedClay = free.amounts.reduce((sum, amount, i) => (held[i].group === RAW_CLAY ? sum + amount : sum), 0);
  const tooMuch = total > 0 && rawClayHigh((100 * cappedClay) / total, oldClay);
  const tooLittle = size > 0 && clay(free.amounts) / total < (least / size) * (1 - 1e-6);
  if (!(total > 0) || !(tooMuch || tooLittle)) return { selection: free, lines };
  const holding = selectMaterials(held, target, { ...options, shares: { ...options.shares, [RAW_CLAY]: most } });
  return holding.miss - free.miss <= CLAY_HOLD_COST ? { selection: holding, lines: held } : { selection: free, lines };
}

/**
 * A selection's explanation, for the lines it chose from: what each material
 * does (the oxides it supplies, largest share first), what else could have
 * helped, near-identical pairs, caps that cost match (as percents of the
 * batch), and how near the result comes: the fit's miss and, given the
 * target, oxide by oxide in the unity formula (lib/chemistry/closeness.js).
 */
function explain(selection, lines, places, target) {
  const name = (i) => lines[i].material.name;
  const used = new Set(selection.chosen);
  const total = selection.amounts.reduce((sum, amount) => sum + amount, 0);
  const percent = (amount) => (total > 0 ? (100 * amount) / total : 0);
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
      ...(lines[c.index].why ? { why: lines[c.index].why } : {})
    })),
    unreachable: selection.unreachable,
    countCost: selection.countCost,
    miss: selection.miss,
    best: selection.best,
    ...(target ? { closeness: closeness(target, selection.moles) } : {})
  };
}

/**
 * The recipe a selection makes: its materials with amounts as text (an amount
 * left as it was keeps its text), and what changed, for the new recipe's notes.
 * `replacements` are swapped-in materials: one the fit has no use for is "not
 * needed" rather than a change. A line marked `added` is new to the recipe
 * even if it starts with an amount (a base frit in place of the lead).
 */
function recipeFrom(selection, lines, replacements, places) {
  const materials = [];
  const changes = [];
  const unused = [];
  lines.forEach((line, i) => {
    const amount = selection.amounts[i];
    const unchanged = amount === line.start && line.start > 0;
    const text = unchanged ? (line.material.amount ?? '') : formatAmount(amount, places);
    const name = line.material.name;
    const fresh = line.added || !(line.start > 0);
    if (amountOf(text) === 0) {
      if (!fresh) {
        if (replacements.has(name)) unused.push(name);
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

/** A selection on another batch total: amounts and caps scaled by `scale`. */
const scaled = (selection, scale) => ({
  ...selection,
  amounts: selection.amounts.map((amount) => amount * scale),
  capped: selection.capped.map((c) => ({ ...c, most: c.most * scale, wouldBe: c.wouldBe * scale }))
});

module.exports = { placesFor, changed, added, removed, selectHoldingClay, explain, recipeFrom, scaled };
