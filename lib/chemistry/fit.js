'use strict';

const messages = require('./messages');
const oxides = require('./oxides');
const materials = require('./materials');
const { boundedLeastSquares, normalEquations } = require('./lsq');

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
// Shared caps are settled one at a time, in turn, until none moves.
const CAP_ROUNDS = 10;
// Caps that pull against each other (a group's member is another share's
// rebated line) can take thousands of rounds one at a time: if the rounds
// leave a cap broken, the prices are then set together, by Newton's method,
// in at most this many steps.
const JOINT_STEPS = 30;
// The fluxes together, when the target has a flux no line supplies (lithia
// with nothing on hand that has it). The fit counts moles per mole of the
// target's fluxes, but a unity formula is per mole of its own: a match short
// of a fifth of its fluxes has every other oxide a quarter higher in its own
// formula. Held as near as any oxide, the others make up most of what is
// missing, as a potter would, and the rest of the formula stays near the
// target's. Where every flux can be had, their own rows already hold them.
const FLUXES_TOGETHER = 0.02;
// A flux worth making up: at least this share of the target's fluxes.
const FLUX_WORTH = 0.005;
// The most work one search may do (fitAmounts, or a choosing in select.js),
// in the solver's multiply-adds (lsq.js meter): about a second on a 2015
// laptop. A list of many materials and a target with many oxides took
// minutes (80 materials and 13 oxides: 93 s), holding the server for
// everyone, or the page, all that time. Past it, the steps that only refine
// what is found (amounts put back at their starts here; dropping, swapping
// and trying more materials in select.js) stop where they are, keeping what
// they have. The largest search the app makes itself, a famous glaze from
// a region's library (shino from the EU's 66 base materials), takes about
// half of it; any recipe or shelf in the tests, under a hundredth. Counted,
// not timed, so the same request gives the same answer anywhere.
const WORK = 1.5e8;

/**
 * A meter for one search: the solver's work so far (lsq.js), the most it may
 * do, and whether a step stopped for it (cut).
 */
const newMeter = (most = WORK) => ({ used: 0, most, cut: false });
/** Whether a search has done all the work it may: a step that would refine further stops, and says so. */
const spent = (meter) => {
  if (meter.used < meter.most) return false;
  meter.cut = true;
  return true;
};

const isFlux = (oxide) => oxides.OXIDE_GROUPS[oxide] === 'R2O' || oxides.OXIDE_GROUPS[oxide] === 'RO';

/**
 * The problem in numbers, in the unity formula's terms (moles per mole of the
 * target's fluxes): a row for each oxide, one for potash and soda together,
 * and one for all the fluxes together when options.fluxTotal says how near or
 * a flux of the target's cannot be had, each with the lines' amounts per gram,
 * the target and a weight. options.near sets how near particular oxides should
 * come, and options.alkalis potash and soda together, in place of the
 * defaults.
 */
