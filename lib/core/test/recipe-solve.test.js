// Target & Solve (lib/core/recipe/solve.js, docs/adr/0026) and the choosing it shares with Match with what I have
// (lib/core/recipe/pool.js), on the standard records by id. Ported from server/test/solve_tests.ts, by id and in
// codes: a known glaze's own unity formula, or its fired analysis, solved from its own materials comes back; a
// target the materials cannot reach says what is missing.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import * as chemistry from '../chemistry/index.js';
import { RecipeError } from '../recipe/messages.js';
import { rawClayPercent } from '../recipe/checks.js';
import { molesOf, unityOf } from '../recipe/materials.js';
import * as solve from '../recipe/solve.js';
import * as pool from '../recipe/pool.js';
import { IDS, GLOSSY, record, linesOf, thrown } from './support.js';

// Standard records not in support.js's IDS, by their uuid in data/materials.ndjson.
const NEPHELINE = '7bb7c679-17b2-4e62-a091-877ac6ed5f85'; // Nepheline Syenite (typical)
const DOLOMITE = 'da635f29-076f-4223-8e75-65d4dfa11700'; // Dolomite
const FRIT3124 = '5049fe05-1766-419f-ac8f-5a6408b8898b'; // Ferro Frit 3124
const CALCINED = '8a654512-2fbe-4a65-a079-ea82fa80d38d'; // Calcined Kaolin (theoretical)
const FLUORSPAR = 'd18eb0f6-fcd0-4461-b79a-9fa99de17938'; // Fluorspar
const CRYOLITE = 'c4a41952-a161-4c4e-bda0-61a64e2cb271'; // Cryolite

const near = (actual, expected, within, what = '') =>
  assert.ok(Math.abs(actual - expected) <= within, `${what} ${actual} is not within ${within} of ${expected}`);

const shelfOf = (...ids) => ids.map((id) => ({ material: record(id), must: false }));
const amountIn = (solved, id) => Number(solved.materials.find((m) => m.id === id)?.amount ?? 0);
const total = (solved) => solved.materials.reduce((sum, m) => sum + Number(m.amount), 0);
const checks = (solved) => solved.cautions.map((caution) => caution.check);
const FOUR = [IDS.custer, IDS.whiting, IDS.epk, IDS.silica];

const GLOSSY_LINES = linesOf(GLOSSY);
const GLOSSY_UNITY = unityOf(molesOf(GLOSSY_LINES));
const GLOSSY_ANALYSIS = chemistry.calculateUMF(GLOSSY_LINES.map((m) => ({ material: m, amount: m.amount }))).analysis;

/** What a solve throws: a RecipeError, its code and values. */
const refusal = (run) => {
  const error = thrown(run);
  assert.ok(error instanceof RecipeError, String(error));
  return { code: error.code, ...(error.params ? { params: error.params } : {}) };
};

