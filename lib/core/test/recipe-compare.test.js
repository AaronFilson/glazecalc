// Two unity formulas side by side (lib/core/recipe/compare.js) and what a unity formula says beyond its oxides
// (analysis.js: mole percent and Stull's chart). Ported from server/test/recipe_tests.ts; keys and codes, no words.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import * as chemistry from '../chemistry/index.ts';
import { UNITY_COLUMNS, compareUnity, silicaAluminaRatio, unityColumnOf } from '../recipe/compare.ts';
import { molePercent, stullPoint } from '../recipe/analysis.ts';
import { HOST, GLOSSY, IDS, record } from './support.js';

const analysed = (pairs) => {
  const result = chemistry.calculateUMF(
    HOST,
    pairs.map(([id, amount]) => ({ material: record(id), amount }))
  );
  return {
    uList: result.umf,
    analysis: result.analysis,
    groups: { R2O: 0.3, RO: 0.7 },
    loi: 12.5,
    expansion: result.expansion
  };
};

describe('compareUnity', () => {
  test('puts each oxide under the column potters read it in', () => {
    assert.deepEqual(UNITY_COLUMNS, ['fluxes', 'stabilizers', 'glassFormers', 'wildcards']);
    assert.deepEqual(
      ['K2O', 'CaO', 'Al2O3', 'B2O3', 'SiO2', 'Fe2O3', 'TiO2'].map((oxide) => unityColumnOf(HOST, oxide)),
      [0, 0, 1, 1, 2, 3, 3]
    );
  });

  test('reads the silica to alumina ratio from the saved value or the unity formula', () => {
    assert.equal(silicaAluminaRatio({ siAlRatio: 7, uList: {} }), 7);
    assert.equal(silicaAluminaRatio({ uList: { SiO2: 3, Al2O3: 0.5 } }), 6);
    assert.equal(silicaAluminaRatio({ uList: { SiO2: 3 } }), null);
    assert.equal(silicaAluminaRatio({ uList: { Al2O3: 0.5 } }), 0);
  });

  test('gives a row for every oxide in either, with the change, then the balance', () => {
    const left = analysed(GLOSSY);
    const right = analysed([...GLOSSY, [IDS.zinc, 5]]);
    const groups = compareUnity(HOST, left, right);
    // EPK brings traces of iron and titania: the wildcards column is there too.
    assert.deepEqual(
      groups.map((g) => g.key),
      ['fluxes', 'stabilizers', 'glassFormers', 'wildcards', 'balance']
    );
    const zinc = groups[0].rows.find((r) => r.oxide === 'ZnO');
    assert.equal(zinc.left, null);
    assert.ok(zinc.right > 0);
    assert.equal(zinc.change, zinc.right);
    assert.equal(zinc.formula, true);
    assert.equal(zinc.places, 3);
    const silica = groups[2].rows.find((r) => r.oxide === 'SiO2');
    assert.ok(Math.abs(silica.change - (right.uList.SiO2 - left.uList.SiO2)) < 1e-12);
    const balance = groups.at(-1).rows;
    assert.deepEqual(
      balance.map((r) => [r.key, r.places]),
      [
        ['silicaToAlumina', 2],
        ['r2oFluxes', 2],
        ['roFluxes', 2],
        ['loi', 1],
        ['expansion', 2]
      ]
    );
    for (const row of balance) assert.equal(row.label, row.key);
    assert.equal(balance[3].change, 0);
    assert.ok(Math.abs(balance[4].left - left.expansion) < 1e-12);
  });

  test('counts an oxide one recipe lacks as none: one dropped, one added', () => {
    const groups = compareUnity(
      HOST,
      { uList: { CaO: 1, ZnO: 0.2, SiO2: 3 } },
      { uList: { CaO: 1, BaO: 0.1, SiO2: 3 } }
    );
    const rows = Object.fromEntries(groups.flatMap((group) => group.rows).map((row) => [row.label, row]));
    assert.deepEqual([rows.ZnO.left, rows.ZnO.right, rows.ZnO.change], [0.2, null, -0.2]);
    assert.deepEqual([rows.BaO.left, rows.BaO.right, rows.BaO.change], [null, 0.1, 0.1]);
  });

  test('has no change against a recipe that is not there, works out an expansion, and adds a wildcards column', () => {
    const left = analysed([...GLOSSY, [IDS.zinc, 5]]);
    delete left.expansion;
    left.uList = { ...left.uList, Fe2O3: 0.05, MnO: 0 };
    const groups = compareUnity(HOST, left, null);
    assert.deepEqual(
      groups.map((g) => g.key),
      ['fluxes', 'stabilizers', 'glassFormers', 'wildcards', 'balance']
    );
    for (const group of groups) for (const row of group.rows) assert.equal(row.change, null, row.label);
    assert.ok(!groups[3].rows.some((r) => r.oxide === 'MnO'));
    const expansion = groups.at(-1).rows.find((r) => r.key === 'expansion');
    assert.ok(Math.abs(expansion.left - chemistry.expansion(HOST, left.analysis)) < 1e-12);
    assert.equal(expansion.right, null);
    // Neither: the three columns, empty, and the balance with nothing in it.
    const none = compareUnity(HOST, null, null);
    assert.deepEqual(
      none.map((g) => g.rows.length),
      [0, 0, 0, 5]
    );
    for (const row of none.at(-1).rows) assert.deepEqual([row.left, row.right, row.change], [null, null, null]);
  });
});

