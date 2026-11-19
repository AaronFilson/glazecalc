import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import * as paste from '../paste.ts';
import { CONES } from '../cones.ts';

// The catalog's reader of pasted recipes (lib/catalog/paste.ts): recipes pasted as text or CSV, read into lines,
// and each line's name matched to a record. Ported from server/test/paste_tests.ts, which reads the same pastes
// with Glazecalc's library; here the names it knows are those the pastes ask of, as the library answers them.

// Reading a paste asks only the host's cone charts, for its firing lines.
const HOST = { cones: CONES };
// The names the library has, of those the pastes below ask isName of.
const NAMES = new Set(
  [
    '6 Tile',
    'Bentonite',
    'Boraq 1',
    'Copper carbonate',
    'Custer',
    'Dolomite',
    'EPK',
    'Feldspath mixte 64',
    'Feldspath potassique (Bodmer)',
    'FERRO FRIT 3134',
    'Ferro Frit 3134',
    'Frit 3124',
    'Fusion Frit F-12',
    'G-200 Feldspar',
    'Hawthorn Bond',
    'Kalifeldspat K 2/75',
    'Kaolin 233',
    "Kaolin d'Arvor",
    'Minspar 200',
    'Molochite 16/30',
    'Molochite 30/80',
    'Mondré & Manz Frit V 15 098',
    'Mondré & Manz Raku Frit M 233 864',
    'OM-4 Ball Clay',
    'Quartz',
    'Red iron oxide',
    'Rutile',
    'Silica',
    'SILICA',
    'TALC',
    'Talc',
    'Tile 6',
    'TIN OXIDE',
    'Tin oxide',
    'Whiting',
    'Wollastonite',
    'WOLLASTONITE',
    'Zirkonfritte M 130 600'
  ].map(paste.foldedName)
);
const isName = (text) => NAMES.has(paste.foldedName(text));

/** Each line as [name, amount, unit, addition]. */
const lines = (read) => read.lines.map((l) => [l.name, l.amount, l.unit, l.addition]);
const one = (text, options = {}) => {
  const read = paste.parsePaste(HOST, text, { isName, ...options });
  assert.equal(read.length, 1);
  return read[0];
};
// Of the names these pastes ask known of, the one like a library material (by matchName).
const known = (text) => text === 'Custer Spa';

describe('Paste-in import: reading lines', () => {
  test('reads a name and an amount, with a percent sign, a colon, a tab or dot leaders', () => {
    const read = one('Custer Feldspar 25\nEPK 20.5 %\nSilica\t30\nWhiting: 20\nTalc ...... 5\nDolomite = 3');
    assert.deepEqual(lines(read), [
      ['Custer Feldspar', 25, null, false],
      ['EPK', 20.5, '%', false],
      ['Silica', 30, null, false],
      ['Whiting', 20, null, false],
      ['Talc', 5, null, false],
      ['Dolomite', 3, null, false]
    ]);
  });

  test('reads the amount before the name, with or without a unit', () => {
    assert.deepEqual(lines(one('25 Custer Feldspar\n20% EPK\n30 g Silica\n4.5g Gerstley Borate\n2 parts Talc')), [
      ['Custer Feldspar', 25, null, false],
      ['EPK', 20, '%', false],
      ['Silica', 30, 'g', false],
      ['Gerstley Borate', 4.5, 'g', false],
      ['Talc', 2, 'parts', false]
    ]);
  });

  test('keeps a number that is part of the name', () => {
    assert.deepEqual(lines(one('Ferro Frit 3134 20\nOM-4 Ball Clay 10\nG-200 Feldspar 30\nSilica (325 mesh) 40')), [
      ['Ferro Frit 3134', 20, null, false],
      ['OM-4 Ball Clay', 10, null, false],
      ['G-200 Feldspar', 30, null, false],
      ['Silica (325 mesh)', 40, null, false]
    ]);
  });

  test('reads the amount first in a line with a number at each end, when a unit follows it or the rest is a known name', () => {
    assert.deepEqual(lines(one('19 g Ferro Frit 3124\n2,5 g Minspar 200\n30 Ferro Frit 3134\n٣٫١ g Ferro Frit 4113')), [
      ['Ferro Frit 3124', 19, 'g', false],
      ['Minspar 200', 2.5, 'g', false],
      ['Ferro Frit 3134', 30, null, false],
      ['Ferro Frit 4113', 3.1, 'g', false]
    ]);
    // As before: the name first where the number before it is part of it, or the library knows the name that way.
    assert.deepEqual(lines(one('325 mesh silica 10\n6 Tile 25\nFerro Frit 3134 20')), [
      ['325 mesh silica', 10, null, false],
      ['6 Tile', 25, null, false],
      ['Ferro Frit 3134', 20, null, false]
    ]);
  });

  test('reads a known name, a comma and its amount, though there is a digit each side of the comma', () => {
    // "Ferro Frit 3134,20" was Ferro Frit at 3134.2, the comma read as a decimal one.
    for (const locale of ['en', 'de', 'fr']) {
      assert.deepEqual(
        lines(one('Ferro Frit 3134,20\nMinspar 200,30\nFusion Frit F-12,16.5\nSilica,33', { locale })),
        [
          ['Ferro Frit 3134', 20, null, false],
          ['Minspar 200', 30, null, false],
          ['Fusion Frit F-12', 16.5, null, false],
          ['Silica', 33, null, false]
        ],
        locale
      );
    }
    // Two numbers after it are asked of as in any comma row: one number with a decimal comma, or two columns. It was
    // the recipe's title.
    const read = one('Ferro Frit 3134,20,5\nSilica,30\nEPK,49,5', { locale: 'de' });
    assert.equal(read.title, null);
    assert.deepEqual(
      read.lines.map((l) => [l.name, l.amount, l.joined]),
      [
        ['Ferro Frit 3134', 20.5, '20,5'],
        ['Silica', 30, undefined],
        ['EPK', 49.5, '49,5']
      ]
    );
    assert.partialDeepStrictEqual(one('Ferro Frit 3134,20,5', { locale: 'en' }).lines[0], {
      name: 'Ferro Frit 3134',
      amount: 20
    });
    // Under a heading row, by its columns.
    assert.deepEqual(lines(one('Material,Amount\nFerro Frit 3134,20\nSilica,80', { locale: 'de' })), [
      ['Ferro Frit 3134', 20, null, false],
      ['Silica', 80, null, false]
    ]);
  });

  test('asks of a known name that ends in a number before a comma and digits, where commas mark decimals', () => {
    // German "Kaolin 233,5" is Kaolin 233 at 5, the known name, or Kaolin at 233.5: it was the first, unasked.
    const paste = 'Kaolin 233,5\nQuarz 30\nMinspar 200,30';
    const read = one(paste, { locale: 'de' });
    assert.deepEqual(
      read.lines.map((l) => [l.name, l.amount, l.joined]),
      [
        ['Kaolin', 233.5, '233,5'],
        ['Quarz', 30, undefined],
        ['Minspar', 200.3, '200,30']
      ]
    );
    // Two columns when the reader chooses them: the known name and its amount.
    assert.deepEqual(
      one(paste, { locale: 'fr', joined: 'columns' }).lines.map((l) => [l.name, l.amount, l.joined]),
      [
        ['Kaolin 233', 5, '233,5'],
        ['Quarz', 30, undefined],
        ['Minspar 200', 30, '200,30']
      ]
    );
    // Nothing to ask for a reader who writes decimal points, or in a paste whose other rows have a comma between a
    // name and a number ("Quarz,30"), or under a heading row: the comma is a column's.
    for (const [text, locale] of [
      [paste, 'en'],
      ['Kaolin 233,5\nQuarz,30', 'de'],
      ['Material,Amount\nKaolin 233,5\nQuarz 30', 'de']
    ]) {
      assert.partialDeepStrictEqual(one(text, { locale }).lines[0], { name: 'Kaolin 233', amount: 5 }, text);
      assert.ok(!('joined' in one(text, { locale }).lines[0]), text);
    }
  });

  test('reads simple fractions and mixed numbers as amounts, and never splits a recipe on one', () => {
    // "Bentonite 1/2" was the title of a second recipe, the materials after it in that one.
    const read = one(
      'Silica 30\nBentonite 1/2\nWhiting 20\nRutile 1 1/2\nTin ½\nZircopax 2½ %\n1/4 Epsom salt\n¾ g Copper carbonate'
    );
    assert.deepEqual(lines(read), [
      ['Silica', 30, null, false],
      ['Bentonite', 0.5, null, false],
      ['Whiting', 20, null, false],
      ['Rutile', 1.5, null, false],
      ['Tin', 0.5, null, false],
      ['Zircopax', 2.5, '%', false],
      ['Epsom salt', 0.25, null, false],
      ['Copper carbonate', 0.75, 'g', false]
    ]);
    assert.deepEqual(
      paste.importAmounts(one('Silica 99\nBentonite 1/3')).map((a) => a.amount),
      ['99', '0.33333']
    );
    // In a table's cell, and written with the fraction slash.
    assert.deepEqual(lines(one('Silica\t30\nBentonite\t1/2\nTin 1\u20442')), [
      ['Silica', 30, null, false],
      ['Bentonite', 0.5, null, false],
      ['Tin', 0.5, null, false]
    ]);
    // A name that ends in a number before a fraction: the name the library has.
    assert.deepEqual(lines(one('Tile 6 1/2\nSilica 99')), [
      ['Tile 6', 0.5, null, false],
      ['Silica', 99, null, false]
    ]);
    // A line with a fraction that is not an amount ("1/2 tsp") is a note, never another recipe's title.
    assert.deepEqual(
      paste
        .parsePaste(HOST, 'Celadon\nSilica 30\nBentonite 1/2 tsp\nWhiting 20', { isName })
        .map((r) => [r.title, r.notes, r.lines.map((l) => l.name)]),
      [['Celadon', ['Bentonite 1/2 tsp'], ['Silica', 'Whiting']]]
    );
    // Not fractions: a name's numbers ("Molochite 30/80"), a date, a number over a smaller one.
    assert.deepEqual(lines(one('Molochite 30/80 20\nMolochite 16/30\nKalifeldspat K 2/75 10')), [
      ['Molochite 30/80', 20, null, false],
      ['Molochite 16/30', null, null, false],
      ['Kalifeldspat K 2/75', 10, null, false]
    ]);
    assert.deepEqual(one('Shino\nCuster 50\nFired 12/03').notes, ['Fired 12/03']);
    // A title with a number over another that is no fraction still starts the next paste.
    const two = paste.parsePaste(HOST, 'Shino\nCuster 50\nSilica 50\nShino 50/50\nCuster 40\nSilica 60', { isName });
    assert.deepEqual(
      two.map((r) => r.title),
      ['Shino', 'Shino 50/50']
    );
  });

  test('reads a name pasted alone, which the library knows, as a material with no amount', () => {
    assert.deepEqual(lines(one('Recipe\nFrit 3124\nEPK 20')), [
      ['Frit 3124', null, null, false],
      ['EPK', 20, null, false]
    ]);
  });

  test('takes the percent when grams and a percent are both given (Insight style)', () => {
    assert.deepEqual(lines(one('Ferro Frit 3134   250.00   25.0%\nEPK   750.0   75.0%')), [
      ['Ferro Frit 3134', 25, '%', false],
      ['EPK', 75, '%', false]
    ]);
  });

  test('reads weights in kg, lb and oz as grams', () => {
    const read = one('Custer 1 kg\nSilica 2 lb\nWhiting 8 oz');
    assert.deepEqual(
      read.lines.map((l) => [l.amount && Math.round(l.amount * 100) / 100, l.unit]),
      [
        [1000, 'g'],
        [907.18, 'g'],
        [226.8, 'g']
      ]
    );
  });

  test('strips list marks: dashes, bullets and numbers', () => {
    assert.deepEqual(lines(one('- Custer 25\n* EPK 20\n• Silica 30\n1. Whiting 20\n2) Talc 5')), [
      ['Custer', 25, null, false],
      ['EPK', 20, null, false],
      ['Silica', 30, null, false],
      ['Whiting', 20, null, false],
      ['Talc', 5, null, false]
    ]);
  });

  test('reads full-width digits and letters', () => {
    assert.deepEqual(lines(one('ＥＰＫ　２０．５')), [['EPK', 20.5, null, false]]);
  });
});

