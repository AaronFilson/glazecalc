// A recipe's firing block (lib/core/cones/firing.js, docs/adr/0021-recipe-firing.md) and the cone charts'
// figures (the catalog's, lib/catalog/cones.ts, as the tests' host has them): cones in order, ranges and tested cones, bands, and conversions that
// say what they rest on.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import * as firing from '../cones/firing.ts';
import * as limits from '../recipe/limits.ts';
import { HOST } from './support.js';

// The charts typed again here, so a slip in the data shows up as a difference.
const SK_FROZEN = [
  ['022', 600], ['021', 650], ['020', 670], ['019', 690], ['018', 710], ['017', 730], ['016', 750],
  ['015a', 790], ['014a', 815], ['013a', 835], ['012a', 855], ['011a', 880], ['010a', 900],
  ['09a', 920], ['08a', 940], ['07a', 960], ['06a', 980], ['05a', 1000], ['04a', 1020],
  ['03a', 1040], ['02a', 1060], ['01a', 1080], ['1a', 1100], ['2a', 1120], ['3a', 1140],
  ['4a', 1160], ['5a', 1180], ['6a', 1200], ['7', 1230], ['8', 1250], ['9', 1280], ['10', 1300],
  ['11', 1320], ['12', 1350], ['13', 1380], ['14', 1410], ['15', 1435], ['16', 1460],
  ['17', 1480], ['18', 1500], ['19', 1520], ['20', 1530]
]; // prettier-ignore
const ORTON_FROZEN = [
  ['022', 600], ['021', 614], ['020', 635], ['019', 683], ['018', 717], ['017', 747], ['016', 792],
  ['015', 804], ['014', 838], ['013', 852], ['012', 884], ['011', 894], ['010', 894], ['09', 923],
  ['08', 955], ['07', 984], ['06', 999], ['05', 1046], ['04', 1060], ['03', 1101], ['02', 1120],
  ['01', 1137], ['1', 1154], ['2', 1162], ['3', 1168], ['4', 1186], ['5', 1196], ['6', 1222],
  ['7', 1240], ['8', 1263], ['9', 1280], ['10', 1305], ['11', 1315], ['12', 1326], ['13', 1346],
  ['14', 1366], ['15', 1431]
]; // prettier-ignore

describe('cone charts', () => {
  test('SK: 42 large cones as the seller printed them, rising, none twice', () => {
    assert.deepEqual(
      HOST.cones.skCones.map((c) => [c.cone, c.celsius]),
      SK_FROZEN
    );
    HOST.cones.skCones.forEach((cone, i) => {
      if (i) assert.ok(cone.celsius > HOST.cones.skCones[i - 1].celsius, cone.cone);
    });
    assert.equal(new Set(HOST.cones.skCones.map((c) => c.cone)).size, 42);
  });

  test("Orton's older chart, large cones at 150 °C an hour, 022 to 15, in order", () => {
    assert.deepEqual(
      HOST.cones.ortonChart.map((c) => [c.cone, c.celsius]),
      ORTON_FROZEN
    );
    const figures = HOST.cones.ortonChart.map((c) => c.celsius);
    assert.deepEqual(
      figures,
      [...figures].sort((a, b) => a - b)
    );
  });

  test("Orton's current figures by heating rate, large 13 and 14 marked as made differently", () => {
    const published = HOST.cones.ortonPublished;
    assert.equal(published.length, 38);
    assert.equal(published.at(-1).cone, '14');
    assert.deepEqual(
      published.filter((c) => c.largeDiffers).map((c) => c.cone),
      ['13', '14']
    );
    const at = (cone) => published.find((c) => c.cone === cone);
    assert.deepEqual(at('022'), { cone: '022', selfSupporting: { 60: 586, 150: 590 } });
    assert.deepEqual(at('6'), {
      cone: '6',
      selfSupporting: { 15: 1185, 60: 1222, 150: 1243 },
      large: { 60: 1220, 150: 1241 }
    });
    assert.equal(at('5.5').large, undefined);
    assert.deepEqual(at('05.5').large, { 60: 1012, 150: 1023 });
    assert.deepEqual(at('14').large, { 60: 1388, 150: 1366 });
    // Where both are read the same way, the older chart and today's differ by at most 19 °C.
    for (const { cone, celsius } of HOST.cones.ortonChart) {
      const today = at(cone)?.large?.[150];
      if (today !== undefined) assert.ok(Math.abs(today - celsius) <= 19, cone);
    }
  });
});