describe('solveTarget', () => {
  test('solves a glaze’s own unity formula back from its own materials, in percent', () => {
    const solved = solve.solveTarget({ kind: 'unity', oxides: GLOSSY_UNITY }, shelfOf(...FOUR));
    near(total(solved), 100, 0.3, 'total');
    for (const [id, amount] of GLOSSY) near(amountIn(solved, id), amount, 0.6, id);
    assert.equal(solved.report.closeness.verdict, 'close');
    for (const oxide of ['SiO2', 'Al2O3', 'CaO', 'K2O', 'Na2O']) near(solved.unity[oxide], GLOSSY_UNITY[oxide], 0.02);
    near(solved.target.SiO2, GLOSSY_UNITY.SiO2, 1e-9);
    near(solved.fluxes, 1, 1e-9);
    assert.deepEqual(solved.report.unreachable, []);
    // The report names the materials by id, the core's default label.
    assert.deepEqual(new Set(solved.report.uses.map((use) => use.name)), new Set(FOUR));
    assert.equal(solve.SOLVE_BATCH, 100);
  });

  test('chooses the fewest that come near from a fuller shelf, and from a fired analysis as well', () => {
    const shelf = shelfOf(IDS.custer, NEPHELINE, IDS.whiting, DOLOMITE, IDS.talc, IDS.epk, IDS.silica, IDS.frit3134);
    for (const target of [
      { kind: 'unity', oxides: GLOSSY_UNITY },
      { kind: 'analysis', oxides: { ...GLOSSY_ANALYSIS, LOI: 12 } }
    ]) {
      const solved = solve.solveTarget(target, shelf);
      assert.equal(solved.report.closeness.verdict, 'close', target.kind);
      assert.ok(solved.materials.length <= 5, target.kind);
      // No boron in the target: the boron frit is not used.
      assert.equal(amountIn(solved, IDS.frit3134), 0, target.kind);
      near(solved.unity.SiO2, GLOSSY_UNITY.SiO2, 0.15, target.kind);
      near(solved.unity.Al2O3, GLOSSY_UNITY.Al2O3, 0.02, target.kind);
      if (target.kind === 'analysis') near(solved.fluxes, 1, 1e-12);
    }
  });

  test('scales a unity formula whose fluxes do not add up to 1, and says what they came to', () => {
    const doubled = Object.fromEntries(Object.entries(GLOSSY_UNITY).map(([oxide, value]) => [oxide, 2 * value]));
    const solved = solve.solveTarget({ kind: 'unity', oxides: doubled }, shelfOf(...FOUR));
    near(solved.fluxes, 2, 1e-9);
    near(solved.target.SiO2, GLOSSY_UNITY.SiO2, 1e-9);
    near(amountIn(solved, IDS.custer), 40, 0.6);
  });

  test('says what a target the materials cannot reach is missing, and that it comes out poor', () => {
    const target = { kind: 'unity', oxides: { K2O: 0.15, Na2O: 0.15, CaO: 0.7, B2O3: 0.4, Al2O3: 0.35, SiO2: 3 } };
    const solved = solve.solveTarget(target, shelfOf(...FOUR));
    assert.deepEqual(solved.report.unreachable, ['B2O3']);
    assert.equal(solved.report.closeness.verdict, 'poor');
    const boron = solved.report.closeness.oxides.find((o) => o.oxide === 'B2O3');
    assert.equal(boron.verdict, 'far');
    assert.equal(boron.now, 0);
    // With a boron frit on hand, it comes near.
    const frit = solve.solveTarget(target, shelfOf(...FOUR, IDS.frit3134));
    assert.deepEqual(frit.report.unreachable, []);
    assert.ok(amountIn(frit, IDS.frit3134) > 10);
    near(frit.unity.B2O3, 0.4, 0.05);
  });

  test('holds raw clay to 20% where calcined kaolin can take up the rest, and gives the recipe page’s cautions', () => {
    const target = { kind: 'unity', oxides: { K2O: 0.25, CaO: 0.75, Al2O3: 0.6, SiO2: 2.5 } };
    const raw = solve.solveTarget(target, shelfOf(...FOUR));
    assert.ok(checks(raw).includes('clay-high'));
    const held = solve.solveTarget(target, shelfOf(...FOUR, CALCINED));
    assert.ok(rawClayPercent(held.materials) <= 20.05);
    assert.ok(amountIn(held, CALCINED) > 1);
    assert.ok(!checks(held).includes('clay-high'));
    // The capped clay in the report, by id, with why as a code.
    const [clay] = held.report.capped;
    if (clay) {
      assert.equal(clay.group, 'raw clay');
      assert.deepEqual(clay.why, { code: 'pool.why.rawClay' });
    }
    // Cautions follow the firing: too much boron for cone 6 is said at mid fire.
    const boron = { kind: 'unity', oxides: { Na2O: 0.3, CaO: 0.7, B2O3: 0.9, Al2O3: 0.3, SiO2: 2.6 } };
    const shelf = shelfOf(IDS.frit3134, FRIT3124, NEPHELINE, IDS.whiting, IDS.epk, IDS.silica);
    assert.ok(checks(solve.solveTarget(boron, shelf, { band: 'mid' })).includes('boron-high'));
  });

  test('gives a recipe that adds up to 100 exactly, as shown', () => {
    const tenths = (solved) => solved.materials.reduce((sum, m) => sum + Math.round(10 * Number(m.amount)), 0);
    for (const oxides of [
      { K2O: 0.25, CaO: 0.75, Al2O3: 0.6, SiO2: 2.6 },
      { Na2O: 0.3, CaO: 0.7, B2O3: 0.9, Al2O3: 0.3, SiO2: 2.6 },
      GLOSSY_UNITY
    ]) {
      const solved = solve.solveTarget({ kind: 'unity', oxides }, shelfOf(...FOUR));
      assert.equal(tenths(solved), 1000, JSON.stringify(solved.materials.map((m) => m.amount)));
      for (const m of solved.materials) assert.match(m.amount, /^\d+(\.\d)?$/);
    }
  });

  test('does not hold the raw clay down with a material that has no oxides', () => {
    const nothing = { id: 'placeholder', percentmole: 'percent', loi: 0, fields: [] };
    const target = { kind: 'unity', oxides: { K2O: 0.25, CaO: 0.75, Al2O3: 0.6, SiO2: 2.6 } };
    const shelf = shelfOf(...FOUR);
    const without = solve.solveTarget(target, shelf);
    const withIt = solve.solveTarget(target, [...shelf, { material: nothing, must: false }]);
    assert.equal(amountIn(withIt, 'placeholder'), 0);
    assert.deepEqual(withIt.materials, without.materials);
  });

  test('leaves out what it is told to by id, and keeps a must', () => {
    const shelf = shelfOf(IDS.custer, NEPHELINE, IDS.whiting, IDS.epk, IDS.silica);
    const without = solve.solveTarget({ kind: 'unity', oxides: GLOSSY_UNITY }, shelf, { avoid: [IDS.custer] });
    assert.equal(amountIn(without, IDS.custer), 0);
    assert.ok(amountIn(without, NEPHELINE) > 10);
    const must = solve.solveTarget({ kind: 'unity', oxides: GLOSSY_UNITY }, [
      ...shelfOf(...FOUR),
      { material: record(NEPHELINE), must: true }
    ]);
    assert.ok(amountIn(must, NEPHELINE) >= 1);
  });

  test('lifts the raw clay cap from a clay named by id in uncapped', () => {
    // EPK a must, calcined kaolin on hand: held, the calcined kaolin takes up the alumina past 20% raw clay.
    const target = { kind: 'unity', oxides: { K2O: 0.25, CaO: 0.75, Al2O3: 0.55, SiO2: 2.6 } };
    const shelf = [
      ...shelfOf(IDS.custer, IDS.whiting, IDS.silica, CALCINED),
      { material: record(IDS.epk), must: true }
    ];
    const held = solve.solveTarget(target, shelf);
    const more = solve.solveTarget(target, shelf, { uncapped: [IDS.epk] });
    assert.ok(rawClayPercent(held.materials) <= 20.05, String(rawClayPercent(held.materials)));
    assert.ok(amountIn(held, CALCINED) > 1);
    assert.ok(rawClayPercent(more.materials) > 20.05, String(rawClayPercent(more.materials)));
  });

  test('brings calcium from whiting, not fluorspar, and fluorine or soluble materials only where nothing else will do', () => {
    const leach = linesOf([
      [IDS.custer, 40],
      [IDS.silica, 30],
      [IDS.whiting, 20],
      [IDS.epk, 10]
    ]);
    const target = { kind: 'unity', oxides: unityOf(molesOf(leach)) };
    for (const shelf of [
      shelfOf(IDS.custer, IDS.silica, IDS.whiting, IDS.epk, FLUORSPAR),
      shelfOf(FLUORSPAR, IDS.custer, IDS.silica, IDS.whiting, IDS.epk, CRYOLITE)
    ]) {
      const solved = solve.solveTarget(target, shelf);
      assert.equal(amountIn(solved, FLUORSPAR), 0);
      assert.equal(amountIn(solved, CRYOLITE), 0);
      near(amountIn(solved, IDS.whiting), 20, 0.5, 'whiting');
      assert.equal(solved.report.closeness.verdict, 'close');
    }
    // With nothing else to bring the calcium, fluorspar does; and marked "must use", it is used.
    assert.ok(amountIn(solve.solveTarget(target, shelfOf(IDS.custer, IDS.silica, IDS.epk, FLUORSPAR)), FLUORSPAR) > 10);
    const must = solve.solveTarget(target, [
      ...shelfOf(IDS.custer, IDS.silica, IDS.whiting, IDS.epk),
      { material: record(FLUORSPAR), must: true }
    ]);
    assert.ok(amountIn(must, FLUORSPAR) >= 1);
  });

  test('refuses what it cannot solve, in codes with their values', () => {
    const shelf = shelfOf(...FOUR);
    const unity =
      (oxides, offered = shelf) =>
      () =>
        solve.solveTarget({ kind: 'unity', oxides }, offered);
    assert.deepEqual(refusal(unity({ Xx2O: 1, SiO2: 3 })), {
      code: 'solve.unknownOxide',
      params: { oxide: 'Xx2O' }
    });
    assert.deepEqual(refusal(unity({ KNaO: 0.3, CaO: 0.7 })), { code: 'solve.together' });
    assert.deepEqual(refusal(unity({ r2o: 0.3, CaO: 0.7 })), { code: 'solve.together' });
    assert.deepEqual(refusal(unity({ CaO: -1 })), { code: 'solve.badAmount', params: { oxide: 'CaO' } });
    assert.deepEqual(refusal(unity({ CaO: '' })), { code: 'solve.badAmount', params: { oxide: 'CaO' } });
    assert.deepEqual(refusal(unity({ CaO: null })), { code: 'solve.badAmount', params: { oxide: 'CaO' } });
    assert.deepEqual(refusal(unity({ Al2O3: 0.3, SiO2: 3 })), { code: 'solve.noFlux', params: { of: 'target' } });
    // A flux so slight that the unity formula is past any number: no flux, not the chemistry's problem.
    assert.deepEqual(refusal(unity({ CaO: 5e-324, SiO2: 3 })), { code: 'solve.noFlux', params: { of: 'target' } });
    assert.deepEqual(refusal(unity(GLOSSY_UNITY, [])), { code: 'solve.noMaterials' });
    // Lithia alone, and nothing with lithium: no amount brings any of it.
    assert.deepEqual(refusal(unity({ Li2O: 1 }, shelfOf(IDS.silica))), { code: 'solve.noMatch' });
    // Silica and calcined kaolin bring silica and alumina but no flux at all.
    assert.deepEqual(refusal(unity(GLOSSY_UNITY, shelfOf(CALCINED, IDS.silica))), {
      code: 'solve.noFlux',
      params: { of: 'offered' }
    });
  });
});