describe('Paste-in import: decimal marks', () => {
  test('reads decimal commas', () => {
    assert.deepEqual(lines(one('Kalifeldspat 25,5\nKaolin 20,25 %', { locale: 'de' })), [
      ['Kalifeldspat', 25.5, null, false],
      ['Kaolin', 20.25, '%', false]
    ]);
  });

  test('reads a decimal comma by the reader’s mark, and a thousands separator by their locale', () => {
    assert.equal(one('Custer 1,250', { locale: 'en' }).lines[0].amount, 1250);
    assert.equal(one('Custer 1,250', { locale: 'de' }).lines[0].amount, 1.25);
    assert.equal(one('Custer 1.250', { locale: 'de' }).lines[0].amount, 1250);
    assert.equal(one('Custer 12,5', { mark: 'comma' }).lines[0].amount, 12.5);
  });

  test('reads semicolon-separated rows with decimal commas, as European spreadsheets write CSV', () => {
    assert.deepEqual(lines(one('Feldspat;25,5\nKaolin;20,5\nQuarz;54', { locale: 'de' })), [
      ['Feldspat', 25.5, null, false],
      ['Kaolin', 20.5, null, false],
      ['Quarz', 54, null, false]
    ]);
  });

  test('joins an unquoted decimal comma in a comma-separated row when the reader writes decimal commas', () => {
    assert.equal(one('EPK,20,5', { locale: 'fr' }).lines[0].amount, 20.5);
    assert.equal(one('EPK,20,5', { mark: 'point' }).lines[0].amount, 20);
  });

  test('never joins two cells into a decimal when a heading row named the columns', () => {
    assert.deepEqual(lines(one('Material,Amount,Notes\nSilica,30,5\nKaolin,20,5', { locale: 'de' })), [
      ['Silica', 30, null, false],
      ['Kaolin', 20, null, false]
    ]);
    assert.deepEqual(lines(one('Name,Percent,Grams\nSilica,30,300', { locale: 'fr' })), [['Silica', 30, null, false]]);
    // With no heading, as before.
    assert.equal(one('Silica,30,5', { locale: 'fr' }).lines[0].amount, 30.5);
  });

  test('marks two cells that can be one number or two columns with no heading row, and reads them as chosen', () => {
    // A German reader with no heading: "30,5" is 30.5 or two columns, 30 and 5. One number, as before, and marked so
    // the page asks.
    const paste = 'Silica,30,5\nKaolin,20,5\nWhiting,49';
    const german = one(paste, { locale: 'de' });
    assert.deepEqual(lines(german), [
      ['Silica', 30.5, null, false],
      ['Kaolin', 20.5, null, false],
      ['Whiting', 49, null, false]
    ]);
    assert.deepEqual(
      german.lines.map((l) => l.joined),
      ['30,5', '20,5', undefined]
    );
    // Two columns when the reader chooses it, still marked; one number when they choose that.
    const apart = one(paste, { locale: 'de', joined: 'columns' });
    assert.deepEqual(lines(apart), [
      ['Silica', 30, null, false],
      ['Kaolin', 20, null, false],
      ['Whiting', 49, null, false]
    ]);
    assert.deepEqual(
      apart.lines.map((l) => l.joined),
      ['30,5', '20,5', undefined]
    );
    assert.deepEqual(
      one(paste, { locale: 'de', joined: 'decimal' }).lines.map((l) => l.amount),
      [30.5, 20.5, 49]
    );
    assert.partialDeepStrictEqual(one('+ Tin oxide,2,5', { locale: 'de', joined: 'columns' }).lines[0], {
      name: 'Tin oxide',
      amount: 2,
      addition: true,
      joined: '2,5'
    });
    // A chosen comma mark is asked too; a reader who writes decimal points reads two columns, with nothing to ask.
    assert.partialDeepStrictEqual(one('Silica,30,5', { mark: 'comma' }).lines[0], { amount: 30.5, joined: '30,5' });
    assert.partialDeepStrictEqual(one('Silica,30,5', { locale: 'en' }).lines[0], { amount: 30 });
    assert.ok(!('joined' in one('Silica,30,5', { locale: 'en' }).lines[0]));
    assert.ok(!('joined' in one('Silica,30,5', { locale: 'de', mark: 'point' }).lines[0]));
    // One number is a decimal, as the page shows it, whatever the other numbers say (1,250 read as thousands here).
    const thousands = one('Feldspar 1,250\nSilica,1,500', { locale: 'de', reading: 'group' });
    assert.deepEqual(
      thousands.lines.map((l) => [l.amount, l.joined]),
      [
        [1250, undefined],
        [1.5, '1,500']
      ]
    );
    // Never two ways where it is not: under a heading row, or with a space or a quote beside the comma.
    assert.ok(!('joined' in one('Material,Amount,Notes\nSilica,30,5', { locale: 'de' }).lines[0]));
    for (const row of ['Silica, 30, 5', 'Silica,30 ,5', '"Silica","30","5"', 'Silica,"30",5', 'Silica,30,"5"']) {
      assert.partialDeepStrictEqual(one(row, { locale: 'de' }).lines[0], { amount: 30 }, row);
      assert.ok(!('joined' in one(row, { locale: 'de' }).lines[0]), row);
    }
  });

  test('asks of a comma row with one cell more than its heading row whether the amount is one number', () => {
    // "Material,Amount" over "Silica,30,5": the 5 is the amount's decimals, or a column the heading did not name.
    const paste = 'Material,Amount\nSilica,30,5\nKaolin,20,5\nWhiting,49';
    for (const locale of ['de', 'fr']) {
      const read = one(paste, { locale });
      assert.deepEqual(
        lines(read),
        [
          ['Silica', 30.5, null, false],
          ['Kaolin', 20.5, null, false],
          ['Whiting', 49, null, false]
        ],
        locale
      );
      assert.deepEqual(
        read.lines.map((l) => l.joined),
        ['30,5', '20,5', undefined],
        locale
      );
      assert.deepEqual(
        read.skipped.map((s) => s.why),
        ['columns']
      );
    }
    // Two columns when the reader chooses it, still marked.
    const apart = one(paste, { locale: 'de', joined: 'columns' });
    assert.deepEqual(
      apart.lines.map((l) => [l.amount, l.joined]),
      [
        [30, '30,5'],
        [20, '20,5'],
        [49, undefined]
      ]
    );
    // The amount's cell and the next, wherever the amount is: the columns after it keep their place.
    assert.deepEqual(lines(one('Material,Amount,Addition\nSilica,30,5,\nRutile,2,5,+', { locale: 'de' })), [
      ['Silica', 30.5, null, false],
      ['Rutile', 2.5, null, true]
    ]);
    // As many cells as the heading, a reader who writes decimal points, or a space beside the comma: nothing to ask.
    assert.ok(!('joined' in one('Material,Amount,Notes\nSilica,30,5', { locale: 'de' }).lines[0]));
    assert.deepEqual(
      one(paste, { locale: 'en' }).lines.map((l) => [l.amount, l.joined]),
      [
        [30, undefined],
        [20, undefined],
        [49, undefined]
      ]
    );
    assert.partialDeepStrictEqual(one('Material,Amount\nSilica, 30, 5', { locale: 'de' }).lines[0], { amount: 30 });
    assert.ok(!('joined' in one('Material,Amount\nSilica, 30, 5', { locale: 'de' }).lines[0]));
  });

  test('asks of a comma row whose amount has its thousands set apart inside it, one number until chosen', () => {
    const read = (text, options = {}) => one(text, options).lines.map((l) => [l.name, l.amount, l.joined]);
    // Each language's own 2,140.7 or 1.161,5 in an unquoted comma row: the first group was the amount, unasked.
    // A comma setting the thousands apart, before a decimal point (English, Thai, Hindi): 2140.7, or 2 and 140.7.
    assert.deepEqual(read('Rutile,2,140.7\nSodium Nitrate,1,114\nSilica,30', { locale: 'en' }), [
      ['Rutile', 2140.7, '2,140.7'],
      ['Sodium Nitrate', 1114, '1,114'],
      ['Silica', 30, undefined]
    ]);
    // In any script's digits (Marathi).
    assert.deepEqual(read('Mahavir Potash Feldspar,१,२८५', { locale: 'mr' }), [
      ['Mahavir Potash Feldspar', 1285, '१,२८५']
    ]);
    // A point or a space setting them apart, before a decimal comma (Danish, Czech's no-break space): 1161.5, or
    // 1.161 and 5.
    assert.deepEqual(read('Pegmatita,1.161,5\nFluorspar,1.223,5\nSilica,30', { locale: 'da' }), [
      ['Pegmatita', 1161.5, '1.161,5'],
      ['Fluorspar', 1223.5, '1.223,5'],
      ['Silica', 30, undefined]
    ]);
    assert.deepEqual(read('Cornish Stone,1\u00a0183,70', { locale: 'cs' }), [
      ['Cornish Stone', 1183.7, '1\u00a0183,70']
    ]);
    // After a known name that ends in a number ("Boraq 1" is one): Boraq at 1111.8 g, or Boraq 1 at 111.8 g, asked as
    // a decimal comma there is. It was the second, unasked.
    assert.deepEqual(read('Boraq 1,111.8 g\nSilica 30 g', { locale: 'en' }), [
      ['Boraq', 1111.8, '1,111.8'],
      ['Silica', 30, undefined]
    ]);
    assert.deepEqual(read('Boraq 1,111.8 g', { locale: 'en', joined: 'columns' }), [['Boraq 1', 111.8, '1,111.8']]);
    // Under a heading row it has one cell more than, as a decimal comma is.
    assert.deepEqual(read('Material,Amount\nRutile,2,140.7\nSilica,30', { locale: 'en' }), [
      ['Rutile', 2140.7, '2,140.7'],
      ['Silica', 30, undefined]
    ]);
    // Two columns when the reader chooses them.
    assert.deepEqual(read('Rutile,2,140.7\nSodium Nitrate,1,114', { locale: 'en', joined: 'columns' }), [
      ['Rutile', 2, '2,140.7'],
      ['Sodium Nitrate', 1, '1,114']
    ]);
    // A row of three whose last two cannot be one number ("Talc,5,50", "Kaolin,20,x"): the rows are three columns,
    // read as before. A decimal comma is asked of as before.
    assert.deepEqual(read('Silica,30,300\nKaolin,20,200\nTalc,5,50', { locale: 'en' }), [
      ['Silica', 30, undefined],
      ['Kaolin', 20, undefined],
      ['Talc', 5, undefined]
    ]);
    assert.deepEqual(read('Rutile,2,140.7\nKaolin,20,x', { locale: 'en' }), [
      ['Rutile', 2, undefined],
      ['Kaolin', 20, undefined]
    ]);
    assert.deepEqual(read('Silica,30,5\nKaolin,20,x', { locale: 'de' }), [
      ['Silica', 30.5, '30,5'],
      ['Kaolin', 20, undefined]
    ]);
    // Nothing to ask where the two cannot be one number: a chosen mark the other way, a first cell that is no number
    // in thousands, or three digits that are not a group.
    for (const [text, options] of [
      ['Rutile,2,140.7', { mark: 'comma' }],
      ['Pegmatita,1.161,5', { mark: 'point' }],
      ['Silica,30,5', { locale: 'en' }],
      ['Silica,12.5,140', { locale: 'en' }],
      ['Silica,0,500', { locale: 'en' }],
      ['Silica,1,5000', { locale: 'en' }]
    ]) {
      assert.ok(!('joined' in one(text, options).lines[0]), text);
    }
  });

  test('knows a heading row in any language by its place: words over rows with numbers in the same columns', () => {
    // A heading with a word no list has ("Preis") was the recipe's title.
    const read = one('Rohstoff,Menge,Preis\nKalifeldspat,30,2\nQuarz,20,1\nKaolin,50,3', { locale: 'de' });
    assert.equal(read.title, null);
    assert.deepEqual(read.skipped, [{ line: 1, text: 'Rohstoff,Menge,Preis', why: 'columns' }]);
    assert.deepEqual(lines(read), [
      ['Kalifeldspat', 30, null, false],
      ['Quarz', 20, null, false],
      ['Kaolin', 50, null, false]
    ]);
    // No word any list has: the column of names, and the first column of numbers after it.
    const unknown = one('Malighafi;Kiasi;Bei\nFeldspar;30;2\nSilica;70;1');
    assert.equal(unknown.title, null);
    assert.deepEqual(
      unknown.skipped.map((s) => s.why),
      ['columns']
    );
    assert.deepEqual(lines(unknown), [
      ['Feldspar', 30, null, false],
      ['Silica', 70, null, false]
    ]);
    // Under a title, and after a blank line.
    const titled = one('Celadon\n\nRohstoff;Menge;Preis\nKalifeldspat;30;2\nQuarz;70;1');
    assert.deepEqual(
      [titled.title, titled.skipped.map((s) => s.why), titled.lines.length],
      ['Celadon', ['columns'], 2]
    );
    // Not a heading: a title typed with a comma and a space over rows written without one, rows with their numbers in
    // other columns, or rows not delimited as it is.
    assert.equal(one('Shino, carbon trap\nCuster,40\nSilica,60').title, 'Shino, carbon trap');
    assert.deepEqual(
      one('Glaze,Notes\nCuster,40\nSilica,60,x\n4,Whiting').skipped.map((s) => s.why),
      []
    );
    assert.equal(one('Malighafi,Kiasi\nFeldspar\t30\nSilica\t70').title, 'Malighafi,Kiasi');
  });

  test('reads a decimal comma in a line of text as a decimal, not a column', () => {
    assert.deepEqual(lines(one('Custer Feldspar 25,5')), [['Custer Feldspar', 25.5, null, false]]);
  });

  test('decides the decimal mark once for the whole paste, not number by number', () => {
    const mixed = 'Feldspar 22,5\nEPK 1,500\nSilica 30';
    // Other numbers write decimal commas, so 1,500 could be 1.5: asked, and by default read as the locale does.
    assert.deepEqual(paste.ambiguousNumbers(mixed), ['1,500']);
    assert.deepEqual(
      one(mixed, { locale: 'en' }).lines.map((l) => l.amount),
      [22.5, 1500, 30]
    );
    assert.deepEqual(
      one(mixed, { locale: 'de' }).lines.map((l) => l.amount),
      [22.5, 1.5, 30]
    );
    assert.deepEqual(
      one(mixed, { reading: 'decimal' }).lines.map((l) => l.amount),
      [22.5, 1.5, 30]
    );
    assert.deepEqual(
      one(mixed, { reading: 'group', locale: 'de' }).lines.map((l) => l.amount),
      [22.5, 1500, 30]
    );
    // A chosen mark decides it, with nothing to ask.
    assert.deepEqual(paste.ambiguousNumbers(mixed, 'comma'), []);
    assert.deepEqual(
      one(mixed, { mark: 'comma' }).lines.map((l) => l.amount),
      [22.5, 1.5, 30]
    );
  });

  test('reads a number that the paste’s other numbers settle as they do', () => {
    // Decimal points elsewhere: 1,500 is a thousand and a half, whatever the locale.
    const points = 'Feldspar 22.5\nEPK 1,500';
    assert.deepEqual(paste.ambiguousNumbers(points), []);
    assert.deepEqual(
      one(points, { locale: 'de' }).lines.map((l) => l.amount),
      [22.5, 1500]
    );
    // Decimal commas elsewhere: 1.500 is digit groups.
    const commas = 'Feldspat 22,5\nQuarz 1.500';
    assert.deepEqual(paste.ambiguousNumbers(commas), []);
    assert.deepEqual(
      one(commas, { locale: 'en' }).lines.map((l) => l.amount),
      [22.5, 1500]
    );
    // Nothing settles it: asked, and the locale reads it.
    assert.deepEqual(paste.ambiguousNumbers('Custer 1,250'), ['1,250']);
    assert.deepEqual(paste.ambiguousNumbers('Custer 12,5\nSilica 40\nWhiting 1250'), []);
  });

  test('reads thousands set apart by a space as the language writes them, and marks each such line so the page asks', () => {
    // French sets thousands apart with a narrow no-break space, Russian with a no-break space: one number, with any space.
    for (const space of [' ', '\u00a0', '\u202f']) {
      assert.deepEqual(
        lines(one(`Silica 1${space}500 g\nWhiting 300 g`, { locale: 'fr' })),
        [
          ['Silica', 1500, 'g', false],
          ['Whiting', 300, 'g', false]
        ],
        JSON.stringify(space)
      );
    }
    assert.partialDeepStrictEqual(one('Silice 1\u00a0250,5', { locale: 'ru' }).lines[0], {
      name: 'Silice',
      amount: 1250.5
    });
    assert.deepEqual(lines(one('1 500 g Silica', { locale: 'fr' })), [['Silica', 1500, 'g', false]]);
    // With a name the library does not have, "Local clay 1" at 500 is a reading too: marked, so the page asks.
    assert.partialDeepStrictEqual(one('Local clay 1 500', { locale: 'sv' }).lines[0], {
      amount: 1500,
      spaced: '1 500'
    });
    assert.equal(paste.spacedReading('fr'), 'group');
    assert.equal(paste.spacedReading('en'), 'apart');
    // English writes 1,500: read as before, the 1 ending the name, and marked so the page asks.
    const english = one('Silica 1\u202f500 g\nWhiting 300 g');
    assert.deepEqual(lines(english), [
      ['Silica 1', 500, 'g', false],
      ['Whiting', 300, 'g', false]
    ]);
    assert.deepEqual(
      english.lines.map((l) => l.spaced),
      ['1 500', undefined]
    );
    assert.equal(one('1 500 g Silica').lines[0].spaced, '1 500');
    // Read as one number when the reader chooses it.
    assert.deepEqual(lines(one('Silica 1 500 g\nWhiting 12 500', { spaced: 'group' })), [
      ['Silica', 1500, 'g', false],
      ['Whiting', 12500, null, false]
    ]);
    assert.equal(one('Silica 1 500', { spaced: 'group' }).lines[0].spaced, '1 500');
    // Not thousands set apart: a group of other than three digits, a four-figure number in the name.
    assert.partialDeepStrictEqual(one('Silica 2 30', { locale: 'fr' }).lines[0], { name: 'Silica 2', amount: 30 });
    assert.partialDeepStrictEqual(one('Frit 3134 500', { locale: 'fr' }).lines[0], { name: 'Frit 3134', amount: 500 });
    assert.equal(one('Frit 3134 500').lines[0].spaced, undefined);
    // A cell holds only its amount: a space there sets thousands apart in any language; tabs stay columns.
    assert.deepEqual(lines(one('Silica\t1 500\nWhiting\t300')), [
      ['Silica', 1500, null, false],
      ['Whiting', 300, null, false]
    ]);
    assert.deepEqual(lines(one('Silice\t1\t500\nCraie\t2\t300', { locale: 'fr' })), [
      ['Silice', 1, null, false],
      ['Craie', 2, null, false]
    ]);
  });

  test('reads a known name that ends in a number before an amount in threes, in every language, with nothing to ask', () => {
    // Thousands set apart by a space would make "Minspar 200 300 g" Minspar at 200 300 g; the library has Minspar 200.
    const paste = [
      'Minspar 200 300 g',
      'Feldspath mixte 64 250',
      'Mondré & Manz Frit V 15 098 980',
      'Zirkonfritte M 130 600 250 g',
      'Kaolin 233 150,5 g',
      'Silica 25'
    ].join('\n');
    for (const locale of ['en', 'de', 'fr', 'sv', 'ru', 'pl', 'cs', 'pt-PT']) {
      const read = one(paste, { locale });
      assert.deepEqual(
        lines(read),
        [
          ['Minspar 200', 300, 'g', false],
          ['Feldspath mixte 64', 250, null, false],
          ['Mondré & Manz Frit V 15 098', 980, null, false],
          ['Zirkonfritte M 130 600', 250, 'g', false],
          ['Kaolin 233', 150.5, 'g', false],
          ['Silica', 25, null, false]
        ],
        locale
      );
      assert.deepEqual(
        read.lines.map((l) => l.spaced),
        [undefined, undefined, undefined, undefined, undefined, undefined],
        locale
      );
    }
    // A name the library does not have: marked in every language, and read as the reader's language writes thousands.
    assert.partialDeepStrictEqual(one('Local clay 2 500 g', { locale: 'fr' }).lines[0], {
      name: 'Local clay',
      amount: 2500,
      spaced: '2 500'
    });
    assert.partialDeepStrictEqual(one('Local clay 2 500 g', { locale: 'en' }).lines[0], {
      name: 'Local clay 2',
      amount: 500,
      spaced: '2 500'
    });
  });

  test('reads a known name before an amount in threes as one number where the language writes thousands so', () => {
    // A French paste of known materials in grams asked of every line, though the library has no "Quartz 3".
    const paste = [
      'Feldspath potassique (Bodmer) 2\u202f500 g',
      "Kaolin d'Arvor 1\u202f250 g",
      'Quartz 3\u202f000 g',
      'Wollastonite 1\u202f100 g',
      'Talc 1\u202f150 g'
    ].join('\n');
    for (const locale of ['fr', 'sv', 'cs', 'pl', 'pt-PT', 'ru']) {
      const read = one(paste, { locale });
      assert.deepEqual(
        lines(read),
        [
          ['Feldspath potassique (Bodmer)', 2500, 'g', false],
          ["Kaolin d'Arvor", 1250, 'g', false],
          ['Quartz', 3000, 'g', false],
          ['Wollastonite', 1100, 'g', false],
          ['Talc', 1150, 'g', false]
        ],
        locale
      );
      assert.deepEqual(
        read.lines.map((l) => l.spaced),
        [undefined, undefined, undefined, undefined, undefined],
        locale
      );
    }
    // The amount first too; a choice made for the whole paste leaves such a line as it is, as it does "Minspar 200".
    assert.partialDeepStrictEqual(one('2 500 g Quartz', { locale: 'fr' }).lines[0], { name: 'Quartz', amount: 2500 });
    assert.ok(!('spaced' in one('2 500 g Quartz', { locale: 'fr' }).lines[0]));
    assert.partialDeepStrictEqual(one('Quartz 3 000 g', { locale: 'fr', spaced: 'apart' }).lines[0], {
      name: 'Quartz',
      amount: 3000
    });
    assert.ok(!('spaced' in one('Quartz 3 000 g', { locale: 'fr', spaced: 'apart' }).lines[0]));
    // A known name with the first group ("Minspar 200") is that name, as before; neither known is asked, one number
    // until the reader chooses.
    assert.deepEqual(lines(one('Minspar 200 300 g\nLocal clay 1 500 g', { locale: 'fr' })), [
      ['Minspar 200', 300, 'g', false],
      ['Local clay', 1500, 'g', false]
    ]);
    assert.deepEqual(
      one('Minspar 200 300 g\nLocal clay 1 500 g', { locale: 'fr' }).lines.map((l) => l.spaced),
      [undefined, '1 500']
    );
    // Groups at both ends, the amount first and the name's own: the amount's leave the known name. Only the name's
    // were tried: asked of, and read as "1 828,5 g Mondré & Manz Raku Frit M" at 233864.
    assert.deepEqual(lines(one('1 828,5 g Mondré & Manz Raku Frit M 233 864', { locale: 'lt' })), [
      ['Mondré & Manz Raku Frit M 233 864', 1828.5, 'g', false]
    ]);
    // In English it is asked of, as the amount's groups ("1 500"), so one number reads it right.
    assert.partialDeepStrictEqual(one('1 500 g Mondré & Manz Frit V 15 098', { spaced: { 1: 'group' } }).lines[0], {
      name: 'Mondré & Manz Frit V 15 098',
      amount: 1500,
      spaced: '1 500'
    });
    // A language that writes 1,500 asks of each, the first group ending the name until the reader chooses; but
    // never with an amount of nothing: a last group of zeros ("Quartz 3 000") is one number until the reader says.
    const english = one(paste, { locale: 'en' });
    assert.deepEqual(
      english.lines.map((l) => [l.name, l.amount, l.spaced]),
      [
        ['Feldspath potassique (Bodmer) 2', 500, '2 500'],
        ["Kaolin d'Arvor 1", 250, '1 250'],
        ['Quartz', 3000, '3 000'],
        ['Wollastonite 1', 100, '1 100'],
        ['Talc 1', 150, '1 150']
      ]
    );
    assert.partialDeepStrictEqual(one('Quartz 3 000 g', { locale: 'en', spaced: { 1: 'apart' } }).lines[0], {
      name: 'Quartz 3',
      amount: 0,
      spaced: '3 000'
    });
  });

  test('reads each line whose thousands may be set apart by a space as the reader chose for that line', () => {
    // One number for a genuine 1 500 joins no other line.
    const paste = 'Silica 1 500 g\nLocal clay 2 500 g\nWhiting 300 g';
    assert.deepEqual(lines(one(paste, { spaced: { 1: 'group' } })), [
      ['Silica', 1500, 'g', false],
      ['Local clay 2', 500, 'g', false],
      ['Whiting', 300, 'g', false]
    ]);
    assert.deepEqual(lines(one(paste, { locale: 'fr', spaced: { 2: 'apart' } })), [
      ['Silica', 1500, 'g', false],
      ['Local clay 2', 500, 'g', false],
      ['Whiting', 300, 'g', false]
    ]);
    // Each stays marked, chosen or not.
    assert.deepEqual(
      one(paste, { spaced: { 1: 'group' } }).lines.map((l) => l.spaced),
      ['1 500', '2 500', undefined]
    );
  });

  test('reads the endings numbers are written with: a full stop, ٪ and ٬, a percent sign first, units in CJK', () => {
    // A full stop after the amount, as at the end of a sentence, keeps the recipe whole.
    assert.deepEqual(lines(one('Silica 30.\nWhiting 20.\nKaolin 50.')), [
      ['Silica', 30, null, false],
      ['Whiting', 20, null, false],
      ['Kaolin', 50, null, false]
    ]);
    assert.equal(one('Silica 22.5.').lines[0].amount, 22.5);
    // The Arabic percent sign and thousands separator.
    assert.deepEqual(lines(one('Silica ٣٠٪\nKaolin ١٬٥٠٠')), [
      ['Silica', 30, '%', false],
      ['Kaolin', 1500, null, false]
    ]);
    // The percent sign before the number, as Turkish writes it.
    assert.deepEqual(lines(one('Silica %20\nKaolin % 30', { locale: 'tr' })), [
      ['Silica', 20, '%', false],
      ['Kaolin', 30, '%', false]
    ]);
    // Grams, kilograms and parts in Chinese, Japanese and Korean.
    assert.deepEqual(lines(one('Silica 30克\nKaolin 1 公斤\nWhiting 2千克\nFeldspar 40公克')), [
      ['Silica', 30, 'g', false],
      ['Kaolin', 1000, 'g', false],
      ['Whiting', 2000, 'g', false],
      ['Feldspar', 40, 'g', false]
    ]);
    assert.deepEqual(lines(one('Silica 30部\nKaolin 20 그램')), [
      ['Silica', 30, 'parts', false],
      ['Kaolin', 20, 'g', false]
    ]);
  });

  test('reads Arabic-Indic digits and the Arabic decimal mark', () => {
    assert.equal(one('Silica ٢٥٫٥').lines[0].amount, 25.5);
  });

  test('reads an amount with the marks Intl writes to keep its direction in Arabic text', () => {
    // Arabic writes 19.5‎%‎ with left-to-right marks around the sign, and Egyptian Arabic ١٩٫٥٪؜ with the Arabic
    // letter mark after it: not seen, so a copied amount carries them.
    const pasted = 'Silica 19.5‎%‎\nWhiting ‏20‎%\nKaolin ١٩٫٥٪؜\nEPK ⁧٤١⁩';
    const read = one(pasted);
    assert.equal(read.title, null);
    assert.deepEqual(lines(read), [
      ['Silica', 19.5, '%', false],
      ['Whiting', 20, '%', false],
      ['Kaolin', 19.5, '%', false],
      ['EPK', 41, null, false]
    ]);
    // Each line is kept as pasted.
    assert.deepEqual(
      read.lines.map((l) => l.text),
      pasted.split('\n')
    );
    // As Intl writes a percent in each language that uses them.
    for (const locale of ['ar', 'ar-EG', 'ar-u-nu-arab', 'fa', 'ur']) {
      const percent = (value) =>
        new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 }).format(value);
      assert.deepEqual(
        lines(one(`Silica ${percent(0.195)}\nWhiting ${percent(0.2)}\nEPK 60`, { locale })),
        [
          ['Silica', 19.5, '%', false],
          ['Whiting', 20, '%', false],
          ['EPK', 60, null, false]
        ],
        locale
      );
    }
  });
});

