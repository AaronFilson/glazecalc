import { readFileSync } from 'node:fs';
import path from 'node:path';
import { compare, hashes, hashOf } from '../../scripts/chemistry-outputs.mjs';
import { expect } from './support/app.ts';

// The output check itself takes two minutes, so CI runs it as a job of its own (npm run check:outputs). These
// hold that it can fail, and that what it keeps covers each area of the chemistry.
describe('the chemistry output check (scripts/chemistry-outputs.mjs)', () => {
  it('finds an output changed, gone or new, and nothing when every one is as kept', () => {
    const kept = { a: '1', b: '2', c: '3' };
    expect(compare(kept, { ...kept })).to.eql({ changed: [], gone: [], added: [], same: true });
    expect(compare(kept, { a: '1', b: 'x', d: '4' })).to.eql({
      changed: ['b'],
      gone: ['c'],
      added: ['d'],
      same: false
    });
  });

  it("tells outputs apart by their JSON, a key's place included", () => {
    const now = hashes([
      ['x', { a: 1, b: 2 }],
      ['y', { b: 2, a: 1 }],
      ['z', undefined]
    ]);
    expect(now['x']).to.not.equal(now['y']);
    expect(now['z']).to.equal(hashOf('undefined'));
    expect(hashOf('{}')).to.equal('44136fa355b3678a');
  });

  it('refuses two outputs with one key, which would hide one of them', () => {
    expect(() =>
      hashes([
        ['x', 1],
        ['x', 2]
      ])
    ).to.throw('Two outputs have the key x');
  });

  it('keeps a hash for each area of the chemistry', () => {
    const file = path.join(import.meta.dirname, '..', '..', 'scripts', 'chemistry-outputs.json');
    const kept = JSON.parse(readFileSync(file, 'utf8')) as Record<string, string>;
    const areas = new Set(Object.keys(kept).map((key) => key.split(' ')[0]));
    expect([...areas]).to.include.members([
      'table',
      'material',
      'additive',
      'formula',
      'oxide',
      'random',
      'blend',
      'vary',
      'slurry',
      'cones',
      'firing',
      'paste',
      'numbers',
      'english',
      'message'
    ]);
    expect(Object.keys(kept).length).to.be.greaterThan(2500);
    expect(Object.values(kept).every((hash) => /^[0-9a-f]{16}$/.test(hash))).to.equal(true);
  });
});
