// The core's hooks (lib/core/identity.js, traits.js) and its problems and warnings (problem.js): a host may
// set how a record is known, keyed, labelled and what traits it has; the core never reads a name. Each test
// puts the defaults back.
import { describe, test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import * as identity from '../identity.ts';
import * as traits from '../traits.ts';
import { problem, warning } from '../problem.ts';
import { mixRecipes } from '../recipe/blends.ts';
import { recipeDrySg } from '../recipe/density.ts';
import { IDS, record, linesOf } from './support.js';

// The defaults, as the core sets them, written again so a test can put them back.
const defaultIdOf = (r) => r.id;
const defaultKeyOf = (r) =>
  JSON.stringify([
    identity.idOf(r),
    (r.fields ?? []).map((field) => [String(field.name), String(field.amount)]).sort(),
    String(r.loi ?? ''),
    String(r.percentmole ?? '')
  ]);
const defaultLabelOf = (r) => identity.idOf(r);
const defaultTraitsOf = (r) => (r && r.traits) || {};

afterEach(() => {
  identity.setIdOf(defaultIdOf);
  identity.setKeyOf(defaultKeyOf);
  identity.setLabelOf(defaultLabelOf);
  traits.setTraitsOf(defaultTraitsOf);
});

describe('identity', () => {
  test('knows a record by its id by default, and no record as undefined', () => {
    assert.equal(identity.idOf(record(IDS.silica)), IDS.silica);
    assert.equal(identity.idOf(null), undefined);
    assert.equal(identity.idOf(undefined), undefined);
  });

  test('labels a record by its identity by default, and follows a host’s idOf', () => {
    assert.equal(identity.labelOf(record(IDS.talc)), IDS.talc);
    assert.equal(identity.labelOf(null), undefined);
    identity.setIdOf((r) => 'k:' + r.id);
    assert.equal(identity.labelOf(record(IDS.talc)), 'k:' + IDS.talc);
  });

  test('takes a host’s own idOf and labelOf', () => {
    identity.setIdOf((r) => r.code);
    assert.equal(identity.idOf({ code: 7 }), 7);
    identity.setLabelOf((r) => 'label ' + r.code);
    assert.equal(identity.labelOf({ code: 7 }), 'label 7');
    assert.equal(identity.labelOf(undefined), undefined);
  });

  test('keys the same record with the same chemistry alike, whatever the order of its fields', () => {
    const silica = record(IDS.silica);
    assert.equal(identity.keyOf(silica), identity.keyOf(record(IDS.silica)));
    const two = {
      id: 'x',
      fields: [
        { name: 'SiO2', amount: '1' },
        { name: 'CaO', amount: '2' }
      ]
    };
    const reversed = { id: 'x', fields: [...two.fields].reverse() };
    assert.equal(identity.keyOf(two), identity.keyOf(reversed));
    // Another analysis under one id is another line.
    assert.notEqual(identity.keyOf(two), identity.keyOf({ ...two, loi: 5 }));
    assert.notEqual(identity.keyOf(two), identity.keyOf({ ...two, percentmole: 'percent' }));
    assert.notEqual(identity.keyOf(two), identity.keyOf({ id: 'y', fields: two.fields }));
    // A record with no fields keys by its id alone.
    assert.equal(identity.keyOf({ id: 'z' }), identity.keyOf({ id: 'z' }));
  });

  test('takes a host’s keyOf, and the blends add up lines by it', () => {
    const a = { materials: [{ id: 'a', amount: '100' }] };
    const b = { materials: [{ id: 'b', amount: '100' }] };
    assert.equal(mixRecipes([a, b], [0.5, 0.5]).materials.length, 2);
    identity.setKeyOf(() => 'same');
    const mixed = mixRecipes([a, b], [0.5, 0.5]);
    assert.equal(mixed.materials.length, 1);
    assert.equal(mixed.materials[0].amount, 100);
  });

  test('a result carries the host’s label', () => {
    identity.setLabelOf((r) => 'L-' + r.id.slice(0, 4));
    const sg = recipeDrySg(linesOf([[IDS.gerstley, 100]]));
    assert.deepEqual(sg.unknown, ['L-' + IDS.gerstley.slice(0, 4)]);
  });

  test('refuses a hook that is not a function', () => {
    for (const set of [identity.setIdOf, identity.setKeyOf, identity.setLabelOf, traits.setTraitsOf]) {
      assert.throws(() => set('id'), TypeError);
      assert.throws(() => set(null), TypeError);
    }
  });

  test('keeps the ids beside a result’s labels under a symbol of its own', () => {
    assert.equal(typeof identity.IDS, 'symbol');
  });
});

describe('traits', () => {
  test('reads a record’s own traits by default, and none for none', () => {
    assert.deepEqual(traits.traitsOf(record(IDS.whiting)), { rawCalcium: true, density: { mineral: 'calcite' } });
    assert.deepEqual(traits.traitsOf(record(IDS.custer)), {});
    assert.deepEqual(traits.traitsOf(null), {});
    assert.deepEqual(traits.traitsOf(undefined), {});
  });

  test('takes a host’s traitsOf, and an empty answer is no traits', () => {
    traits.setTraitsOf((r) => (r.id === 'q' ? { density: { mineral: 'quartz' } } : null));
    assert.deepEqual(traits.traitsOf({ id: 'q' }), { density: { mineral: 'quartz' } });
    assert.deepEqual(traits.traitsOf({ id: 'other' }), {});
    // The density goes by the host's traits.
    assert.equal(recipeDrySg([{ id: 'q', amount: '10' }]).sg, 2.65);
  });
});

describe('problem and warning', () => {
  test('a problem is an Error whose message is its code, with its values', () => {
    const error = problem('no-flux', { id: 'x' });
    assert.ok(error instanceof Error);
    assert.equal(error.message, 'no-flux');
    assert.equal(error.code, 'no-flux');
    assert.deepEqual(error.params, { id: 'x' });
    assert.deepEqual(problem('bare').params, {});
  });

  test('a warning is a code and its values', () => {
    assert.deepEqual(warning('w', { n: 1 }), { code: 'w', params: { n: 1 } });
    assert.deepEqual(warning('w'), { code: 'w', params: {} });
  });
});
