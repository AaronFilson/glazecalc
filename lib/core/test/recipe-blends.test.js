// Blends for test tiles (lib/core/recipe/blends.js): line, biaxial and triaxial tiles, each tile's recipe
// mixed from the corners by id, and one material varied across a range.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { BLEND_CORNERS, BLEND_STEPS, blendTiles, mixRecipes, varyMaterial } from '../recipe/blends.ts';
import { HOST, IDS, linesOf } from './support.js';

const sum = (values) => values.reduce((a, b) => a + b, 0);
const round = (value) => Math.round(value * 1e6) / 1e6;
/** A line by id, with its amount as saved. */
const line = (id, amount, extra = {}) => ({ id, amount, ...extra });
const ids = (mixed) => mixed.map((m) => [m.line.id, round(m.amount)]);

describe('blend tiles', () => {
  test('a line blend runs from all A to all B in even steps', () => {
    const blend = blendTiles('line', 5);
    assert.equal(blend.corners, 2);
    assert.equal(blend.rows, 1);
    assert.equal(blend.kind, 'line');
    assert.equal(blend.steps, 5);
    assert.deepEqual(
      blend.tiles.map((t) => t.shares),
      [
        [1, 0],
        [0.75, 0.25],
        [0.5, 0.5],
        [0.25, 0.75],
        [0, 1]
      ]
    );
    assert.deepEqual(
      blend.tiles.map((t) => [t.number, t.row, t.col]),
      [
        [1, 0, 0],
        [2, 0, 1],
        [3, 0, 2],
        [4, 0, 3],
        [5, 0, 4]
      ]
    );
  });

  test('rounds shares that come out a hair off', () => {
    assert.deepEqual(
      blendTiles('line', 11).tiles.map((t) => t.shares[1]),
      [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]
    );
  });

  test('a biaxial blend is a square grid with a corner recipe at each corner', () => {
    const blend = blendTiles('biaxial', 3);
    assert.equal(blend.tiles.length, 9);
    assert.equal(blend.corners, 4);
    assert.equal(blend.rows, 3);
    const at = (row, col) => blend.tiles.find((t) => t.row === row && t.col === col);
    assert.deepEqual(at(0, 0).shares, [1, 0, 0, 0]);
    assert.deepEqual(at(0, 2).shares, [0, 1, 0, 0]);
    assert.deepEqual(at(2, 0).shares, [0, 0, 1, 0]);
    assert.deepEqual(at(2, 2).shares, [0, 0, 0, 1]);
    assert.deepEqual(at(1, 1).shares, [0.25, 0.25, 0.25, 0.25]);
    assert.deepEqual(at(0, 1).shares, [0.5, 0.5, 0, 0]);
    assert.equal(at(1, 2).number, 6);
  });

  test('a triaxial blend is a triangle: A at the top, B bottom left, C bottom right', () => {
    assert.deepEqual(
      blendTiles('triaxial', 3).tiles.map((t) => [t.number, t.row, t.col, t.shares]),
      [
        [1, 0, 0, [1, 0, 0]],
        [2, 1, 0, [0.5, 0.5, 0]],
        [3, 1, 1, [0.5, 0, 0.5]],
        [4, 2, 0, [0, 1, 0]],
        [5, 2, 1, [0, 0.5, 0.5]],
        [6, 2, 2, [0, 0, 1]]
      ]
    );
  });

  test('every tile’s shares add up to 1, and a triaxial blend of n rows has n(n+1)/2 tiles', () => {
    for (const kind of ['line', 'biaxial', 'triaxial']) {
      const { min, max } = BLEND_STEPS[kind];
      for (let steps = min; steps <= max; steps++) {
        const blend = blendTiles(kind, steps);
        for (const tile of blend.tiles) assert.equal(round(sum(tile.shares)), 1, `${kind} ${steps}`);
        const count = kind === 'line' ? steps : kind === 'biaxial' ? steps * steps : (steps * (steps + 1)) / 2;
        assert.equal(blend.tiles.length, count);
        assert.deepEqual(
          blend.tiles.map((t) => t.number),
          blend.tiles.map((_, i) => i + 1)
        );
        assert.equal(blend.corners, BLEND_CORNERS[kind]);
      }
    }
    assert.equal(blendTiles('triaxial', 11).tiles.length, 66);
  });

  test('refuses steps out of range and unknown kinds', () => {
    assert.equal(blendTiles('line', 1), null);
    assert.equal(blendTiles('line', 22), null);
    assert.equal(blendTiles('biaxial', 9), null);
    assert.equal(blendTiles('triaxial', 2.5), null);
    assert.equal(blendTiles('square', 3), null);
  });
});

