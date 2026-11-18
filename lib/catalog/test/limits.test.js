// The catalog's limits (lib/catalog/limits.ts): the figures the recipe checks warn at, the limit sets and
// Stull's chart, which the core's host passes as host.limits and host.stull.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CHECK_LIMITS,
  DEFAULT_LIMIT_SET,
  FIRING,
  GLAZECALC_LIMITS,
  HESSELBERTH_ROY_LIMITS,
  LIMIT_SETS,
  LIMITS,
  STULL
} from '../limits.ts';
import { CONE_CHARTS } from '../cones.ts';

describe('the limits', () => {
  test('are the figures and sets the host passes, frozen', () => {
    assert.ok(
      [LIMITS, FIRING, CHECK_LIMITS, LIMIT_SETS, GLAZECALC_LIMITS, HESSELBERTH_ROY_LIMITS].every(Object.isFrozen)
    );
    assert.equal(LIMITS.firing, FIRING);
    assert.equal(LIMITS.checks, CHECK_LIMITS);
    assert.equal(LIMITS.own, GLAZECALC_LIMITS);
    assert.equal(LIMITS.forFit, HESSELBERTH_ROY_LIMITS);
  });

  test('offer Hesselberth & Roy’s set by default, and the app’s own, by id', () => {
    assert.equal(DEFAULT_LIMIT_SET, 'hesselberth-roy');
    assert.equal(LIMIT_SETS[DEFAULT_LIMIT_SET], HESSELBERTH_ROY_LIMITS);
    assert.equal(LIMIT_SETS.glazecalc, GLAZECALC_LIMITS);
    for (const [id, set] of Object.entries(LIMIT_SETS)) assert.equal(set.id, id);
  });

  test('draw their band edges where the cone charts do: one 1150 °C, 1250 and 1320', () => {
    assert.equal(FIRING.lowFireBelow, CONE_CHARTS.lowBelow);
    assert.equal(FIRING.topFrom, CONE_CHARTS.highBelow);
    const edges = (set) => set.bands.map((band) => band.belowC);
    assert.deepEqual(edges(GLAZECALC_LIMITS), [CONE_CHARTS.lowBelow, CONE_CHARTS.highBelow, undefined]);
    assert.deepEqual(edges(HESSELBERTH_ROY_LIMITS), [
      CONE_CHARTS.lowBelow,
      CONE_CHARTS.midBelow,
      CONE_CHARTS.highBelow,
      undefined
    ]);
  });
});

describe('Stull’s chart', () => {
  test('is frozen, its regions starting at 0.08 alumina', () => {
    assert.ok(Object.isFrozen(STULL) && Object.isFrozen(STULL.regions));
    assert.deepEqual(Object.keys(STULL.regions), ['unfused', 'matte', 'semi-matte', 'underfired']);
    const alumina = Object.values(STULL.regions).flatMap((region) => region.map(([, y]) => y));
    assert.equal(Math.min(...alumina), 0.08);
  });
});
