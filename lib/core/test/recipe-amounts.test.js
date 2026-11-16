'use strict';

// Amounts as saved and scaled (lib/core/recipe/amounts.js, plain.js), a batch's cost (cost.js), the slurry
// in the bucket (slurry.js), and how the recipe tools say things (messages.js).
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const amounts = require('../recipe/amounts');
const { plainNumber } = require('../recipe/plain');
const cost = require('../recipe/cost');
const slurry = require('../recipe/slurry');
const messages = require('../recipe/messages');
const { thrown } = require('./support');

const near = (actual, expected, within, what = '') =>
  assert.ok(Math.abs(actual - expected) <= within, `${what} ${actual} is not within ${within} of ${expected}`);

describe('plainNumber', () => {
  test('reads a number saved plainly, and nothing else', () => {
    assert.equal(plainNumber('12.5'), 12.5);
    assert.equal(plainNumber(' -3 '), -3);
    assert.equal(plainNumber('.5'), 0.5);
    assert.equal(plainNumber(7), 7);
    for (const text of ['12,5', '1e3', '0x10', '', '1.', 'abc', null, undefined]) {
      assert.equal(plainNumber(text), null, String(text));
    }
  });
});

describe('amounts', () => {
  test('reads amounts as the app does', () => {
    assert.equal(amounts.amountOf('12.5'), 12.5);
    assert.equal(amounts.amountOf('12,5'), 0);
    assert.equal(amounts.amountOf('-3'), 0);
    assert.equal(amounts.amountOf(''), 0);
    assert.equal(amounts.isAmount('-3'), false);
    assert.equal(amounts.isAmount(''), true);
    assert.equal(amounts.isAmount(undefined), true);
    assert.equal(amounts.isAmount('0'), true);
    assert.equal(amounts.isAmount('1e3'), false);
    assert.equal(amounts.totalOf(['1', '2.5', '', 'x']), 3.5);
    assert.equal(amounts.unitOf({}), 'percent');
    assert.equal(amounts.unitOf({ unit: 'grams' }), 'grams');
  });

  test('writes an amount as a plain decimal however small, never with an exponent', () => {
    assert.deepEqual(
      [0.0000001, 2.5e-8, 12.5, 0, 1.25e21].map((value) => amounts.plainAmount(value)),
      ['0.0000001', '0.000000025', '12.5', '0', '1250000000000000000000']
    );
    for (const value of [1e-7, 1.234567e-9, 5e-324]) {
      assert.equal(amounts.isAmount(amounts.plainAmount(value)), true, String(value));
      assert.equal(amounts.amountOf(amounts.plainAmount(value)), value, String(value));
    }
    assert.equal(amounts.plainAmount(-1e-7), '-0.0000001');
    // A tiny amount scaled keeps three figures, written plainly too.
    assert.equal(amounts.formatScaled(4.99999995e-7), '0.0000005');
    assert.equal(amounts.formatScaled(7.000011), '7.00001');
    assert.equal(amounts.formatAmount(12.5, 3), '12.5');
  });

  test('scales to percent, parts colorants and all; a percent colorant stays as it is', () => {
    assert.deepEqual(amounts.rebase(['3', '2', '5'], [{ amount: '1', unit: 'parts' }], { to: 'percent' }), {
      materials: ['30', '20', '50'],
      additives: ['10']
    });
    assert.deepEqual(amounts.rebase(['60', '40'], [{ amount: '2' }], { to: 'percent' }).additives, ['2']);
    // A blank or unreadable amount is left as it is.
    assert.deepEqual(amounts.rebase(['50', '', '12,5'], [], { to: 'percent' }).materials, ['100', '', '12,5']);
  });

  test('scales to small whole parts where they fit, and exact values for the rest', () => {
    assert.deepEqual(amounts.rebase(['30', '20'], [], { to: 'parts' }).materials, ['3', '2']);
    assert.deepEqual(amounts.rebase(['33.33', '66.67'], [], { to: 'parts' }).materials, ['1', '2']);
    const factor = amounts.wholePartsFactor([30, 20, 14.77]);
    assert.equal(Math.round(30 * factor), 3);
    assert.equal(amounts.wholePartsFactor([]), 1);
  });

  test('scales to a batch, and has nothing to scale from without amounts or a weight', () => {
    assert.deepEqual(amounts.rebase(['60', '40'], [{ amount: '1', unit: 'grams' }], { to: 'batch', weight: 500 }), {
      materials: ['300', '200'],
      additives: ['5']
    });
    assert.equal(amounts.rebase(['', '0'], [], { to: 'percent' }), null);
    assert.equal(amounts.rebase(['1'], [], { to: 'batch', weight: 0 }), null);
    assert.equal(amounts.rebase(['1'], [], { to: 'batch' }), null);
  });

  test('weighs a batch: a percent colorant is of the base, one in parts or grams scales with it', () => {
    assert.deepEqual(amounts.batchWeights(['60', '40'], [{ amount: '2' }], 500), {
      materials: [300, 200],
      additives: [10],
      base: 500,
      total: 510
    });
    assert.deepEqual(amounts.batchWeights(['6', '4'], [{ amount: '1', unit: 'parts' }], 1000).additives, [100]);
    assert.equal(amounts.batchWeights([''], [], 500), null);
    assert.equal(amounts.batchWeights(['1'], [], 0), null);
  });
});