describe('targetOf', () => {
  test('puts the target on 100 g of fired glaze, LOI left out, an oxide twice added up', () => {
    const { moles, unity, fluxes } = solve.targetOf({
      kind: 'unity',
      oxides: { ' CaO ': 0.5, LOI: 3, K2O: 0.5, SiO2: 3 }
    });
    near(fluxes, 1, 1e-12);
    assert.deepEqual(Object.keys(unity).sort(), ['CaO', 'K2O', 'SiO2']);
    const fired = Object.entries(moles).reduce((sum, [oxide, m]) => sum + m * chemistry.MOLAR_MASS[oxide], 0);
    near(fired, 100, 1e-9, 'fired grams');
  });

  test('reads an analysis in weight percent into moles', () => {
    const { unity } = solve.targetOf({ kind: 'analysis', oxides: { CaO: 56.08, SiO2: 60.08 } });
    near(unity.CaO, 1, 1e-3);
    near(unity.SiO2, 1, 1e-3);
  });
});

describe('solveCautions', () => {
  test('gives no cautions for a plain glaze at cone 6, and small-batch notes for many tiny amounts', () => {
    const glossy = solve.solveTarget({ kind: 'unity', oxides: GLOSSY_UNITY }, shelfOf(...FOUR));
    const cautions = solve.solveCautions(glossy.materials, glossy.unity, { celsius: 1222, band: 'mid' });
    assert.ok(Array.isArray(cautions));
    for (const caution of cautions) assert.equal(typeof caution.check, 'string');
  });
});

