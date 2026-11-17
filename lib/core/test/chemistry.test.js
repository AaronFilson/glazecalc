// The core's chemistry (lib/core/chemistry) on the standard records, by id.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import * as chemistry from '../chemistry/index.ts';
import { prepareMaterial } from '../chemistry/materials.ts';
import { molarMass } from '../chemistry/oxides.ts';
import { HOST, IDS, GLOSSY, record, thrown } from './support.js';

const near = (actual, expected, within, what = '') =>
  assert.ok(Math.abs(actual - expected) <= within, `${what} ${actual} is not within ${within} of ${expected}`);

const glossy = () => GLOSSY.map(([id, amount]) => ({ material: record(id), amount }));

describe('calculateUMF', () => {
  test('puts the fluxes at one, and reads silica and alumina from them', () => {
    const { umf } = chemistry.calculateUMF(HOST, glossy());
    const fluxes = ['CaO', 'MgO', 'K2O', 'Na2O', 'Li2O', 'ZnO', 'BaO', 'SrO'].reduce((s, o) => s + (umf[o] ?? 0), 0);
    near(fluxes, 1, 1e-9, 'fluxes');
    near(umf.SiO2, 3.3, 0.4, 'SiO2');
    near(umf.Al2O3, 0.53, 0.05, 'Al2O3');
  });

  test('gives a fired analysis that adds up to 100', () => {
    const { analysis } = chemistry.calculateUMF(HOST, glossy());
    near(
      Object.values(analysis).reduce((s, p) => s + p, 0),
      100,
      1e-6,
      'analysis'
    );
  });

  test('is the same whatever order the lines come in', () => {
    const a = chemistry.calculateUMF(HOST, glossy()).umf;
    const b = chemistry.calculateUMF(HOST, glossy().reverse()).umf;
    for (const oxide of Object.keys(a)) near(b[oxide], a[oxide], 1e-12, oxide);
  });

  test('scales: twice every amount is the same unity formula', () => {
    const a = chemistry.calculateUMF(HOST, glossy()).umf;
    const b = chemistry.calculateUMF(
      HOST,
      glossy().map((line) => ({ ...line, amount: line.amount * 2 }))
    ).umf;
    for (const oxide of Object.keys(a)) near(b[oxide], a[oxide], 1e-12, oxide);
  });

  test('works out an expansion for a glaze with fluxes', () => {
    const { expansion } = chemistry.calculateUMF(HOST, glossy());
    assert.equal(typeof expansion, 'number');
    assert.ok(expansion > 4 && expansion < 9, String(expansion));
  });
});

describe('prepareMaterial', () => {
  test('gives silica to alumina as 0 for a glaze with alumina and no silica', () => {
    const alumina = { id: 'alumina', percentmole: 'percent', loi: 0, fields: [{ name: 'Al2O3', amount: 100 }] };
    const result = chemistry.calculateUMF(HOST, [
      { material: record(IDS.whiting), amount: 50 },
      { material: alumina, amount: 50 }
    ]);
    assert.ok(result.umf.Al2O3 > 0);
    assert.equal(result.umf.SiO2, undefined);
    assert.equal(result.siAlRatio, 0);
  });

  test('reads a molecular formula into an analysis and its loss on ignition', () => {
    const whiting = prepareMaterial(HOST, record(IDS.whiting));
    // CaCO3, per raw gram: 56.03% CaO and 43.97% CO2 lost in the firing.
    near(whiting.analysis.CaO, 56.03, 0.01, 'CaO');
    near(whiting.loi, 43.97, 0.01, 'LOI');
  });

  test('names the record by id in a problem, never by a word', () => {
    const error = thrown(() => prepareMaterial(HOST, { id: 'm-1', fields: [{ name: 'Xx2O', amount: '5' }] }));
    assert.equal(typeof error.message, 'string');
    assert.doesNotMatch(error.message, / /);
    assert.equal(error.params.material, 'm-1');
  });
});

describe('molar masses, expansion and closeness', () => {
  test('refuses an element it has no weight for, and text that is not a formula', () => {
    const unknown = thrown(() => molarMass(HOST, 'Xq2'));
    assert.equal(unknown.code, 'unknown-element');
    assert.deepEqual(unknown.params, { element: 'Xq', formula: 'Xq2' });
    const bad = thrown(() => molarMass(HOST, 'SiO2x'));
    assert.equal(bad.code, 'bad-formula');
    assert.deepEqual(bad.params, { formula: 'SiO2x' });
  });

  test('has no expansion for no analysis, or for one with no amount it can read', () => {
    assert.equal(chemistry.expansion(null), null);
    assert.equal(chemistry.expansion({ SiO2: 'about 70' }), null);
  });

  test('counts an oxide with no coefficient in the whole, adding nothing, and leaves out an amount it cannot read', () => {
    const silica = chemistry.expansion({ SiO2: 50 });
    assert.equal(silica, 100 * chemistry.EXPANSION.SiO2);
    assert.equal(chemistry.expansion({ SiO2: 50, Ag2O: 50 }), silica / 2);
    assert.equal(chemistry.expansion({ SiO2: 50, Na2O: 'n/a' }), silica);
  });

  test('lists an oxide in no group after every group, though its name comes first', () => {
    const { oxides } = chemistry.closeness(HOST, { CaO: 1, SiO2: 3 }, { CaO: 1, SiO2: 3, Ag2O: 0.5 });
    assert.deepEqual(
      oxides.map((row) => row.oxide),
      ['CaO', 'SiO2', 'Ag2O']
    );
  });
});
