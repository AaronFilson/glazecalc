'use strict';

const { amountOf, formatAmount } = require('./amounts');
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

/**
 * A selection's explanation, for the lines it chose from: what each material
 * does (the oxides it supplies, largest share first), what else could have
 * helped, near-identical pairs, caps that cost match (as percents of the
 * batch), and how near the result comes.
 */
function explain(selection, lines, places) {
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
    best: selection.best
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

module.exports = { placesFor, changed, added, removed, explain, recipeFrom, scaled };