describe('cones in order', () => {
  test('puts Orton cones in true order: 022 … 01 below 1 … 42, 06 far below 6, half cones between', () => {
    const sorted = ['6', '06', '10', '022', '01', '1', '5.5', '42', '014'].sort((a, b) =>
      firing.compareCones(HOST, 'orton', a, b)
    );
    assert.deepEqual(sorted, ['022', '014', '06', '01', '1', '5.5', '6', '10', '42']);
    assert.ok(firing.ordinal(HOST, 'orton', '06') < firing.ordinal(HOST, 'orton', '6'));
    assert.ok(firing.ordinal(HOST, 'orton', '5.5') > firing.ordinal(HOST, 'orton', '5'));
    assert.ok(firing.ordinal(HOST, 'orton', '5.5') < firing.ordinal(HOST, 'orton', '6'));
    assert.ok(Number.isNaN(firing.ordinal(HOST, 'orton', 'six')));
  });

  test('orders SK cones by their chart, letter cones included, and temperatures by degree', () => {
    assert.ok(firing.compareCones(HOST, 'sk', '6a', '7') < 0);
    assert.ok(firing.compareCones(HOST, 'sk', '015a', '016') > 0);
    assert.equal(firing.isCone(HOST, 'sk', '6a'), true);
    assert.equal(firing.isCone(HOST, 'sk', '6'), false);
    assert.equal(HOST.cones.skOrder.get('022'), 0);
    assert.equal(firing.ordinal(HOST, 'temperature', '1222'), 1222);
  });

  test('knows a cone of each scale, and nothing else', () => {
    for (const cone of ['13.5', '14.5', '15', '15.5', '16', '21', '05.5'])
      assert.equal(firing.isCone(HOST, 'orton', cone), true, cone);
    for (const cone of ['22', '24', '16.5', '43', '06.5', '022.5', '01.5', '0.5', '', 6]) {
      assert.equal(firing.isCone(HOST, 'orton', cone), false, String(cone));
    }
    assert.equal(firing.isCone(HOST, 'temperature', '1240'), true);
    assert.equal(firing.isCone(HOST, 'temperature', '499'), false);
    assert.equal(firing.isCone(HOST, 'temperature', '1601'), false);
    assert.equal(firing.isCone(HOST, 'temperature', '12a0'), false);
    assert.equal(firing.isCone(HOST, 'kelvin', '6'), false);
    assert.deepEqual(firing.SCALES, ['orton', 'sk', 'temperature']);
  });

  test('offers Orton 022 … 13 first, then half cones from 05½, then 14 … 42; SK its chart; none for temperature', () => {
    const groups = firing.coneChoices(HOST, 'orton');
    assert.deepEqual(
      groups.map((g) => g.group),
      ['usual', 'half', 'above']
    );
    const [usual, half, above] = groups;
    assert.equal(usual.cones[0], '022');
    assert.equal(usual.cones.at(-1), '13');
    assert.equal(half.cones[0], '05.5');
    for (const cone of ['1.5', '5.5', '12.5', '13.5', '14.5', '15.5']) assert.ok(half.cones.includes(cone), cone);
    assert.deepEqual(above.cones.slice(0, 5), ['14', '15', '16', '17', '18']);
    for (const cone of ['21', '23', '31.5', '32.5', '42']) assert.ok(above.cones.includes(cone), cone);
    const all = groups.flatMap((group) => group.cones);
    const sorted = [...all].sort((a, b) => firing.compareCones(HOST, 'orton', a, b));
    assert.deepEqual(sorted.slice(sorted.indexOf('13'), sorted.indexOf('17') + 1), [
      '13',
      '13.5',
      '14',
      '14.5',
      '15',
      '15.5',
      '16',
      '17'
    ]);
    assert.deepEqual(sorted.slice(sorted.indexOf('06'), sorted.indexOf('04') + 1), ['06', '05.5', '05', '04']);
    assert.equal(firing.coneChoices(HOST, 'sk')[0].cones.length, 42);
    assert.deepEqual(firing.coneChoices(HOST, 'temperature'), []);
  });
});