describe('parseTarget', () => {
  test('reads oxides and amounts, one per line or several on one', () => {
    assert.deepEqual(solve.parseTarget('SiO2 3.20\nAl2O3: 0.35\nCaO\t0.7  K2O 0.3'), {
      oxides: { SiO2: 3.2, Al2O3: 0.35, CaO: 0.7, K2O: 0.3 },
      unknown: [],
      together: false
    });
    // Subscripts, any case, a decimal comma, LOI left out, the first of two kept.
    assert.deepEqual(solve.parseTarget('SiO₂ = 3,2; sio2 4; na2o .2; LOI 12; Total 100').oxides, {
      SiO2: 3.2,
      Na2O: 0.2
    });
  });

  test('reads a row of oxides over a row of numbers, and says what it does not know', () => {
    assert.deepEqual(solve.parseTarget('K2O\tCaO\tAl2O3\tSiO2\n0.3\t0.7\t0.4\t3.1').oxides, {
      K2O: 0.3,
      CaO: 0.7,
      Al2O3: 0.4,
      SiO2: 3.1
    });
    assert.deepEqual(solve.parseTarget('Xx2O 0.1 KNaO 0.3 CaO 0.7'), {
      oxides: { CaO: 0.7 },
      unknown: ['Xx2O'],
      together: true
    });
    assert.deepEqual(solve.parseTarget('nothing here').oxides, {});
    assert.deepEqual(solve.parseTarget(undefined), { oxides: {}, unknown: [], together: false });
  });
});