describe('Paste-in import: limits', () => {
  test('reads a very long line quickly, as text', () => {
    const started = Date.now();
    for (const long of [
      'a '.repeat(20000) + '1x',
      '1 '.repeat(20000),
      'x'.repeat(40000) + ' 1,5 %',
      '.,'.repeat(20000)
    ]) {
      const read = paste.parsePaste(HOST, 'Custer 50\n' + long + '\nSilica 50');
      assert.deepEqual(
        read.flatMap((r) => r.lines.map((l) => l.name)),
        ['Custer', 'Silica']
      );
    }
    assert.ok(Date.now() - started < 1000);
  });

  test('says when a paste is too long, in characters or lines, and reads nothing from it', () => {
    const { chars, lines: most } = paste.PASTE_LIMITS;
    assert.equal(paste.pasteTooLong('Custer 50\nSilica 50'), null);
    assert.equal(paste.pasteTooLong('x'.repeat(chars)), null);
    assert.equal(paste.pasteTooLong('x'.repeat(chars + 1)), 'chars');
    assert.equal(paste.pasteTooLong('\n'.repeat(most - 1)), null);
    assert.equal(paste.pasteTooLong('\n'.repeat(most)), 'lines');
    assert.deepEqual(paste.parsePaste(HOST, 'Custer 50\n'.repeat(most)), []);
    assert.deepEqual(paste.parsePaste(HOST, 'Custer 50 '.repeat(chars)), []);
  });
});

