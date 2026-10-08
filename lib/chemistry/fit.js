'use strict';

const oxides = require('./oxides');
const materials = require('./materials');
const { boundedLeastSquares } = require('./lsq');

// Working out a recipe's amounts again after a material in it is swapped for
// one that is not like for like (niter for a frit, red lead for a lead frit):
// the amounts whose fired oxides come nearest the old recipe's, changing the
// recipe as little as that allows. See docs/adr/0010-suggested-amounts.md and,
// for choosing among many materials, select.js and docs/adr/0012.

/** Moles of each fired oxide in one gram of the raw material. */
const molesPerGram = function (material) {
  const { unity, equivalent } = materials.materialWeights(material);
  const moles = {};
  Object.keys(unity).forEach((oxide) => (moles[oxide] = unity[oxide] / equivalent));
  return moles;
};

/** Moles of each fired oxide in the lines: [{ material, amount }]. */
const oxideMoles = function (lines) {
  const total = {};
  lines.forEach((line) => {
    const amount = Number(line.amount);
    if (!(amount > 0)) return;
    const moles = molesPerGram(line.material);
    Object.keys(moles).forEach((oxide) => (total[oxide] = (total[oxide] || 0) + moles[oxide] * amount));
  });
  return total;
};

// How near each oxide should come, in the unity formula: within 0.02, or 5%
// of a large amount such as silica's. A miss counts as its square in these units.
const CLOSE = 0.02;
const CLOSE_SHARE = 0.05;
// Potters count potash and soda together (KNaO): matched together as closely
// as any oxide, and apart only loosely, so feldspar's soda can stand in for
// some of niter's potash.
const ALKALIS = ['K2O', 'Na2O'];
const CLOSE_APART = 0.06;
// How far the pull toward the recipe as it was may take the match from the
// best one: about a third of "near" on one oxide.
const ROOM_FOR_FEWER_CHANGES = 0.1;
// Amounts within 5% of where they started are tried back at their start, and
// a token amount, under 1% of the batch, is tried at nothing.
const SNAP_BACK = 0.05;
const TOKEN = 0.01;

const isFlux = (oxide) => oxides.OXIDE_GROUPS[oxide] === 'R2O' || oxides.OXIDE_GROUPS[oxide] === 'RO';

/**
 * The problem in numbers, in the unity formula's terms (moles per mole of the
 * target's fluxes): a row for each oxide, one for potash and soda together,
 * and with options.fluxTotal one for all the fluxes together, each with the
 * lines' amounts per gram, the target and a weight. options.near sets how near
 * particular oxides should come, and options.alkalis potash and soda together,
 * in place of the defaults.
 */
const setUp = function (lines, target, options) {
  const near = options.near || {};
  const columns = lines.map((line) => molesPerGram(line.material));
  const names = new Set(Object.keys(target));
  columns.forEach((column) => Object.keys(column).forEach((oxide) => names.add(oxide)));
  const list = Array.from(names);
  const fluxes = list.reduce((sum, oxide) => (isFlux(oxide) ? sum + (target[oxide] || 0) : sum), 0);
  const scale = fluxes > 0 ? fluxes : Math.max(0, ...list.map((oxide) => target[oxide] || 0));
  if (!(scale > 0)) throw new Error('The target has no oxides to aim for');

  const rows = list.map((oxide) => ({
    oxides: [oxide],
    close: near[oxide] ?? (ALKALIS.includes(oxide) ? CLOSE_APART : CLOSE)
  }));
  if (ALKALIS.some((oxide) => names.has(oxide))) rows.push({ oxides: ALKALIS, close: options.alkalis ?? CLOSE });
  if (options.fluxTotal) rows.push({ oxides: list.filter(isFlux), close: options.fluxTotal });
  const sum = (amounts, row) => row.oxides.reduce((total, oxide) => total + (amounts[oxide] || 0), 0) / scale;
  const a = columns.map((column) => rows.map((row) => sum(column, row)));
  const b = rows.map((row) => sum(target, row));
  const w = rows.map((row, r) => 1 / Math.pow(Math.max(row.close, CLOSE_SHARE * b[r]), 2));
  return { a, b, w };
};

/** How far amounts x are from the target: the weighted sum of squared misses. */
const missOf = function (problem, x) {
  const { a, b, w } = problem;
  return b.reduce((sum, target, r) => {
    const value = a.reduce((total, column, i) => total + column[r] * x[i], 0) - target;
    return sum + w[r] * value * value;
  }, 0);
};

/**
 * A fitting problem, ready to solve many ways: the rows, each line's start
 * (what to stay near), least and most, and the shared caps.
 *
 *   lines    [{ material, start, most, least, group }]: start is the amount to
 *            stay near, 0 for a material being brought in; most and least, if
 *            given, the most and least it may be; group, a shared cap's name
 *   options  { near, alkalis, fluxTotal, groups: { name: most } }
 */
