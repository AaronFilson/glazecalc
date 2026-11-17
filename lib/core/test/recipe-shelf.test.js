// Matching a recipe with the materials on hand (lib/core/recipe/shelf.js), by id: the changes, cautions
// and what it cannot do, as codes.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { matchFromShelf } from '../recipe/shelf.ts';
import { amountOf } from '../recipe/amounts.ts';
import { IDS, GLOSSY, linesOf, record, thrown } from './support.js';

const shelf = (ids) => ids.map((id) => ({ material: record(id) }));
const amounts = (result) => result.materials.map((m) => [m.id, m.amount]);
const total = (result) => result.materials.reduce((sum, m) => sum + amountOf(m.amount), 0);

describe('matchFromShelf', () => {
  test('gives the recipe back as it was when everything it uses is on the shelf', () => {
    const result = matchFromShelf(linesOf(GLOSSY), shelf([IDS.custer, IDS.whiting, IDS.epk, IDS.silica]));
    assert.deepEqual(
      amounts(result),
      GLOSSY.map(([id, amount]) => [id, String(amount)])
    );
    assert.deepEqual(result.changes, []);
    assert.deepEqual(result.cautions, []);
    assert.ok(result.report);
  });

  test('makes it again without the clay, on the old batch’s total, saying what changed by id', () => {
    const result = matchFromShelf(
      linesOf(GLOSSY),
      shelf([IDS.custer, IDS.whiting, IDS.talc, IDS.silica, IDS.frit3134])
    );
    assert.ok(!result.materials.some((m) => m.id === IDS.epk));
    assert.ok(Math.abs(total(result) - 100) < 1e-6, String(total(result)));
    for (const change of result.changes) assert.equal(change.code, 'pool.changed');
    const kaolin = result.changes.find((c) => c.params.name === IDS.epk);
    assert.deepEqual(kaolin.params.to, { value: 0, places: 0, upTo: true });
    assert.equal(kaolin.params.from.value, 20);
    // Without its clay, the glaze has none to keep it in suspension.
    assert.ok(result.cautions.some((c) => c.check === 'clay-low'));
  });

  test('leaves out a material to avoid', () => {
    const result = matchFromShelf(linesOf(GLOSSY), shelf([IDS.custer, IDS.whiting, IDS.epk, IDS.silica, IDS.talc]), {
      avoid: [IDS.epk]
    });
    assert.ok(!result.materials.some((m) => m.id === IDS.epk));
  });

  test('says what it cannot do, as codes', () => {
    assert.equal(thrown(() => matchFromShelf(linesOf(GLOSSY), [])).code, 'shelf.empty');
    const noFlux = thrown(() => matchFromShelf(linesOf([[IDS.silica, 100]]), shelf([IDS.silica])));
    assert.equal(noFlux.code, 'solve.noFlux');
    assert.deepEqual(noFlux.params, { of: 'recipe' });
    const offered = thrown(() => matchFromShelf(linesOf(GLOSSY), shelf([IDS.silica])));
    assert.equal(offered.code, 'solve.noFlux');
    assert.deepEqual(offered.params, { of: 'offered' });
  });
});
