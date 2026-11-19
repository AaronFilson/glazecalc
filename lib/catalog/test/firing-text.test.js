// The catalog's firing text (lib/catalog/firing-text.ts): a pasted recipe's firing line, a typed cone, a
// firing log's cone columns, and Glazy's names for a firing, each read with a host's cone charts.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import * as text from '../firing-text.ts';
import { CONES } from '../cones.ts';

// Reading text asks only the host's cone charts.
const HOST = { cones: CONES };
const read = (line, options) => {
  const found = text.readFiring(HOST, line, options);
  if (!found) return found;
  const rest = { ...found };
  delete rest.whole;
  return rest;
};

describe('reading a firing from a line', () => {
  test('reads cones as potters write them', () => {
    const cases = [
      ['Cone 6 ox', { scale: 'orton', low: '6', atmospheres: ['oxidation'] }],
      ['^6', { scale: 'orton', low: '6' }],
      ['C/6', { scale: 'orton', low: '6' }],
      ['Δ6', { scale: 'orton', low: '6' }],
      ['c6', { scale: 'orton', low: '6' }],
      ['Cone 6.0', { scale: 'orton', low: '6' }],
      ['cone 6-5', { scale: 'orton', low: '5', high: '6' }],
      ['cone 6-6', { scale: 'orton', low: '6' }],
      ['SK8', { scale: 'sk', low: '8' }],
      ['SK 6', { scale: 'sk', low: '6a' }],
      ['SK 6-8', { scale: 'sk', low: '6a', high: '8' }],
      ['06', { scale: 'orton', low: '06' }],
      ['6½', { scale: 'orton', low: '6.5' }],
      ['cone 6 1/2', { scale: 'orton', low: '6.5' }],
      ['6 ox', { scale: 'orton', low: '6', atmospheres: ['oxidation'] }],
      ['6 raku', { scale: 'orton', low: '6', processes: ['raku'] }],
      ['ox/red', { atmospheres: ['oxidation', 'reduction'] }],
      ['oxidation, oxidised', { atmospheres: ['oxidation'] }],
      ['neutral raku', { atmospheres: ['neutral'], processes: ['raku'] }],
      ['Cone 10 reduction, wood fired', { scale: 'orton', low: '10', atmospheres: ['reduction'], processes: ['wood'] }],
      ['salt glaze ^10', { scale: 'orton', low: '10', processes: ['salt'] }],
      ['soda fired, salt glazed, pit fired', { processes: ['soda', 'salt', 'pit'] }],
      ['Cone 10 soda pit wood', { scale: 'orton', low: '10', processes: ['wood', 'soda', 'pit'] }]
    ];
    for (const [line, expected] of cases) assert.deepEqual(read(line), expected, line);
  });

  test('reads lists of cones as their range', () => {
    assert.deepEqual(read('cone 4, 6, 5'), { scale: 'orton', low: '4', high: '6' });
    assert.deepEqual(read('SK 8, 10'), { scale: 'sk', low: '8', high: '10' });
    // A list with no cone the chart has is not read: an SK one is still an SK line, "cone 50, 60" no firing.
    assert.deepEqual(read('SK 98, 99'), { unknown: true });
    assert.equal(read('cone 50, 60'), null);
  });

  test('reads temperatures, and a range of them, in °C', () => {
    assert.deepEqual(read('1240°C'), { scale: 'temperature', low: '1240' });
    assert.deepEqual(read('2232 °F'), { scale: 'temperature', low: '1222' });
    assert.deepEqual(read('1,240 degrees C'), { scale: 'temperature', low: '1240' });
    assert.deepEqual(read('1240ºC'), { scale: 'temperature', low: '1240' });
    assert.deepEqual(read('1220-1260°C'), { scale: 'temperature', low: '1220', high: '1260' });
    assert.deepEqual(read('1220°-1260°C'), { scale: 'temperature', low: '1220', high: '1260' });
    // A peak before a cooling range is the firing.
    assert.deepEqual(read('Fire to 1240°C, slow cool 1100-900°C'), { scale: 'temperature', low: '1240' });
    // A range that is no firing gives way to a temperature that is one.
    assert.deepEqual(read('open at 100-150°C, fired to 1240°C'), { scale: 'temperature', low: '1240' });
    // A cone names the firing; the temperature beside it does not.
    assert.deepEqual(read('Cone 6, 1222°C'), { scale: 'orton', low: '6' });
    assert.deepEqual(read('Cone 6, 1220-1240°C'), { scale: 'orton', low: '6' });
    // A temperature no firing reaches is still a firing line, but no firing.
    assert.equal(read('100°C'), null);
    assert.equal(text.isFiringLine(HOST, '100°C'), false);
    assert.equal(read('100-150°C'), null);
  });

  test('takes a bisque firing out, so it is not the glaze’s', () => {
    assert.equal(read('Bisque to cone 04'), null);
    assert.deepEqual(read('Glaze: cone 6 Bisque: cone 04'), { scale: 'orton', low: '6' });
    assert.deepEqual(read('Cone 04 bisque, cone 6 glaze'), { scale: 'orton', low: '6' });
    assert.deepEqual(read('bisque 1000-1040°C, glaze 1240°C'), { scale: 'temperature', low: '1240' });
    assert.equal(read('Bisque in oxidation'), null);
    assert.equal(text.readCone(HOST, 'Bisque cone 04'), null);
  });

  test('does not take a colour, an ash or a material for a firing', () => {
    assert.equal(read('a deep red glaze'), null);
    assert.equal(read('Soda ash'), null);
    assert.equal(read('Red iron oxide'), null);
    assert.equal(read('Cone 10, wood ash glaze').processes, undefined);
    assert.equal(read('Lovely glossy surface'), null);
    assert.equal(read(''), null);
    assert.equal(text.readFiring(HOST, undefined), null);
    // Weak words alone are a firing when there is nothing else on the line.
    assert.deepEqual(read('Red'), { atmospheres: ['reduction'] });
  });

  test('says when a line is nothing but a firing, and clearly one', () => {
    assert.equal(text.readFiring(HOST, 'Cone 6').whole, true);
    assert.equal(text.readFiring(HOST, 'Cone 6 on a stoneware body').whole, false);
    assert.equal(text.isFiringLine(HOST, 'C/6'), true);
    assert.equal(text.isFiringLine(HOST, 'ox/red'), true);
    assert.equal(text.isFiringLine(HOST, '06'), false);
    assert.equal(text.isFiringLine(HOST, 'Salt'), false);
    assert.equal(text.isFiringLine(HOST, 'Bisque'), true);
    assert.equal(text.isFiringLine(HOST, 'Shino'), false);
  });

  test('never drops an SK cone the chart lacks silently', () => {
    assert.deepEqual(text.readFiring(HOST, 'SK 26'), { unknown: true, whole: true });
    assert.equal(text.isFiringLine(HOST, 'SK 26'), true);
    assert.equal(text.skCone(HOST, '7'), '7');
    assert.equal(text.skCone(HOST, '6'), '6a');
    assert.equal(text.skCone(HOST, '7a'), null);
    assert.equal(text.skCone(HOST, undefined), null);
  });

  test('reads "4,5" as a list, and as a half cone only for a decimal comma with no other number', () => {
    assert.deepEqual(read('cone 4,5'), { scale: 'orton', low: '4', high: '5' });
    assert.deepEqual(read('cone 4,5', { decimalComma: true }), { scale: 'orton', low: '4.5' });
    assert.deepEqual(read('cone 4,5 1240°C', { decimalComma: true }), { scale: 'orton', low: '4', high: '5' });
    assert.equal(text.textForCones('Cone ٦'), 'cone 6');
    assert.equal(text.textForCones('6,5'), '6,5');
  });

  test('knows who writes decimal commas', () => {
    assert.equal(text.readsDecimalComma('comma'), true);
    assert.equal(text.readsDecimalComma('point', 'de'), false);
    assert.equal(text.readsDecimalComma('either', 'de'), true);
    assert.equal(text.readsDecimalComma(), false);
  });
});

