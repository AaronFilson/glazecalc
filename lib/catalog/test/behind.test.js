// The lookbehind stand-in (lib/catalog/behind.ts): the same matches as the lookbehind it replaces, which Node
// still reads; and no lookbehind written anywhere in the core or the catalog, so both parse in Safari 15.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { firstAfter, matchesAfter, notAfter } from '../behind.ts';

const LIB = path.resolve(import.meta.dirname, '..', '..');
const brief = (matches) => [...matches].map((m) => [m.index, ...m]);

describe('matchesAfter', () => {
  test('gives what (?<!…) at the start gives', () => {
    const texts = ['1.5 2,25 x7 .8 12', '21240°C 1240°C', 'a1b2 c3', '', '...9'];
    for (const text of texts)
      assert.deepEqual(
        brief(matchesAfter(text, /\d[\d.,]*/g, notAfter(/[\d.,a-z]/))),
        brief(text.matchAll(/(?<![\d.,a-z])\d[\d.,]*/g)),
        text
      );
  });

  test('gives what (?<=…) gives, and takes a pattern without the g flag, leaving it as it was', () => {
    const pattern = /\d+/;
    const ok = (previous) => previous === ' ';
    assert.deepEqual(brief(matchesAfter('a1 22 x3 4', pattern, ok)), brief('a1 22 x3 4'.matchAll(/(?<= )\d+/g)));
    assert.equal(pattern.flags, '');
    assert.equal(pattern.lastIndex, 0);
  });

  test('reads the character before as a whole code point, and steps over one under the u flag', () => {
    // 𝐀 is a letter outside the BMP (two code units): "mesh" after it is inside a word.
    const word = notAfter(/[\p{L}\p{Nd}]/u);
    assert.equal(firstAfter('𝐀mesh', /mesh/iu, word), null);
    assert.equal(firstAfter('😀mesh', /mesh/iu, word)?.index, 2);
    assert.deepEqual(brief(matchesAfter('𝐀𝐀x x', /\S/gu, word)), brief('𝐀𝐀x x'.matchAll(/(?<![\p{L}\p{Nd}])\S/gu)));
    // A lone low surrogate at the start is a character of its own.
    assert.equal(firstAfter('\udc00a', /a/, (previous) => previous === '\udc00')?.index, 1);
  });

  test('steps past an empty match, as matchAll does', () => {
    assert.deepEqual(brief(matchesAfter('ab', /x*/g, () => true)), brief('ab'.matchAll(/x*/g)));
    assert.deepEqual(brief(matchesAfter('😀', /x*/gu, () => true)), brief('😀'.matchAll(/x*/gu)));
  });

  test('firstAfter is null with no match, as match is', () => {
    assert.equal(
      firstAfter('abc', /\d/, () => true),
      null
    );
  });
});

describe('the libraries write no lookbehind', () => {
  test('in lib/core and lib/catalog, outside their tests', () => {
    const found = [];
    for (const library of ['core', 'catalog'])
      for (const file of readdirSync(path.join(LIB, library), { recursive: true })) {
        if (!/\.(ts|js)$/.test(file) || file.split(path.sep).includes('test') || file === 'behind.ts') continue;
        const text = readFileSync(path.join(LIB, library, file), 'utf8');
        if (/\(\?<[=!]/.test(text)) found.push(`${library}/${file}`);
      }
    assert.deepEqual(found, []);
  });
});
