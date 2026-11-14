'use strict';

// Bounded least squares by an active set (after Stark and Parker's BVLS, and
// Lawson and Hanson's NNLS): the x within its bounds that makes
//
//   |A x - b|^2 + lambda |x - pullTo|^2 + 2 cost . x
//
// smallest. The second term pulls x toward pullTo (the recipe as it was); the
// third puts a price on each variable (what keeps a shared cap, in fit.js).
// Variables sit at a bound or are free; each step frees the variable whose
// gradient most wants to leave its bound, solves for the free ones exactly
// (normal equations, Cholesky), and steps back to the first bound crossed if
// any free variable would leave its range. For the sizes a glaze has (tens of
// materials, a dozen or two oxides) a solve takes well under a millisecond.

const TOLERANCE = 1e-12;

/** Solves the symmetric positive definite system M z = v in place of a copy; null if it is not. */
function cholesky(M, v) {
  const n = v.length;
  const L = M.map((row) => row.slice());
  for (let j = 0; j < n; j++) {
    for (let k = 0; k < j; k++) L[j][j] -= L[j][k] * L[j][k];
    if (!(L[j][j] > 0)) return null;
    L[j][j] = Math.sqrt(L[j][j]);
    for (let i = j + 1; i < n; i++) {
      for (let k = 0; k < j; k++) L[i][j] -= L[i][k] * L[j][k];
      L[i][j] /= L[j][j];
    }
  }
  const y = v.slice();
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < i; k++) y[i] -= L[i][k] * y[k];
    y[i] /= L[i][i];
  }
  for (let i = n - 1; i >= 0; i--) {
    for (let k = i + 1; k < n; k++) y[i] -= L[k][i] * y[k];
    y[i] /= L[i][i];
  }
  return y;
}

/**
 * A^T A and A^T b: the same for every solve of one problem, whatever its
 * bounds, pull and prices, so a caller that solves one problem many ways
 * (fit.js prepare) works them out once. Their multiply-adds are counted on
 * the meter, when given.
 */
function normalEquations(columns, b, meter) {
  const gram = columns.map((cj) => columns.map((ck) => cj.reduce((sum, value, r) => sum + value * ck[r], 0)));
  const atb = columns.map((cj) => cj.reduce((sum, value, r) => sum + value * b[r], 0));
  if (meter) meter.used += columns.length * (columns.length + 1) * b.length;
  return { gram, atb };
}

/**
 * The bounded least-squares solution.
 *
 *   columns  A's columns: columns[j][r] is variable j's entry in row r
 *   b        the target, one value per row
 *   lo, hi   each variable's bounds (lo = hi holds it there)
 *   lambda   the pull's strength (0 for none), and pullTo where it pulls
 *   cost     a price on each unit of each variable (none if not given)
 *   normal   normalEquations(columns, b), when worked out already
 *   meter    when given, meter.used goes up by the multiply-adds the solve
 *            takes, about: the work a search has done, counted rather than
 *            timed (fit.js WORK)
 *   stopAt   with a meter, stop once meter.used reaches this: after the
 *            first variable freed, between steps, with x within its bounds
 *            and as near as the variables freed so far bring it
 *
 * Returns x.
 */