describe('cost', () => {
  const recipe = {
    materials: [
      { key: 'potash', amount: '60' },
      { key: 'whiting', amount: '40' },
      { key: 'blank', amount: '' }
    ],
    additives: [{ key: 'cobalt', amount: '2', unit: 'percent' }]
  };
  const prices = [
    { key: 'potash', perKg: 2 },
    { key: 'whiting', perKg: 0.5 },
    { key: 'cobalt', perKg: 80 }
  ];

  test('costs a batch from the prices, per kilogram too', () => {
    // 600 g at 2 a kg, 400 g at 0.5, and 20 g of cobalt at 80: 1.2 + 0.2 + 1.6.
    const all = cost.recipeCost(recipe, 1000, prices);
    near(all.cost, 3, 1e-9);
    near(all.grams, 1020, 1e-9);
    near(all.perKg, (3 / 1020) * 1000, 1e-9);
    assert.equal(all.complete, true);
    assert.deepEqual(all.missing, []);
    // A line that weighs nothing needs no price.
    assert.deepEqual(all.lines[2], { key: 'blank', grams: 0, perKg: null, cost: 0 });
    const twice = cost.recipeCost(recipe, 2000, prices);
    near(twice.cost, 6, 1e-9);
    near(twice.perKg, all.perKg, 1e-9);
    assert.equal(cost.GRAMS_PER_KG, 1000);
  });

  test('names a line with no price rather than guessing, and gives no cost per kilogram', () => {
    const some = cost.recipeCost(
      recipe,
      1000,
      new Map([
        ['potash', 2],
        ['whiting', 0.5]
      ])
    );
    near(some.cost, 1.4, 1e-9);
    assert.equal(some.complete, false);
    assert.equal(some.perKg, null);
    assert.deepEqual(some.missing, ['cobalt']);
    assert.equal(some.lines[3].cost, null);
  });

  test('counts a price that is not one as none; 0 is a price', () => {
    const odd = cost.batchCost(
      [
        { key: 'a', grams: 500 },
        { key: 'b', grams: 500 },
        { key: 'a', grams: 100 }
      ],
      [
        { key: 'a', perKg: -1 },
        { key: 'b', perKg: 0 },
        { key: 7, perKg: 1 }
      ]
    );
    assert.deepEqual(odd.missing, ['a']);
    assert.equal(odd.cost, 0);
    assert.equal(cost.isPrice(0), true);
    assert.equal(
      [NaN, Infinity, -0.01, '3', null].some((value) => cost.isPrice(value)),
      false
    );
    assert.deepEqual(cost.batchCost([], undefined), {
      cost: 0,
      grams: 0,
      perKg: null,
      complete: true,
      missing: [],
      lines: []
    });
  });

  test('has nothing to cost without amounts or a batch size', () => {
    assert.equal(cost.recipeCost({ materials: [{ key: 'a', amount: '' }] }, 1000, prices), null);
    assert.equal(cost.recipeCost(recipe, 0, prices), null);
    assert.equal(cost.recipeCost({}, 1000, prices), null);
  });
});