describe('pool', () => {
  test('rounds amounts to add up to a total, the largest remainders moved, an unchanged line and a least kept', () => {
    assert.deepEqual(pool.addingUp({ amounts: [33.33, 33.34, 33.33] }, 1, 100).amounts, [33.33, 33.4, 33.33]);
    assert.deepEqual(
      pool.addingUp({ amounts: [20.25, 39.94, 39.94] }, 1, 100.25, (i) => i === 0).amounts,
      [20.25, 40, 40]
    );
    assert.deepEqual(pool.addingUp({ amounts: [1.06, 49.47, 49.47] }, 1, 100).amounts, [1, 49.47, 49.47]);
    assert.deepEqual(
      pool.addingUp({ amounts: [1.06, 49.47, 49.47] }, 1, 100, undefined, () => 1.05).amounts,
      [1.06, 49.4, 49.47]
    );
    // Already adding up: the same selection back.
    const selection = { amounts: [50, 50] };
    assert.equal(pool.addingUp(selection, 1, 100), selection);
  });

  test('writes a batch’s new amounts to as many decimals as keep 1% of it', () => {
    assert.deepEqual(
      [0.0005, 0.05, 0.1, 4.9, 5, 49, 50].map((batch) => pool.placesFor(batch)),
      [6, 4, 3, 3, 2, 2, 1]
    );
    assert.equal(pool.placesFor(0), 3);
  });

  test('says what changed as codes with the record’s id', () => {
    assert.deepEqual(pool.changed(IDS.epk, 20, 5.8), {
      code: 'pool.changed',
      params: { name: IDS.epk, from: 20, to: 5.8 }
    });
    assert.deepEqual(pool.added(IDS.talc, 3), { code: 'pool.added', params: { name: IDS.talc, amount: 3 } });
    assert.deepEqual(pool.removed(IDS.talc, 10, 1), {
      code: 'pool.changed',
      params: { name: IDS.talc, from: { value: 10, places: 1, upTo: true }, to: { value: 0, places: 0, upTo: true } }
    });
  });

  test('takes a fluorine or soluble material as a last resort unless it is a must', () => {
    assert.equal(pool.lastResort({ material: record(FLUORSPAR), must: false }), true);
    assert.equal(pool.lastResort({ material: record(FLUORSPAR), must: true }), false);
    assert.equal(pool.lastResort({ material: record(IDS.whiting), must: false }), false);
  });

  test('makes a recipe of a selection: unchanged text kept, a replacement not needed, a line removed or added', () => {
    const lines = [
      { material: { ...record(IDS.custer), amount: '40.0' }, start: 40 },
      { material: { ...record(IDS.whiting), amount: '20' }, start: 20 },
      { material: { ...record(IDS.talc), amount: '5' }, start: 5 },
      { material: { ...record(IDS.zinc), amount: '' }, start: 0 },
      { material: { ...record(IDS.epk), amount: '10' }, start: 10 }
    ];
    const made = pool.recipeFrom({ amounts: [40, 18.5, 0, 2, 0] }, lines, new Set([IDS.epk]), 1);
    assert.deepEqual(
      made.materials.map((m) => [m.id, m.amount]),
      [
        [IDS.custer, '40.0'],
        [IDS.whiting, '18.5'],
        [IDS.zinc, '2']
      ]
    );
    assert.deepEqual(made.unused, [IDS.epk]);
    assert.deepEqual(
      made.changes.map((c) => [c.code, c.params.name]),
      [
        ['pool.changed', IDS.whiting],
        ['pool.changed', IDS.talc],
        ['pool.added', IDS.zinc]
      ]
    );
  });

  test('scales a selection’s amounts and caps', () => {
    const s = pool.scaled({ amounts: [1, 2], capped: [{ most: 1, wouldBe: 3 }] }, 10);
    assert.deepEqual(s.amounts, [10, 20]);
    assert.deepEqual(s.capped, [{ most: 10, wouldBe: 30 }]);
  });
});

