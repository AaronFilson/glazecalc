// The catalog's English (lib/catalog/english.ts): the words of the core's codes, and how they are put on
// what the core returns.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import {
  MESSAGES,
  english,
  figureText,
  formatFormula,
  inWords,
  paramsText,
  problem,
  warning,
  worded,
  wordedWarnings
} from '../english.ts';

const CORE = path.join(import.meta.dirname, '..', '..', 'core');
const sources = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? entry.name === 'test'
        ? []
        : sources(path.join(dir, entry.name))
      : entry.name.endsWith('.ts')
        ? [readFileSync(path.join(dir, entry.name), 'utf8')]
        : []
  );

describe('the English', () => {
  test('has words for every problem and warning the core raises by name', () => {
    // 'no-frit' is the lead tools' own, which lib/recipe/lead.js words.
    const codes = new Set(
      sources(CORE).flatMap((text) => [...text.matchAll(/\b(?:problem|warning)\('([a-z-]+)'/g)].map((m) => m[1]))
    );
    codes.delete('no-frit');
    assert.ok(codes.size > 20);
    for (const code of codes) assert.ok(Object.hasOwn(MESSAGES, code), code);
    assert.ok(Object.isFrozen(MESSAGES));
  });

  test('puts values in, numbers to two places, and a quoted brace as it is', () => {
    assert.equal(english('unknown-material', { material: 'Talc' }), 'Unknown material Talc');
    assert.equal(english('analysis-total', { material: 'X', total: 97.5 }).includes('97.50%'), true);
    assert.equal(problem('no-name').message, 'Material must have a name');
    assert.deepEqual(problem('no-name').params, {});
    assert.deepEqual(warning('trace-flux'), { code: 'trace-flux', params: {}, message: english('trace-flux') });
  });

  test('words the core’s problems and warnings, oxides with subscripts, each warning once if asked', () => {
    const error = Object.assign(new Error('unknown-oxide'), {
      code: 'unknown-oxide',
      params: { oxide: 'Fe2O3', material: 'M' }
    });
    assert.equal(worded(error), error);
    assert.equal(error.message, 'Unknown oxide Fe₂O₃ in material M');
    const theirs = Object.assign(new Error('x'), { code: 'not-ours' });
    assert.equal(worded(theirs).message, 'x');
    assert.equal(worded(null), null);
    const noParams = Object.assign(new Error('no-name'), { code: 'no-name' });
    assert.deepEqual(worded(noParams).params, {});
    const w = () => ({ code: 'colorant-flux', params: { oxides: ['CoO', 'Fe2O3'] } });
    const once = wordedWarnings([w(), w()], { once: true });
    assert.equal(once.warnings.length, 1);
    assert.ok(once.warnings[0].includes('CoO, Fe₂O₃'));
    assert.equal(wordedWarnings([w(), w()], { once: false }).warningCodes.length, 2);
    assert.equal(wordedWarnings([{ code: 'trace-flux' }], { once: false }).warningCodes[0].params, undefined);
  });

  test('words a function’s problems, keeping its this and its result', () => {
    const fails = inWords(() => {
      throw Object.assign(new Error('no-target'), { code: 'no-target', params: {} });
    });
    assert.throws(fails, { message: 'The target has no oxides to aim for' });
    const self = {
      n: 2,
      twice: inWords(function () {
        return this.n * 2;
      })
    };
    assert.equal(self.twice(), 4);
  });

  test('writes formulas with subscripts, and figures in a locale', () => {
    assert.equal(formatFormula('Ca3(PO4)2'), 'Ca₃(PO₄)₂');
    assert.equal(formatFormula('2CaO•3B2O3'), '2CaO•3B₂O₃');
    assert.equal(formatFormula(null), '');
    assert.equal(figureText({ value: 1240, places: 0 }), '1240');
    assert.equal(figureText({ value: 12345.5, places: 2 }, 'en'), '12,345.50');
    assert.equal(figureText({ value: 0.5, places: 2, upTo: true }), '0.5');
    assert.equal(figureText({ value: -0, places: 1 }), '0.0');
    assert.deepEqual(paramsText({ params: { a: { value: 1.5, places: 1 }, b: 'x' } }, 'de'), { a: '1,5', b: 'x' });
    assert.deepEqual(paramsText({}), {});
    assert.deepEqual(
      paramsText({ params: { a: { value: 1, places: 0 } } }, 'en', () => 'w'),
      { a: 'w' }
    );
  });
});