const prepare = function (lines, target, options = {}) {
  if (!lines.length) throw new Error('There are no materials to work out');
  const problem = setUp(lines, target, options);
  const most = lines.map((line) => (Number(line.most) >= 0 ? Number(line.most) : Infinity));
  const least = lines.map((line, i) => Math.min(most[i], Math.max(0, Number(line.least) || 0)));
  const starts = lines.map((line, i) => Math.min(most[i], Math.max(least[i], Number(line.start) || 0)));
  // With nothing to start from, the batch the target implies sets the scale.
  const firedGrams = Object.keys(target).reduce((sum, oxide) => sum + target[oxide] * oxides.MOLAR_MASS[oxide], 0);
  const size = starts.reduce((sum, amount) => sum + amount, 0) || firedGrams || 1;
  const caps = options.groups || {};
  const groups = Object.keys(caps)
    .map((name) => ({
      most: caps[name],
      members: lines.map((line, i) => (line.group === name ? i : -1)).filter((i) => i >= 0)
    }))
    .filter((group) => group.members.length > 1 || (group.members.length === 1 && Number.isFinite(group.most)));

  /**
   * The amounts that minimize the weighted misses plus a pull of the given
   * strength toward the starts, within bounds: lines in `held` at the amount
   * it gives, lines in `off` at nothing. A shared cap is enforced by giving
   * each member its share of it, in proportion to what it took, until the
   * members together keep to it.
   */
  const solve = (pull, held = new Map(), off = new Set()) => {
    const root = problem.w.map(Math.sqrt);
    const columns = problem.a.map((column) => column.map((value, r) => value * root[r]));
    const b = problem.b.map((value, r) => value * root[r]);
    const hi = most.slice();
    let x;
    for (let round = 0; round < 6; round++) {
      x = boundedLeastSquares({
        columns,
        b,
        lo: least.map((low, i) => (off.has(i) ? 0 : held.has(i) ? held.get(i) : low)),
        hi: hi.map((high, i) => (off.has(i) ? 0 : held.has(i) ? held.get(i) : high)),
        lambda: pull / (size * size),
        pullTo: starts
      });
      let over = false;
      for (const group of groups) {
        const total = group.members.reduce((sum, i) => sum + x[i], 0);
        if (total > group.most * (1 + 1e-9)) {
          over = true;
          group.members.forEach(
            (i) => (hi[i] = total > 0 ? (group.most * x[i]) / total : group.most / group.members.length)
          );
        }
      }
      if (!over) break;
    }
    return { x, miss: missOf(problem, x) };
  };
  return { problem, lines, starts, least, most, size, solve };
};

/**
 * Amounts for the lines that bring their fired oxides as near the target as
 * the materials allow, changing them from their start amounts as little as
 * possible: first the best match, then each amount pulled back toward its
 * start for as long as the match stays within about 1% of an oxide of it.
 *
 *   lines    [{ material, start, most, least, group }] (see prepare)
 *   target   { oxide: moles }, such as the old recipe's oxideMoles
 *   options  { near: { oxide: how near }, alkalis, fluxTotal, groups: { name: most } }:
 *            how near the oxides, potash and soda together and all the fluxes
 *            together should come, where the defaults will not do, and shared caps
 *
 * Returns { amounts, moles, miss }: the lines' oxide moles at those amounts, and
 * how far they are from the target (the sum of each oxide's miss, squared, in
 * units of how near it should come), for ranking one choice of materials
 * against another.
 */
const fitAmounts = function (lines, target, options = {}) {
  const fit = prepare(lines, target, options);
  const { starts, size } = fit;
  const allowed = fit.solve(0).miss + ROOM_FOR_FEWER_CHANGES;
  // With some lines held: the best match, then the strongest pull toward the
  // starts that keeps it within what is allowed; null when holding them leaves
  // the match short of that.
  const search = (held) => {
    let best = fit.solve(0, held);
    if (best.miss > allowed) return null;
    for (let pull = 1e-6; pull <= 1e6; pull *= 2) {
      const tried = fit.solve(pull, held);
      if (tried.miss > allowed) break;
      best = tried;
    }
    return best;
  };
  // One at a time, where the match allows: a token amount the fit has left
  // goes (so a replacement it hardly uses is not in the recipe at 0.2), then an
  // amount that has moved only a little goes back to its start (so what did
  // not need changing is unchanged).
  const held = new Map();
  let best = search(held);
  for (;;) {
    const free = best.x.map((amount, i) => ({ i, amount })).filter(({ i }) => !held.has(i));
    const tokens = free
      .filter(({ i, amount }) => amount > 0 && amount < TOKEN * size && amount !== starts[i] && fit.least[i] === 0)
      .sort((p, q) => p.amount - q.amount)
      .map(({ i }) => [i, 0]);
    const near = free
      .map(({ i, amount }) => ({ i, moved: starts[i] > 0 ? Math.abs(amount - starts[i]) / starts[i] : Infinity }))
      .filter(({ moved }) => moved > 0 && moved <= SNAP_BACK)
      .sort((p, q) => p.moved - q.moved)
      .map(({ i }) => [i, starts[i]]);
    const next = [...tokens, ...near]
      .map(([i, value]) => ({ i, value, found: search(new Map([...held, [i, value]])) }))
      .find(({ found }) => found);
    if (!next) break;
    held.set(next.i, next.value);
    best = next.found;
  }
  const amounts = best.x;
  return {
    amounts,
    miss: best.miss,
    moles: oxideMoles(lines.map((line, i) => ({ material: line.material, amount: amounts[i] })))
  };
};

/** The best match the lines can make, with no pull toward their starts: fast, for ranking choices. */
const bestFit = function (lines, target, options = {}) {
  const fit = prepare(lines, target, options);
  const { x, miss } = fit.solve(0);
  return { amounts: x, miss };
};

module.exports = { fitAmounts, bestFit, prepare, molesPerGram, oxideMoles };