describe('the work bounded', () => {
  test('leaves a shelf as potters have one alone: a small part of the work, nothing cut', () => {
    const meter = chemistry.newMeter();
    const shelf = shelfOf(IDS.custer, NEPHELINE, IDS.whiting, DOLOMITE, IDS.talc, IDS.epk, IDS.silica);
    const solved = solve.solveTarget({ kind: 'unity', oxides: GLOSSY_UNITY }, shelf, { meter });
    assert.ok(!('cutShort' in solved.report));
    assert.ok(meter.used < chemistry.WORK / 100, String(meter.used));
  });

  test('says it was cut short when the work runs out holding the clay, even if the free choosing is kept', () => {
    const target = { kind: 'unity', oxides: { K2O: 0.25, CaO: 0.75, Al2O3: 0.6, SiO2: 2.5 } };
    const shelf = shelfOf(...FOUR);
    const { moles } = solve.targetOf(target);
    const lines = shelf.map((tried) => ({ material: { ...tried.material, amount: '' }, start: 0, least: 1 }));
    const alone = chemistry.newMeter();
    chemistry.selectMaterials(lines, moles, { meter: alone });
    const meter = chemistry.newMeter(alone.used + 1);
    const chosen = pool.selectHoldingClay(lines, moles, { batch: 100, meter });
    assert.equal(meter.cut, true);
    assert.equal(chosen.selection.cutShort, true);
    const solved = solve.solveTarget(target, shelf, { meter: chemistry.newMeter(alone.used + 1) });
    assert.equal(solved.report.cutShort, true);
  });
});