describe('ranges and tested cones', () => {
  test('ticks each whole cone of a range and its two ends; only a ticked cone is tested', () => {
    assert.deepEqual(firing.conesBetween(HOST, 'orton', '5', '7'), ['5', '6', '7']);
    assert.deepEqual(firing.conesBetween(HOST, 'orton', '5.5', '6.5'), ['5.5', '6', '6.5']);
    assert.deepEqual(firing.conesBetween(HOST, 'orton', '06', '04'), ['06', '05', '04']);
    assert.deepEqual(firing.conesBetween(HOST, 'orton', '06', '05.5'), ['06', '05.5']);
    assert.deepEqual(firing.conesBetween(HOST, 'orton', '05.5', '04'), ['05.5', '05', '04']);
    assert.deepEqual(firing.conesBetween(HOST, 'orton', '12', '16'), ['12', '13', '14', '15', '16']);
    assert.deepEqual(firing.conesBetween(HOST, 'temperature', '1220', '1260'), ['1220', '1260']);
    assert.deepEqual(firing.conesBetween(HOST, 'sk', '8', '10'), ['8', '9', '10']);
    assert.deepEqual(firing.conesBetween(HOST, 'orton', '6'), ['6']);
    assert.deepEqual(firing.conesBetween(HOST, 'orton', '6', '6'), ['6']);
    assert.deepEqual(firing.conesBetween(HOST, 'orton', '10', '6'), []);
    assert.deepEqual(firing.conesBetween(HOST, 'orton', 'x', '6'), []);
    assert.deepEqual(firing.testedCones(HOST, { scale: 'orton', low: '6' }), []);
    assert.deepEqual(firing.testedCones(HOST, { scale: 'orton', low: '6', tested: ['6'] }), ['6']);
    assert.deepEqual(firing.testedCones(HOST, { scale: 'orton', low: '6', tested: ['7'] }), []);
    assert.deepEqual(firing.testedCones(HOST, { scale: 'orton', low: '6', high: '10', tested: ['10'] }), ['10']);
    assert.deepEqual(firing.testedCones(HOST, null), []);
  });

  test('finds whether a cone is within a range, at either end too', () => {
    const block = { scale: 'orton', low: '5', high: '7' };
    assert.equal(firing.inRange(HOST, block, 'orton', '6'), true);
    assert.equal(firing.inRange(HOST, block, 'orton', '7'), true);
    assert.equal(firing.inRange(HOST, block, 'orton', '06'), false);
    assert.equal(firing.inRange(HOST, block, 'sk', '6a'), false);
    assert.equal(firing.inRange(HOST, { scale: 'orton', low: '06', high: '05' }, 'orton', '05.5'), true);
    assert.equal(firing.inRange(HOST, { scale: 'orton', low: '6' }, 'orton', '6'), true);
    assert.equal(firing.inRange(HOST, null, 'orton', '6'), false);
  });
});

