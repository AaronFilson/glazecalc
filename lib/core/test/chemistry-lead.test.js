// Replacing lead (lib/core/chemistry/lead.js), ported from server/test/chemistry_tests.ts ('replacing lead').
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import * as chemistry from '../chemistry/index.ts';
import { HOST, IDS, record, thrown } from './support.js';

const near = (actual, expected, within, what = '') =>
  assert.ok(Math.abs(actual - expected) <= within, `${what} ${actual} is not within ${within} of ${expected}`);

const RED_LEAD = '9965f3fd-a90f-459f-8ad1-e874fc915e13'; // Lead, Red
const CHINA_CLAY = 'c4eeb157-5c2b-4875-90c5-808f75079658'; // China Clay

/** In the unity formula: per mole of the fluxes, lead included. */
const unityOf = (moles) => {
  const fluxes = Object.entries(moles)
    .filter(([oxide]) => ['R2O', 'RO'].includes(HOST.oxides.groups[oxide]))
    .reduce((sum, [, amount]) => sum + amount, 0);
  return Object.fromEntries(Object.entries(moles).map(([oxide, amount]) => [oxide, amount / fluxes]));
};
const HONEY = { PbO: 0.72, CaO: 0.206, K2O: 0.074, Al2O3: 0.12, SiO2: 3.05, B2O3: 0.7 };

describe('replacing lead', () => {
  test("sets boron by Katz's rule for the firing", () => {
    const at = (cone) => chemistry.boronFor(chemistry.CONES.find((c) => c.cone === cone).celsius);
    near(at('06'), 0.61, 0.005);
    near(at('04'), 0.49, 0.005);
    near(at('03'), 0.41, 0.005);
    assert.equal(chemistry.boronFor(1305), 0);
    assert.equal(chemistry.boronFor(1400), 0);
    assert.ok(Number.isNaN(chemistry.boronFor(null)));
  });

  test("rebuilds a lead-only glaze's fluxes, keeping its silica and alumina", () => {
    const old = chemistry.oxideMoles(
      HOST,
      [
        [RED_LEAD, 55],
        [CHINA_CLAY, 15],
        [IDS.silica, 30]
      ].map(([id, amount]) => ({ material: record(id), amount }))
    );
    const was = unityOf(old);
    const now = unityOf(chemistry.leadFreeTarget(HOST, old, { celsius: 1060 }));
    assert.equal(now.PbO, undefined);
    near(now.K2O + now.Na2O, 0.3, 1e-9);
    near(now.K2O, now.Na2O, 1e-9);
    near(now.CaO, 0.6, 1e-9);
    near(now.ZnO, 0.1, 1e-9);
    assert.equal(now.SrO ?? 0, 0);
    near(now.SiO2, was.SiO2, 1e-9);
    near(now.Al2O3, was.Al2O3, 1e-9);
    near(now.B2O3, 0.49, 1e-9);
  });

  test('keeps the fluxes a glaze has, raises alumina to 0.2, and leaves out zinc and magnesia for chrome', () => {
    const now = unityOf(chemistry.leadFreeTarget(HOST, HONEY, { celsius: 1060, noZincOrMagnesia: true }));
    near(now.K2O, 0.3, 1e-9);
    assert.equal(now.Na2O ?? 0, 0);
    near(now.CaO, 0.6, 1e-9);
    assert.equal(now.ZnO ?? 0, 0);
    assert.equal(now.MgO ?? 0, 0);
    near(now.SrO, 0.1, 1e-9);
    assert.equal(now.Al2O3, 0.2);
    near(now.B2O3, 0.7, 1e-9);
  });

  test('leaves out zinc, magnesia or strontium on their own, and wants more alumina at mid fire', () => {
    const lowFire = unityOf(chemistry.leadFreeTarget(HOST, HONEY, { celsius: 1060, noZinc: true, noStrontium: true }));
    assert.equal(lowFire.ZnO ?? 0, 0);
    assert.equal(lowFire.SrO ?? 0, 0);
    near(lowFire.MgO, 0.1, 1e-9);
    assert.equal(lowFire.Al2O3, 0.2);
    const midFire = unityOf(chemistry.leadFreeTarget(HOST, HONEY, { celsius: 1222, noMagnesia: true }));
    assert.equal(midFire.MgO ?? 0, 0);
    near(midFire.ZnO, 0.1, 1e-9);
    assert.equal(midFire.Al2O3, 0.25);
    const fluxes = (u) => ['K2O', 'Na2O', 'CaO', 'MgO', 'ZnO', 'SrO'].reduce((sum, oxide) => sum + (u[oxide] ?? 0), 0);
    near(fluxes(lowFire), 1, 1e-9);
    near(fluxes(midFire), 1, 1e-9);
  });

  test('leaves the fluxes of a glaze without lead as they are, raising only its alumina and boron', () => {
    // Room for more alkali and calcium, where lead's share of the fluxes would go.
    const moles = { CaO: 0.5, K2O: 0.1, Na2O: 0.1, Al2O3: 0.07, SiO2: 2 };
    const now = chemistry.leadFreeTarget(HOST, moles, { celsius: 1060 });
    assert.deepEqual(Object.keys(now).sort(), ['Al2O3', 'B2O3', 'CaO', 'K2O', 'Na2O', 'SiO2']);
    for (const oxide of ['CaO', 'K2O', 'Na2O', 'SiO2']) near(now[oxide], moles[oxide], 1e-12, oxide);
    near(unityOf(now).Al2O3, 0.2, 1e-12);
    near(unityOf(now).B2O3, chemistry.boronFor(1060), 1e-12);
  });

  test('gives a glaze with no alumina, as lead bisilicate alone, the least alumina for its firing', () => {
    const bisilicate = { PbO: 1, SiO2: 2 };
    assert.equal(chemistry.leadFreeTarget(HOST, bisilicate, { celsius: 1060 }).Al2O3, 0.2);
    assert.equal(chemistry.leadFreeTarget(HOST, bisilicate, { celsius: 1222 }).Al2O3, 0.25);
  });

  test('needs the firing, and a flux, by code', () => {
    assert.equal(
      thrown(() => chemistry.leadFreeTarget(HOST, { PbO: 1, SiO2: 2 }, { celsius: 0 })).code,
      'no-temperature'
    );
    assert.equal(thrown(() => chemistry.leadFreeTarget(HOST, { PbO: 1, SiO2: 2 })).code, 'no-temperature');
    assert.equal(
      thrown(() => chemistry.leadFreeTarget(HOST, { SiO2: 2 }, { celsius: 1060 })).code,
      'no-flux-to-rebuild'
    );
  });
});