describe('mixing the corners', () => {
  const RED_IRON = 'red-iron';
  const RUTILE = 'rutile';
  const celadon = {
    materials: [line(IDS.custer, '40'), line(IDS.whiting, '20'), line(IDS.silica, '40')],
    additives: [line(RED_IRON, '2', { unit: 'percent' })]
  };
  // In grams, not percent: 500 g of base.
  const matte = {
    materials: [line(IDS.custer, '250'), line(IDS.talc, '100'), line(IDS.epk, '150')],
    additives: [line(RUTILE, '20', { unit: 'grams' })]
  };

  test('mixes two recipes as percents of their bases, whatever scale each is in', () => {
    const mixed = mixRecipes(HOST, [celadon, matte], [0.5, 0.5]);
    assert.deepEqual(ids(mixed.materials), [
      [IDS.custer, 45],
      [IDS.whiting, 10],
      [IDS.silica, 20],
      [IDS.talc, 10],
      [IDS.epk, 15]
    ]);
    assert.equal(round(sum(mixed.materials.map((m) => m.amount))), 100);
    // 2% of one, and 20 g on a 500 g base (4%) of the other.
    assert.deepEqual(ids(mixed.additives), [
      [RED_IRON, 1],
      [RUTILE, 2]
    ]);
  });

  test('gives a corner tile its corner’s recipe, in percent, leaving out what it does not have', () => {
    const mixed = mixRecipes(HOST, [celadon, matte], [0, 1]);
    assert.deepEqual(ids(mixed.materials), [
      [IDS.custer, 50],
      [IDS.talc, 20],
      [IDS.epk, 30]
    ]);
    assert.deepEqual(ids(mixed.additives), [[RUTILE, 4]]);
  });

  test('treats a colorant in parts as parts of the base, and one saved before units as a percent', () => {
    const parts = {
      materials: [line(IDS.custer, '5'), line(IDS.silica, '5')],
      additives: [line('co', '0.1', { unit: 'parts' })]
    };
    assert.equal(round(mixRecipes(HOST, [parts], [1]).additives[0].amount), 1);
    const old = { materials: [line(IDS.custer, '50'), line(IDS.silica, '50')], additives: [line('cu', '3')] };
    assert.equal(round(mixRecipes(HOST, [old], [1]).additives[0].amount), 3);
  });

  test('counts the same standard record in two corners as one line', () => {
    const a = { materials: linesOf([[IDS.silica, 100]]) };
    const b = {
      materials: linesOf([
        [IDS.silica, 50],
        [IDS.whiting, 50]
      ])
    };
    const mixed = mixRecipes(HOST, [a, b], [0.5, 0.5]);
    assert.deepEqual(ids(mixed.materials), [
      [IDS.silica, 75],
      [IDS.whiting, 25]
    ]);
  });

  test('keeps two analyses under one id as two lines, each with its own chemistry', () => {
    const ash = (fields) => ({
      id: 'wood-ash',
      amount: '40',
      percentmole: 'percent',
      loi: 0,
      fields: fields.map(([name, amount]) => ({ name, amount }))
    });
    const ashA = ash([
      ['CaO', '60'],
      ['SiO2', '20'],
      ['K2O', '20']
    ]);
    const ashB = ash([
      ['SiO2', '70'],
      ['K2O', '25'],
      ['CaO', '5']
    ]);
    const a = { materials: [ashA, line(IDS.silica, '60')] };
    const b = { materials: [ashB, line(IDS.silica, '60')] };
    // All B is recipe B, its own ash and not A's; A, with no share, has no say in it.
    const allB = mixRecipes(HOST, [a, b], [0, 1]);
    assert.deepEqual(
      allB.materials.map((m) => [m.line, round(m.amount)]),
      [
        [ashB, 40],
        [b.materials[1], 60]
      ]
    );
    // Half and half: both ashes, the silica they share as one line.
    const half = mixRecipes(HOST, [a, b], [0.5, 0.5]);
    assert.deepEqual(
      half.materials.map((m) => [m.line, round(m.amount)]),
      [
        [ashA, 20],
        [a.materials[1], 60],
        [ashB, 20]
      ]
    );
    // The same analysis, written in another order, is the same material.
    const same = { materials: [{ ...ashA, fields: [...ashA.fields].reverse() }, line(IDS.silica, '60')] };
    assert.equal(mixRecipes(HOST, [a, same], [0.5, 0.5]).materials.length, 2);
  });

  test('mixes four corners of a biaxial tile and three of a triaxial', () => {
    const only = (id) => ({ materials: [line(id, '10')] });
    const corners = [only('A'), only('B'), only('C'), only('D')];
    const tile = blendTiles('biaxial', 3).tiles[4];
    assert.deepEqual(
      mixRecipes(HOST, corners, tile.shares).materials.map((m) => round(m.amount)),
      [25, 25, 25, 25]
    );
    const tri = blendTiles('triaxial', 5).tiles[7];
    const mixed = mixRecipes(HOST, corners.slice(0, 3), tri.shares);
    assert.equal(round(sum(mixed.materials.map((m) => m.amount))), 100);
  });

  test('returns null when a corner with a share has no base, and ignores an empty one with none', () => {
    const empty = { materials: [line(IDS.silica, '')] };
    assert.equal(mixRecipes(HOST, [celadon, empty], [0.5, 0.5]), null);
    assert.notEqual(mixRecipes(HOST, [celadon, empty], [1, 0]), null);
    assert.deepEqual(mixRecipes(HOST, [celadon, {}], [1]).additives.length, 1);
  });
});

