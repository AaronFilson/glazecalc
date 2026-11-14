'use strict';

// Shared caps kept exactly, for when setting each cap's price in turn
// (fit.js) has not settled them: the bounded least squares of lsq.js,
//
//   |A x - b|^2 + lambda |x - pullTo|^2,  lo <= x <= hi,  w . x <= most for each cap,
//
// with the caps as constraints of their own. A primal active-set method
// (Nocedal and Wright, Numerical Optimization, 2nd ed., 16.5): each variable
// is at a bound or free, and each cap under its most, at it, or over it. Each
// step solves for the free variables with the caps at their most held exactly
// (the KKT system, by the free variables' Cholesky factor and the held caps'
// Schur complement), then moves toward that solution until a variable reaches
// a bound or a cap its most. Where it gets there, a variable whose gradient
// wants it off its bound, or a cap whose multiplier has the wrong sign, is let
// go, the most wrong first, until none is. A cap over its most is charged a
// price for each unit over (an exact penalty, the "elastic" mode of SQP
// solvers), raised while the cap is still over: so every cap that can be kept
// is kept exactly, and caps that cannot be (their members' leasts alone come
// to more) are broken as little as the bounds allow. Started from where the
// prices left the amounts, it takes a few steps.

/** Steps at most, beyond ten for each variable and cap: a guard against cycling, not reached in the tests. */
const STEPS = 50;
/** How far the price on a cap over its most is raised at a time, and how far past the gradients' scale it may go. */
const RAISE = 100;
const DEAREST = 1e12;

/**
 * The solution of a square system A z = v by Gaussian elimination, the
 * largest entry left the pivot each time (full pivoting: steady for the KKT
 * systems here, which are symmetric but not positive definite, and whose
 * least squares part can be near singular, as with silica and flint); null
 * if A is singular, or so near it that a pivot is under 1e-14 of A's largest
 * entry.
 */
const solveSquare = (A, v) => {
  const n = v.length;
  const M = A.map((row, i) => [...row, v[i]]);
  const column = [...Array(n).keys()];
  let largest = 0;
  for (const row of M) for (let c = 0; c < n; c++) largest = Math.max(largest, Math.abs(row[c]));
  for (let k = 0; k < n; k++) {
    let top = -1;
    let pr = k;
    let pc = k;
    for (let r = k; r < n; r++)
      for (let c = k; c < n; c++)
        if (Math.abs(M[r][c]) > top) {
          top = Math.abs(M[r][c]);
          pr = r;
          pc = c;
        }
    if (!(top > 1e-14 * largest)) return null;
    [M[k], M[pr]] = [M[pr], M[k]];
    if (pc !== k) {
      for (const row of M) [row[k], row[pc]] = [row[pc], row[k]];
      [column[k], column[pc]] = [column[pc], column[k]];
    }
    for (let r = k + 1; r < n; r++) {
      const ratio = M[r][k] / M[k][k];
      if (ratio !== 0) for (let c = k; c <= n; c++) M[r][c] -= ratio * M[k][c];
    }
  }
  const z = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let value = M[r][n];
    for (let c = r + 1; c < n; c++) value -= M[r][c] * z[c];
    z[r] = value / M[r][r];
  }
  const solution = new Array(n);
  column.forEach((c, i) => (solution[c] = z[i]));
  return solution.every(Number.isFinite) ? solution : null;
};

/**
 * The x within its bounds that keeps the caps, or breaks them as little as
 * the bounds allow, with the least squares smallest.
 *
 *   normal   { gram, atb }: A^T A and A^T b (lsq.js normalEquations)
 *   lambda   the pull's strength, and pullTo where it pulls
 *   lo, hi   each variable's bounds (lo = hi holds it there)
 *   caps     [{ weights, most, tolerance, price }]: weights . x at most
 *            `most`, kept to within `tolerance`; price, what setting the
 *            caps one at a time left on it (a first guess at its worth)
 *   start    where to start, within the bounds
 *   size     the batch's size, about (fit.js): a move a ten-billionth of it
 *            is rounding, not a move
 *   meter    when given, the work is counted on it, and the search stops
 *            where it is once meter.used reaches stopAt (meter.most if not
 *            given)
 *
 * Returns x: stopped by the meter, within its bounds and as near the answer
 * as the steps so far have brought it.
 */