describe('Paste-in import: CSV and columns', () => {
  test('reads CSV with a heading row and quoted names with commas', () => {
    const read = one('Material,Amount\n"Feldspar, potash",25\nEPK,20\n"Silica ""325""",55');
    assert.deepEqual(lines(read), [
      ['Feldspar, potash', 25, null, false],
      ['EPK', 20, null, false],
      ['Silica "325"', 55, null, false]
    ]);
    assert.deepEqual(read.skipped, [{ line: 1, text: 'Material,Amount', why: 'columns' }]);
  });

  test('reads the columns a heading row names, in any order', () => {
    assert.deepEqual(lines(one('Amount\tMaterial\n25\tCuster\n75\tSilica')), [
      ['Custer', 25, null, false],
      ['Silica', 75, null, false]
    ]);
  });

  test('splits rows into recipes by a recipe column', () => {
    const read = paste.parsePaste(
      HOST,
      'Glaze,Material,Amount\nCeladon,Custer,40\nCeladon,Silica,60\nShino,Neph Sy,70\nShino,EPK,30'
    );
    assert.deepEqual(
      read.map((r) => [r.title, r.lines.length]),
      [
        ['Celadon', 2],
        ['Shino', 2]
      ]
    );
  });

  test('marks additions from an addition column', () => {
    assert.deepEqual(lines(one('Material;Amount;Addition\nCuster;50;\nSilica;50;\nRed iron oxide;2;+')), [
      ['Custer', 50, null, false],
      ['Silica', 50, null, false],
      ['Red iron oxide', 2, null, true]
    ]);
  });

  test('marks a row whose name starts with "+" as an addition', () => {
    assert.deepEqual(lines(one('Material;Amount\nCuster;50\n+ Tin oxide;2')), [
      ['Custer', 50, null, false],
      ['Tin oxide', 2, null, true]
    ]);
    assert.deepEqual(lines(one('Custer\t50\n+Rutile\t4')), [
      ['Custer', 50, null, false],
      ['Rutile', 4, null, true]
    ]);
  });

  test('reads a spreadsheet row with a code column before the name and a percent after it', () => {
    assert.deepEqual(lines(one('F3134\t20.00\t20.0%')), [['F3134', 20, null, false]]);
  });

  test('reads German column headings', () => {
    const read = one('Rohstoff;Menge\nKalifeldspat;30');
    assert.equal(read.skipped[0].why, 'columns');
    assert.deepEqual(lines(read), [['Kalifeldspat', 30, null, false]]);
  });
});