function boundedLeastSquares({ columns, b, lo, hi, lambda = 0, pullTo, cost, normal, meter, stopAt = Infinity }) {
  const n = columns.length;
  const m = b.length;
  const tally = (work) => {
    if (meter) meter.used += work;
  };
  const toward = pullTo || new Array(n).fill(0);
  const x = lo.map((low, j) => Math.min(hi[j], Math.max(low, 0)));
  const free = new Array(n).fill(false);
  // A^T A and A^T b (less the price).
  const { gram, atb: plain } = normal ?? normalEquations(columns, b, meter);
  const atb = cost ? plain.map((value, j) => value - cost[j]) : plain;
  // Setting up, a few passes over the variables.
  tally(4 * n);
  const scale = Math.max(1e-300, ...gram.map((row, j) => row[j]));
  // A ridge so slight it only steadies the solve: 1e-13 of the largest column's
  // square, or a millionth of a column's own where that is far smaller (under
  // 1e-7 of the largest), so a tiny column is not held back by the others'.
  const ridge = gram.map((row, j) => Math.min(1e-13 * scale, 1e-6 * row[j]));
  // The least slope worth moving a variable for: TOLERANCE of the largest
  // column's square, or less for a column far smaller, likewise.
  const least = gram.map((row, j) => TOLERANCE * Math.min(scale, 1e7 * row[j]));
  // A column of zeros touches no row and no other variable: its own best, at
  // once, from the pull and the price alone (where they leave it anywhere, or
  // would take it past every bound, it stays where it starts).
  const empty = gram.map((row, j) => row[j] === 0);
  empty.forEach((none, j) => {
    if (!none) return;
    const best = lambda > 0 ? toward[j] - (cost ? cost[j] : 0) / lambda : NaN;
    if (Number.isFinite(best)) x[j] = Math.min(hi[j], Math.max(lo[j], best));
    else if (cost && cost[j] > 0) x[j] = lo[j];
    else if (cost && cost[j] < 0 && Number.isFinite(hi[j])) x[j] = hi[j];
  });
  // The gradient's negative half: A^T (b - A x) + lambda (pullTo - x).
  const slope = (j) => {
    tally(n);
    let value = atb[j] + lambda * (toward[j] - x[j]);
    for (let k = 0; k < n; k++) value -= gram[j][k] * x[k];
    return value;
  };
  // Tolerances on the finite bounds only: an absent upper bound is Infinity.
  const sizeOf = (j) => Math.max(1, Math.abs(lo[j]), Number.isFinite(hi[j]) ? Math.abs(hi[j]) : 0);
  const fixed = (j) => Number.isFinite(hi[j]) && hi[j] - lo[j] <= TOLERANCE * sizeOf(j);
  const refused = new Set();
  const spent = () => meter !== undefined && meter.used >= stopAt;
  let stopped = false;

  for (let outer = 0; outer < 4 * n + 10; outer++) {
    if (outer > 0 && spent()) break;
    // The variable at a bound that most wants to move inward: each looked at, and a slope for those that may move.
    tally(n);
    let best = -1;
    let most = 0;
    for (let j = 0; j < n; j++) {
      if (free[j] || empty[j] || fixed(j) || refused.has(j)) continue;
      const g = slope(j);
      const inward = x[j] <= lo[j] ? g : x[j] >= hi[j] ? -g : Math.abs(g);
      if (inward > least[j] && inward > most) {
        most = inward;
        best = j;
      }
    }
    if (best < 0) break;
    free[best] = true;

    for (let inner = 0; inner < 4 * n + 10; inner++) {
      if (inner > 0 && spent()) {
        stopped = true;
        break;
      }
      const F = [];
      for (let j = 0; j < n; j++) if (free[j]) F.push(j);
      // The free variables' exact solution with the others where they are.
      const M = F.map((j) => F.map((k) => gram[j][k] + (j === k ? lambda + ridge[j] : 0)));
      const v = F.map((j) => {
        let value = atb[j] + lambda * toward[j];
        for (let k = 0; k < n; k++) if (!free[k]) value -= gram[j][k] * x[k];
        return value;
      });
      const solved = cholesky(M, v);
      tally(F.length * ((F.length * F.length) / 3 + n));
      // Past any number (a column far too small for its price): no use, as if it would not solve.
      const z = solved && solved.every(Number.isFinite) ? solved : null;
      if (!z) {
        free[best] = false;
        refused.add(best);
        break;
      }
      // A freed variable that would move the wrong way is left at its bound.
      if (inner === 0) {
        const i = F.indexOf(best);
        const wrong = x[best] <= lo[best] ? z[i] <= x[best] : x[best] >= hi[best] ? z[i] >= x[best] : false;
        if (wrong) {
          free[best] = false;
          refused.add(best);
          break;
        }
      }
      let alpha = 1;
      F.forEach((j, i) => {
        if (z[i] < lo[j]) alpha = Math.min(alpha, (x[j] - lo[j]) / (x[j] - z[i]));
        else if (z[i] > hi[j]) alpha = Math.min(alpha, (hi[j] - x[j]) / (z[i] - x[j]));
      });
      alpha = Math.max(0, alpha);
      F.forEach((j, i) => (x[j] += alpha * (z[i] - x[j])));
      if (alpha >= 1) break;
      // Those that reached a bound stay there.
      F.forEach((j) => {
        const span = TOLERANCE * sizeOf(j);
        if (x[j] <= lo[j] + span) {
          x[j] = lo[j];
          free[j] = false;
        } else if (x[j] >= hi[j] - span) {
          x[j] = hi[j];
          free[j] = false;
        }
      });
    }
    if (stopped) break;
    // A move elsewhere can make a refused variable worth freeing again.
    refused.clear();
  }
  void m;
  return x;
}

module.exports = { boundedLeastSquares, normalEquations };