const setUp = function (lines, target, options) {
  const near = options.near || {};
  const columns = lines.map((line) => molesPerGram(line.material));
  const names = new Set(Object.keys(target));
  columns.forEach((column) => Object.keys(column).forEach((oxide) => names.add(oxide)));
  const list = Array.from(names);
  const fluxes = list.reduce((sum, oxide) => (isFlux(oxide) ? sum + (target[oxide] || 0) : sum), 0);
  const scale = fluxes > 0 ? fluxes : Math.max(0, ...list.map((oxide) => target[oxide] || 0));
  if (!(scale > 0)) throw messages.problem('no-target');

  // An exact row (the fluxes together, FLUXES_TOGETHER) is held to its own closeness, never widened to 5% of its amount.
  /** @type {Array<{ oxides: string[], close: number, exact?: boolean }>} */
  const rows = list.map((oxide) => ({
    oxides: [oxide],
    close: near[oxide] ?? (ALKALIS.includes(oxide) ? CLOSE_APART : CLOSE)
  }));
  if (ALKALIS.some((oxide) => names.has(oxide))) rows.push({ oxides: ALKALIS, close: options.alkalis ?? CLOSE });
  const fluxNames = list.filter(isFlux);
  const supplied = (oxide) => columns.some((column) => column[oxide] > 0);
  const missing = fluxNames.some((oxide) => (target[oxide] || 0) >= FLUX_WORTH * fluxes && !supplied(oxide));
  if (options.fluxTotal) rows.push({ oxides: fluxNames, close: options.fluxTotal });
  else if (missing && fluxNames.some(supplied)) rows.push({ oxides: fluxNames, close: FLUXES_TOGETHER, exact: true });
  const sum = (amounts, row) => row.oxides.reduce((total, oxide) => total + (amounts[oxide] || 0), 0) / scale;
  const a = columns.map((column) => rows.map((row) => sum(column, row)));
  const b = rows.map((row) => sum(target, row));
  const w = rows.map((row, r) => 1 / Math.pow(row.exact ? row.close : Math.max(row.close, CLOSE_SHARE * b[r]), 2));
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

/** The solution of a small square system A z = v (Gaussian elimination, the largest pivot first); null if singular. */
const solveSmall = (A, v) => {
  const n = v.length;
  const M = A.map((row, i) => [...row, v[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
    const largest = Math.max(...M.map((row) => Math.abs(row[col])));
    if (!(Math.abs(M[pivot][col]) > 1e-12 * largest)) return null;
    [M[col], M[pivot]] = [M[pivot], M[col]];
    for (let r = col + 1; r < n; r++) {
      const factor = M[r][col] / M[col][col];
      for (let k = col; k <= n; k++) M[r][k] -= factor * M[col][k];
    }
  }
  const z = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let value = M[r][n];
    for (let k = r + 1; k < n; k++) value -= M[r][k] * z[k];
    z[r] = value / M[r][r];
  }
  return z.every(Number.isFinite) ? z : null;
};

/**
 * A fitting problem, ready to solve many ways: the rows, each line's start
 * (what to stay near), least and most, and the shared caps.
 *
 *   lines    [{ material, start, most, least, group }]: start is the amount to
 *            stay near, 0 for a material being brought in; most and least, if
 *            given, the most and least it may be; group, a shared cap's name
 *   options  { near, alkalis, fluxTotal, groups: { name: most }, shares: { name: share }, meter }:
 *            a group's members together at most `most`, or a share's at most
 *            that share (0 to 1) of all the lines together; every solve's
 *            work is counted on the meter, when given (newMeter)
 */
const prepare = function (lines, target, options = {}) {
  if (!lines.length) throw messages.problem('no-materials');
  const problem = setUp(lines, target, options);
  const most = lines.map((line) => (Number(line.most) >= 0 ? Number(line.most) : Infinity));
  const least = lines.map((line, i) => Math.min(most[i], Math.max(0, Number(line.least) || 0)));
  const starts = lines.map((line, i) => Math.min(most[i], Math.max(least[i], Number(line.start) || 0)));
  // With nothing to start from, the batch the target implies sets the scale.
  const firedGrams = Object.keys(target).reduce((sum, oxide) => sum + target[oxide] * oxides.MOLAR_MASS[oxide], 0);
  const size = starts.reduce((sum, amount) => sum + amount, 0) || firedGrams || 1;
  // Each cap as weights on the amounts, their weighted total at most `most`: a
  // group's members count 1 each; for a share s of the batch, members count
  // 1 - s and the other lines -s, so the members come to at most s of the total.
  // A line that supplies nothing the target has counts for nothing in a share:
  // it costs the match nothing, so the share's rebate would make it free filler
  // (a material saved with no oxides, at half the batch, to dilute the clay).
  const supplies = problem.a.map((column) => column.some((value, r) => value > 0 && problem.b[r] > 0));
  const membersOf = (name) => lines.map((line, i) => (line.group === name ? i : -1)).filter((i) => i >= 0);
  const caps = options.groups || {};
  const shares = options.shares || {};
  const groups = [
    ...Object.keys(caps).map((name) => {
      const members = membersOf(name);
      const cap = Number(caps[name]);
      const weights = lines.map((line, i) => (members.includes(i) ? 1 : 0));
      return { most: cap, members, weights, slack: 1e-9 * Math.max(1, cap) };
    }),
    ...Object.keys(shares)
      .filter((name) => Number(shares[name]) >= 0 && Number(shares[name]) < 1)
      .map((name) => {
        const share = Number(shares[name]);
        const members = membersOf(name);
        const weights = lines.map((line, i) => (members.includes(i) ? 1 - share : supplies[i] ? -share : 0));
        return { most: 0, members, weights, slack: 1e-9 * Math.max(1, size) };
      })
  ].filter((group) => group.members.length > 0 && Number.isFinite(group.most));
  const over = (group, x) => group.weights.reduce((sum, weight, i) => sum + weight * x[i], 0) - group.most;
  /** Whether amounts x keep every cap. */
  const keeps = (x) => groups.every((group) => over(group, x) <= Math.max(group.slack, 1e-6 * size));

  const root = problem.w.map(Math.sqrt);
  const columns = problem.a.map((column) => column.map((value, r) => value * root[r]));
  const b = problem.b.map((value, r) => value * root[r]);
  // The same for every solve below: worked out once, not for each (a choosing solves one problem thousands of ways).
  const normal = normalEquations(columns, b, options.meter);
  // How much a price on one unit of each line moves it, about: for a first guess at a cap's price.
  const stiffness = columns.map((column) => column.reduce((sum, value) => sum + value * value, 0));

  /**
   * The amounts that minimize the weighted misses plus a pull of the given
   * strength toward the starts, within bounds: lines in `held` at the amount
   * it gives, lines in `off` at nothing. A shared cap is kept by a price on
   * each of its members' amounts (a Lagrange multiplier; for a share, a
   * rebate on the other lines too), raised just enough that the members
   * together keep to it, so the cap goes where it helps the match most and
   * each member keeps its own least. With `stopAt`, the solve stops once the
   * meter reaches it (lsq.js), and then, the meter spent, leaves the caps
   * unpriced.
   */
  const solve = (pull, held = new Map(), off = new Set(), stopAt = Infinity) => {
    const lo = least.map((low, i) => (off.has(i) ? 0 : held.has(i) ? held.get(i) : low));
    const hi = most.map((high, i) => (off.has(i) ? 0 : held.has(i) ? held.get(i) : high));
    const prices = groups.map(() => 0);
    const cost = new Array(lines.length).fill(0);
    const run = () => {
      cost.fill(0);
      groups.forEach((group, g) => group.weights.forEach((weight, i) => (cost[i] += prices[g] * weight)));
      return boundedLeastSquares({
        columns,
        b,
        lo,
        hi,
        lambda: pull / (size * size),
        pullTo: starts,
        cost,
        normal,
        meter: options.meter,
        stopAt
      });
    };
    let x = run();
    if (stopAt < Infinity && options.meter && spent(options.meter)) return { x, miss: missOf(problem, x) };
    for (let round = 0; round < CAP_ROUNDS && groups.length; round++) {
      let moved = false;
      for (let g = 0; g < groups.length; g++) {
        const found = priceFor(g, x, prices, lo, hi, run);
        if (found) {
          x = found;
          moved = true;
        }
      }
      if (!moved) break;
    }
    if (groups.length > 1 && !keeps(x)) x = together(x, prices, run, pull);
    return { x, miss: missOf(problem, x) };
  };

  /**
   * The prices of all the caps at once, when setting them one at a time has
   * left a cap broken. The right prices make the most of the dual (the
   * solve's own measure plus each cap's price times how far it is over),
   * whose slope in each price is how far that cap is over. Each step measures
   * how the caps' overs move with the prices, finds the prices that would
   * keep the caps if they moved just so (each cap with a price at its most,
   * each without one within it), and goes toward them, halving the way until
   * the dual rises. Returns the amounts at the last prices, or, if a cap is
   * still broken then, the least broken found.
   */
  const together = (x, prices, run, pull) => {
    const lambda = pull / (size * size);
    const tolerance = (group) => Math.max(group.slack, 1e-6 * size);
    const broken = (overs) => groups.reduce((sum, group, g) => sum + Math.max(0, overs[g] - tolerance(group)), 0);
    const state = (values, y) => {
      const overs = groups.map((group) => over(group, y));
      let value = 0;
      for (let r = 0; r < b.length; r++) {
        let sum = -b[r];
        for (let i = 0; i < y.length; i++) sum += columns[i][r] * y[i];
        value += sum * sum;
      }
      for (let i = 0; i < y.length; i++) value += lambda * (y[i] - starts[i]) ** 2;
      groups.forEach((_, g) => (value += 2 * values[g] * overs[g]));
      return { prices: values.slice(), x: y, overs, dual: value, broken: broken(overs) };
    };
    const at = (values) => {
      values.forEach((value, g) => (prices[g] = value));
      return state(values, run());
    };
    const k = groups.length;
    // Every set of caps, the fewest first.
    const ones = (set) => groups.reduce((sum, _, g) => sum + ((set >> g) & 1), 0);
    const sets = [...Array(1 << k).keys()].sort((p, q) => ones(p) - ones(q) || p - q);
    let now = state(prices.slice(), x);
    let least = now;
    for (let step = 0; step < JOINT_STEPS; step++) {
      const settled = groups.every(
        (group, g) => now.overs[g] <= tolerance(group) && (now.prices[g] === 0 || now.overs[g] >= -tolerance(group))
      );
      if (settled) break;
      // How each cap's over moves with each price, measured.
      const slopes = groups.map(() => new Array(k).fill(0));
      groups.forEach((group, h) => {
        const { members, weights } = group;
        const guess = Math.max(...members.map((i) => stiffness[i] / weights[i] ** 2)) * Math.abs(now.overs[h]);
        const d = 1e-6 * (now.prices[h] > 0 ? now.prices[h] : guess || 1);
        const bumped = now.prices.slice();
        bumped[h] += d;
        const moved = at(bumped);
        groups.forEach((_, g) => (slopes[g][h] = (moved.overs[g] - now.overs[g]) / d));
      });
      // The prices that keep the caps if the overs move so: some caps at their most (a price of 0 or
      // more), the rest within it at no price; of the sets of caps that work, the one with the fewest.
      const model = (values) =>
        groups.map(
          (_, g) => now.overs[g] + slopes[g].reduce((sum, slope, h) => sum + slope * (values[h] - now.prices[h]), 0)
        );
      let aim = null;
      for (const set of sets) {
        const binding = groups.map((_, g) => g).filter((g) => set & (1 << g));
        const values = new Array(k).fill(0);
        if (binding.length) {
          // over_g + sum over h of slope_gh (value_h - price_h) = 0 for g binding, value_h = 0 for the others.
          const solved = solveSmall(
            binding.map((g) => binding.map((h) => slopes[g][h])),
            binding.map((g) => -now.overs[g] + groups.reduce((sum, _, h) => sum + slopes[g][h] * now.prices[h], 0))
          );
          if (!solved || solved.some((value) => value < 0)) continue;
          binding.forEach((g, a) => (values[g] = solved[a]));
        }
        const predicted = model(values);
        if (groups.every((group, g) => set & (1 << g) || predicted[g] <= tolerance(group))) {
          aim = values;
          break;
        }
      }
      if (!aim) break;
      // Toward them, halving the way until the dual rises (it is concave in the prices).
      let kept = null;
      for (let scale = 1; scale > 1e-4 && !kept; scale /= 2) {
        const values = now.prices.map((price, g) => price + scale * (aim[g] - price));
        const tried = at(values);
        const rise = groups.reduce((sum, _, g) => sum + 2 * now.overs[g] * (values[g] - now.prices[g]), 0);
        if (tried.dual > now.dual && tried.dual >= now.dual + 1e-4 * rise) kept = tried;
      }
      if (!kept) break;
      now = kept;
      if (now.broken < least.broken) least = now;
    }
    const chosen = now.broken > 0 && least.broken < now.broken ? least : now;
    chosen.prices.forEach((value, g) => (prices[g] = value));
    return chosen.x;
  };

  /**
   * The price on a shared cap's members that brings them together to the cap,
   * the other caps' prices as they are; null if the price already does (or
   * the cap does not bind and there is no price). The members' total falls as
   * the price rises, so the price is found between one too low and one high
   * enough (regula falsi, the Illinois way). If the members' leasts alone come
   * to more than the cap, they stay at their leasts.
   */
  const priceFor = (g, x, prices, lo, hi, run) => {
    const group = groups[g];
    const { members, weights } = group;
    const near = group.slack;
    const price = prices[g];
    if (over(group, x) <= near && (price === 0 || over(group, x) >= -near)) return null;
    const at = (value) => {
      prices[g] = value;
      const y = run();
      return { value, y, over: over(group, y) };
    };
    const none = at(0);
    if (none.over <= near) return price === 0 ? null : none.y;
    // Every line the price moves is at its bound: members at their least, the others (for a share) at their most.
    const stuck = (y) =>
      weights.every((weight, i) => (weight > 0 ? y[i] <= lo[i] + near : weight < 0 ? y[i] >= hi[i] - near : true));
    // A price high enough: a first guess, doubled until the members keep to the cap.
    let low = none;
    let high = at(Math.max(price, none.over * Math.max(...members.map((i) => stiffness[i] / weights[i] ** 2))) || 1);
    for (let k = 0; k < 60 && high.over > near; k++) {
      if (stuck(high.y)) return high.y;
      low = high;
      high = at(2 * high.value);
    }
    // Then nearer, keeping a price on each side; an end kept twice running counts for half.
    let fLow = low.over;
    let fHigh = high.over;
    let kept = '';
    for (let k = 0; k < 60 && high.over < -near && high.value - low.value > 1e-12 * high.value; k++) {
      const tried = at(high.value - (fHigh * (high.value - low.value)) / (fHigh - fLow));
      if (tried.over > near) {
        low = tried;
        fLow = tried.over;
        if (kept === 'high') fHigh /= 2;
        kept = 'high';
      } else {
        high = tried;
        fHigh = tried.over;
        if (kept === 'low') fLow /= 2;
        kept = 'low';
      }
    }
    prices[g] = high.value;
    return high.y;
  };
  return { problem, lines, starts, least, most, size, solve, keeps };
};

/**
 * Amounts for the lines that bring their fired oxides as near the target as
 * the materials allow, changing them from their start amounts as little as
 * possible: first the best match, then each amount pulled back toward its
 * start for as long as the match stays within about 1% of an oxide of it.
 *
 *   lines    [{ material, start, most, least, group }] (see prepare)
 *   target   { oxide: moles }, such as the old recipe's oxideMoles
 *   options  { near: { oxide: how near }, alkalis, fluxTotal, groups: { name: most }, shares: { name: share }, meter }:
 *            how near the oxides, potash and soda together and all the fluxes
 *            together should come, where the defaults will not do, and shared
 *            caps, on an amount or on a share of the batch; the meter of the
 *            search this is part of (a new one if not given)
 *
 * Returns { amounts, moles, miss }: the lines' oxide moles at those amounts, and
 * how far they are from the target (the sum of each oxide's miss, squared, in
 * units of how near it should come), for ranking one choice of materials
 * against another. With the meter spent, amounts not yet put back at their
 * starts stay where the match has them.
 */
const fitAmounts = function (lines, target, options = {}) {
  const meter = options.meter ?? newMeter();
  const fit = prepare(lines, target, { ...options, meter });
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
  // not need changing is unchanged). Neither may break a cap the match keeps:
  // a held amount is out of reach of the cap's price, so a member put back at
  // its start could take its group past the cap.
  const held = new Map();
  let best = search(held);
  const allows = (found) => found && (fit.keeps(found.x) || !fit.keeps(best.x));
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
    // The first the match allows, each tried only once those before it are not.
    let next = null;
    for (const [i, value] of [...tokens, ...near]) {
      if (spent(meter)) break;
      const found = search(new Map([...held, [i, value]]));
      if (allows(found)) {
        next = { i, value, found };
        break;
      }
    }
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

module.exports = {
  fitAmounts,
  bestFit,
  prepare,
  molesPerGram,
  oxideMoles,
  newMeter,
  spent,
  CLOSE,
  CLOSE_SHARE,
  CLOSE_APART,
  ALKALIS,
  WORK
};
