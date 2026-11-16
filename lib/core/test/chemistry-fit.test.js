// Working out amounts (lib/core/chemistry/fit.js, lsq.js, caps.js) on the standard records, by id.
// Ported from server/test/chemistry_tests.ts ('bounded least squares', 'suggested amounts for a swap').
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import * as chemistry from '../chemistry/index.js';
import { IDS, record, thrown } from './support.js';

const near = (actual, expected, within, what = '') =>
  assert.ok(Math.abs(actual - expected) <= within, `${what} ${actual} is not within ${within} of ${expected}`);

// Standard records, from data/materials.ndjson.
const RED_LEAD = '9965f3fd-a90f-459f-8ad1-e874fc915e13'; // Lead, Red
const CHINA_CLAY = 'c4eeb157-5c2b-4875-90c5-808f75079658'; // China Clay
const LEAD_BISILICATE = '2f4cdb59-6c8e-4b19-b513-11df791ccc9a'; // Lead Bisilicate Frit (Potclays 2261)
const NITER = '7dffc301-0836-4f8b-be6f-e51dfc6ad36a'; // Niter
const FRIT_3110 = '634e5cfa-5a35-4cfb-afd3-095e06d1b8c2'; // Ferro Frit 3110
const G200 = 'c8c97af3-4d2a-4a62-bda5-7ecb7bd303e2'; // G-200 EU Feldspar
const DOLOMITE = 'da635f29-076f-4223-8e75-65d4dfa11700'; // Dolomite
const FRIT_4113 = '95bc6cda-e298-4a5b-b489-ce9a08c4ea9d'; // Ferro Frit 4113
const ECKALITE = '7b37d8dd-0bdc-4a1f-9bbc-2868df8c09a6'; // Eckalite 2 Kaolin
const CLAY_CERAM = '7407a922-a2dd-48ea-bbc0-770a9c873962'; // Clay Ceram (Unimin, Granville)
const FFF = 'b481fae9-80a9-45c8-8350-21abbf9dba60'; // FFF Feldspar (Sibelco FFF K7-60)
const ALKALI_FRIT = 'da11c8ea-6ba6-4465-bcbd-0195b84f2d17'; // Alkali Frit 15.10 (Keramikos)
const F19 = '4b1e914a-3f21-4d9d-acce-6bfec6abe659'; // Fusion Frit F-19
const BORIC_ACID = 'df0f5c7c-6eec-4fff-96c8-eb784a71ba64'; // Boric Acid
const GILLESPIE = '5d9f3fd2-4fab-4fcc-b595-de6cd95a2b58'; // Gillespie Borate
const F69 = '1790d254-3c27-4f54-91bf-59be2f06afdd'; // Fusion Frit F-69
const ALBANY = 'edf14a13-7ad2-4299-b654-ee27f87ead6f'; // Albany Slip
const BORAX_FRIT = '1f9730a6-2f16-420c-86db-18744203e933'; // Standard Borax Frit (Potclays 2263)

const lines = (pairs) => pairs.map(([id, amount]) => ({ material: record(id), amount }));
const molesOf = (pairs) => chemistry.oxideMoles(lines(pairs));
/** The unity formula, with potash and soda together as potters count them. */
const unity = (pairs) => {
  const { umf } = chemistry.calculateUMF(lines(pairs));
  return { ...umf, KNaO: (umf.K2O ?? 0) + (umf.Na2O ?? 0) };
};
const fit = (old, modern) => {
  const { amounts } = chemistry.fitAmounts(
    modern.map(([id, start]) => ({ material: record(id), start })),
    molesOf(old)
  );
  return modern.map(([id], i) => [id, amounts[i]]);
};

