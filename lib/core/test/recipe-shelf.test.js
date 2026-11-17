// Matching a recipe with the materials on hand (lib/core/recipe/shelf.js), by id: the changes, cautions
// and what it cannot do, as codes.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { matchFromShelf } from '../recipe/shelf.ts';
import { amountOf } from '../recipe/amounts.ts';
import { HOST, IDS, GLOSSY, linesOf, record, thrown } from './support.js';

// Standard records not in support.js's IDS, by their uuid in data/materials.ndjson and data/additives.ndjson.
const NYAD = 'a4955e9d-e8f3-4fe8-bfde-478cdaad34b6'; // Wollastonite (NYAD 400)
const MAGNESIUM_CARBONATE = 'fd3e3df2-6cb5-4a2a-b1df-0019abd77ba3'; // Magnesium Carbonate (magnesite)
const TIN_OXIDE = 'b0233775-bb31-4584-bda2-5e8e3eaf5e3a'; // Tin oxide
const FLINT = '62eaa6d6-1827-46ef-bd5e-7326ee27653f'; // Flint

const shelf = (ids) => ids.map((id) => ({ material: record(id) }));
const amounts = (result) => result.materials.map((m) => [m.id, m.amount]);
const total = (result) => result.materials.reduce((sum, m) => sum + amountOf(m.amount), 0);

describe('matchFromShelf', () => {
  test('gives the recipe back as it was when everything it uses is on the shelf', () => {
    const result = matchFromShelf(HOST, linesOf(GLOSSY), shelf([IDS.custer, IDS.whiting, IDS.epk, IDS.silica]));
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
      HOST,
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

  test('adds the amounts up to the old batch as shown, a material brought in taking the rounding where it went over', () => {
    // Flint for the silica: the amounts scaled to the old 100 round to 100.1, and the flint's furthest up.
    const result = matchFromShelf(HOST, linesOf(GLOSSY), shelf([IDS.custer, IDS.whiting, IDS.epk, FLINT]));
    assert.deepEqual(amounts(result), [
      [IDS.custer, '40.3'],
      [IDS.whiting, '20.2'],
      [IDS.epk, '20.2'],
      [FLINT, '19.3']
    ]);
  });

  test('leaves out a material to avoid', () => {
    const result = matchFromShelf(
      HOST,
      linesOf(GLOSSY),
      shelf([IDS.custer, IDS.whiting, IDS.epk, IDS.silica, IDS.talc]),
      {
        avoid: [IDS.epk]
      }
    );
    assert.ok(!result.materials.some((m) => m.id === IDS.epk));
  });

  test('says what it cannot do, as codes', () => {
    assert.equal(thrown(() => matchFromShelf(HOST, linesOf(GLOSSY), [])).code, 'shelf.empty');
    const noFlux = thrown(() => matchFromShelf(HOST, linesOf([[IDS.silica, 100]]), shelf([IDS.silica])));
    assert.equal(noFlux.code, 'solve.noFlux');
    assert.deepEqual(noFlux.params, { of: 'recipe' });
    const offered = thrown(() => matchFromShelf(HOST, linesOf(GLOSSY), shelf([IDS.silica])));
    assert.equal(offered.code, 'solve.noFlux');
    assert.deepEqual(offered.params, { of: 'offered' });
    // Nothing on the shelf has any of the recipe's oxides.
    assert.equal(thrown(() => matchFromShelf(HOST, linesOf(GLOSSY), shelf([TIN_OXIDE]))).code, 'solve.noMatch');
  });

  test('passes on what the chemistry says of a material on the shelf that it cannot read', () => {
    const typo = { id: 'typo', percentmole: 'molecular', loi: 0, fields: [{ name: 'Xx2O', amount: 1 }] };
    const error = thrown(() =>
      matchFromShelf(HOST, linesOf(GLOSSY), [...shelf([IDS.custer, IDS.whiting]), { material: typo }])
    );
    assert.deepEqual([error.code, error.params], ['unknown-oxide', { oxide: 'Xx2O', material: 'typo' }]);
  });

  test('brings a material in at 1% of the batch or more, where the new batch weighs more than the old', () => {
    // Wollastonite made again from whiting and silica weighs more: magnesium carbonate, for the talc, comes in
    // at its least, 1% of the old batch, and that is under 1% of the new one.
    const recipe = linesOf([
      [NYAD, 25],
      [IDS.custer, 35],
      [IDS.epk, 20],
      [IDS.silica, 19],
      [IDS.talc, 1]
    ]);
    const result = matchFromShelf(
      HOST,
      recipe,
      shelf([IDS.custer, IDS.epk, IDS.silica, IDS.whiting, MAGNESIUM_CARBONATE])
    );
    const added = result.changes.filter((c) => c.code === 'pool.added').map((c) => c.params.name);
    assert.deepEqual(added.sort(), [IDS.whiting, MAGNESIUM_CARBONATE].sort());
    for (const id of added) assert.ok(amountOf(result.materials.find((m) => m.id === id).amount) >= 1, id);
    assert.ok(Math.abs(total(result) - 100) < 1e-6, String(total(result)));
  });
});