describe('reading one cone', () => {
  test('reads one cone of a scale as it is stored', () => {
    assert.equal(text.readCone(HOST, '6'), '6');
    assert.equal(text.readCone(HOST, 'Cone 06'), '06');
    assert.equal(text.readCone(HOST, '5½'), '5.5');
    assert.equal(text.readCone(HOST, '^6'), '6');
    assert.equal(text.readCone(HOST, 'Δ٦'), '6');
    assert.equal(text.readCone(HOST, '6', 'sk'), '6a');
    assert.equal(text.readCone(HOST, 'SK 8', 'sk'), '8');
    assert.equal(text.readCone(HOST, 'SK-8', 'sk'), '8');
  });

  test('is never a range, a firing word, another scale’s cone or a temperature', () => {
    assert.equal(text.readCone(HOST, 'cone 5-6'), null);
    assert.equal(text.readCone(HOST, 'cone 6 ox'), null);
    assert.equal(text.readCone(HOST, 'cone 6 wood fired'), null);
    assert.equal(text.readCone(HOST, 'SK 8'), null);
    assert.equal(text.readCone(HOST, '1240', 'temperature'), null);
    assert.equal(text.readCone(HOST, undefined), null);
    assert.equal(text.readCone(HOST, 'cone 99'), null);
  });
});