describe('molePercent and stullPoint', () => {
  test('works out the analysis a unity formula implies: mole percent and the point on Stull’s chart', () => {
    assert.deepEqual(molePercent({ CaO: 1, Al2O3: 0.5, SiO2: 3.5, ZnO: 0 }), { CaO: 20, Al2O3: 10, SiO2: 70 });
    assert.deepEqual(molePercent({}), {});
    assert.deepEqual(molePercent(undefined), {});
    assert.deepEqual(stullPoint(HOST, { SiO2: 3.5, Al2O3: 0.35 }), {
      silica: 3.5,
      alumina: 0.35,
      ratio: 10,
      region: 'bright',
      crazed: false
    });
    assert.equal(stullPoint(HOST, { SiO2: 2.5, Al2O3: 0.6 }).region, 'matte');
    assert.equal(stullPoint(HOST, { SiO2: 1.5, Al2O3: 0.9 }).region, 'unfused');
    assert.equal(stullPoint(HOST, { SiO2: 3.6, Al2O3: 0.75 }).region, 'semi-matte');
    const underfired = stullPoint(HOST, { SiO2: 6, Al2O3: 0.3 });
    assert.equal(underfired.region, 'underfired');
    assert.equal(underfired.crazed, true);
    assert.equal(stullPoint(HOST, { SiO2: 9, Al2O3: 0.3 }).region, null);
    assert.equal(stullPoint(HOST, { SiO2: 9, Al2O3: 0.3 }).crazed, false);
    assert.equal(stullPoint(HOST, { SiO2: 3 }), null);
    assert.equal(stullPoint(HOST, undefined), null);
  });

  test('leaves a point under the lowest region’s alumina unclassified, not bright', () => {
    const low = stullPoint(HOST, { SiO2: 3.5, Al2O3: 0.05 });
    assert.equal(low.region, 'unclassified');
    assert.equal(low.crazed, false);
    assert.notEqual(stullPoint(HOST, { SiO2: 3.5, Al2O3: 0.08 }).region, 'unclassified');
  });

  test('reads Stull’s outlines to their edges: nothing bright between semi-matte and matte, nor on the chart’s rim', () => {
    const point = (SiO2, Al2O3) => stullPoint(HOST, { SiO2, Al2O3 });
    for (let x = 1.25; x < 4; x += 0.25) {
      const edge = 0.08 + (0.92 * (x - 0.6)) / 3.4;
      for (const y of [edge - 3e-4, edge - 1e-4, edge - 1e-12, edge, edge + 1e-12, edge + 1e-4]) {
        assert.ok(['semi-matte', 'matte'].includes(point(x, y).region), `${x}, ${y}`);
      }
    }
    assert.deepEqual(
      [1.5, 3.5, 4.5, 6].map((silica) => point(silica, 1).region),
      ['unfused', 'matte', 'semi-matte', 'bright']
    );
    assert.deepEqual(
      [point(0.6, 0.08), point(0.6, 0.3), point(0.6, 0.7), point(7.2, 0.3), point(7.2, 0.8)].map((p) => p.region),
      ['matte', 'matte', 'unfused', 'underfired', 'bright']
    );
    assert.equal(point(1.48, 0.652).region, 'unfused');
    assert.deepEqual([point(7.2, 0.3).crazed, point(1, 1).crazed, point(7.2, 0.8).crazed], [true, true, false]);
  });

  test('reads the chart it is given', () => {
    const STULL = HOST.stull;
    assert.deepEqual(Object.keys(STULL.regions), ['unfused', 'matte', 'semi-matte', 'underfired']);
    assert.deepEqual(STULL.silica, { min: 0.6, max: 7.2 });
  });
});