function cappedLeastSquares({ normal, lambda = 0, pullTo, lo, hi, caps, start, size = 1, meter, stopAt }) {
  const { gram, atb } = normal;
  const n = atb.length;
  const k = caps.length;
  const tally = (work) => {
    if (meter) meter.used += work;
  };
  const spent = () => meter !== undefined && meter.used >= (stopAt ?? meter.most);
  // The same slight ridge as lsq.js, only to steady the solve.
  const scale = Math.max(1e-300, ...gram.map((row, j) => row[j]));
  const ridge = gram.map((row, j) => Math.min(1e-13 * scale, 1e-6 * row[j]));
  const diagonal = gram.map((row, j) => row[j] + lambda + ridge[j]);
  const toward = pullTo || new Array(n).fill(0);
  const v = atb.map((value, j) => value + lambda * toward[j]);
  const sizeOf = (j) => Math.max(1, Math.abs(lo[j]), Number.isFinite(hi[j]) ? Math.abs(hi[j]) : 0);
  // Held where lo = hi; and a variable in no row and with no pull, which only a cap would move, stays where it starts.
  const fixed = lo.map((low, j) => (Number.isFinite(hi[j]) && hi[j] - low <= 1e-12 * sizeOf(j)) || !(diagonal[j] > 0));
  const within = (j, value) => Math.min(hi[j], Math.max(lo[j], value));
  const x = start.map((value, j) => within(j, value));
  // Each variable: 0 free, -1 at its lower bound, 1 at its upper.
  const side = x.map((value, j) => (fixed[j] ? 0 : value <= lo[j] ? -1 : value >= hi[j] ? 1 : 0));
  const isFree = (j) => !fixed[j] && side[j] === 0;
  // Each cap: 'under' its most, 'at' it (held there exactly), or 'over' it at a price for each unit over.
  const over = (g) => caps[g].weights.reduce((sum, weight, j) => sum + weight * x[j], 0) - caps[g].most;
  const state = caps.map((cap, g) => (over(g) > 0 ? 'over' : 'under'));
  const gradientScale = Math.max(1e-300, ...v.map(Math.abs), ...x.map((value, j) => diagonal[j] * Math.abs(value)));
  const price = caps.map((cap) => RAISE * Math.max(cap.price || 0, gradientScale));
  const dearest = DEAREST * gradientScale;
  // The least gradient or multiplier worth letting a variable or cap go for.
  const least = 1e-11 * gradientScale;
  // The least squares' gradient for x_j, with the prices on caps over their most and the multipliers mu on those at it.
  const gradient = (j, held, mu) => {
    let value = -v[j] + (lambda + ridge[j]) * x[j];
    for (let c = 0; c < n; c++) value += gram[j][c] * x[c];
    caps.forEach((cap, g) => {
      if (state[g] === 'over') value += price[g] * cap.weights[j];
    });
    held.forEach((g, b) => (value += mu[b] * caps[g].weights[j]));
    return value;
  };
  // What was let go last, to undo if the step it gives turns straight back (numerical noise, not a better
  // answer); and what was let go and undone since the amounts last moved, not let go again until they do.
  /** @type {{ j?: number, from?: number, g?: number, to?: string } | null} */
  let released = null;
  const refused = new Set();
  const limit = STEPS + 10 * (n + k);
  for (let step = 0; step < limit && !spent(); step++) {
    const free = [];
    for (let j = 0; j < n; j++) if (isFree(j)) free.push(j);
    const held = caps.map((cap, g) => g).filter((g) => state[g] === 'at');
    // The free variables' right-hand side: A^T b and the pull, less the others where they are and the prices.
    const r = free.map((j) => {
      let value = v[j];
      for (let c = 0; c < n; c++) if (!isFree(c)) value -= gram[j][c] * x[c];
      caps.forEach((cap, g) => {
        if (state[g] === 'over') value -= price[g] * cap.weights[j];
      });
      return value;
    });
    // The KKT system: the free variables' least squares with the caps held at their most exactly,
    //   [M_FF  W_F^T] [x_F]   [r             ]
    //   [W_F   0    ] [mu ] = [most - W_N x_N]
    // the caps' rows scaled to the largest of M_FF's diagonal, and their multipliers scaled back after.
    const across = held.length ? Math.max(1e-300, ...free.map((j) => diagonal[j])) : 1;
    const K = [
      ...free.map((j) => [
        ...free.map((c) => gram[j][c] + (j === c ? lambda + ridge[j] : 0)),
        ...held.map((g) => across * caps[g].weights[j])
      ]),
      ...held.map((g) => [...free.map((j) => across * caps[g].weights[j]), ...held.map(() => 0)])
    ];
    const room = held.map((g) =>
      caps[g].weights.reduce((sum, weight, j) => (isFree(j) ? sum : sum - weight * x[j]), caps[g].most)
    );
    tally(K.length * K.length * K.length + free.length * n + n * k);
    const solution = solveSquare(K, [...r, ...room.map((value) => across * value)]);
    if (!solution) {
      // The caps held are not independent over the free variables (numerically): the last held is let go.
      if (!held.length) break;
      const g = held[held.length - 1];
      state[g] = over(g) > 0 ? 'over' : 'under';
      released = null;
      continue;
    }
    const target = solution.slice(0, free.length);
    const mu = held.map((g, b) => across * solution[free.length + b]);
    // A step of rounding noise is none: taken as a direction, it would stop at once at any bound or cap
    // it touches, and the steps could go round in circles at a corner where many meet (all at nothing).
    const p = target.map((value, i) => {
      const move = value - x[free[i]];
      return Math.abs(move) > 1e-10 * size ? move : 0;
    });
    const rate = (g) => free.reduce((sum, j, i) => sum + caps[g].weights[j] * p[i], 0);
    // What was just let go, turning straight back: put back, and not let go again until the amounts move.
    if (released) {
      const { j, g, from } = released;
      const back =
        j !== undefined
          ? (from < 0 && p[free.indexOf(j)] < 0) || (from > 0 && p[free.indexOf(j)] > 0)
          : (state[g] === 'under' && rate(g) > 0) || (state[g] === 'over' && rate(g) < 0);
      released = null;
      if (back) {
        if (j !== undefined) {
          side[j] = from;
          x[j] = from < 0 ? lo[j] : hi[j];
          refused.add(j);
        } else {
          state[g] = 'at';
          refused.add(n + g);
        }
        continue;
      }
    }
    // How far toward it before a variable reaches a bound or a cap its most.
    let alpha = 1;
    /** @type {{ j?: number, side?: number, g?: number } | null} */
    let blocking = null;
    p.forEach((move, i) => {
      const j = free[i];
      const ratio =
        move < 0 ? (lo[j] - x[j]) / move : move > 0 && Number.isFinite(hi[j]) ? (hi[j] - x[j]) / move : Infinity;
      if (ratio < alpha) {
        alpha = ratio;
        blocking = { j, side: move < 0 ? -1 : 1 };
      }
    });
    caps.forEach((cap, g) => {
      if (state[g] === 'at') return;
      const toward = rate(g);
      const ratio =
        state[g] === 'under' ? (toward > 0 ? -over(g) / toward : Infinity) : toward < 0 ? -over(g) / toward : Infinity;
      if (ratio < alpha) {
        alpha = ratio;
        blocking = { g };
      }
    });
    alpha = Math.max(0, alpha);
    // Whether the amounts really move: then what was refused may be let go again.
    const moves = p.some((move) => alpha * Math.abs(move) > 1e-10 * size);
    if (moves) refused.clear();
    if (blocking) {
      free.forEach((j, i) => (x[j] = within(j, x[j] + alpha * p[i])));
      if (blocking.j !== undefined) {
        x[blocking.j] = blocking.side < 0 ? lo[blocking.j] : hi[blocking.j];
        side[blocking.j] = blocking.side;
      } else state[blocking.g] = 'at';
      continue;
    }
    free.forEach((j, i) => (x[j] = within(j, target[i])));
    // At the solution with these held: a variable whose gradient wants it off its bound, or a cap whose
    // multiplier says it would rather be under (below 0) or over (above its price), is let go, the most wrong.
    tally(n * n + n * k);
    let worst = least;
    /** @type {{ j?: number, from?: number, g?: number, to?: string } | null} */
    let release = null;
    for (let j = 0; j < n; j++) {
      if (fixed[j] || side[j] === 0 || refused.has(j)) continue;
      const wrong = side[j] * gradient(j, held, mu);
      if (wrong > worst) {
        worst = wrong;
        release = { j, from: side[j] };
      }
    }
    held.forEach((g, b) => {
      if (refused.has(n + g)) return;
      if (-mu[b] > worst) {
        worst = -mu[b];
        release = { g, to: 'under' };
      } else if (mu[b] - price[g] > worst) {
        worst = mu[b] - price[g];
        release = { g, to: 'over' };
      }
    });
    if (release) {
      if (release.j !== undefined) side[release.j] = 0;
      else state[release.g] = release.to;
      released = release;
      continue;
    }
    // The best at these prices: a cap still over its most is charged more, while that may help.
    const dearer = caps
      .map((cap, g) => g)
      .filter((g) => state[g] === 'over' && over(g) > caps[g].tolerance && price[g] < dearest);
    if (!dearer.length) break;
    dearer.forEach((g) => (price[g] = Math.min(dearest, RAISE * price[g])));
  }
  return x;
}

module.exports = { cappedLeastSquares };
