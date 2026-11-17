// The host (lib/core/host.ts, docs/adr/0031-functional-core.md): each call is given how to read the host's
// records, and the core keeps no readers between calls. A host may say how a record is known, keyed and
// labelled and what traits it has; the core never reads a name. And its problems and warnings (problem.ts).
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import * as identity from '../identity.ts';
import * as traits from '../traits.ts';
import { problem, warning } from '../problem.ts';
import { prepareMaterial } from '../chemistry/materials.ts';
import { mixRecipes } from '../recipe/blends.ts';
import { recipeDrySg } from '../recipe/density.ts';
import { HOST, IDS, record, linesOf } from './support.js';

describe('identity', () => {
  test('knows a record by its id by default, and no record as undefined', () => {
    assert.equal(identity.idOf(HOST, record(IDS.silica)), IDS.silica);
    assert.equal(identity.idOf(HOST, null), undefined);
    assert.equal(identity.idOf(HOST, undefined), undefined);
  });

  test('labels a record by its identity by default, and follows a host’s idOf', () => {
    assert.equal(identity.labelOf(HOST, record(IDS.talc)), IDS.talc);
    assert.equal(identity.labelOf(HOST, null), undefined);
    assert.equal(identity.labelOf({ idOf: (r) => 'k:' + r.id }, record(IDS.talc)), 'k:' + IDS.talc);
  });

  test('takes a host’s own idOf and labelOf', () => {
    const host = { idOf: (r) => r.code, labelOf: (r) => 'label ' + r.code };
    assert.equal(identity.idOf(host, { code: 7 }), 7);
    assert.equal(identity.labelOf(host, { code: 7 }), 'label 7');
    assert.equal(identity.labelOf(host, undefined), undefined);
  });

  test('keys the same record with the same chemistry alike, whatever the order of its fields', () => {
    const silica = record(IDS.silica);
    assert.equal(identity.keyOf(HOST, silica), identity.keyOf(HOST, record(IDS.silica)));
    const two = {
      id: 'x',
      fields: [
        { name: 'SiO2', amount: '1' },
        { name: 'CaO', amount: '2' }
      ]
    };
    const reversed = { id: 'x', fields: [...two.fields].reverse() };
    assert.equal(identity.keyOf(HOST, two), identity.keyOf(HOST, reversed));
    // Another analysis under one id is another line.
    assert.notEqual(identity.keyOf(HOST, two), identity.keyOf(HOST, { ...two, loi: 5 }));
    assert.notEqual(identity.keyOf(HOST, two), identity.keyOf(HOST, { ...two, percentmole: 'percent' }));
    assert.notEqual(identity.keyOf(HOST, two), identity.keyOf(HOST, { id: 'y', fields: two.fields }));
    // A record with no fields keys by its id alone.
    assert.equal(identity.keyOf(HOST, { id: 'z' }), identity.keyOf(HOST, { id: 'z' }));
  });

  test('keys by the host’s idOf when the host gives no keyOf', () => {
    const byCode = { idOf: (r) => r.code };
    assert.equal(identity.keyOf(byCode, { code: 1, id: 'a' }), identity.keyOf(byCode, { code: 1, id: 'b' }));
    assert.notEqual(identity.keyOf(HOST, { code: 1, id: 'a' }), identity.keyOf(HOST, { code: 1, id: 'b' }));
  });

  test('takes a host’s keyOf, and the blends add up lines by it', () => {
    const a = { materials: [{ id: 'a', amount: '100' }] };
    const b = { materials: [{ id: 'b', amount: '100' }] };
    assert.equal(mixRecipes(HOST, [a, b], [0.5, 0.5]).materials.length, 2);
    const mixed = mixRecipes({ keyOf: () => 'same' }, [a, b], [0.5, 0.5]);
    assert.equal(mixed.materials.length, 1);
    assert.equal(mixed.materials[0].amount, 100);
  });

  test('a result carries the host’s label', () => {
    const sg = recipeDrySg({ labelOf: (r) => 'L-' + r.id.slice(0, 4) }, linesOf([[IDS.gerstley, 100]]));
    assert.deepEqual(sg.unknown, ['L-' + IDS.gerstley.slice(0, 4)]);
  });

  test('keeps nothing between calls: two hosts, by turns, each get their own answer', () => {
    const named = { idOf: (r) => r.name, labelOf: (r) => r.name.toUpperCase() };
    const mine = { id: 'm-1', name: 'mine', formula: { SiO2: 1 } };
    assert.equal(prepareMaterial(HOST, mine).id, 'm-1');
    assert.deepEqual([prepareMaterial(named, mine).id, prepareMaterial(named, mine).label], ['mine', 'MINE']);
    assert.deepEqual([prepareMaterial(HOST, mine).id, prepareMaterial(HOST, mine).label], ['m-1', 'm-1']);
  });

  test('keeps the ids beside a result’s labels under a symbol of its own', () => {
    assert.equal(typeof identity.IDS, 'symbol');
  });
});

describe('traits', () => {
  test('reads a record’s own traits by default, and none for none', () => {
    assert.deepEqual(traits.traitsOf(HOST, record(IDS.whiting)), { rawCalcium: true, density: { mineral: 'calcite' } });
    assert.deepEqual(traits.traitsOf(HOST, record(IDS.custer)), {});
    assert.deepEqual(traits.traitsOf(HOST, null), {});
    assert.deepEqual(traits.traitsOf(HOST, undefined), {});
  });

  test('takes a host’s traitsOf, and an empty answer is no traits', () => {
    const host = { traitsOf: (r) => (r.id === 'q' ? { density: { mineral: 'quartz' } } : null) };
    assert.deepEqual(traits.traitsOf(host, { id: 'q' }), { density: { mineral: 'quartz' } });
    assert.deepEqual(traits.traitsOf(host, { id: 'other' }), {});
    // The density goes by the host's traits, and only in the call given them.
    assert.equal(recipeDrySg(host, [{ id: 'q', amount: '10' }]).sg, 2.65);
    assert.equal(recipeDrySg(HOST, [{ id: 'q', amount: '10' }]).sg, null);
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
