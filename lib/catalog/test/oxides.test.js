// The catalog's elements and oxides (lib/catalog/oxides.ts): the tables the core's host passes as
// host.oxides, frozen, and the molar masses worked out from the atomic weights by the core's molarMass.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { ATOMIC_WEIGHTS, MOLAR_MASS, OXIDE_GROUPS, OXIDES, VOLATILES } from '../oxides.ts';
import { molarMass } from '../../core/chemistry/oxides.ts';

describe('the elements and oxides', () => {
  test('are the four tables the host passes, frozen, so no caller can change what another reads', () => {
    assert.deepEqual(Object.keys(OXIDES), ['atomicWeights', 'groups', 'volatiles', 'molarMass']);
    assert.equal(OXIDES.atomicWeights, ATOMIC_WEIGHTS);
    assert.equal(OXIDES.groups, OXIDE_GROUPS);
    assert.equal(OXIDES.volatiles, VOLATILES);
    assert.equal(OXIDES.molarMass, MOLAR_MASS);
    for (const table of [OXIDES, ATOMIC_WEIGHTS, OXIDE_GROUPS, VOLATILES, MOLAR_MASS])
      assert.ok(Object.isFrozen(table));
    assert.throws(() => {
      'use strict';
      MOLAR_MASS.SiO2 = 60;
    }, TypeError);
  });

  test('give each oxide a Seger group, and each oxide and volatile its molar mass from the atomic weights', () => {
    for (const group of Object.values(OXIDE_GROUPS)) assert.ok(['R2O', 'RO', 'R2O3', 'RO2'].includes(group), group);
    assert.deepEqual(Object.keys(MOLAR_MASS), [...Object.keys(OXIDE_GROUPS), ...VOLATILES]);
    for (const [formula, mass] of Object.entries(MOLAR_MASS))
      assert.equal(mass, molarMass({ oxides: { atomicWeights: ATOMIC_WEIGHTS } }, formula), formula);
    assert.equal(MOLAR_MASS.SiO2, ATOMIC_WEIGHTS.Si + 2 * ATOMIC_WEIGHTS.O);
  });

  test('keep CIAAW 2024’s standard atomic weights', () => {
    assert.deepEqual(
      { H: ATOMIC_WEIGHTS.H, O: ATOMIC_WEIGHTS.O, Si: ATOMIC_WEIGHTS.Si, Ba: ATOMIC_WEIGHTS.Ba, Pb: ATOMIC_WEIGHTS.Pb },
      { H: 1.008, O: 15.999, Si: 28.085, Ba: 137.327, Pb: 207.2 }
    );
  });
});
