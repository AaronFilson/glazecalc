// The catalog's readers (lib/catalog/readers.ts, traits.ts, density-names.ts, same-key.ts, ids.ts): how the
// core reads Glazecalc's records.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { READERS, idOf, labelOf } from '../readers.ts';
import { traitsOf, traitsFromName } from '../traits.ts';
import { BY_NAME, REASON_OF_NAME, densityOf } from '../density-names.ts';
import { sameKey } from '../same-key.ts';
import { byName, idsNamed } from '../ids.ts';

describe('the readers', () => {
  test('know a record by its UUID, else its name, and call it by its name', () => {
    assert.ok(Object.isFrozen(READERS));
    assert.deepEqual(Object.keys(READERS), ['idOf', 'labelOf', 'keyOf', 'traitsOf']);
    assert.equal(idOf({ uuid: 'abc', name: 'Silica' }), 'uuid:abc');
    assert.equal(idOf({ uuid: '', name: 'Silica' }), 'Silica');
    assert.equal(labelOf({ uuid: 'abc', name: 'Silica' }), 'Silica');
    assert.equal(READERS.keyOf, sameKey);
  });

  test('read a standard record’s own traits, and any other’s from its name, once while its name stays', () => {
    const own = { theoretical: true };
    assert.equal(traitsOf({ ownedBy: 'Standard', name: 'Silica', traits: own }), own);
    const potters = { name: 'Calcined Kaolin', ownedBy: 'me' };
    const traits = traitsOf(potters);
    assert.equal(traits.calcined, true);
    assert.equal(traits.kaolin, true);
    assert.equal(traitsFromName(potters), traits);
    potters.name = 'Whiting';
    assert.equal(traitsFromName(potters).rawCalcium, true);
    assert.equal(traitsFromName(undefined).theoretical, false);
    assert.equal(traitsFromName({ name: 'Kaolin (theoretical)' }).theoretical, true);
  });

  test('know a standard material’s mineral by its name, and why some have none', () => {
    assert.ok(Object.isFrozen(BY_NAME) && Object.isFrozen(REASON_OF_NAME));
    assert.deepEqual(densityOf({ name: 'Whiting', ownedBy: 'Standard' }), { mineral: 'calcite', reason: undefined });
    assert.deepEqual(densityOf({ name: ' Molochite ', ownedBy: 'Standard' }), {
      mineral: null,
      reason: 'crystal-form-unknown'
    });
    assert.equal(densityOf({ name: 'Whiting', ownedBy: 'me' }), undefined);
    assert.equal(densityOf({ name: 'toString', ownedBy: 'Standard' }), undefined);
    assert.equal(densityOf(null), undefined);
    for (const name of Object.keys(REASON_OF_NAME)) assert.equal(BY_NAME[name], null, name);
  });

  test('key a line by its saved id, else its name and chemistry', () => {
    assert.equal(sameKey({ _id: 'x1', name: 'Silica' }), 'id:x1');
    const line = { name: ' SILICA ', fields: [{ name: 'SiO2', amount: 100 }] };
    assert.equal(sameKey(line), sameKey({ name: 'silica', fields: [{ name: 'SiO2', amount: '100' }] }));
    assert.notEqual(sameKey(line), sameKey({ name: 'silica', fields: [{ name: 'SiO2', amount: 99 }] }));
    assert.equal(sameKey({ name: 'Silica' }), 'name:silica[[],"",""]');
  });

  test('turn names into ids: of records in play, else found, else the name itself', () => {
    const host = { idOf: (record) => 'id:' + record.name };
    const records = [{ name: 'Silica' }, null, { name: 'Silica' }];
    const find = (name) => (name === 'Talc' ? { name: 'Talc' } : null);
    assert.deepEqual(idsNamed(host, ['Silica', 'Talc', 'Gone'], records, find), [
      'id:Silica',
      'id:Silica',
      'id:Talc',
      'Gone'
    ]);
    assert.deepEqual(idsNamed(host, ['Talc'], records), ['Talc']);
    assert.equal(idsNamed(host, undefined, records), undefined);
    const lookup = byName((name) => name);
    assert.equal(lookup('Silica'), 'Silica');
    assert.equal(lookup({ name: 'Talc' }), 'Talc');
    assert.equal(lookup(null), undefined);
    assert.equal(byName(undefined), undefined);
  });
});