describe('a firing block', () => {
  test('refuses a block that is not a firing, with a code', () => {
    assert.equal(firing.firingProblem(HOST, { scale: 'orton', low: '6', high: '10', tested: ['6', '10'] }), null);
    assert.equal(firing.firingProblem(HOST, { scale: 'orton', low: '05.5', high: '04', tested: ['05.5'] }), null);
    assert.equal(firing.firingProblem(HOST, null), 'block');
    assert.equal(firing.firingProblem(HOST, []), 'block');
    assert.equal(firing.firingProblem(HOST, { scale: 'kelvin', low: '6' }), 'scale');
    assert.equal(firing.firingProblem(HOST, { scale: 'orton', low: '6a' }), 'low');
    assert.equal(firing.firingProblem(HOST, { scale: 'orton', low: '10', high: '6' }), 'order');
    assert.equal(firing.firingProblem(HOST, { scale: 'orton', low: '05', high: '05.5' }), 'order');
    assert.equal(firing.firingProblem(HOST, { scale: 'orton', high: '6' }), 'low');
    assert.equal(firing.firingProblem(HOST, { scale: 'orton', low: '6', high: 'x' }), 'high');
    assert.equal(firing.firingProblem(HOST, { scale: 'orton', low: '6', tested: ['7'] }), 'tested');
    assert.equal(firing.firingProblem(HOST, { scale: 'orton', low: '6', tested: ['6', '6'] }), 'tested');
    assert.equal(firing.firingProblem(HOST, { scale: 'orton', low: '6', tested: '6' }), 'tested');
    assert.equal(firing.firingProblem(HOST, { scale: 'orton', low: '6', atmospheres: ['wood'] }), 'atmospheres');
    assert.equal(firing.firingProblem(HOST, { scale: 'orton', low: '6', processes: ['wood', 'wood'] }), 'processes');
    assert.equal(firing.firingProblem(HOST, { scale: 'temperature', low: '1240', rate: 0 }), 'rate');
    assert.equal(firing.firingProblem(HOST, { scale: 'temperature', low: '1240', rate: 1.5 + Infinity }), 'rate');
    assert.equal(firing.firingProblem(HOST, { scale: 'temperature', low: '1240', hold: 2000 }), 'hold');
    assert.equal(firing.firingProblem(HOST, { scale: 'temperature', low: '99999' }), 'low');
    assert.equal(firing.firingProblem(HOST, { scale: 'orton', schedule: 'x'.repeat(301) }), 'schedule');
    assert.equal(firing.firingProblem(HOST, { scale: 'orton', schedule: 3 }), 'schedule');
    assert.equal(firing.firingProblem(HOST, { scale: 'orton', witness: 'yes' }), 'witness');
    assert.equal(firing.firingProblem(HOST, { scale: 'orton', low: '', high: '' }), null);
  });

  test('keeps only its known fields, in order, or nothing when it says nothing', () => {
    assert.deepEqual(
      firing.cleanFiring(HOST, {
        scale: 'orton',
        low: '5',
        high: '7',
        tested: ['7', '5'],
        atmospheres: ['reduction', 'oxidation'],
        processes: ['salt', 'wood'],
        rate: 60,
        hold: 10,
        schedule: '  slow cool  ',
        witness: true,
        extra: 'dropped'
      }),
      {
        scale: 'orton',
        low: '5',
        high: '7',
        tested: ['5', '7'],
        atmospheres: ['oxidation', 'reduction'],
        processes: ['wood', 'salt'],
        rate: 60,
        hold: 10,
        schedule: 'slow cool',
        witness: true
      }
    );
    assert.deepEqual(firing.cleanFiring(HOST, { scale: 'orton', low: '6', high: '6' }), { scale: 'orton', low: '6' });
    assert.equal(firing.cleanFiring(HOST, { scale: 'orton' }), null);
    assert.equal(firing.cleanFiring(HOST, { scale: 'orton', schedule: '   ' }), null);
    assert.equal(firing.cleanFiring(HOST, { scale: 'kelvin', low: '6' }), null);
    assert.equal(firing.cleanFiring(HOST, null), null);
    assert.equal(firing.isStated(HOST, { scale: 'orton', atmospheres: ['reduction'] }), true);
    assert.equal(firing.isStated(HOST, { scale: 'orton' }), false);
  });

  test('keeps its bounds and choices as data', () => {
    assert.deepEqual(firing.FIRING_LIMITS.celsius, { min: 500, max: 1600 });
    assert.equal(firing.FIRING_LIMITS.schedule, 300);
    assert.deepEqual(firing.ATMOSPHERES, ['oxidation', 'reduction', 'neutral']);
    assert.deepEqual(firing.PROCESSES, ['wood', 'soda', 'salt', 'raku', 'pit']);
    assert.deepEqual(HOST.cones.skMeasured, { 8: 1198, 10: 1232 });
  });
});

