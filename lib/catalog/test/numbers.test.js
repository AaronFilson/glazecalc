// The catalog's number reader (lib/catalog/numbers.ts): typed numbers as the reader writes them.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  forTyping,
  parseNumber,
  plainDigits,
  plainNumber,
  separators,
  toPlain,
  withoutDirectionMarks
} from '../numbers.ts';

const LRM = '‎';
const ALM = '؜';

describe('typed numbers', () => {
  test('read either mark, digit groups of three or Indian twos, and any script’s digits', () => {
    assert.equal(parseNumber('12,5'), 12.5);
    assert.equal(parseNumber('12.5'), 12.5);
    assert.equal(parseNumber('1 234,5', 'either', 'fr'), 1234.5);
    assert.equal(parseNumber('1.234,5'), 1234.5);
    assert.equal(parseNumber('1,234.5'), 1234.5);
    assert.equal(parseNumber('12,34,567.5'), 1234567.5);
    assert.equal(parseNumber('1,00,000', 'point'), 100000);
    assert.equal(parseNumber('١٢٫٥'), 12.5);
    assert.equal(parseNumber('١٬٢٣٤٫٥'), 1234.5);
    assert.equal(parseNumber('１２．５'), 12.5);
    assert.equal(parseNumber('12。5'), 12.5);
    assert.equal(parseNumber('−3'), -3);
    assert.equal(parseNumber('+3'), 3);
    assert.equal(parseNumber(ALM + '-3'), -3);
    assert.equal(parseNumber('٥٪'), 5);
    assert.equal(parseNumber('%5'), 5);
    assert.equal(parseNumber('7 %', 'either', 'fr'), 7);
    assert.equal(parseNumber('1500'), 1500);
    assert.equal(parseNumber(',5'), 0.5);
    assert.equal(parseNumber('.5'), 0.5);
  });

  test('read a lone separator before three digits as the locale does, and a mark only as set', () => {
    assert.equal(parseNumber('1,250', 'either', 'en'), 1250);
    assert.equal(parseNumber('1,250', 'either', 'de'), 1.25);
    assert.equal(parseNumber('1.500', 'comma', 'de'), 1500);
    assert.equal(parseNumber('0,500', 'comma', 'en'), 0.5);
    assert.equal(parseNumber('12.5', 'comma'), null);
    assert.equal(parseNumber('12,5', 'point'), null);
    assert.equal(parseNumber('12,5', 'comma'), 12.5);
    assert.equal(parseNumber('12.5', 'point'), 12.5);
    assert.equal(parseNumber('1.234,5', 'point'), null);
    assert.equal(parseNumber('1,234.5', 'comma'), null);
  });

  test('are not numbers when they are anything else', () => {
    for (const text of [
      '',
      ' ',
      '1e3',
      '0x10',
      '12,5,3',
      'abc',
      '-',
      '1 23',
      '12.',
      '0.500.1',
      '1,23,4',
      '1.2,3',
      '12,5.3,1',
      '1' + '0'.repeat(400)
    ])
      assert.equal(parseNumber(text), null, text);
    assert.equal(parseNumber('0.500', 'either', 'de'), 0.5);
  });

  test('are written for typing and saved plainly', () => {
    assert.equal(forTyping('12.5', 'either', 'de'), '12,5');
    assert.equal(forTyping('12.5', 'comma'), '12,5');
    assert.equal(forTyping(' 12.5 ', 'point'), '12.5');
    assert.equal(forTyping('about 12'), 'about 12');
    assert.equal(toPlain('12,5', 'comma'), '12.5');
    assert.equal(toPlain('lots'), 'lots');
    assert.equal(toPlain('0,0000001'), '0.0000001');
    assert.equal(plainNumber('12.5'), 12.5);
  });

  test('keep the locale’s marks, any script’s digits, and drop direction marks', () => {
    assert.deepEqual(separators('de'), { decimal: ',', group: '.' });
    assert.deepEqual(separators('ar-EG-u-nu-arab'), { decimal: '.', group: ',' });
    assert.equal(plainDigits(LRM + '-' + LRM + '۳ ١٢٫٥ १२'), '-3 12٫5 12');
    assert.equal(withoutDirectionMarks('19.5' + LRM + '%'), '19.5%');
    assert.equal(withoutDirectionMarks(null), '');
    // A locale that writes no group mark (Spanish groups only from five digits), and one that writes none at all.
    assert.deepEqual(separators('es'), { decimal: ',', group: '.' });
    const formatToParts = Intl.NumberFormat.prototype.formatToParts;
    Intl.NumberFormat.prototype.formatToParts = () => [];
    try {
      assert.deepEqual(separators('en'), { decimal: '.', group: ',' });
    } finally {
      Intl.NumberFormat.prototype.formatToParts = formatToParts;
    }
  });
});
