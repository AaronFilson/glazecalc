// The core's chemistry (lib/core/chemistry) on the standard records, by id.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import * as chemistry from '../chemistry/index.js';
import { prepareMaterial } from '../chemistry/materials.js';
import { IDS, GLOSSY, record, thrown } from './support.js';

const near = (actual, expected, within, what = '') =>
  assert.ok(Math.abs(actual - expected) <= within, `${what} ${actual} is not within ${within} of ${expected}`);

const glossy = () => GLOSSY.map(([id, amount]) => ({ material: record(id), amount }));

describe('calculateUMF', () => {
  test('puts the fluxes at one, and reads silica and alumina from them', () => {
    const { umf } = chemistry.calculateUMF(glossy());
    const fluxes = ['CaO', 'MgO', 'K2O', 'Na2O', 'Li2O', 'ZnO', 'BaO', 'SrO'].reduce((s, o) => s + (umf[o] ?? 0), 0);
    near(fluxes, 1, 1e-9, 'fluxes');
    near(umf.SiO2, 3.3, 0.4, 'SiO2');
    near(umf.Al2O3, 0.53, 0.05, 'Al2O3');
  });

  test('gives a fired analysis that adds up to 100', () => {
    const { analysis } = chemistry.calculateUMF(glossy());
    near(
      Object.values(analysis).reduce((s, p) => s + p, 0),
      100,
      1e-6,
      'analysis'
    );
  });

  test('is the same whatever order the lines come in', () => {
    const a = chemistry.calculateUMF(glossy()).umf;
    const b = chemistry.calculateUMF(glossy().reverse()).umf;
    for (const oxide of Object.keys(a)) near(b[oxide], a[oxide], 1e-12, oxide);
  });

  test('scales: twice every amount is the same unity formula', () => {
    const a = chemistry.calculateUMF(glossy()).umf;
    const b = chemistry.calculateUMF(glossy().map((line) => ({ ...line, amount: line.amount * 2 }))).umf;
    for (const oxide of Object.keys(a)) near(b[oxide], a[oxide], 1e-12, oxide);
  });

  test('works out an expansion for a glaze with fluxes', () => {
    const { expansion } = chemistry.calculateUMF(glossy());
    assert.equal(typeof expansion, 'number');
    assert.ok(expansion > 4 && expansion < 9, String(expansion));
  });
});

describe('prepareMaterial', () => {
  test('reads a molecular formula into an analysis and its loss on ignition', () => {
    const whiting = prepareMaterial(record(IDS.whiting));
    // CaCO3, per raw gram: 56.03% CaO and 43.97% CO2 lost in the firing.
    near(whiting.analysis.CaO, 56.03, 0.01, 'CaO');
    near(whiting.loi, 43.97, 0.01, 'LOI');
  });

  test('names the record by id in a problem, never by a word', () => {
    const error = thrown(() => prepareMaterial({ id: 'm-1', fields: [{ name: 'Xx2O', amount: '5' }] }));
    assert.equal(typeof error.message, 'string');
    assert.doesNotMatch(error.message, / /);
    assert.equal(error.params.material, 'm-1');
  });
});