describe('boundedLeastSquares', () => {
  const { boundedLeastSquares } = chemistry;
  const close = (x, want) => x.forEach((v, i) => near(v, want[i], 1e-9, String(i)));

  test('solves exactly, stops at bounds, and holds a variable whose bounds meet', () => {
    close(boundedLeastSquares({ columns: [[1]], b: [2], lo: [0], hi: [Infinity] }), [2]);
    const pair = [
      [1, 1],
      [1, -1]
    ];
    close(boundedLeastSquares({ columns: pair, b: [2, 0], lo: [0, 0], hi: [Infinity, Infinity] }), [1, 1]);
    const eye = [
      [1, 0],
      [0, 1]
    ];
    // A cap is a hard upper bound; the other variable does what it can.
    close(boundedLeastSquares({ columns: eye, b: [2, 3], lo: [0, 0], hi: [1, Infinity] }), [1, 3]);
    // Nothing negative: the best non-negative answer, not the unconstrained one (-1).
    close(boundedLeastSquares({ columns: [[1]], b: [-1], lo: [0], hi: [Infinity] }), [0]);
    close(boundedLeastSquares({ columns: eye, b: [2, 3], lo: [0.5, 0], hi: [0.5, Infinity] }), [0.5, 3]);
  });

  test('pulls toward the given amounts in proportion to lambda, and puts a price on each variable', () => {
    // |x - 2|^2 + lambda |x - 0|^2 is least at 2 / (1 + lambda).
    close(boundedLeastSquares({ columns: [[1]], b: [2], lo: [0], hi: [Infinity], lambda: 1, pullTo: [0] }), [1]);
    // |x - 2|^2 + 2 cost x is least at 2 - cost, and no lower than its bound.
    close(boundedLeastSquares({ columns: [[1]], b: [2], lo: [0], hi: [Infinity], cost: [0.5] }), [1.5]);
    close(boundedLeastSquares({ columns: [[1]], b: [2], lo: [0.5], hi: [Infinity], cost: [3] }), [0.5]);
  });

  test('gives a number for a column of zeros, and does not hold back a tiny column', () => {
    const zeros = boundedLeastSquares({ columns: [[0, 0]], b: [1, 1], lo: [0], hi: [Infinity], cost: [-1] });
    assert.ok(zeros.every(Number.isFinite));
    close(
      boundedLeastSquares({
        columns: [[0, 0]],
        b: [1, 1],
        lo: [0],
        hi: [Infinity],
        lambda: 1,
        pullTo: [2],
        cost: [-1]
      }),
      [3]
    );
    close(
      boundedLeastSquares({
        columns: [
          [1, 0],
          [0, 0],
          [0, 1]
        ],
        b: [2, 3],
        lo: [0, 0, 0],
        hi: [Infinity, 5, Infinity]
      }),
      [2, 0, 3]
    );
    for (const tiny of [2e-6, 1e-7]) {
      const x = boundedLeastSquares({
        columns: [
          [tiny, 0],
          [0, 1]
        ],
        b: [tiny, 1],
        lo: [0, 0],
        hi: [Infinity, Infinity]
      });
      near(x[0], 1, 1e-4, String(tiny));
      near(x[1], 1, 1e-9);
    }
  });

  test('copes with near-duplicate columns, and matches a slow method on random problems', () => {
    let seed = 11;
    const random = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    const value = (columns, b, x) =>
      b.reduce((sum, target, r) => sum + (columns.reduce((t, c, j) => t + c[r] * x[j], 0) - target) ** 2, 0);
    for (let trial = 0; trial < 20; trial++) {
      const rows = 4 + Math.floor(random() * 6);
      const n = 3 + Math.floor(random() * 6);
      const columns = Array.from({ length: n }, () => Array.from({ length: rows }, () => random()));
      columns[1] = columns[0].map((v) => v * 1.001);
      const b = Array.from({ length: rows }, () => random() * 2);
      const lo = new Array(n).fill(0);
      const hi = Array.from({ length: n }, () => (random() < 0.3 ? 0.3 : Infinity));
      const meter = chemistry.newMeter(Infinity);
      const x = chemistry.boundedLeastSquares({ columns, b, lo, hi, meter });
      assert.ok(meter.used > 0);
      // Projected gradient, run long: slow but sure.
      const y = lo.slice();
      const step = 1 / columns.reduce((s, c) => s + c.reduce((t, v) => t + v * v, 0), 0);
      for (let it = 0; it < 20000; it++) {
        const r = b.map((target, i) => columns.reduce((t, c, j) => t + c[i] * y[j], 0) - target);
        columns.forEach(
          (c, j) => (y[j] = Math.min(hi[j], Math.max(0, y[j] - step * c.reduce((t, v, i) => t + v * r[i], 0))))
        );
      }
      assert.ok(value(columns, b, x) <= value(columns, b, y) + 1e-6, 'trial ' + trial);
      x.forEach((v, j) => assert.ok(v >= lo[j] - 1e-9 && v <= hi[j] + 1e-9));
    }
  });
});

