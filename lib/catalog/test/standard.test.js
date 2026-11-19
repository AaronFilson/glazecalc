// The catalog's standard records (lib/catalog/standard.ts): the materials and additives every installation
// starts with, read with no database.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { STANDARD_COLLECTIONS, readRecords, standardFile } from '../standard.ts';

const text = (collection) => readFileSync(new URL('../' + standardFile(collection), import.meta.url), 'utf8');

describe('the standard records', () => {
  test('are the materials and additives, each a file beside the reader', () => {
    assert.deepEqual(STANDARD_COLLECTIONS, ['materials', 'additives']);
    assert.ok(Object.isFrozen(STANDARD_COLLECTIONS));
    assert.equal(standardFile('materials'), 'data/materials.ndjson');
    const materials = readRecords(text('materials'));
    const additives = readRecords(text('additives'));
    assert.ok(materials.length > 150 && additives.length > 30);
    // Each has a name and a uuid, and its id as a hex string.
    for (const record of [...materials, ...additives]) {
      assert.equal(typeof record.name, 'string');
      assert.equal(typeof record.uuid, 'string');
      assert.match(record._id, /^[0-9a-f]{24}$/);
    }
  });

  test("read each { $oid } as the host's id, and nothing else", () => {
    const lines =
      '{"_id":{"$oid":"aa"},"ref":{"$oid":"bb","x":1},"n":{"$oid":2},"z":null}\r\n\n{"_id":{"$oid":"cc"}}\n';
    assert.deepEqual(readRecords(lines), [
      { _id: 'aa', ref: { $oid: 'bb', x: 1 }, n: { $oid: 2 }, z: null },
      { _id: 'cc' }
    ]);
    assert.deepEqual(
      readRecords(lines, (hex) => ({ id: hex })).map((r) => r._id),
      [{ id: 'aa' }, { id: 'cc' }]
    );
    assert.deepEqual(readRecords(''), []);
  });
});