describe('Paste-in import: titles, notes, totals and additions', () => {
  test('reads a Glazy-style recipe: title, firing note, tab columns, total and additions', () => {
    const read = one(
      [
        'Leach 4321 Celadon',
        'Cone 10 Reduction',
        '',
        'Custer Feldspar\t40.00',
        'Whiting\t20.00',
        'EPK\t10.00',
        'Silica\t30.00',
        'Total\t100.00',
        '',
        'Additions',
        'Red Iron Oxide\t1.00',
        'Bentonite\t2.00'
      ].join('\n')
    );
    assert.equal(read.title, 'Leach 4321 Celadon');
    assert.deepEqual(read.notes, ['Cone 10 Reduction']);
    assert.deepEqual(read.skipped, [{ line: 8, text: 'Total\t100.00', why: 'total' }]);
    assert.deepEqual(lines(read), [
      ['Custer Feldspar', 40, null, false],
      ['Whiting', 20, null, false],
      ['EPK', 10, null, false],
      ['Silica', 30, null, false],
      ['Red Iron Oxide', 1, null, true],
      ['Bentonite', 2, null, true]
    ]);
  });

  test('reads a Digitalfire-style recipe: upper case, aligned columns, a percent column and "Added"', () => {
    const read = one(
      [
        'G2926B - Cone 6 Glossy Base',
        '',
        'Material          Amount   %',
        'NEPHELINE SYENITE  18.00  17.6',
        'FERRO FRIT 3134    15.00  14.7',
        'EPK                23.00  22.5',
        'WOLLASTONITE        7.00   6.9',
        'SILICA             32.00  31.4',
        'TALC                7.00   6.9',
        '                  102.00',
        'Added',
        'TIN OXIDE           2.00'
      ].join('\n')
    );
    assert.equal(read.title, 'G2926B - Cone 6 Glossy Base');
    assert.deepEqual(
      read.skipped.map((s) => s.why),
      ['columns', 'total']
    );
    assert.deepEqual(
      lines(read).map(([name, , , addition]) => [name, addition]),
      [
        ['NEPHELINE SYENITE', false],
        ['FERRO FRIT 3134', false],
        ['EPK', false],
        ['WOLLASTONITE', false],
        ['SILICA', false],
        ['TALC', false],
        ['TIN OXIDE', true]
      ]
    );
  });

  test('marks lines starting with "+" as additions, and "Add:" lines too', () => {
    assert.deepEqual(lines(one('Custer 50\nSilica 50\n+ Copper carbonate 2\n+Rutile 4\nAdd: Tin oxide 1')), [
      ['Custer', 50, null, false],
      ['Silica', 50, null, false],
      ['Copper carbonate', 2, null, true],
      ['Rutile', 4, null, true],
      ['Tin oxide', 1, null, true]
    ]);
  });

  test('knows addition headings in other languages and with brackets or colons', () => {
    for (const heading of ['Colorants:', 'Additions (%)', 'Zusätze', 'Ajouts', 'Aggiunte', 'Toevoegingen', '添加物']) {
      assert.equal(one('Custer 50\nSilica 50\n' + heading + '\nRutile 4').lines[2].addition, true, heading);
    }
  });

  test('knows the addition headings the Asian languages use, including the one each paste help names', () => {
    const headings = [
      ...['追加分', '外割', '着色剤', '추가', '첨가제', '발색제', '外加', '添加剂', '著色劑'],
      ...['ส่วนที่เติมเพิ่ม', 'สารเติมแต่ง', 'สารให้สี'],
      ...['Phần thêm', 'Phụ gia:', 'Chất tạo màu'],
      ...['Tambahan', 'Bahan tambahan (%)', 'Aditif', 'Pewarna']
    ];
    for (const heading of headings) {
      assert.equal(one('Custer 50\nSilica 50\n' + heading + '\nRutile 4').lines[2].addition, true, heading);
    }
  });

  test('knows the headings the Arabic and South Asian languages use over a base and its additions', () => {
    const recipes = {
      ar: ['الخلطة', 'الملوِّنات والإضافات', 'أكاسيد'],
      hi: ['बेस ग्लेज़', 'कलरेंट और एडिटिव', 'अतिरिक्त सामग्री'],
      ur: ['بنیادی گلیز', 'رنگ دار آکسائیڈز اور اضافی مادے', 'اضافی مادہ'],
      bn: ['মূল গ্লেজ', 'রঞ্জক উপাদান ও সংযোজন', 'সংযোজন'],
      ta: ['பேஸ் கிளேஸ்', 'கலரன்ட்களும் சேர்க்கைப் பொருட்களும்', 'சேர்க்கை'],
      mr: ['बेस ग्लेझ', 'कलरंट आणि ॲडिटिव्ह', 'भर'],
      kn: ['ಬೇಸ್ ಗ್ಲೇಜ್', 'ಕಲರೆಂಟುಗಳು ಮತ್ತು ಆಡಿಟಿವುಗಳು', 'ಸೇರ್ಪಡೆ']
    };
    for (const [code, [base, addHeading, shortHeading]] of Object.entries(recipes)) {
      for (const heading of [addHeading, shortHeading + ':', shortHeading + ' (%)']) {
        const read = one(base + '\nCuster 50\nSilica 50\n' + heading + '\nRutile 4\nTin oxide 1');
        assert.deepEqual(
          read.lines.map((l) => [l.addition]),
          [[false], [false], [true], [true]],
          code + ' ' + heading
        );
        assert.deepEqual(
          read.lines.map((l) => l.name),
          ['Custer', 'Silica', 'Rutile', 'Tin oxide']
        );
      }
    }
  });

  test('reads an Urdu heading typed with Arabic letters, and an Arabic one with Urdu letters', () => {
    for (const heading of ['اضافي مادہ', 'اضافى ماده', 'اضافی مادہ', 'اسٹين', 'رنگ دار آكسائيڈز', 'الإضافات']) {
      assert.equal(one('Custer 50\nSilica 50\n' + heading + '\nRutile 4').lines[2].addition, true, heading);
    }
    assert.deepEqual(
      one('اضافہ\nRutile 4\nبنيادي گليز\nCuster 100').lines.map((l) => l.addition),
      [true, false]
    );
    assert.deepEqual(
      one('الإضافات\nRutile 4\nبنیادی گلیز\nCuster 100').lines.map((l) => l.addition),
      [true, false]
    );
  });

  test('a base heading in the Arabic and South Asian languages starts the base again after additions', () => {
    for (const [add, base] of [
      ['الإضافات', 'الأساس'],
      ['एडिटिव', 'सामग्री'],
      ['اضافہ', 'بنیادی گلیز'],
      ['সংযোজন', 'উপাদান'],
      ['சேர்க்கை', 'ரெசிபி'],
      ['ॲडिटिव्ह', 'साहित्य'],
      ['ಆಡಿಟಿವ್', 'ಸಾಮಗ್ರಿ']
    ]) {
      assert.deepEqual(
        one(add + '\nRutile 4\n' + base + '\nCuster 100').lines.map((l) => l.addition),
        [true, false],
        add
      );
    }
  });

  test('a blank line ends a section of additions, so the next lines are base, or a new recipe', () => {
    const read = paste.parsePaste(HOST, 'Custer 50\nSilica 50\nColorants\nRutile 4\n\nCuster 40\nSilica 60');
    assert.deepEqual(
      read.map((r) => r.lines.map((l) => l.addition)),
      [
        [false, false, true],
        [false, false]
      ]
    );
    assert.deepEqual(
      one('Custer 50\nSilica 50\nColorants\nRutile 4\n\nWhiting 5').lines.map((l) => l.addition),
      [false, false, true, false]
    );
    // A blank line between the heading and its first line is only a gap.
    assert.deepEqual(
      one('Custer 100\nColorants\n\nRutile 4').lines.map((l) => l.addition),
      [false, true]
    );
  });

  test('a base heading after additions starts the base again', () => {
    assert.deepEqual(
      one('Additions\nRutile 4\nBase\nCuster 100').lines.map((l) => l.addition),
      [true, false]
    );
  });

  test('sets aside totals in other languages, and a bare number', () => {
    const read = one('Custer 50\nSilica 50\nSumme 100\nTotaal: 100\n合計 100\n100.0');
    assert.equal(read.lines.length, 2);
    assert.deepEqual(
      read.skipped.map((s) => s.why),
      ['total', 'total', 'total', 'total']
    );
  });

  test('keeps firing notes, temperatures, SG and links as notes, not materials', () => {
    const read = one(
      'Tenmoku\nCuster 50\nSilica 50\nCone 6\n^6 oxidation\nΔ10\n1240 °C\nSG 1.45\nhttps://glazy.org/recipes/1234'
    );
    assert.equal(read.lines.length, 2);
    assert.deepEqual(read.notes, [
      'Cone 6',
      '^6 oxidation',
      'Δ10',
      '1240 °C',
      'SG 1.45',
      'https://glazy.org/recipes/1234'
    ]);
  });

  test('reads a title that names a cone at its end as the title, not as a material at the cone', () => {
    // "Celadon, cone 10" over comma rows was the material "Celadon, cone" at 10, and the recipe had no title.
    const read = one('Celadon, cone 10\nCuster,40\nSilica,60');
    assert.equal(read.title, 'Celadon, cone 10');
    assert.deepEqual(lines(read), [
      ['Custer', 40, null, false],
      ['Silica', 60, null, false]
    ]);
    // Over lines of text too, with a dash, a number in the name, a cone with its zero, an SK cone, and the words of
    // other languages.
    for (const [text, locale] of [
      ['Celadon cone 10\nCuster 40\nSilica 60', 'en'],
      ['Celadon - Cone 10\nCuster 40\nSilica 60', 'en'],
      ['Leach 4321, cone 10\nCuster,40\nSilica,60', 'en'],
      ['Tenmoku, cone 06\nCuster,40\nSilica,60', 'en'],
      ['Seladon, SK 8\nKalifeldspat;40\nQuarz;60', 'de'],
      ['Seladon, Kegel 10\nKalifeldspat;40\nQuarz;60', 'de'],
      ['Céladon, cône 10\nFeldspath;40\nSilice;60', 'fr']
    ]) {
      const pasted = one(text, { locale });
      assert.equal(pasted.title, text.split('\n')[0], text);
      assert.equal(pasted.lines.length, 2, text);
    }
    // After a recipe, such a title starts the next one.
    const two = paste.parsePaste(
      HOST,
      'Celadon, cone 10\nCuster,40\nSilica,60\n\nTenmoku, cone 6\nCuster,50\nSilica,50',
      {
        isName
      }
    );
    assert.deepEqual(
      two.map((r) => [r.title, r.lines.length]),
      [
        ['Celadon, cone 10', 2],
        ['Tenmoku, cone 6', 2]
      ]
    );
  });

  test('does not take "Red iron oxide" for a reduction note', () => {
    assert.equal(one('Red iron oxide 2').lines[0].name, 'Red iron oxide');
  });

  test('gives no title when the paste starts with materials', () => {
    assert.equal(one('Custer 50\nSilica 50').title, null);
  });

  test('reads a title that ends in a number ("Leach 4321") when it is more than the materials under it', () => {
    const read = one('Leach 4321\nCuster Feldspar 40\nWhiting 20\nEPK 10\nSilica 30\n+ Red iron oxide 1', { known });
    assert.equal(read.title, 'Leach 4321');
    assert.deepEqual(
      read.lines.map((l) => l.name),
      ['Custer Feldspar', 'Whiting', 'EPK', 'Silica', 'Red iron oxide']
    );
    // After another recipe and a blank line, it starts the next.
    const both = paste.parsePaste(HOST, 'Celadon\nCuster 40\nSilica 60\n\nLeach 4321\nCuster 40\nSilica 60', {
      isName,
      known
    });
    assert.deepEqual(
      both.map((r) => [r.title, r.lines.length]),
      [
        ['Celadon', 2],
        ['Leach 4321', 2]
      ]
    );
  });

  test('keeps a first material that only looks like such a title', () => {
    // A local clay not in the library, at less than the rest together.
    assert.deepEqual(lines(one('Hawthorn Bond 40\nCuster Feldspar 30\nSilica 30', { known }))[0], [
      'Hawthorn Bond',
      40,
      null,
      false
    ]);
    // A name like a material's, a unit, a decimal, or only one line under it.
    for (const text of [
      'Custer Spa 4321\nWhiting 20\nSilica 30',
      'Leach 4321 g\nWhiting 20\nSilica 30',
      'Leach 4321.5\nWhiting 20\nSilica 30',
      'Leach 4321\nSilica 30'
    ]) {
      assert.equal(one(text, { known }).title, null, text);
    }
  });

  test('ignores blank lines, trailing spaces, Windows line ends and a byte order mark', () => {
    const read = one('﻿Celadon\r\n\r\nCuster 50   \r\n\r\n\r\nSilica 50\r\n');
    assert.equal(read.title, 'Celadon');
    assert.deepEqual(
      read.lines.map((l) => l.line),
      [3, 6]
    );
  });
});

