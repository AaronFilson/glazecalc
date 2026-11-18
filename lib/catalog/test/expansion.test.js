// The catalog's expansion coefficients (lib/catalog/expansion.ts), which the core's host passes as host.expansion.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { EXPANSION } from '../expansion.ts';

describe('the expansion coefficients', () => {
  test('are frozen, per weight percent, soda the highest and zirconia and tin the lowest', () => {
    assert.ok(Object.isFrozen(EXPANSION));
    assert.equal(EXPANSION.SiO2, 0.035);
    assert.equal(Math.max(...Object.values(EXPANSION)), EXPANSION.Na2O);
    assert.equal(Math.min(...Object.values(EXPANSION)), EXPANSION.ZrO2);
    for (const [oxide, value] of Object.entries(EXPANSION)) assert.ok(value > 0, oxide);
  });
});