describe('bands', () => {
  test('maps cones to the limits bands: 06 low, 6 mid, 8 to 11 high, 12 up top; SK by its own table', () => {
    for (const [cone, band] of [
      ['06', 'low'],
      ['02', 'low'],
      ['05.5', 'low'],
      ['6', 'mid'],
      ['7', 'mid'],
      ['8', 'high'],
      ['11', 'high']
    ]) {
      assert.equal(firing.coneBand(HOST, 'orton', cone), band, cone);
    }
    for (const cone of ['11.5', '12', '13', '14', '14.5', '15', '15.5', '16', '20', '42']) {
      assert.equal(firing.coneBand(HOST, 'orton', cone), 'top', cone);
    }
    assert.equal(firing.coneBand(HOST, 'sk', '8'), 'mid');
    assert.equal(firing.coneBand(HOST, 'sk', '10'), 'mid');
    assert.equal(firing.coneBand(HOST, 'sk', '12'), 'high');
    assert.equal(firing.coneBand(HOST, 'sk', '13'), 'high');
    for (const cone of ['14', '15', '16', '20']) assert.equal(firing.coneBand(HOST, 'sk', cone), 'top', cone);
    assert.equal(firing.coneBand(HOST, 'sk', '4a'), 'low');
    assert.equal(firing.coneBand(HOST, 'sk', '5a'), 'mid');
    assert.equal(firing.coneBand(HOST, 'temperature', '1280'), 'high');
    assert.equal(firing.coneBand(HOST, 'temperature', '1319'), 'high');
    assert.equal(firing.coneBand(HOST, 'temperature', '1320'), 'top');
    assert.equal(firing.coneBand(HOST, 'orton', 'x'), undefined);
  });

  test('gives the bands a block’s range touches, coolest first', () => {
    assert.deepEqual(firing.firingBands(HOST, { scale: 'orton', low: '10', high: '14' }), ['high', 'top']);
    assert.deepEqual(firing.firingBands(HOST, { scale: 'orton', low: '6', high: '16' }), ['mid', 'high', 'top']);
    assert.deepEqual(firing.firingBands(HOST, { scale: 'orton', low: '6', high: '10' }), ['mid', 'high']);
    assert.deepEqual(firing.firingBands(HOST, { scale: 'orton', low: '04', high: '10' }), ['low', 'mid', 'high']);
    assert.deepEqual(firing.firingBands(HOST, { scale: 'orton', low: '5', high: '6' }), ['mid']);
    assert.deepEqual(firing.firingBands(HOST, { scale: 'orton', low: '5' }), ['mid']);
    assert.deepEqual(firing.firingBands(HOST, null), []);
  });

  test('draws its band edges where the limits do: every temperature from 500 to 1600 °C in the same band', () => {
    const { min, max } = firing.FIRING_LIMITS.celsius;
    for (let celsius = min; celsius <= max; celsius++) {
      const band = firing.coneBand(HOST, 'temperature', String(celsius));
      assert.equal(band, limits.bandOf(limits.HESSELBERTH_ROY_LIMITS, celsius), `${celsius} °C`);
      assert.equal(
        limits.bandIn(limits.GLAZECALC_LIMITS, band),
        limits.bandOf(limits.GLAZECALC_LIMITS, celsius),
        `${celsius} °C, own set`
      );
    }
    assert.ok(firing.approxCelsius(HOST, 'orton', '11').celsius < limits.FIRING.topFrom);
    assert.ok(firing.approxCelsius(HOST, 'orton', '12').celsius >= limits.FIRING.topFrom);
  });
});

