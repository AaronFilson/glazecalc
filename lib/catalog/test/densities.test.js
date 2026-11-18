// The catalog's densities (lib/catalog/densities.ts), which the core's host passes as host.densities.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { DENSITIES, GLASS_VOLUMES, KINDS, MINERALS } from '../densities.ts';

describe('the densities', () => {
  test('are the minerals, kinds and glass volumes the host passes, frozen', () => {
    assert.ok([DENSITIES, MINERALS, KINDS, GLASS_VOLUMES].every(Object.isFrozen));
    assert.equal(DENSITIES.minerals, MINERALS);
    assert.equal(DENSITIES.kinds, KINDS);
    assert.equal(DENSITIES.glassVolumes, GLASS_VOLUMES);
    assert.equal(MINERALS.quartz, 2.65);
    assert.deepEqual(KINDS, { feldspar: 2.6, clay: 2.6 });
    assert.equal(GLASS_VOLUMES.B2O3, 38);
  });

  test('give every value as a positive number', () => {
    for (const table of [MINERALS, KINDS, GLASS_VOLUMES])
      for (const [key, value] of Object.entries(table)) assert.ok(value > 0, key);
  });
});