describe('Paste-in import: several recipes', () => {
  test('starts a new recipe at a line of text after materials, with materials under it', () => {
    const read = paste.parsePaste(HOST, 'Glaze A\nCuster 50\nSilica 50\n\nGlaze B\nNeph Sy 60\nSilica 40\nFire slowly');
    assert.deepEqual(
      read.map((r) => [r.title, r.lines.map((l) => l.name), r.notes]),
      [
        ['Glaze A', ['Custer', 'Silica'], []],
        ['Glaze B', ['Neph Sy', 'Silica'], ['Fire slowly']]
      ]
    );
  });

  test('starts a new recipe after a line of dashes', () => {
    const read = paste.parsePaste(HOST, 'Custer 50\nSilica 50\n---\nWhiting 20\nEPK 80\n=====\nTalc 100');
    assert.deepEqual(
      read.map((r) => r.lines.length),
      [2, 2, 1]
    );
  });

  test('starts a new recipe after a blank line when a material comes again', () => {
    const read = paste.parsePaste(HOST, 'Custer 50\nSilica 50\n\nCuster 40\nSilica 60');
    assert.deepEqual(
      read.map((r) => r.lines.length),
      [2, 2]
    );
  });

  test('keeps one recipe across a blank line when nothing comes again', () => {
    assert.equal(paste.parsePaste(HOST, 'Custer 50\nSilica 50\n\nWhiting 10').length, 1);
  });

  test('a heading over additions does not start a new recipe', () => {
    assert.equal(paste.parsePaste(HOST, 'Custer 50\nSilica 50\nColorants\nRutile 4').length, 1);
  });

  test('reads nothing from empty text, or from text with no materials but a title', () => {
    assert.deepEqual(paste.parsePaste(HOST, ''), []);
    assert.deepEqual(paste.parsePaste(HOST, '  \n\n '), []);
    assert.deepEqual(paste.parsePaste(HOST, 'Just a note'), [
      { title: 'Just a note', notes: [], lines: [], skipped: [] }
    ]);
  });
});