describe('conversions', () => {
  test('gives Orton cones the older chart’s figure to cone 15, half cones halfway, and none from 16 up', () => {
    for (const { cone, celsius } of HOST.cones.ortonChart) {
      assert.deepEqual(firing.approxCelsius(HOST, 'orton', cone), { celsius, basis: 'orton-150' }, cone);
    }
    assert.deepEqual(firing.approxCelsius(HOST, 'orton', '13.5'), { celsius: 1356, basis: 'orton-150-halfway' });
    assert.deepEqual(firing.approxCelsius(HOST, 'orton', '14.5'), { celsius: 1399, basis: 'orton-150-halfway' });
    assert.deepEqual(firing.approxCelsius(HOST, 'orton', '5.5'), { celsius: 1209, basis: 'orton-150-halfway' });
    // 05½ from Orton's 2016 chart, the one half cone it gives large cones a figure for.
    assert.deepEqual(firing.approxCelsius(HOST, 'orton', '05.5'), { celsius: 1023, basis: 'orton-2016-150' });
    for (const cone of ['15.5', '16', '17', '21', '31.5', '42'])
      assert.equal(firing.approxCelsius(HOST, 'orton', cone), null, cone);
    assert.deepEqual(firing.approxCelsius(HOST, 'temperature', '1240'), { celsius: 1240, basis: 'stated' });
    assert.equal(firing.approxCelsius(HOST, 'orton', 'x'), null);
  });

  test('gives SK cones only Kyoto’s measured bends, never the JIS nominal figure', () => {
    assert.deepEqual(firing.approxCelsius(HOST, 'sk', '10'), { celsius: 1232, basis: 'kyoto' });
    assert.deepEqual(firing.approxCelsius(HOST, 'sk', '8'), { celsius: 1198, basis: 'kyoto' });
    for (const cone of ['7', '9', '6a', '11', '12', '022'])
      assert.equal(firing.approxCelsius(HOST, 'sk', cone), null, cone);
  });

  test('converts a cone to another scale only approximately, and says on what', () => {
    assert.deepEqual(firing.approxCone(HOST, 'sk', '12', 'orton'), { cone: '10', basis: 'kyoto' });
    assert.deepEqual(firing.approxCone(HOST, 'orton', '10', 'sk'), { cone: '12', basis: 'kyoto' });
    assert.notEqual(firing.approxCone(HOST, 'sk', '10', 'orton')?.cone, '10');
    assert.equal(firing.approxCone(HOST, 'sk', '6a', 'orton'), null);
    assert.equal(firing.approxCone(HOST, 'sk', '15', 'orton'), null);
    assert.equal(firing.approxCone(HOST, 'sk', '8', 'temperature'), null);
    assert.equal(firing.approxCone(HOST, 'orton', '6', 'orton'), null);
    assert.equal(firing.approxCone(HOST, 'orton', 'x', 'sk'), null);
    assert.deepEqual(firing.approxCone(HOST, 'temperature', '1222', 'orton'), { cone: '6', basis: 'orton-150' });
    assert.deepEqual(firing.approxCone(HOST, 'temperature', '1366', 'orton'), { cone: '14', basis: 'orton-150' });
    assert.deepEqual(firing.approxCone(HOST, 'temperature', '1440', 'orton'), { cone: '15', basis: 'orton-150' });
    assert.equal(firing.approxCone(HOST, 'temperature', '1460', 'orton'), null);
    assert.equal(firing.approxCone(HOST, 'temperature', '560', 'orton'), null);
    // SK from a temperature only near a measured bend.
    assert.deepEqual(firing.approxCone(HOST, 'temperature', '1200', 'sk'), { cone: '8', basis: 'kyoto' });
    assert.equal(firing.approxCone(HOST, 'temperature', '1100', 'sk'), null);
    // Orton from a cone with no figure: none.
    assert.equal(firing.approxCone(HOST, 'orton', '16', 'temperature'), null);
  });

  test('matches SK and Orton by Kyoto’s same-kiln columns, one to one', () => {
    const sk = { 7: '4', 8: '5', 9: '6', 10: '7', 11: '8', 12: '10', 13: '11', 14: '12' };
    for (const [from, to] of Object.entries(sk)) {
      assert.deepEqual(firing.approxCone(HOST, 'sk', from, 'orton'), { cone: to, basis: 'kyoto' }, `SK ${from}`);
      assert.deepEqual(firing.approxCone(HOST, 'orton', to, 'sk'), { cone: from, basis: 'kyoto' }, `Orton ${to}`);
    }
    for (const from of ['9', '3', '04', '5.5', '13'])
      assert.equal(firing.approxCone(HOST, 'orton', from, 'sk'), null, from);
    // A cone taken across and back is the cone it was.
    const all = (scale) => firing.coneChoices(HOST, scale).flatMap((group) => group.cones);
    let across = 0;
    for (const [from, to] of [
      ['orton', 'sk'],
      ['sk', 'orton']
    ]) {
      for (const cone of all(from)) {
        const other = firing.approxCone(HOST, from, cone, to);
        if (!other) continue;
        across++;
        assert.equal(firing.approxCone(HOST, to, other.cone, from)?.cone, cone, `${from} ${cone}`);
      }
    }
    assert.equal(across, 16);
  });
});