describe('slurry', () => {
  test('works out dry glaze and water by Brongniart’s formula', () => {
    near(slurry.dryPerLitre(1.5, 2.5), 0.8333, 1e-4);
    const contents = slurry.slurryContents(10, 1.5, 2.5);
    near(contents.glaze, 8.333, 1e-3);
    near(contents.water, 6.667, 1e-3);
    assert.deepEqual(slurry.batchForVolume(10, 1.5, 2.5), contents);
  });

  test('gives the water to reach an SG, whatever the materials, and water to pour off as negative', () => {
    near(slurry.waterToReach(10, 1.5, 1.45, 2.5), 1.111, 1e-3);
    near(slurry.waterToReach(10, 1.5, 1.45, 2.6), 1.111, 1e-3);
    near(slurry.waterToReach(10, 1.5, 1.45, null), 1.111, 1e-3);
    near(slurry.waterToReach(10, 2.7, 1.45, null), 27.778, 1e-3);
    const off = slurry.waterToReach(10, 1.4, 1.5, 2.5);
    near(off, -2, 1e-9);
    near(slurry.slurryContents(10 + off, 1.5, 2.5).glaze, slurry.slurryContents(10, 1.4, 2.5).glaze, 1e-9);
  });

  test('is at the SG wanted already under half a gram of water a litre, and under a litre half a gram', () => {
    assert.equal(slurry.reachedAlready(slurry.waterToReach(100, 1.4502, 1.45, null), 100), true);
    assert.equal(slurry.reachedAlready(slurry.waterToReach(1, 1.452, 1.45, null), 1), false);
    assert.deepEqual(
      [0.0049, -0.0049, 0.005, -0.005].map((water) => slurry.reachedAlready(water, 10)),
      [true, true, false, false]
    );
    for (const litres of [0.1, 0.5, 1]) {
      assert.deepEqual(
        [0.00049, -0.00049, 0.0005, -0.0005].map((water) => slurry.reachedAlready(water, litres)),
        [true, true, false, false]
      );
    }
  });

  test('mixes a batch at a target SG, and back again', () => {
    const batch = slurry.waterForBatch(5, 1.45, 2.5);
    near(slurry.slurryContents(batch.litres, 1.45, 2.5).glaze, 5, 1e-9);
    near(batch.water, batch.litres * 1.45 - 5, 1e-9);
    assert.equal(slurry.waterForBatch(0, 1.45, 2.5), null);
    assert.equal(slurry.waterForBatch(5, 1, 2.5), null);
  });

  test('takes no water, a slurry heavier than its materials, no volume or no dry SG', () => {
    assert.equal(slurry.dryPerLitre(1, 2.5), null);
    assert.equal(slurry.dryPerLitre(2.6, 2.5), null);
    assert.equal(slurry.dryPerLitre(1.5), null);
    assert.equal(slurry.dryPerLitre(1.5, 1), null);
    assert.equal(slurry.slurryContents(0, 1.5, 2.5), null);
    assert.equal(slurry.waterToReach(10, 1.5, 0.9, 2.5), null);
    assert.equal(slurry.waterToReach(10, 1.5, 1, null), null);
    assert.equal(slurry.waterToReach(0, 1.5, 1.45, null), null);
    assert.equal(slurry.waterToReach(10, 2.7, 1.45, 2.5), null);
  });

  test('reads densities as potters do: Baumé, a pint’s ounces, gallons', () => {
    near(slurry.sgFromBaume(slurry.baumeFromSg(1.45)), 1.45, 1e-12);
    assert.equal(slurry.sgFromPint(29), 1.45);
    assert.equal(slurry.pintFromSg(1.5), 30);
    near(slurry.LITRES.usGallon, 3.785, 1e-3);
    near(slurry.LITRES.imperialGallon, 8 * slurry.LITRES.imperialPint, 1e-9);
    assert.deepEqual(slurry.SG_TARGET_RANGE, { min: 1, max: 2.5 });
  });
});

describe('messages', () => {
  test('says every code once', () => {
    assert.equal(new Set(messages.CODES).size, messages.CODES.length);
    assert.ok(Object.isFrozen(messages.CODES));
    for (const code of messages.CODES) assert.match(code, /^[a-zA-Z]+(\.[a-zA-Z]+)+$/, code);
  });

  test('a message is a code, with values only where it has them', () => {
    assert.deepEqual(messages.say('checks.alkali'), { code: 'checks.alkali' });
    assert.deepEqual(messages.say('checks.alkali', { alkali: 1 }), { code: 'checks.alkali', params: { alkali: 1 } });
  });

  test('writes a figure with its decimals, or up to them', () => {
    assert.deepEqual(messages.figure(0.3, 2), { value: 0.3, places: 2 });
    assert.deepEqual(messages.upTo(12.5, 3), { value: 12.5, places: 3, upTo: true });
    assert.deepEqual(messages.plainFigure('12.50'), { value: 12.5, places: 2 });
    assert.deepEqual(messages.plainFigure(' 7 '), { value: 7, places: 0 });
    assert.equal(messages.plainFigure('a lot'), 'a lot');
    assert.equal(messages.plainFigure(undefined), '');
  });

  test('a RecipeError is its code, with its values', () => {
    const error = thrown(() => {
      throw new messages.RecipeError('solve.noFlux', { of: 'recipe' });
    });
    assert.ok(error instanceof Error);
    assert.equal(error.name, 'RecipeError');
    assert.equal(error.message, 'solve.noFlux');
    assert.equal(error.code, 'solve.noFlux');
    assert.deepEqual(error.params, { of: 'recipe' });
    assert.equal('params' in new messages.RecipeError('shelf.empty'), false);
  });
});
