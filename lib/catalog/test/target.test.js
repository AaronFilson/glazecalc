// The catalog's target reader (lib/catalog/target.ts): a unity formula pasted from another app.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTarget } from '../target.ts';
import { OXIDES } from '../oxides.ts';

const HOST = { oxides: OXIDES };
const solve = { parseTarget };

describe('parseTarget', () => {
  test('reads oxides and amounts, one per line or several on one', () => {
    assert.deepEqual(solve.parseTarget(HOST, 'SiO2 3.20\nAl2O3: 0.35\nCaO\t0.7  K2O 0.3'), {
      oxides: { SiO2: 3.2, Al2O3: 0.35, CaO: 0.7, K2O: 0.3 },
      unknown: [],
      together: false
    });
    // Subscripts, any case, a decimal comma, LOI left out, the first of two kept.
    assert.deepEqual(solve.parseTarget(HOST, 'SiO₂ = 3,2; sio2 4; na2o .2; LOI 12; Total 100').oxides, {
      SiO2: 3.2,
      Na2O: 0.2
    });
  });

  test('reads a row of oxides over a row of numbers, and says what it does not know', () => {
    assert.deepEqual(solve.parseTarget(HOST, 'K2O\tCaO\tAl2O3\tSiO2\n0.3\t0.7\t0.4\t3.1').oxides, {
      K2O: 0.3,
      CaO: 0.7,
      Al2O3: 0.4,
      SiO2: 3.1
    });
    assert.deepEqual(solve.parseTarget(HOST, 'Xx2O 0.1 KNaO 0.3 CaO 0.7'), {
      oxides: { CaO: 0.7 },
      unknown: ['Xx2O'],
      together: true
    });
    assert.deepEqual(solve.parseTarget(HOST, 'nothing here').oxides, {});
    assert.deepEqual(solve.parseTarget(HOST, undefined), { oxides: {}, unknown: [], together: false });
  });
});