describe('Paste-in import: amounts as kept', () => {
  test('gives additions as a percent when the base adds up to 100', () => {
    const read = one('Custer 60\nSilica 40\nAdditions\nRutile 4\nTin 1 g');
    assert.deepEqual(paste.importAmounts(read), [
      { amount: '60' },
      { amount: '40' },
      { amount: '4', unit: 'percent' },
      { amount: '1', unit: 'grams' }
    ]);
  });

  test('gives additions in parts when the base does not add up to 100, unless marked %', () => {
    const read = one('Custer 600\nSilica 400\n+ Rutile 40\n+ Tin 1%');
    assert.deepEqual(paste.importAmounts(read).slice(2), [
      { amount: '40', unit: 'parts' },
      { amount: '1', unit: 'percent' }
    ]);
  });

  test('keeps grams as grams, and no amount as blank', () => {
    const read = one('Custer 1 kg\nFrit 3124');
    assert.deepEqual(paste.importAmounts(read), [{ amount: '1000' }, { amount: '' }]);
  });
});

describe('Paste-in import: lines that are not amounts', () => {
  test('reads a mesh size as part of the name, never as the amount', () => {
    assert.deepEqual(
      lines(one('Silica 200 mesh\n325 mesh silica\nSilica mesh 200 5\nSilica 200 mesh 25\n325 mesh silica 10')),
      [
        ['Silica 200 mesh', null, null, false],
        ['325 mesh silica', null, null, false],
        ['Silica mesh 200', 5, null, false],
        ['Silica 200 mesh', 25, null, false],
        ['325 mesh silica', 10, null, false]
      ]
    );
    assert.deepEqual(lines(one('Silica\nSilica mesh 200')), [
      ['Silica', null, null, false],
      ['Silica mesh 200', null, null, false]
    ]);
  });

  test('sets aside a line whose name, after its amount, is a total or a note', () => {
    const read = one('Glaze\nSilica 30\n100 Total\n12 cost');
    assert.deepEqual(lines(read), [['Silica', 30, null, false]]);
    assert.deepEqual(read.skipped, [{ line: 3, text: '100 Total', why: 'total' }]);
    assert.deepEqual(read.notes, ['12 cost']);
  });

  test('sets aside a line that starts with a total or a note', () => {
    const read = one('Glaze\nSilica 30\nSumme der Rohstoffe 100\nCost per kg 12');
    assert.deepEqual(lines(read), [['Silica', 30, null, false]]);
    assert.deepEqual(
      read.skipped.map((s) => s.why),
      ['total']
    );
    assert.deepEqual(read.notes, ['Cost per kg 12']);
  });
});

describe('Paste-in import: one number of two cells', () => {
  test('reads two cells as one number as the reader writes numbers', () => {
    assert.equal(paste.joinedNumber('30,5', 'comma'), 30.5);
    assert.equal(paste.joinedNumber('30,5', 'either', 'de'), 30.5);
    assert.equal(paste.joinedNumber('30,5'), null);
    assert.equal(paste.joinedNumber('2,140.7'), 2140.7);
    assert.equal(paste.joinedNumber('1,114', 'point'), 1114);
    assert.equal(paste.joinedNumber('1.161,5'), 1161.5);
    assert.equal(paste.joinedNumber('1 183,70'), 1183.7);
    assert.equal(paste.joinedNumber('1.161,5', 'point'), null);
    assert.equal(paste.joinedNumber('1,114', 'comma'), 1.114);
    assert.equal(paste.joinedNumber('30'), null);
    assert.equal(paste.joinedNumber(undefined), null);
  });
});

// Records as a library and a potter's own records give them: a name and other names.
const RECORDS = [
  { name: 'Silica', aliases: ['Flint', 'Quartz'] },
  { name: 'Whiting', aliases: ['Calcium carbonate'] },
  { name: 'G-200 Feldspar', aliases: ['G200'] },
  { name: 'EPK Kaolin', aliases: ['EPK'] },
  { name: 'Grolleg China Clay' },
  { name: 'Tile #6 Kaolin' },
  { name: 'Custer Spar', aliases: ['Custer Feldspar'] },
  { name: 'Ferro Frit 3134' },
  { name: 'Ferro Frit 3124' },
  { name: 'Nepheline Syenite A270' },
  { name: 'Copper carbonate' },
  { name: 'Gerstley Borate' },
  { name: 'Nickel oxide, green' },
  { name: 'Nickel oxide, black' },
  { name: 'Tin oxide' },
  { name: 'Zircon' },
  { name: 'Zirconium oxide' }
];
const matched = (name, records = RECORDS) => {
  const match = paste.matchName(name, records);
  return [match.how, match.record?.name ?? null, match.candidates.map((r) => r.name)];
};

