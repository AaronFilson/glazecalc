// The catalog's cone charts (lib/catalog/cones.ts): the charts and figures the core's host passes as
// host.cones, with the lookups the core's coneTable works out from them once.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { CONE_CHARTS, CONES, ORTON_CHART_CONES, ORTON_PUBLISHED_CONES, SK_CONES, SK_MEASURED } from '../cones.ts';

describe('the cone charts', () => {
  test('are the charts and figures coneTable takes, frozen, and CONES their lookups', () => {
    assert.ok(Object.isFrozen(CONE_CHARTS) && Object.isFrozen(CONES));
    assert.equal(CONE_CHARTS.skCones, SK_CONES);
    assert.equal(CONE_CHARTS.ortonChart, ORTON_CHART_CONES);
    assert.equal(CONE_CHARTS.ortonPublished, ORTON_PUBLISHED_CONES);
    assert.equal(CONE_CHARTS.skMeasured, SK_MEASURED);
    for (const key of Object.keys(CONE_CHARTS)) assert.equal(CONES[key], CONE_CHARTS[key], key);
    assert.equal(CONES.ortonCelsius.get('6'), 1222);
    assert.equal(CONES.ortonHalf150.get('05.5'), 1023);
    assert.equal(CONES.skOrder.get(SK_CONES[0].cone), 0);
    assert.equal(CONES.kyotoMatch.toOrton.get('12'), '10');
  });

  test('draw the band edges once: low fire below 1150 °C, mid below 1250, high below 1320', () => {
    assert.deepEqual([CONE_CHARTS.lowBelow, CONE_CHARTS.midBelow, CONE_CHARTS.highBelow], [1150, 1250, 1320]);
    assert.deepEqual([CONE_CHARTS.skMidFrom, CONE_CHARTS.skHighFrom, CONE_CHARTS.skTopFrom], ['5a', '11', '14']);
  });

  test('give Orton’s current figures by heating rate, large ones where printed', () => {
    const cone6 = ORTON_PUBLISHED_CONES.find((c) => c.cone === '6');
    assert.deepEqual(Object.keys(cone6.selfSupporting), ['15', '60', '150']);
    assert.ok(ORTON_PUBLISHED_CONES.some((c) => c.largeDiffers));
  });
});