describe('oxideMoles and molesPerGram', () => {
  test('a gram of whiting holds a mole of CaO per its formula weight; nothing for no amount', () => {
    near(chemistry.molesPerGram(record(IDS.whiting)).CaO, 1 / 100.086, 1e-4);
    assert.deepEqual(chemistry.oxideMoles([{ material: record(IDS.whiting), amount: 0 }]), {});
    near(molesOf([[IDS.whiting, 50]]).CaO, 50 / 100.086, 5e-3);
  });
});

describe('fitAmounts and bestFit', () => {
  test('bring red lead back with a lead frit, taking out the silica and clay it brings', () => {
    const old = [
      [RED_LEAD, 55],
      [CHINA_CLAY, 15],
      [IDS.silica, 30]
    ];
    const suggested = fit(old, [
      [LEAD_BISILICATE, 55],
      [CHINA_CLAY, 15],
      [IDS.silica, 30]
    ]);
    const [frit, clay, silica] = suggested.map(([, amount]) => amount);
    near(frit, 81.6, 1, 'frit');
    near(clay, 9.7, 0.5, 'clay');
    near(silica, 6.2, 1, 'silica');
    const [was, now] = [unity(old), unity(suggested)];
    for (const oxide of ['PbO', 'Al2O3', 'SiO2']) near(now[oxide], was[oxide], 0.02 * was[oxide], oxide);
  });

  test("bring niter's potash back with feldspar, leaving the rest as it was", () => {
    const old = [
      [NITER, 10],
      [IDS.whiting, 20],
      [CHINA_CLAY, 20],
      [IDS.silica, 40],
      [IDS.talc, 10]
    ];
    const suggested = fit(old, [
      [FRIT_3110, 10],
      [IDS.whiting, 20],
      [CHINA_CLAY, 20],
      [IDS.silica, 40],
      [IDS.talc, 10],
      [G200, 0]
    ]);
    const amount = Object.fromEntries(suggested);
    assert.equal(amount[IDS.whiting], 20);
    assert.equal(amount[IDS.talc], 10);
    near(amount[G200], 33, 2, 'feldspar');
    assert.ok(amount[CHINA_CLAY] < 10);
    assert.ok(amount[IDS.silica] < 30);
    const [was, now] = [unity(old), unity(suggested)];
    near(now.KNaO, was.KNaO, 0.01, 'KNaO');
    for (const oxide of ['CaO', 'MgO', 'Al2O3', 'SiO2']) near(now[oxide], was[oxide], 0.02 * was[oxide], oxide);
  });

  test('leave a recipe that already matches as it is, and never suggest less than nothing', () => {
    const recipe = [
      [IDS.whiting, 20],
      [CHINA_CLAY, 25],
      [IDS.silica, 35]
    ];
    assert.deepEqual(fit(recipe, recipe), recipe);
    const suggested = fit(
      [
        [NITER, 10],
        [IDS.silica, 40]
      ],
      [
        [FRIT_3110, 10],
        [IDS.silica, 40]
      ]
    );
    for (const [id, amount] of suggested) assert.ok(amount >= 0, id);
  });

  test('give a shared cap to the member that helps most, keeping each one its least', () => {
    const glaze = (whiting, dolomite) =>
      molesOf([
        [IDS.frit3134, 60],
        [IDS.whiting, whiting],
        [DOLOMITE, dolomite],
        [CHINA_CLAY, 15],
        [IDS.silica, 13]
      ]);
    const target = glaze(4, 8);
    const pool = (whiting, dolomite) => [
      { material: record(IDS.frit3134), start: 0 },
      { material: record(CHINA_CLAY), start: 0 },
      { material: record(IDS.silica), start: 0 },
      { material: record(IDS.whiting), start: 0, group: 'raw calcium', ...whiting },
      { material: record(DOLOMITE), start: 0, group: 'raw calcium', ...dolomite }
    ];
    const groups = { 'raw calcium': 5 };
    const capped = chemistry.bestFit(pool({}, {}), target, { groups });
    near(capped.amounts[3] + capped.amounts[4], 5, 1e-6);
    for (let whiting = 0; whiting <= 5; whiting += 0.5) {
      const split = chemistry.bestFit(
        pool({ least: whiting, most: whiting }, { least: 5 - whiting, most: 5 - whiting }),
        target
      );
      assert.ok(capped.miss <= split.miss + 1e-9, 'whiting ' + whiting);
    }
    near(capped.amounts[4], 5, 1e-6);
    const { amounts } = chemistry.fitAmounts(pool({ least: 1 }, { least: 1 }), glaze(2, 10), { groups });
    assert.ok(amounts[3] >= 1 - 1e-9);
    assert.ok(amounts[4] >= 1 - 1e-9);
    assert.ok(amounts[3] + amounts[4] <= 5 + 1e-6);
  });

  test('keep a cap on an amount and a cap on a share together', () => {
    const pool = [
      { material: record(FRIT_4113), start: 0, least: 15.6838, group: 's' },
      { material: record(NITER), start: 0 },
      { material: record(ECKALITE), start: 0, least: 1.219, group: 's' },
      { material: record(RED_LEAD), start: 0 },
      { material: record(CLAY_CERAM), start: 0, least: 1.219, group: 'g' }
    ];
    const target = {
      K2O: 0.059929,
      SiO2: 0.739948,
      Al2O3: 0.193607,
      Fe2O3: 0.002237,
      TiO2: 0.005106,
      Na2O: 0.03768,
      PbO: 0.1164,
      MgO: 0.001891,
      B2O3: 0.069023,
      CaO: 0.084026
    };
    const options = { groups: { g: 12.4568 }, shares: { s: 0.3401 } };
    for (const { amounts } of [chemistry.bestFit(pool, target, options), chemistry.fitAmounts(pool, target, options)]) {
      const batch = amounts.reduce((sum, amount) => sum + amount, 0);
      assert.ok(amounts[4] <= 12.4568 * (1 + 1e-6), 'the group');
      assert.ok((amounts[0] + amounts[2]) / batch <= 0.3401 * (1 + 1e-6), 'the share');
      pool.forEach((line, i) => assert.ok(amounts[i] >= (line.least ?? 0) * (1 - 1e-9)));
    }
  });

  // Two frits each in a group of its own, and a feldspar held to a share of the batch.
  const JOINT = {
    pool: () => [
      { material: record(FFF), start: 0, group: 's1' },
      { material: record(ALKALI_FRIT), start: 0, most: 11.7, group: 'g0' },
      { material: record(F19), start: 20.5, group: 'g2' }
    ],
    target: {
      K2O: 0.07469364508185836,
      Na2O: 0.11423829155813757,
      Al2O3: 0.21000501084324397,
      CaO: 0.03847147925816046,
      SiO2: 0.7142405385274848,
      B2O3: 0.022601041164855357,
      PbO: 0.21183571505009055
    },
    options: { groups: { g0: 8.2453, g2: 9.5824 }, shares: { s1: 0.7317 } }
  };

  test('keep caps that pull against each other exactly, where one at a time leaves them broken', () => {
    // From an independent solver: the frits at their caps, and the feldspar at its share.
    const optimum = [48.61918781, 8.2453, 9.5824];
    for (const fitted of [
      chemistry.bestFit(JOINT.pool(), JOINT.target, JOINT.options),
      chemistry.fitAmounts(JOINT.pool(), JOINT.target, JOINT.options)
    ]) {
      fitted.amounts.forEach((amount, i) => near(amount, optimum[i], 1e-6 * optimum[i], String(i)));
      assert.equal(fitted.broken, undefined);
    }
  });

  test('set the prices again together where one at a time leaves one on a cap with room', () => {
    const pool = [
      { material: record(BORIC_ACID), start: 0, most: 6.4, group: 's0' },
      { material: record(GILLESPIE), start: 0, least: 1.9, group: 's1' },
      { material: record(F69), start: 20.5, least: 4.3 },
      { material: record(ALBANY), start: 20.8, group: 's0' }
    ];
    const target = {
      MgO: 0.0904214881033699,
      B2O3: 0.44150862545841085,
      Al2O3: 0.03490484850402188,
      SiO2: 0.2108716675201659
    };
    const { amounts, miss } = chemistry.bestFit(pool, target, { shares: { s0: 0.1241, s1: 0.0391 } });
    const optimum = [6.030434783, 1.9, 40.6629156, 0];
    amounts.forEach((amount, i) => near(amount, optimum[i], 1e-6 * (1 + optimum[i]), String(i)));
    near(miss, 340.4581, 1e-3);
  });

  test('say which caps they cannot keep', () => {
    const pool = [
      { material: record(G200), start: 40 },
      { material: record(IDS.silica), start: 30 },
      { material: record(CHINA_CLAY), start: 15 },
      { material: record(IDS.whiting), start: 0, least: 8, group: 'raw calcium' }
    ];
    const target = molesOf([
      [IDS.whiting, 15],
      [G200, 40],
      [IDS.silica, 30],
      [CHINA_CLAY, 15]
    ]);
    const groups = { 'raw calcium': 5 };
    for (const fitted of [
      chemistry.bestFit(pool, target, { groups }),
      chemistry.fitAmounts(pool, target, { groups })
    ]) {
      near(fitted.amounts[3], 8, 1e-9);
      assert.deepEqual(fitted.broken, ['raw calcium']);
    }
    assert.equal(chemistry.bestFit(pool, target, { groups: { 'raw calcium': 9 } }).broken, undefined);
  });

  test('stop setting the prices one cap at a time once the work is spent, and keep the caps all the same', () => {
    const all = chemistry.newMeter(Infinity);
    const whole = chemistry.bestFit(JOINT.pool(), JOINT.target, { ...JOINT.options, meter: all });
    const meter = chemistry.newMeter(1);
    const cut = chemistry.bestFit(JOINT.pool(), JOINT.target, { ...JOINT.options, meter });
    assert.equal(meter.cut, true);
    assert.ok(meter.used < all.used / 10);
    assert.equal(cut.broken, undefined);
    cut.amounts.forEach((amount, i) => near(amount, whole.amounts[i], 1e-6 * whole.amounts[i], String(i)));
  });

  test('a meter: WORK by default, and one with its own most does not scale', () => {
    assert.deepEqual(chemistry.newMeter(), { used: 0, most: chemistry.WORK, cut: false, scales: true });
    assert.deepEqual(chemistry.newMeter(10), { used: 0, most: 10, cut: false, scales: false });
  });

  test('say, by code, when there is nothing to work out', () => {
    assert.equal(thrown(() => chemistry.fitAmounts([], { CaO: 1 })).code, 'no-materials');
    assert.equal(
      thrown(() => chemistry.fitAmounts([{ material: record(IDS.silica), start: 1 }], {})).code,
      'no-target'
    );
  });

  test('fit a lead-free recipe to the rebuilt formula, keeping raw whiting and zinc to their most', () => {
    const target = chemistry.leadFreeTarget(
      molesOf([
        [RED_LEAD, 55],
        [CHINA_CLAY, 15],
        [IDS.silica, 30]
      ]),
      { celsius: 1060 }
    );
    const ids = [BORAX_FRIT, CHINA_CLAY, IDS.silica, IDS.whiting, IDS.zinc];
    const { amounts, moles } = chemistry.fitAmounts(
      ids.map((id, i) => ({ material: record(id), start: [55, 15, 30, 0, 0][i], most: i >= 3 ? 5 : undefined })),
      target,
      { near: { B2O3: 0.05, Al2O3: 0.02, K2O: 0.15, Na2O: 0.15 }, alkalis: 0.03, fluxTotal: 0.03 }
    );
    assert.ok(amounts[3] <= 5);
    assert.ok(amounts[4] <= 5);
    const unityOf = (m) => {
      const fluxes = Object.entries(m)
        .filter(([oxide]) => ['R2O', 'RO'].includes(chemistry.OXIDE_GROUPS[oxide]))
        .reduce((sum, [, amount]) => sum + amount, 0);
      return Object.fromEntries(Object.entries(m).map(([oxide, amount]) => [oxide, amount / fluxes]));
    };
    const [want, got] = [unityOf(target), unityOf(moles)];
    for (const oxide of ['B2O3', 'Al2O3', 'SiO2', 'CaO']) near(got[oxide], want[oxide], 0.05 * want[oxide], oxide);
  });
});