describe('matchesCone', () => {
  test('matches the same scale by range', () => {
    assert.equal(firing.matchesCone(HOST, { scale: 'orton', low: '14', high: '16' }, 'orton', '15'), true);
    assert.equal(firing.matchesCone(HOST, { scale: 'orton', low: '5', high: '7' }, 'orton', '8'), false);
    assert.equal(firing.matchesCone(HOST, null, 'orton', '6'), false);
    assert.equal(firing.matchesCone(HOST, { scale: 'orton' }, 'orton', '6'), false);
  });

  test('matches a temperature and a cone by the cone’s figure, within 15 °C', () => {
    assert.equal(firing.matchesCone(HOST, { scale: 'temperature', low: '1430' }, 'orton', '15'), true);
    assert.equal(firing.matchesCone(HOST, { scale: 'temperature', low: '1430' }, 'orton', '16'), false);
    assert.equal(firing.matchesCone(HOST, { scale: 'temperature', low: '1020' }, 'orton', '05.5'), true);
    assert.equal(firing.matchesCone(HOST, { scale: 'orton', low: '6' }, 'temperature', '1230'), true);
    assert.equal(firing.matchesCone(HOST, { scale: 'orton', low: '6' }, 'temperature', '1250'), false);
    assert.equal(firing.matchesCone(HOST, { scale: 'sk', low: '9' }, 'temperature', '1250'), false);
  });

  test('matches SK and Orton through Kyoto’s columns, both ways round alike', () => {
    const block = { scale: 'sk', low: '8', high: '10' };
    assert.deepEqual(
      [4, 5, 6, 7, 8].map((c) => firing.matchesCone(HOST, block, 'orton', String(c))),
      [false, true, true, true, false]
    );
    const ortonBlock = { scale: 'orton', low: '4', high: '6' };
    assert.equal(firing.matchesCone(HOST, ortonBlock, 'sk', '8'), true);
    assert.equal(firing.matchesCone(HOST, ortonBlock, 'sk', '10'), false);
    assert.equal(firing.matchesCone(HOST, { scale: 'orton', low: '9' }, 'sk', '11'), false);
    const all = (scale) => firing.coneChoices(HOST, scale).flatMap((group) => group.cones);
    for (const orton of all('orton')) {
      for (const sk of all('sk')) {
        assert.equal(
          firing.matchesCone(HOST, { scale: 'orton', low: orton }, 'sk', sk),
          firing.matchesCone(HOST, { scale: 'sk', low: sk }, 'orton', orton),
          `Orton ${orton}, SK ${sk}`
        );
      }
    }
  });
});