describe('Paste-in import: finding the material', () => {
  test('finds a record by its name or another name, whatever the case, width or punctuation', () => {
    assert.deepEqual(matched('WHITING').slice(0, 2), ['name', 'Whiting']);
    assert.deepEqual(matched('ｓｉｌｉｃａ').slice(0, 2), ['name', 'Silica']);
    assert.deepEqual(matched('g-200  feldspar.').slice(0, 2), ['name', 'G-200 Feldspar']);
    assert.deepEqual(matched('Calcium carbonate').slice(0, 2), ['alias', 'Whiting']);
    assert.deepEqual(matched('G 200').slice(0, 2), ['alias', 'G-200 Feldspar']);
    assert.deepEqual(matched('G-200-Feldspar').slice(0, 2), ['name', 'G-200 Feldspar']);
  });

  test('takes a close name when one stands out, and never a frit with another number', () => {
    assert.deepEqual(matched('Frit 3134').slice(0, 2), ['close', 'Ferro Frit 3134']);
    assert.deepEqual(matched('Nephaline Syenite A270').slice(0, 2), ['close', 'Nepheline Syenite A270']);
    assert.deepEqual(matched('Copper carb').slice(0, 2), ['close', 'Copper carbonate']);
    assert.deepEqual(matched('Gerstley').slice(0, 2), ['close', 'Gerstley Borate']);
    assert.deepEqual(matched('Silca').slice(0, 2), ['close', 'Silica']);
    assert.equal(paste.matchName('Frit 3135', RECORDS).record, null);
  });

  test('offers every record that differs only by a qualifier', () => {
    const [how, record, candidates] = matched('Nickel Oxide');
    assert.deepEqual([how, record], ['choose', null]);
    assert.deepEqual(candidates.slice(0, 2).sort(), ['Nickel oxide, black', 'Nickel oxide, green']);
    assert.deepEqual(matched('Tin Oxide').slice(0, 2), ['name', 'Tin oxide']);
  });

  test('chooses when no close name stands out', () => {
    const SPARS = [{ name: 'Custer Spar' }, { name: 'Kona Spar' }, { name: 'Copper carbonate' }];
    // None close enough, or two as close.
    assert.deepEqual(matched('Kona Custer', SPARS), ['choose', null, ['Custer Spar', 'Kona Spar']]);
    assert.deepEqual(matched('Spar Custer Kona', SPARS), ['choose', null, ['Custer Spar', 'Kona Spar']]);
    assert.deepEqual(matched('Ferro Frit').slice(0, 2), ['choose', null]);
  });

  test('never takes a mesh size silently', () => {
    for (const name of ['Silica 200 mesh', '325 mesh silica', 'Silica 200#']) {
      const [how, record, candidates] = matched(name);
      assert.deepEqual([how, record], ['choose', null], name);
      assert.ok(candidates.includes('Silica'), name);
    }
    assert.deepEqual(matched('Plutonium mesh'), ['none', null, []]);
  });

  test('finds nothing for a name no record has', () => {
    assert.deepEqual(paste.matchName('Plutonium', RECORDS), { how: 'none', record: null, candidates: [] });
    assert.equal(paste.matchName('  ', RECORDS).how, 'none');
    assert.equal(paste.matchName(undefined, RECORDS).how, 'none');
  });

  test('offers the records of a generic word, most common first, never picking one', () => {
    assert.deepEqual(matched('Kaolin').slice(0, 2), ['choose', null]);
    assert.deepEqual(matched('Kaolin')[2].slice(0, 3), ['EPK Kaolin', 'Grolleg China Clay', 'Tile #6 Kaolin']);
    assert.deepEqual(matched('Zircopax')[2], ['Zircon', 'Zirconium oxide']);
    assert.equal(paste.matchName('Kaolin', RECORDS, 2).candidates.length, 2);
    // Just one of the word's records: it, then the close ones.
    const one = matched('Zircopax', [{ name: 'Zircon' }, { name: 'Zircopax Plus' }, { name: 'Talc' }]);
    assert.deepEqual(one, ['choose', null, ['Zircon', 'Zircopax Plus']]);
    // None of them: as any name.
    assert.equal(paste.matchName('Zircopax', [{ name: 'Talc' }]).how, 'none');
  });

  test('takes a potter’s own record first, when listed first', () => {
    const own = { name: 'Kaolin', aliases: [] };
    assert.equal(paste.matchName('kaolin', [own, ...RECORDS]).record, own);
  });

  test('chooses among records that share a name loosely', () => {
    assert.equal(paste.matchName('Spar X', [{ name: 'Spar-X' }, { name: 'Other' }]).how, 'name');
    assert.equal(paste.matchName('Spar X', [{ name: 'Spar-X' }, { name: 'Spar X.' }]).how, 'choose');
    assert.deepEqual(
      matched('abc', [
        { name: 'One', aliases: ['A.B.C.'] },
        { name: 'Two', aliases: ['A-B-C'] }
      ]),
      ['choose', null, ['One', 'Two']]
    );
    assert.deepEqual(matched('abc', [{ name: 'One', aliases: ['A.B.C.'] }, { name: 'abc!' }]).slice(0, 2), [
      'name',
      'abc!'
    ]);
  });

  test('keeps each name it prepares for as long as the matcher is kept', () => {
    const match = paste.nameMatcher();
    const first = match('Silca', RECORDS);
    assert.deepEqual(match('Silca', RECORDS), first);
    assert.equal(match('Silca', RECORDS, 1).candidates.length, 1);
  });

  test('compares accented and plain letters loosely, and Turkish dotless i', () => {
    assert.equal(paste.compactName('Feldspäth'), paste.compactName('Feldspath'));
    assert.equal(paste.compactName('SİLİCA'), 'silica');
    assert.equal(paste.compactName('sılıca'), 'silica');
    assert.equal(paste.compactName('Straße'), 'strasse');
    assert.equal(paste.foldedName('  EPK   Kaolin '), 'epk kaolin');
    assert.ok(paste.likeness('Caolin Nacional', 'Caolín nacional superfino') > 0.7);
  });

  test('scores names by their words, their letters and their numbers', () => {
    assert.equal(paste.likeness('', 'Silica'), 0);
    assert.equal(paste.likeness('of the', 'Silica'), 0);
    assert.equal(paste.likeness('a', 'a'), 1 * 0.6 + 0.25 + 0.15);
    assert.equal(paste.likeness('a', 'b') < 0.5, true);
    // A word that starts the other, either way, and long ones a letter apart, added or taken out.
    assert.ok(paste.likeness('carb', 'carbonate') > 0.5);
    assert.ok(paste.likeness('carbonate', 'carb') > 0.5);
    assert.ok(paste.likeness('nephaline', 'nepheline') > 0.5);
    assert.ok(paste.likeness('nepheline', 'nephelines') > 0.5);
    assert.ok(paste.likeness('nephelines', 'nepheline') > 0.5);
    assert.ok(paste.likeness('abcdefg', 'abxyzfg') < 0.3);
    // A number missed: half when the name has another.
    assert.ok(paste.likeness('Frit 3135', 'Frit 3134') < paste.likeness('Frit 3135', 'Frit'));
    assert.ok(paste.likeness('Frit 3135', 'Frit') > 0);
  });
});

describe('Paste-in import: edges', () => {
  // Each recipe as [title, notes, lines as [name, amount, unit, addition, joined], what was set aside].
  const summary = (text, options = {}) =>
    paste
      .parsePaste(HOST, text, { isName, ...options })
      .map((r) => [
        r.title,
        r.notes,
        r.lines.map((l) => [l.name, l.amount, l.unit, l.addition, l.joined ?? null]),
        r.skipped.map((s) => s.why)
      ]);

  test('reads nothing from no text, and finds no numbers in it', () => {
    assert.equal(paste.pasteTooLong(undefined), null);
    assert.deepEqual(paste.parsePaste(HOST, undefined), []);
    assert.deepEqual(paste.ambiguousNumbers(undefined), []);
    assert.deepEqual(paste.ambiguousNumbers('no numbers'), []);
    assert.equal(paste.foldedName(undefined), '');
  });

  test('settles an ambiguous number by a number with both marks, or one mark twice', () => {
    assert.deepEqual(paste.ambiguousNumbers('1,500\n1,234.5'), []);
    assert.deepEqual(paste.ambiguousNumbers('1.500\n1.234.567'), []);
    // Decimal commas: 1,500 could be 1.5, so it is asked of.
    assert.deepEqual(paste.ambiguousNumbers('1,500\n1.234,5'), ['1,500']);
  });

  test('reads no amount from a fraction in digits it does not know, or a number over another', () => {
    assert.deepEqual(summary('Glaze\nSilica 𞥑/𞥒\nWhiting 20'), [
      ['Silica 𞥑/𞥒', [], [['Whiting', 20, null, false, null]], []]
    ]);
    assert.deepEqual(summary('Glaze\nCuster\t30/80\nWhiting\t20'), [
      ['Custer\t30/80', [], [['Whiting', 20, null, false, null]], []]
    ]);
  });

  test('reads a heading row by its place only where its rows fit it', () => {
    const cases = [
      // A digit in it, no number in the heading's columns, or the material's column of numbers: a title.
      ['Glaze 1,notes\nCuster,30\nWhiting,20', [['Glaze 1,notes', [], [['Custer', 30, null, false, null], ['Whiting', 20, null, false, null]], []]]],
      ['Malighafi,Kiasi\nCuster,x,5', [['Malighafi,Kiasi', [], [['Custer', 5, null, false, null]], []]]],
      ['Kiasi,Material\nCuster,30', [['Kiasi,Material', [], [['Custer', 30, null, false, null]], []]]],
      // The amount before the names, and a recipe's word over the names, which are not a recipe's.
      ['Kiasi,Malighafi\n30,Custer', [[null, [], [['Custer', 30, null, false, null]], ['columns']]]],
      ['Glasur,Kiasi\nCuster,30', [[null, [], [['Custer', 30, null, false, null]], ['columns']]]]
    ]; // prettier-ignore
    for (const [text, read] of cases) assert.deepEqual(summary(text), read, text);
  });

  test('reads a row its heading row does not fit as it would be read with none', () => {
    for (const text of [
      'Notes,Amount,Material\nfoo,30',
      'Material,Notes,Amount\nCuster,30',
      'Amount,Material\nCuster,30',
      'Material,Amount,Type\nCuster,30',
      'Material,Amount,Recipe\nCuster,30'
    ]) {
      const [name, amount] = text.includes('foo') ? ['foo', 30] : ['Custer', 30];
      assert.deepEqual(summary(text), [[null, [], [[name, amount, null, false, null]], ['columns']]], text);
    }
  });

  test('reads a row with no name as text', () => {
    assert.deepEqual(summary('Glaze\n30;40\nCuster 5'), [['30;40', [], [['Custer', 5, null, false, null]], []]]);
    assert.deepEqual(summary('30,30,5', { locale: 'de' }), [['30,30,5', [], [], []]]);
    assert.deepEqual(summary('add,30,5', { locale: 'de' }), [['add,30,5', [], [], []]]);
    assert.deepEqual(summary('5 g,30,5', { locale: 'de' }), [[null, [], [['g,30,5', 5, null, false, null]], []]]);
  });

  test('asks nothing of a known name’s number and a percent over 100', () => {
    assert.deepEqual(summary('Kaolin 233,5 %', { locale: 'de' }), [
      [null, [], [['Kaolin 233', 5, '%', false, null]], []]
    ]);
  });

  test('reads no title of a number over a name alone', () => {
    assert.deepEqual(summary('Leach 4321\nSilica\nCuster 40\nWhiting 20')[0][2].slice(0, 2), [
      ['Leach', 4321, null, false, null],
      ['Silica', null, null, false, null]
    ]);
  });

  test('keeps an empty recipe’s place for its title, through a separator', () => {
    assert.deepEqual(summary('Add:\n---\nCuster 30'), [[null, [], [['Custer', 30, null, true, null]], []]]);
    assert.deepEqual(summary('Add:\nCone 6\nTin 2'), [['Cone 6', [], [['Tin', 2, null, true, null]], []]]);
    assert.deepEqual(summary('Add:\nNotes here\nTin 2'), [['Notes here', [], [['Tin', 2, null, true, null]], []]]);
    // A firing set off by a blank line with materials under it starts the next recipe, else it is a note.
    assert.deepEqual(
      summary('Glaze\nCuster 30\n\nCone 6\nCuster 40').map(([title, notes, read]) => [title, notes, read.length]),
      [
        [null, [], 1],
        ['Cone 6', [], 1]
      ]
    );
    assert.deepEqual(summary('Glaze\nCuster 30\n\nCone 6\nNotes x')[0][1], ['Cone 6', 'Notes x']);
    assert.deepEqual(summary('Celadon\n\nCone 6\nCuster 30'), [
      ['Celadon', ['Cone 6'], [['Custer', 30, null, false, null]], []]
    ]);
    assert.deepEqual(summary('Glaze\nCuster 30\n\nCone 6'), [
      [null, ['Cone 6'], [['Custer', 30, null, false, null]], []]
    ]);
  });
});
