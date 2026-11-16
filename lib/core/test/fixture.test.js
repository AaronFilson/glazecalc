// The standard records the core's tests use (standard.json): nameless, by id, and each one the core can read.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prepareMaterial } from '../chemistry/materials.js';
import { MATERIALS, ADDITIVES } from './support.js';

test('every record has a unique id and no name', () => {
  const all = [...MATERIALS, ...ADDITIVES];
  assert.ok(MATERIALS.length > 100);
  assert.equal(new Set(all.map((record) => record.id)).size, all.length);
  for (const record of all) {
    assert.match(record.id, /^[0-9a-f-]{36}$/);
    for (const key of ['name', 'aliases', 'notes', 'hazards']) assert.equal(record[key], undefined, key);
  }
});

test('every substitute is a standard record', () => {
  const ids = new Set([...MATERIALS, ...ADDITIVES].map((record) => record.id));
  for (const record of [...MATERIALS, ...ADDITIVES])
    for (const id of record.substitutes ?? []) assert.ok(ids.has(id), `${record.id} names ${id}`);
});

test('the core reads every standard material without a problem', () => {
  for (const material of MATERIALS) {
    const prepared = prepareMaterial(material);
    // Per raw gram: the oxides and the loss on ignition add up to about 100 (a measured analysis rarely exactly).
    const total = Object.values(prepared.analysis).reduce((sum, percent) => sum + percent, 0) + prepared.loi;
    assert.ok(total > 97 && total < 102, `${material.id} adds up to ${total}`);
  }
});