describe('a block from lines', () => {
  test('takes the first cone and every atmosphere and process, no cone ticked', () => {
    assert.deepEqual(text.firingFromLines(HOST, ['Cone 6', 'oxidation, slow cool']), {
      scale: 'orton',
      low: '6',
      atmospheres: ['oxidation']
    });
    assert.deepEqual(text.firingFromLines(HOST, ['ox', 'cone 5-6', 'Cone 10 red', 'wood fired', 'soda fired']), {
      scale: 'orton',
      low: '5',
      high: '6',
      atmospheres: ['oxidation', 'reduction'],
      processes: ['wood', 'soda']
    });
    assert.deepEqual(text.firingFromLines(HOST, ['SK6']), { scale: 'sk', low: '6a' });
    assert.equal(text.firingFromLines(HOST, ['Lovely glossy surface']), null);
    assert.equal(text.firingFromLines(HOST, undefined), null);
  });

  test('takes its scale from an unknown SK cone, the fallback, or Orton for a scale that is none', () => {
    assert.equal(text.firingFromLines(HOST, ['SK 26', 'reduction']).scale, 'sk');
    assert.equal(text.firingFromLines(HOST, ['reduction'], 'temperature').scale, 'temperature');
    assert.equal(text.firingFromLines(HOST, ['reduction'], 'kelvin').scale, 'orton');
  });
});

describe("a firing log's cones", () => {
  test('reads the cone columns of each row, in order, each once', () => {
    const log = {
      fieldsIncluded: ['Date', 'Cones Top', 'Cone'],
      rows: [['6', '06 down', 'cone 6'], ['x', '5½', '99'], 'no']
    };
    assert.deepEqual(text.conesFromLog(HOST, log, 'orton'), ['06', '5.5', '6']);
    assert.deepEqual(text.conesFromLog(HOST, { fieldsIncluded: ['Cone'], rows: [['SK6 down'], ['8'], [null]] }, 'sk'), [
      '6a',
      '8'
    ]);
  });

  test('is nothing for no log, a temperature, or a log with no cone column', () => {
    assert.deepEqual(text.conesFromLog(HOST, null, 'orton'), []);
    assert.deepEqual(text.conesFromLog(HOST, { fieldsIncluded: ['Cone'], rows: [['6']] }, 'temperature'), []);
    assert.deepEqual(text.conesFromLog(HOST, {}, 'orton'), []);
  });
});

describe("Glazy's names", () => {
  test('shows half cones as ½', () => {
    assert.equal(text.coneLabel('5.5'), '5½');
    assert.equal(text.coneLabel(undefined), '');
  });

  test('writes Glazy’s "Cone" string and "Atmospheres" list', () => {
    assert.deepEqual(
      text.glazyFiring(HOST, { scale: 'orton', low: '9', high: '10', atmospheres: ['reduction'], processes: ['wood'] }),
      {
        cone: '9 - 10',
        atmospheres: ['Reduction', 'Wood']
      }
    );
    assert.deepEqual(text.glazyFiring(HOST, { scale: 'sk', low: '8' }), { cone: 'SK 8', atmospheres: [] });
    assert.deepEqual(text.glazyFiring(HOST, { scale: 'orton', low: '6', atmospheres: ['oxidation'] }), {
      cone: '6',
      atmospheres: ['Oxidation']
    });
    assert.deepEqual(text.glazyFiring(HOST, { scale: 'temperature', low: '1240' }), {
      cone: '1240°C',
      atmospheres: []
    });
    assert.deepEqual(text.glazyFiring(HOST, { scale: 'orton' }), { cone: '', atmospheres: [] });
    assert.deepEqual(text.glazyFiring(HOST, { scale: 'orton', processes: ['raku'] }), {
      cone: '',
      atmospheres: ['Raku']
    });
    assert.deepEqual(text.glazyFiring(HOST, null), { cone: '', atmospheres: [] });
  });

  test('marks the CSV cone cell with the cone sign', () => {
    assert.equal(text.glazyConeCell(HOST, { scale: 'orton', low: '06' }), 'Δ06');
    assert.equal(text.glazyConeCell(HOST, { scale: 'orton', low: '9', high: '10' }), 'Δ9 - Δ10');
    assert.equal(text.glazyConeCell(HOST, { scale: 'sk', low: '8' }), 'SK 8');
    assert.equal(text.glazyConeCell(HOST, { scale: 'orton' }), '');
    assert.equal(text.glazyConeCell(HOST, null), '');
  });
});
