// The catalog's names (lib/catalog/names.ts): the formula materials, the generic words and the name key.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { FORMULA_MATERIALS, GENERIC_NAMES, nameKey } from '../names.ts';

describe('the names', () => {
  test('are frozen through', () => {
    assert.ok(Object.isFrozen(FORMULA_MATERIALS) && FORMULA_MATERIALS.every(Object.isFrozen));
    assert.ok(Object.isFrozen(FORMULA_MATERIALS[0].formula) && Object.isFrozen(FORMULA_MATERIALS[0].aliases));
    assert.ok(Object.isFrozen(GENERIC_NAMES) && GENERIC_NAMES.every((g) => Object.isFrozen(g.words)));
  });

  test('give each formula material one name, and every generic word something to offer', () => {
    const names = FORMULA_MATERIALS.flatMap((m) => [m.name, ...(m.aliases ?? [])]).map(nameKey);
    assert.equal(new Set(names).size, names.length);
    for (const generic of GENERIC_NAMES) assert.ok(generic.offer.length > 0, generic.words[0]);
  });

  test('key a name without case, marks or punctuation, keeping the letters of any script', () => {
    assert.equal(nameKey('Silica.'), nameKey('SILICA'));
    assert.equal(nameKey('Feldspáth'), 'feldspath');
    assert.equal(nameKey('釜戸長石'), '釜戸長石');
    assert.equal(nameKey('Улексит'), 'улексит');
    assert.equal(nameKey(' - '), '');
    assert.equal(nameKey(42), '42');
  });
});
