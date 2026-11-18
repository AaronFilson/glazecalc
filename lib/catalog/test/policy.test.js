// The catalog's policy (lib/catalog/policy.ts): the app's own choices, which the core's host passes as host.policy.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { ALSO_LISTS, CONE_FIT_POLICY, POLICY, SG_TARGET_RANGE } from '../policy.ts';

describe('the policy', () => {
  test('is the choices the host passes, frozen', () => {
    assert.ok([POLICY, ALSO_LISTS, ALSO_LISTS.JP, CONE_FIT_POLICY, SG_TARGET_RANGE].every(Object.isFrozen));
    assert.equal(POLICY.alsoLists, ALSO_LISTS);
    assert.equal(POLICY.coneFit, CONE_FIT_POLICY);
  });

  test('has Japan’s library list the US set, and no other', () => {
    assert.deepEqual(ALSO_LISTS, { JP: ['US'] });
  });

  test('keeps cone fit’s margins and cut-offs, and a target SG between water and 2.5', () => {
    assert.equal(CONE_FIT_POLICY.boronOver, 0.3);
    assert.equal(CONE_FIT_POLICY.boronUnder, 0.15);
    assert.equal(CONE_FIT_POLICY.lowFireSilicaMost, 3.0);
    assert.deepEqual(CONE_FIT_POLICY.silica, { min: 1, max: 8 });
    assert.deepEqual(SG_TARGET_RANGE, { min: 1, max: 2.5 });
  });
});