describe('varying one material', () => {
  const base = [
    { id: 'a', amount: 40 },
    { id: 'b', amount: 60 }
  ];

  test('adds a material on top, its own line at the end, the total growing', () => {
    const { tiles } = varyMaterial(base, 'c', [0, 5, 10], 'add');
    assert.deepEqual(
      tiles.map((t) => t.lines),
      [
        [
          { id: 'a', amount: 40 },
          { id: 'b', amount: 60 }
        ],
        [
          { id: 'a', amount: 40 },
          { id: 'b', amount: 60 },
          { id: 'c', amount: 5 }
        ],
        [
          { id: 'a', amount: 40 },
          { id: 'b', amount: 60 },
          { id: 'c', amount: 10 }
        ]
      ]
    );
    assert.deepEqual(
      tiles.map((t) => t.amount),
      [0, 5, 10]
    );
    // A material the base has gets the amount on its own line.
    assert.deepEqual(varyMaterial(base, 'a', [5], 'add').tiles[0].lines, [
      { id: 'a', amount: 45 },
      { id: 'b', amount: 60 }
    ]);
    // The base is not changed.
    assert.deepEqual(base, [
      { id: 'a', amount: 40 },
      { id: 'b', amount: 60 }
    ]);
  });

  test('replaces as much of another line, the total staying the same, and says when it is too much', () => {
    const { tiles } = varyMaterial(base, 'c', [10, 40], 'replace', 'a');
    assert.deepEqual(tiles[0].lines, [
      { id: 'a', amount: 30 },
      { id: 'b', amount: 60 },
      { id: 'c', amount: 10 }
    ]);
    // All of a taken: it is left out.
    assert.deepEqual(tiles[1].lines, [
      { id: 'b', amount: 60 },
      { id: 'c', amount: 40 }
    ]);
    assert.deepEqual(varyMaterial(base, 'c', [10, 41, 50], 'replace', 'a'), { tooMuch: 41 });
    assert.deepEqual(varyMaterial(base, 'c', [1], 'replace', 'missing'), { tooMuch: 1 });
  });
});
