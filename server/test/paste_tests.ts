import { expect } from 'chai';
import recipe from '../../lib/recipe/index.js';
import type { PastedRecipe } from '../../lib/recipe/index.js';
import { GENERIC_NAMES } from '../../lib/recipe/generic-names.js';
import standardData from '../../data/index.js';

// Paste-in import (lib/recipe/paste.js): recipes pasted as text or CSV, read
// into lines, and each line's name found in the standard library.

interface LibraryRecord {
  name: string;
  aliases?: string[];
}
const LIBRARY: LibraryRecord[] = [
  ...standardData.load<LibraryRecord>('materials'),
  ...standardData.load<LibraryRecord>('additives')
];
const NAMES = new Set(LIBRARY.flatMap((r) => [r.name, ...(r.aliases ?? [])]).map(recipe.foldedName));
const isName = (text: string): boolean => NAMES.has(recipe.foldedName(text));

/** Each line as [name, amount, unit, addition]. */
const lines = (read: PastedRecipe) => read.lines.map((l) => [l.name, l.amount, l.unit, l.addition]);
const one = (text: string, options = {}): PastedRecipe => {
  const read = recipe.parsePaste(text, { isName, ...options });
  expect(read).to.have.length(1);
  return read[0];
};
const matched = (name: string) => {
  const match = recipe.matchName(name, LIBRARY);
  return [match.how, match.record?.name ?? null];
};

describe('Paste-in import: reading lines', () => {
  it('reads a name and an amount, with a percent sign, a colon, a tab or dot leaders', () => {
    const read = one('Custer Feldspar 25\nEPK 20.5 %\nSilica\t30\nWhiting: 20\nTalc ...... 5\nDolomite = 3');
    expect(lines(read)).to.eql([
      ['Custer Feldspar', 25, null, false],
      ['EPK', 20.5, '%', false],
      ['Silica', 30, null, false],
      ['Whiting', 20, null, false],
      ['Talc', 5, null, false],
      ['Dolomite', 3, null, false]
    ]);
  });

  it('reads the amount before the name, with or without a unit', () => {
    expect(lines(one('25 Custer Feldspar\n20% EPK\n30 g Silica\n4.5g Gerstley Borate\n2 parts Talc'))).to.eql([
      ['Custer Feldspar', 25, null, false],
      ['EPK', 20, '%', false],
      ['Silica', 30, 'g', false],
      ['Gerstley Borate', 4.5, 'g', false],
      ['Talc', 2, 'parts', false]
    ]);
  });

  it('keeps a number that is part of the name', () => {
    expect(lines(one('Ferro Frit 3134 20\nOM-4 Ball Clay 10\nG-200 Feldspar 30\nSilica (325 mesh) 40'))).to.eql([
      ['Ferro Frit 3134', 20, null, false],
      ['OM-4 Ball Clay', 10, null, false],
      ['G-200 Feldspar', 30, null, false],
      ['Silica (325 mesh)', 40, null, false]
    ]);
  });

  it('reads the amount first in a line with a number at each end, when a unit follows it or the rest is a known name', () => {
    expect(lines(one('19 g Ferro Frit 3124\n2,5 g Minspar 200\n30 Ferro Frit 3134\n٣٫١ g Ferro Frit 4113'))).to.eql([
      ['Ferro Frit 3124', 19, 'g', false],
      ['Minspar 200', 2.5, 'g', false],
      ['Ferro Frit 3134', 30, null, false],
      ['Ferro Frit 4113', 3.1, 'g', false]
    ]);
    // As before: the name first where the number before it is part of it, or the library knows the name that way.
    expect(lines(one('325 mesh silica 10\n6 Tile 25\nFerro Frit 3134 20'))).to.eql([
      ['325 mesh silica', 10, null, false],
      ['6 Tile', 25, null, false],
      ['Ferro Frit 3134', 20, null, false]
    ]);
  });

  it('reads a known name, a comma and its amount, though there is a digit each side of the comma', () => {
    // "Ferro Frit 3134,20" was Ferro Frit at 3134.2, the comma read as a decimal one.
    for (const locale of ['en', 'de', 'fr']) {
      expect(
        lines(one('Ferro Frit 3134,20\nMinspar 200,30\nFusion Frit F-12,16.5\nSilica,33', { locale })),
        locale
      ).to.eql([
        ['Ferro Frit 3134', 20, null, false],
        ['Minspar 200', 30, null, false],
        ['Fusion Frit F-12', 16.5, null, false],
        ['Silica', 33, null, false]
      ]);
    }
    // Two numbers after it are asked of as in any comma row: one number with a decimal comma, or two columns. It was
    // the recipe's title.
    const read = one('Ferro Frit 3134,20,5\nSilica,30\nEPK,49,5', { locale: 'de' });
    expect(read.title).to.equal(null);
    expect(read.lines.map((l) => [l.name, l.amount, l.joined])).to.eql([
      ['Ferro Frit 3134', 20.5, '20,5'],
      ['Silica', 30, undefined],
      ['EPK', 49.5, '49,5']
    ]);
    expect(one('Ferro Frit 3134,20,5', { locale: 'en' }).lines[0]).to.include({ name: 'Ferro Frit 3134', amount: 20 });
    // Under a heading row, by its columns.
    expect(lines(one('Material,Amount\nFerro Frit 3134,20\nSilica,80', { locale: 'de' }))).to.eql([
      ['Ferro Frit 3134', 20, null, false],
      ['Silica', 80, null, false]
    ]);
  });

  it('asks of a known name that ends in a number before a comma and digits, where commas mark decimals', () => {
    // German "Kaolin 233,5" is Kaolin 233 at 5, the known name, or Kaolin at 233.5: it was the first, unasked.
    const paste = 'Kaolin 233,5\nQuarz 30\nMinspar 200,30';
    const read = one(paste, { locale: 'de' });
    expect(read.lines.map((l) => [l.name, l.amount, l.joined])).to.eql([
      ['Kaolin', 233.5, '233,5'],
      ['Quarz', 30, undefined],
      ['Minspar', 200.3, '200,30']
    ]);
    // Two columns when the reader chooses them: the known name and its amount.
    expect(one(paste, { locale: 'fr', joined: 'columns' }).lines.map((l) => [l.name, l.amount, l.joined])).to.eql([
      ['Kaolin 233', 5, '233,5'],
      ['Quarz', 30, undefined],
      ['Minspar 200', 30, '200,30']
    ]);
    // Nothing to ask for a reader who writes decimal points, or in a paste whose other rows have a comma between a
    // name and a number ("Quarz,30"), or under a heading row: the comma is a column's.
    for (const [text, locale] of [
      [paste, 'en'],
      ['Kaolin 233,5\nQuarz,30', 'de'],
      ['Material,Amount\nKaolin 233,5\nQuarz 30', 'de']
    ]) {
      expect(one(text, { locale }).lines[0], text)
        .to.include({ name: 'Kaolin 233', amount: 5 })
        .and.not.have.property('joined');
    }
  });

  it('reads simple fractions and mixed numbers as amounts, and never splits a recipe on one', () => {
    // "Bentonite 1/2" was the title of a second recipe, the materials after it in that one.
    const read = one(
      'Silica 30\nBentonite 1/2\nWhiting 20\nRutile 1 1/2\nTin ½\nZircopax 2½ %\n1/4 Epsom salt\n¾ g Copper carbonate'
    );
    expect(lines(read)).to.eql([
      ['Silica', 30, null, false],
      ['Bentonite', 0.5, null, false],
      ['Whiting', 20, null, false],
      ['Rutile', 1.5, null, false],
      ['Tin', 0.5, null, false],
      ['Zircopax', 2.5, '%', false],
      ['Epsom salt', 0.25, null, false],
      ['Copper carbonate', 0.75, 'g', false]
    ]);
    expect(recipe.importAmounts(one('Silica 99\nBentonite 1/3')).map((a) => a.amount)).to.eql(['99', '0.33333']);
    // In a table's cell, and written with the fraction slash.
    expect(lines(one('Silica\t30\nBentonite\t1/2\nTin 1\u20442'))).to.eql([
      ['Silica', 30, null, false],
      ['Bentonite', 0.5, null, false],
      ['Tin', 0.5, null, false]
    ]);
    // A name that ends in a number before a fraction: the name the library has.
    expect(lines(one('Tile 6 1/2\nSilica 99'))).to.eql([
      ['Tile 6', 0.5, null, false],
      ['Silica', 99, null, false]
    ]);
    // A line with a fraction that is not an amount ("1/2 tsp") is a note, never another recipe's title.
    expect(
      recipe
        .parsePaste('Celadon\nSilica 30\nBentonite 1/2 tsp\nWhiting 20', { isName })
        .map((r) => [r.title, r.notes, r.lines.map((l) => l.name)])
    ).to.eql([['Celadon', ['Bentonite 1/2 tsp'], ['Silica', 'Whiting']]]);
    // Not fractions: a name's numbers ("Molochite 30/80"), a date, a number over a smaller one.
    expect(lines(one('Molochite 30/80 20\nMolochite 16/30\nKalifeldspat K 2/75 10'))).to.eql([
      ['Molochite 30/80', 20, null, false],
      ['Molochite 16/30', null, null, false],
      ['Kalifeldspat K 2/75', 10, null, false]
    ]);
    expect(one('Shino\nCuster 50\nFired 12/03').notes).to.eql(['Fired 12/03']);
    // A title with a number over another that is no fraction still starts the next recipe.
    const two = recipe.parsePaste('Shino\nCuster 50\nSilica 50\nShino 50/50\nCuster 40\nSilica 60', { isName });
    expect(two.map((r) => r.title)).to.eql(['Shino', 'Shino 50/50']);
  });

  it('reads a name pasted alone, which the library knows, as a material with no amount', () => {
    expect(lines(one('Recipe\nFrit 3124\nEPK 20'))).to.eql([
      ['Frit 3124', null, null, false],
      ['EPK', 20, null, false]
    ]);
  });

  it('takes the percent when grams and a percent are both given (Insight style)', () => {
    expect(lines(one('Ferro Frit 3134   250.00   25.0%\nEPK   750.0   75.0%'))).to.eql([
      ['Ferro Frit 3134', 25, '%', false],
      ['EPK', 75, '%', false]
    ]);
  });

  it('reads weights in kg, lb and oz as grams', () => {
    const read = one('Custer 1 kg\nSilica 2 lb\nWhiting 8 oz');
    expect(read.lines.map((l) => [l.amount && Math.round(l.amount * 100) / 100, l.unit])).to.eql([
      [1000, 'g'],
      [907.18, 'g'],
      [226.8, 'g']
    ]);
  });

  it('strips list marks: dashes, bullets and numbers', () => {
    expect(lines(one('- Custer 25\n* EPK 20\n• Silica 30\n1. Whiting 20\n2) Talc 5'))).to.eql([
      ['Custer', 25, null, false],
      ['EPK', 20, null, false],
      ['Silica', 30, null, false],
      ['Whiting', 20, null, false],
      ['Talc', 5, null, false]
    ]);
  });

  it('reads full-width digits and letters', () => {
    expect(lines(one('ＥＰＫ　２０．５'))).to.eql([['EPK', 20.5, null, false]]);
  });
});

describe('Paste-in import: decimal marks', () => {
  it('reads decimal commas', () => {
    expect(lines(one('Kalifeldspat 25,5\nKaolin 20,25 %', { locale: 'de' }))).to.eql([
      ['Kalifeldspat', 25.5, null, false],
      ['Kaolin', 20.25, '%', false]
    ]);
  });

  it('reads a decimal comma by the reader’s mark, and a thousands separator by their locale', () => {
    expect(one('Custer 1,250', { locale: 'en' }).lines[0].amount).to.equal(1250);
    expect(one('Custer 1,250', { locale: 'de' }).lines[0].amount).to.equal(1.25);
    expect(one('Custer 1.250', { locale: 'de' }).lines[0].amount).to.equal(1250);
    expect(one('Custer 12,5', { mark: 'comma' }).lines[0].amount).to.equal(12.5);
  });

  it('reads semicolon-separated rows with decimal commas, as European spreadsheets write CSV', () => {
    expect(lines(one('Feldspat;25,5\nKaolin;20,5\nQuarz;54', { locale: 'de' }))).to.eql([
      ['Feldspat', 25.5, null, false],
      ['Kaolin', 20.5, null, false],
      ['Quarz', 54, null, false]
    ]);
  });

  it('joins an unquoted decimal comma in a comma-separated row when the reader writes decimal commas', () => {
    expect(one('EPK,20,5', { locale: 'fr' }).lines[0].amount).to.equal(20.5);
    expect(one('EPK,20,5', { mark: 'point' }).lines[0].amount).to.equal(20);
  });

  it('never joins two cells into a decimal when a heading row named the columns', () => {
    expect(lines(one('Material,Amount,Notes\nSilica,30,5\nKaolin,20,5', { locale: 'de' }))).to.eql([
      ['Silica', 30, null, false],
      ['Kaolin', 20, null, false]
    ]);
    expect(lines(one('Name,Percent,Grams\nSilica,30,300', { locale: 'fr' }))).to.eql([['Silica', 30, null, false]]);
    // With no heading, as before.
    expect(one('Silica,30,5', { locale: 'fr' }).lines[0].amount).to.equal(30.5);
  });

  it('marks two cells that can be one number or two columns with no heading row, and reads them as chosen', () => {
    // A German reader with no heading: "30,5" is 30.5 or two columns, 30 and 5. One number, as before, and marked so
    // the page asks.
    const paste = 'Silica,30,5\nKaolin,20,5\nWhiting,49';
    const german = one(paste, { locale: 'de' });
    expect(lines(german)).to.eql([
      ['Silica', 30.5, null, false],
      ['Kaolin', 20.5, null, false],
      ['Whiting', 49, null, false]
    ]);
    expect(german.lines.map((l) => l.joined)).to.eql(['30,5', '20,5', undefined]);
    // Two columns when the reader chooses it, still marked; one number when they choose that.
    const apart = one(paste, { locale: 'de', joined: 'columns' });
    expect(lines(apart)).to.eql([
      ['Silica', 30, null, false],
      ['Kaolin', 20, null, false],
      ['Whiting', 49, null, false]
    ]);
    expect(apart.lines.map((l) => l.joined)).to.eql(['30,5', '20,5', undefined]);
    expect(one(paste, { locale: 'de', joined: 'decimal' }).lines.map((l) => l.amount)).to.eql([30.5, 20.5, 49]);
    expect(one('+ Tin oxide,2,5', { locale: 'de', joined: 'columns' }).lines[0]).to.include({
      name: 'Tin oxide',
      amount: 2,
      addition: true,
      joined: '2,5'
    });
    // A chosen comma mark is asked too; a reader who writes decimal points reads two columns, with nothing to ask.
    expect(one('Silica,30,5', { mark: 'comma' }).lines[0]).to.include({ amount: 30.5, joined: '30,5' });
    expect(one('Silica,30,5', { locale: 'en' }).lines[0])
      .to.include({ amount: 30 })
      .and.not.have.property('joined');
    expect(one('Silica,30,5', { locale: 'de', mark: 'point' }).lines[0]).not.to.have.property('joined');
    // One number is a decimal, as the page shows it, whatever the other numbers say (1,250 read as thousands here).
    const thousands = one('Feldspar 1,250\nSilica,1,500', { locale: 'de', reading: 'group' });
    expect(thousands.lines.map((l) => [l.amount, l.joined])).to.eql([
      [1250, undefined],
      [1.5, '1,500']
    ]);
    // Never two ways where it is not: under a heading row, or with a space or a quote beside the comma.
    expect(one('Material,Amount,Notes\nSilica,30,5', { locale: 'de' }).lines[0]).not.to.have.property('joined');
    for (const row of ['Silica, 30, 5', 'Silica,30 ,5', '"Silica","30","5"', 'Silica,"30",5', 'Silica,30,"5"']) {
      expect(one(row, { locale: 'de' }).lines[0], row)
        .to.include({ amount: 30 })
        .and.not.have.property('joined');
    }
  });

  it('asks of a comma row with one cell more than its heading row whether the amount is one number', () => {
    // "Material,Amount" over "Silica,30,5": the 5 is the amount's decimals, or a column the heading did not name.
    const paste = 'Material,Amount\nSilica,30,5\nKaolin,20,5\nWhiting,49';
    for (const locale of ['de', 'fr']) {
      const read = one(paste, { locale });
      expect(lines(read), locale).to.eql([
        ['Silica', 30.5, null, false],
        ['Kaolin', 20.5, null, false],
        ['Whiting', 49, null, false]
      ]);
      expect(
        read.lines.map((l) => l.joined),
        locale
      ).to.eql(['30,5', '20,5', undefined]);
      expect(read.skipped.map((s) => s.why)).to.eql(['columns']);
    }
    // Two columns when the reader chooses it, still marked.
    const apart = one(paste, { locale: 'de', joined: 'columns' });
    expect(apart.lines.map((l) => [l.amount, l.joined])).to.eql([
      [30, '30,5'],
      [20, '20,5'],
      [49, undefined]
    ]);
    // The amount's cell and the next, wherever the amount is: the columns after it keep their place.
    expect(lines(one('Material,Amount,Addition\nSilica,30,5,\nRutile,2,5,+', { locale: 'de' }))).to.eql([
      ['Silica', 30.5, null, false],
      ['Rutile', 2.5, null, true]
    ]);
    // As many cells as the heading, a reader who writes decimal points, or a space beside the comma: nothing to ask.
    expect(one('Material,Amount,Notes\nSilica,30,5', { locale: 'de' }).lines[0]).not.to.have.property('joined');
    expect(one(paste, { locale: 'en' }).lines.map((l) => [l.amount, l.joined])).to.eql([
      [30, undefined],
      [20, undefined],
      [49, undefined]
    ]);
    expect(one('Material,Amount\nSilica, 30, 5', { locale: 'de' }).lines[0])
      .to.include({ amount: 30 })
      .and.not.have.property('joined');
  });

  it('asks of a comma row whose amount has its thousands set apart inside it, one number until chosen', () => {
    const read = (text: string, options = {}) => one(text, options).lines.map((l) => [l.name, l.amount, l.joined]);
    // Each language's own 2,140.7 or 1.161,5 in an unquoted comma row: the first group was the amount, unasked.
    // A comma setting the thousands apart, before a decimal point (English, Thai, Hindi): 2140.7, or 2 and 140.7.
    expect(read('Rutile,2,140.7\nSodium Nitrate,1,114\nSilica,30', { locale: 'en' })).to.eql([
      ['Rutile', 2140.7, '2,140.7'],
      ['Sodium Nitrate', 1114, '1,114'],
      ['Silica', 30, undefined]
    ]);
    // In any script's digits (Marathi).
    expect(read('Mahavir Potash Feldspar,१,२८५', { locale: 'mr' })).to.eql([
      ['Mahavir Potash Feldspar', 1285, '१,२८५']
    ]);
    // A point or a space setting them apart, before a decimal comma (Danish, Czech's no-break space): 1161.5, or
    // 1.161 and 5.
    expect(read('Pegmatita,1.161,5\nFluorspar,1.223,5\nSilica,30', { locale: 'da' })).to.eql([
      ['Pegmatita', 1161.5, '1.161,5'],
      ['Fluorspar', 1223.5, '1.223,5'],
      ['Silica', 30, undefined]
    ]);
    expect(read('Cornish Stone,1\u00a0183,70', { locale: 'cs' })).to.eql([['Cornish Stone', 1183.7, '1\u00a0183,70']]);
    // After a known name that ends in a number ("Boraq 1" is one): Boraq at 1111.8 g, or Boraq 1 at 111.8 g, asked as
    // a decimal comma there is. It was the second, unasked.
    expect(read('Boraq 1,111.8 g\nSilica 30 g', { locale: 'en' })).to.eql([
      ['Boraq', 1111.8, '1,111.8'],
      ['Silica', 30, undefined]
    ]);
    expect(read('Boraq 1,111.8 g', { locale: 'en', joined: 'columns' })).to.eql([['Boraq 1', 111.8, '1,111.8']]);
    // Under a heading row it has one cell more than, as a decimal comma is.
    expect(read('Material,Amount\nRutile,2,140.7\nSilica,30', { locale: 'en' })).to.eql([
      ['Rutile', 2140.7, '2,140.7'],
      ['Silica', 30, undefined]
    ]);
    // Two columns when the reader chooses them.
    expect(read('Rutile,2,140.7\nSodium Nitrate,1,114', { locale: 'en', joined: 'columns' })).to.eql([
      ['Rutile', 2, '2,140.7'],
      ['Sodium Nitrate', 1, '1,114']
    ]);
    // A row of three whose last two cannot be one number ("Talc,5,50", "Kaolin,20,x"): the rows are three columns,
    // read as before. A decimal comma is asked of as before.
    expect(read('Silica,30,300\nKaolin,20,200\nTalc,5,50', { locale: 'en' })).to.eql([
      ['Silica', 30, undefined],
      ['Kaolin', 20, undefined],
      ['Talc', 5, undefined]
    ]);
    expect(read('Rutile,2,140.7\nKaolin,20,x', { locale: 'en' })).to.eql([
      ['Rutile', 2, undefined],
      ['Kaolin', 20, undefined]
    ]);
    expect(read('Silica,30,5\nKaolin,20,x', { locale: 'de' })).to.eql([
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
    ] as const) {
      expect(one(text, options).lines[0], text).not.to.have.property('joined');
    }
  });

  it('knows a heading row in any language by its place: words over rows with numbers in the same columns', () => {
    // A heading with a word no list has ("Preis") was the recipe's title.
    const read = one('Rohstoff,Menge,Preis\nKalifeldspat,30,2\nQuarz,20,1\nKaolin,50,3', { locale: 'de' });
    expect(read.title).to.equal(null);
    expect(read.skipped).to.eql([{ line: 1, text: 'Rohstoff,Menge,Preis', why: 'columns' }]);
    expect(lines(read)).to.eql([
      ['Kalifeldspat', 30, null, false],
      ['Quarz', 20, null, false],
      ['Kaolin', 50, null, false]
    ]);
    // No word any list has: the column of names, and the first column of numbers after it.
    const unknown = one('Malighafi;Kiasi;Bei\nFeldspar;30;2\nSilica;70;1');
    expect(unknown.title).to.equal(null);
    expect(unknown.skipped.map((s) => s.why)).to.eql(['columns']);
    expect(lines(unknown)).to.eql([
      ['Feldspar', 30, null, false],
      ['Silica', 70, null, false]
    ]);
    // Under a title, and after a blank line.
    const titled = one('Celadon\n\nRohstoff;Menge;Preis\nKalifeldspat;30;2\nQuarz;70;1');
    expect([titled.title, titled.skipped.map((s) => s.why), titled.lines.length]).to.eql(['Celadon', ['columns'], 2]);
    // Not a heading: a title typed with a comma and a space over rows written without one, rows with their numbers in
    // other columns, or rows not delimited as it is.
    expect(one('Shino, carbon trap\nCuster,40\nSilica,60').title).to.equal('Shino, carbon trap');
    expect(one('Glaze,Notes\nCuster,40\nSilica,60,x\n4,Whiting').skipped.map((s) => s.why)).to.eql([]);
    expect(one('Malighafi,Kiasi\nFeldspar\t30\nSilica\t70').title).to.equal('Malighafi,Kiasi');
  });

  it('reads a decimal comma in a line of text as a decimal, not a column', () => {
    expect(lines(one('Custer Feldspar 25,5'))).to.eql([['Custer Feldspar', 25.5, null, false]]);
  });

  it('decides the decimal mark once for the whole paste, not number by number', () => {
    const mixed = 'Feldspar 22,5\nEPK 1,500\nSilica 30';
    // Other numbers write decimal commas, so 1,500 could be 1.5: asked, and by default read as the locale does.
    expect(recipe.ambiguousNumbers(mixed)).to.eql(['1,500']);
    expect(one(mixed, { locale: 'en' }).lines.map((l) => l.amount)).to.eql([22.5, 1500, 30]);
    expect(one(mixed, { locale: 'de' }).lines.map((l) => l.amount)).to.eql([22.5, 1.5, 30]);
    expect(one(mixed, { reading: 'decimal' }).lines.map((l) => l.amount)).to.eql([22.5, 1.5, 30]);
    expect(one(mixed, { reading: 'group', locale: 'de' }).lines.map((l) => l.amount)).to.eql([22.5, 1500, 30]);
    // A chosen mark decides it, with nothing to ask.
    expect(recipe.ambiguousNumbers(mixed, 'comma')).to.eql([]);
    expect(one(mixed, { mark: 'comma' }).lines.map((l) => l.amount)).to.eql([22.5, 1.5, 30]);
  });

  it('reads a number that the paste’s other numbers settle as they do', () => {
    // Decimal points elsewhere: 1,500 is a thousand and a half, whatever the locale.
    const points = 'Feldspar 22.5\nEPK 1,500';
    expect(recipe.ambiguousNumbers(points)).to.eql([]);
    expect(one(points, { locale: 'de' }).lines.map((l) => l.amount)).to.eql([22.5, 1500]);
    // Decimal commas elsewhere: 1.500 is digit groups.
    const commas = 'Feldspat 22,5\nQuarz 1.500';
    expect(recipe.ambiguousNumbers(commas)).to.eql([]);
    expect(one(commas, { locale: 'en' }).lines.map((l) => l.amount)).to.eql([22.5, 1500]);
    // Nothing settles it: asked, and the locale reads it.
    expect(recipe.ambiguousNumbers('Custer 1,250')).to.eql(['1,250']);
    expect(recipe.ambiguousNumbers('Custer 12,5\nSilica 40\nWhiting 1250')).to.eql([]);
  });

  it('reads thousands set apart by a space as the language writes them, and marks each such line so the page asks', () => {
    // French sets thousands apart with a narrow no-break space, Russian with a no-break space: one number, with any space.
    for (const space of [' ', '\u00a0', '\u202f']) {
      expect(lines(one(`Silica 1${space}500 g\nWhiting 300 g`, { locale: 'fr' })), JSON.stringify(space)).to.eql([
        ['Silica', 1500, 'g', false],
        ['Whiting', 300, 'g', false]
      ]);
    }
    expect(one('Silice 1\u00a0250,5', { locale: 'ru' }).lines[0]).to.include({ name: 'Silice', amount: 1250.5 });
    expect(lines(one('1 500 g Silica', { locale: 'fr' }))).to.eql([['Silica', 1500, 'g', false]]);
    // With a name the library does not have, "Local clay 1" at 500 is a reading too: marked, so the page asks.
    expect(one('Local clay 1 500', { locale: 'sv' }).lines[0]).to.include({ amount: 1500, spaced: '1 500' });
    expect(recipe.spacedReading('fr')).to.equal('group');
    expect(recipe.spacedReading('en')).to.equal('apart');
    // English writes 1,500: read as before, the 1 ending the name, and marked so the page asks.
    const english = one('Silica 1\u202f500 g\nWhiting 300 g');
    expect(lines(english)).to.eql([
      ['Silica 1', 500, 'g', false],
      ['Whiting', 300, 'g', false]
    ]);
    expect(english.lines.map((l) => l.spaced)).to.eql(['1 500', undefined]);
    expect(one('1 500 g Silica').lines[0].spaced).to.equal('1 500');
    // Read as one number when the reader chooses it.
    expect(lines(one('Silica 1 500 g\nWhiting 12 500', { spaced: 'group' }))).to.eql([
      ['Silica', 1500, 'g', false],
      ['Whiting', 12500, null, false]
    ]);
    expect(one('Silica 1 500', { spaced: 'group' }).lines[0].spaced).to.equal('1 500');
    // Not thousands set apart: a group of other than three digits, a four-figure number in the name.
    expect(one('Silica 2 30', { locale: 'fr' }).lines[0]).to.include({ name: 'Silica 2', amount: 30 });
    expect(one('Frit 3134 500', { locale: 'fr' }).lines[0]).to.include({ name: 'Frit 3134', amount: 500 });
    expect(one('Frit 3134 500').lines[0].spaced).to.equal(undefined);
    // A cell holds only its amount: a space there sets thousands apart in any language; tabs stay columns.
    expect(lines(one('Silica\t1 500\nWhiting\t300'))).to.eql([
      ['Silica', 1500, null, false],
      ['Whiting', 300, null, false]
    ]);
    expect(lines(one('Silice\t1\t500\nCraie\t2\t300', { locale: 'fr' }))).to.eql([
      ['Silice', 1, null, false],
      ['Craie', 2, null, false]
    ]);
  });

  it('reads a known name that ends in a number before an amount in threes, in every language, with nothing to ask', () => {
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
      expect(lines(read), locale).to.eql([
        ['Minspar 200', 300, 'g', false],
        ['Feldspath mixte 64', 250, null, false],
        ['Mondré & Manz Frit V 15 098', 980, null, false],
        ['Zirkonfritte M 130 600', 250, 'g', false],
        ['Kaolin 233', 150.5, 'g', false],
        ['Silica', 25, null, false]
      ]);
      expect(
        read.lines.map((l) => l.spaced),
        locale
      ).to.eql([undefined, undefined, undefined, undefined, undefined, undefined]);
    }
    // A name the library does not have: marked in every language, and read as the reader's language writes thousands.
    expect(one('Local clay 2 500 g', { locale: 'fr' }).lines[0]).to.include({
      name: 'Local clay',
      amount: 2500,
      spaced: '2 500'
    });
    expect(one('Local clay 2 500 g', { locale: 'en' }).lines[0]).to.include({
      name: 'Local clay 2',
      amount: 500,
      spaced: '2 500'
    });
  });

  it('reads a known name before an amount in threes as one number where the language writes thousands so', () => {
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
      expect(lines(read), locale).to.eql([
        ['Feldspath potassique (Bodmer)', 2500, 'g', false],
        ["Kaolin d'Arvor", 1250, 'g', false],
        ['Quartz', 3000, 'g', false],
        ['Wollastonite', 1100, 'g', false],
        ['Talc', 1150, 'g', false]
      ]);
      expect(
        read.lines.map((l) => l.spaced),
        locale
      ).to.eql([undefined, undefined, undefined, undefined, undefined]);
    }
    // The amount first too; a choice made for the whole paste leaves such a line as it is, as it does "Minspar 200".
    expect(one('2 500 g Quartz', { locale: 'fr' }).lines[0])
      .to.include({ name: 'Quartz', amount: 2500 })
      .and.not.have.property('spaced');
    expect(one('Quartz 3 000 g', { locale: 'fr', spaced: 'apart' }).lines[0])
      .to.include({ name: 'Quartz', amount: 3000 })
      .and.not.have.property('spaced');
    // A known name with the first group ("Minspar 200") is that name, as before; neither known is asked, one number
    // until the reader chooses.
    expect(lines(one('Minspar 200 300 g\nLocal clay 1 500 g', { locale: 'fr' }))).to.eql([
      ['Minspar 200', 300, 'g', false],
      ['Local clay', 1500, 'g', false]
    ]);
    expect(one('Minspar 200 300 g\nLocal clay 1 500 g', { locale: 'fr' }).lines.map((l) => l.spaced)).to.eql([
      undefined,
      '1 500'
    ]);
    // Groups at both ends, the amount first and the name's own: the amount's leave the known name. Only the name's
    // were tried: asked of, and read as "1 828,5 g Mondré & Manz Raku Frit M" at 233864.
    expect(lines(one('1 828,5 g Mondré & Manz Raku Frit M 233 864', { locale: 'lt' }))).to.eql([
      ['Mondré & Manz Raku Frit M 233 864', 1828.5, 'g', false]
    ]);
    // In English it is asked of, as the amount's groups ("1 500"), so one number reads it right.
    expect(one('1 500 g Mondré & Manz Frit V 15 098', { spaced: { 1: 'group' } }).lines[0]).to.include({
      name: 'Mondré & Manz Frit V 15 098',
      amount: 1500,
      spaced: '1 500'
    });
    // A language that writes 1,500 asks of each, the first group ending the name until the reader chooses; but
    // never with an amount of nothing: a last group of zeros ("Quartz 3 000") is one number until the reader says.
    const english = one(paste, { locale: 'en' });
    expect(english.lines.map((l) => [l.name, l.amount, l.spaced])).to.eql([
      ['Feldspath potassique (Bodmer) 2', 500, '2 500'],
      ["Kaolin d'Arvor 1", 250, '1 250'],
      ['Quartz', 3000, '3 000'],
      ['Wollastonite 1', 100, '1 100'],
      ['Talc 1', 150, '1 150']
    ]);
    expect(one('Quartz 3 000 g', { locale: 'en', spaced: { 1: 'apart' } }).lines[0]).to.include({
      name: 'Quartz 3',
      amount: 0,
      spaced: '3 000'
    });
  });

  it('reads each line whose thousands may be set apart by a space as the reader chose for that line', () => {
    // One number for a genuine 1 500 joins no other line.
    const paste = 'Silica 1 500 g\nLocal clay 2 500 g\nWhiting 300 g';
    expect(lines(one(paste, { spaced: { 1: 'group' } }))).to.eql([
      ['Silica', 1500, 'g', false],
      ['Local clay 2', 500, 'g', false],
      ['Whiting', 300, 'g', false]
    ]);
    expect(lines(one(paste, { locale: 'fr', spaced: { 2: 'apart' } }))).to.eql([
      ['Silica', 1500, 'g', false],
      ['Local clay 2', 500, 'g', false],
      ['Whiting', 300, 'g', false]
    ]);
    // Each stays marked, chosen or not.
    expect(one(paste, { spaced: { 1: 'group' } }).lines.map((l) => l.spaced)).to.eql(['1 500', '2 500', undefined]);
  });

  it('reads the endings numbers are written with: a full stop, ٪ and ٬, a percent sign first, units in CJK', () => {
    // A full stop after the amount, as at the end of a sentence, keeps the recipe whole.
    expect(lines(one('Silica 30.\nWhiting 20.\nKaolin 50.'))).to.eql([
      ['Silica', 30, null, false],
      ['Whiting', 20, null, false],
      ['Kaolin', 50, null, false]
    ]);
    expect(one('Silica 22.5.').lines[0].amount).to.equal(22.5);
    // The Arabic percent sign and thousands separator.
    expect(lines(one('Silica ٣٠٪\nKaolin ١٬٥٠٠'))).to.eql([
      ['Silica', 30, '%', false],
      ['Kaolin', 1500, null, false]
    ]);
    // The percent sign before the number, as Turkish writes it.
    expect(lines(one('Silica %20\nKaolin % 30', { locale: 'tr' }))).to.eql([
      ['Silica', 20, '%', false],
      ['Kaolin', 30, '%', false]
    ]);
    // Grams, kilograms and parts in Chinese, Japanese and Korean.
    expect(lines(one('Silica 30克\nKaolin 1 公斤\nWhiting 2千克\nFeldspar 40公克'))).to.eql([
      ['Silica', 30, 'g', false],
      ['Kaolin', 1000, 'g', false],
      ['Whiting', 2000, 'g', false],
      ['Feldspar', 40, 'g', false]
    ]);
    expect(lines(one('Silica 30部\nKaolin 20 그램'))).to.eql([
      ['Silica', 30, 'parts', false],
      ['Kaolin', 20, 'g', false]
    ]);
  });

  it('reads Arabic-Indic digits and the Arabic decimal mark', () => {
    expect(one('Silica ٢٥٫٥').lines[0].amount).to.equal(25.5);
  });

  it('reads an amount with the marks Intl writes to keep its direction in Arabic text', () => {
    // Arabic writes 19.5‎%‎ with left-to-right marks around the sign, and Egyptian Arabic ١٩٫٥٪؜ with the Arabic
    // letter mark after it: not seen, so a copied amount carries them.
    const pasted = 'Silica 19.5‎%‎\nWhiting ‏20‎%\nKaolin ١٩٫٥٪؜\nEPK ⁧٤١⁩';
    const read = one(pasted);
    expect(read.title).to.equal(null);
    expect(lines(read)).to.eql([
      ['Silica', 19.5, '%', false],
      ['Whiting', 20, '%', false],
      ['Kaolin', 19.5, '%', false],
      ['EPK', 41, null, false]
    ]);
    // Each line is kept as pasted.
    expect(read.lines.map((l) => l.text)).to.eql(pasted.split('\n'));
    // As Intl writes a percent in each language that uses them.
    for (const locale of ['ar', 'ar-EG', 'ar-u-nu-arab', 'fa', 'ur']) {
      const percent = (value: number) =>
        new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 }).format(value);
      expect(lines(one(`Silica ${percent(0.195)}\nWhiting ${percent(0.2)}\nEPK 60`, { locale })), locale).to.eql([
        ['Silica', 19.5, '%', false],
        ['Whiting', 20, '%', false],
        ['EPK', 60, null, false]
      ]);
    }
  });
});

describe('Paste-in import: limits', () => {
  it('reads a very long line quickly, as text', () => {
    const started = Date.now();
    for (const long of [
      'a '.repeat(20000) + '1x',
      '1 '.repeat(20000),
      'x'.repeat(40000) + ' 1,5 %',
      '.,'.repeat(20000)
    ]) {
      const read = recipe.parsePaste('Custer 50\n' + long + '\nSilica 50');
      expect(read.flatMap((r) => r.lines.map((l) => l.name))).to.eql(['Custer', 'Silica']);
    }
    expect(Date.now() - started).to.be.below(1000);
  });

  it('says when a paste is too long, in characters or lines, and reads nothing from it', () => {
    const { chars, lines: most } = recipe.PASTE_LIMITS;
    expect(recipe.pasteTooLong('Custer 50\nSilica 50')).to.equal(null);
    expect(recipe.pasteTooLong('x'.repeat(chars))).to.equal(null);
    expect(recipe.pasteTooLong('x'.repeat(chars + 1))).to.equal('chars');
    expect(recipe.pasteTooLong('\n'.repeat(most - 1))).to.equal(null);
    expect(recipe.pasteTooLong('\n'.repeat(most))).to.equal('lines');
    expect(recipe.parsePaste('Custer 50\n'.repeat(most))).to.eql([]);
    expect(recipe.parsePaste('Custer 50 '.repeat(chars))).to.eql([]);
  });
});

describe('Paste-in import: CSV and columns', () => {
  it('reads CSV with a heading row and quoted names with commas', () => {
    const read = one('Material,Amount\n"Feldspar, potash",25\nEPK,20\n"Silica ""325""",55');
    expect(lines(read)).to.eql([
      ['Feldspar, potash', 25, null, false],
      ['EPK', 20, null, false],
      ['Silica "325"', 55, null, false]
    ]);
    expect(read.skipped).to.eql([{ line: 1, text: 'Material,Amount', why: 'columns' }]);
  });

  it('reads the columns a heading row names, in any order', () => {
    expect(lines(one('Amount\tMaterial\n25\tCuster\n75\tSilica'))).to.eql([
      ['Custer', 25, null, false],
      ['Silica', 75, null, false]
    ]);
  });

  it('splits rows into recipes by a recipe column', () => {
    const read = recipe.parsePaste(
      'Glaze,Material,Amount\nCeladon,Custer,40\nCeladon,Silica,60\nShino,Neph Sy,70\nShino,EPK,30'
    );
    expect(read.map((r) => [r.title, r.lines.length])).to.eql([
      ['Celadon', 2],
      ['Shino', 2]
    ]);
  });

  it('marks additions from an addition column', () => {
    expect(lines(one('Material;Amount;Addition\nCuster;50;\nSilica;50;\nRed iron oxide;2;+'))).to.eql([
      ['Custer', 50, null, false],
      ['Silica', 50, null, false],
      ['Red iron oxide', 2, null, true]
    ]);
  });

  it('marks a row whose name starts with "+" as an addition', () => {
    expect(lines(one('Material;Amount\nCuster;50\n+ Tin oxide;2'))).to.eql([
      ['Custer', 50, null, false],
      ['Tin oxide', 2, null, true]
    ]);
    expect(lines(one('Custer\t50\n+Rutile\t4'))).to.eql([
      ['Custer', 50, null, false],
      ['Rutile', 4, null, true]
    ]);
  });

  it('reads a spreadsheet row with a code column before the name and a percent after it', () => {
    expect(lines(one('F3134\t20.00\t20.0%'))).to.eql([['F3134', 20, null, false]]);
  });

  it('reads German column headings', () => {
    const read = one('Rohstoff;Menge\nKalifeldspat;30');
    expect(read.skipped[0].why).to.equal('columns');
    expect(lines(read)).to.eql([['Kalifeldspat', 30, null, false]]);
  });
});

describe('Paste-in import: titles, notes, totals and additions', () => {
  it('reads a Glazy-style recipe: title, firing note, tab columns, total and additions', () => {
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
    expect(read.title).to.equal('Leach 4321 Celadon');
    expect(read.notes).to.eql(['Cone 10 Reduction']);
    expect(read.skipped).to.eql([{ line: 8, text: 'Total\t100.00', why: 'total' }]);
    expect(lines(read)).to.eql([
      ['Custer Feldspar', 40, null, false],
      ['Whiting', 20, null, false],
      ['EPK', 10, null, false],
      ['Silica', 30, null, false],
      ['Red Iron Oxide', 1, null, true],
      ['Bentonite', 2, null, true]
    ]);
  });

  it('reads a Digitalfire-style recipe: upper case, aligned columns, a percent column and "Added"', () => {
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
    expect(read.title).to.equal('G2926B - Cone 6 Glossy Base');
    expect(read.skipped.map((s) => s.why)).to.eql(['columns', 'total']);
    expect(lines(read).map(([name, , , addition]) => [name, addition])).to.eql([
      ['NEPHELINE SYENITE', false],
      ['FERRO FRIT 3134', false],
      ['EPK', false],
      ['WOLLASTONITE', false],
      ['SILICA', false],
      ['TALC', false],
      ['TIN OXIDE', true]
    ]);
  });

  it('marks lines starting with "+" as additions, and "Add:" lines too', () => {
    expect(lines(one('Custer 50\nSilica 50\n+ Copper carbonate 2\n+Rutile 4\nAdd: Tin oxide 1'))).to.eql([
      ['Custer', 50, null, false],
      ['Silica', 50, null, false],
      ['Copper carbonate', 2, null, true],
      ['Rutile', 4, null, true],
      ['Tin oxide', 1, null, true]
    ]);
  });

  it('knows addition headings in other languages and with brackets or colons', () => {
    for (const heading of ['Colorants:', 'Additions (%)', 'Zusätze', 'Ajouts', 'Aggiunte', 'Toevoegingen', '添加物']) {
      expect(one('Custer 50\nSilica 50\n' + heading + '\nRutile 4').lines[2].addition, heading).to.equal(true);
    }
  });

  it('knows the addition headings the Asian languages use, including the one each paste help names', () => {
    const headings = [
      ...['追加分', '外割', '着色剤', '추가', '첨가제', '발색제', '外加', '添加剂', '著色劑'],
      ...['ส่วนที่เติมเพิ่ม', 'สารเติมแต่ง', 'สารให้สี'],
      ...['Phần thêm', 'Phụ gia:', 'Chất tạo màu'],
      ...['Tambahan', 'Bahan tambahan (%)', 'Aditif', 'Pewarna']
    ];
    for (const heading of headings) {
      expect(one('Custer 50\nSilica 50\n' + heading + '\nRutile 4').lines[2].addition, heading).to.equal(true);
    }
  });

  it('knows the headings the Arabic and South Asian languages use over a base and its additions', () => {
    const recipes: Record<string, [string, string, string]> = {
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
        expect(
          read.lines.map((l) => [l.addition]),
          code + ' ' + heading
        ).to.eql([[false], [false], [true], [true]]);
        expect(read.lines.map((l) => l.name)).to.eql(['Custer', 'Silica', 'Rutile', 'Tin oxide']);
      }
    }
  });

  it('reads an Urdu heading typed with Arabic letters, and an Arabic one with Urdu letters', () => {
    for (const heading of ['اضافي مادہ', 'اضافى ماده', 'اضافی مادہ', 'اسٹين', 'رنگ دار آكسائيڈز', 'الإضافات']) {
      expect(one('Custer 50\nSilica 50\n' + heading + '\nRutile 4').lines[2].addition, heading).to.equal(true);
    }
    expect(one('اضافہ\nRutile 4\nبنيادي گليز\nCuster 100').lines.map((l) => l.addition)).to.eql([true, false]);
    expect(one('الإضافات\nRutile 4\nبنیادی گلیز\nCuster 100').lines.map((l) => l.addition)).to.eql([true, false]);
  });

  it('a base heading in the Arabic and South Asian languages starts the base again after additions', () => {
    for (const [add, base] of [
      ['الإضافات', 'الأساس'],
      ['एडिटिव', 'सामग्री'],
      ['اضافہ', 'بنیادی گلیز'],
      ['সংযোজন', 'উপাদান'],
      ['சேர்க்கை', 'ரெசிபி'],
      ['ॲडिटिव्ह', 'साहित्य'],
      ['ಆಡಿಟಿವ್', 'ಸಾಮಗ್ರಿ']
    ]) {
      expect(
        one(add + '\nRutile 4\n' + base + '\nCuster 100').lines.map((l) => l.addition),
        add
      ).to.eql([true, false]);
    }
  });

  it('a blank line ends a section of additions, so the next lines are base, or a new recipe', () => {
    const read = recipe.parsePaste('Custer 50\nSilica 50\nColorants\nRutile 4\n\nCuster 40\nSilica 60');
    expect(read.map((r) => r.lines.map((l) => l.addition))).to.eql([
      [false, false, true],
      [false, false]
    ]);
    expect(one('Custer 50\nSilica 50\nColorants\nRutile 4\n\nWhiting 5').lines.map((l) => l.addition)).to.eql([
      false,
      false,
      true,
      false
    ]);
    // A blank line between the heading and its first line is only a gap.
    expect(one('Custer 100\nColorants\n\nRutile 4').lines.map((l) => l.addition)).to.eql([false, true]);
  });

  it('a base heading after additions starts the base again', () => {
    expect(one('Additions\nRutile 4\nBase\nCuster 100').lines.map((l) => l.addition)).to.eql([true, false]);
  });

  it('sets aside totals in other languages, and a bare number', () => {
    const read = one('Custer 50\nSilica 50\nSumme 100\nTotaal: 100\n合計 100\n100.0');
    expect(read.lines).to.have.length(2);
    expect(read.skipped.map((s) => s.why)).to.eql(['total', 'total', 'total', 'total']);
  });

  it('keeps firing notes, temperatures, SG and links as notes, not materials', () => {
    const read = one(
      'Tenmoku\nCuster 50\nSilica 50\nCone 6\n^6 oxidation\nΔ10\n1240 °C\nSG 1.45\nhttps://glazy.org/recipes/1234'
    );
    expect(read.lines).to.have.length(2);
    expect(read.notes).to.eql([
      'Cone 6',
      '^6 oxidation',
      'Δ10',
      '1240 °C',
      'SG 1.45',
      'https://glazy.org/recipes/1234'
    ]);
  });

  it('reads a title that names a cone at its end as the title, not as a material at the cone', () => {
    // "Celadon, cone 10" over comma rows was the material "Celadon, cone" at 10, and the recipe had no title.
    const read = one('Celadon, cone 10\nCuster,40\nSilica,60');
    expect(read.title).to.equal('Celadon, cone 10');
    expect(lines(read)).to.eql([
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
      expect(pasted.title, text).to.equal(text.split('\n')[0]);
      expect(pasted.lines, text).to.have.length(2);
    }
    // After a recipe, such a title starts the next one.
    const two = recipe.parsePaste('Celadon, cone 10\nCuster,40\nSilica,60\n\nTenmoku, cone 6\nCuster,50\nSilica,50', {
      isName
    });
    expect(two.map((r) => [r.title, r.lines.length])).to.eql([
      ['Celadon, cone 10', 2],
      ['Tenmoku, cone 6', 2]
    ]);
  });

  it('does not take "Red iron oxide" for a reduction note', () => {
    expect(one('Red iron oxide 2').lines[0].name).to.equal('Red iron oxide');
  });

  it('gives no title when the paste starts with materials', () => {
    expect(one('Custer 50\nSilica 50').title).to.equal(null);
  });

  it('reads a title that ends in a number ("Leach 4321") when it is more than the materials under it', () => {
    const known = (text: string) => recipe.matchName(text, LIBRARY).how !== 'none';
    const read = one('Leach 4321\nCuster Feldspar 40\nWhiting 20\nEPK 10\nSilica 30\n+ Red iron oxide 1', { known });
    expect(read.title).to.equal('Leach 4321');
    expect(read.lines.map((l) => l.name)).to.eql(['Custer Feldspar', 'Whiting', 'EPK', 'Silica', 'Red iron oxide']);
    // After another recipe and a blank line, it starts the next.
    const both = recipe.parsePaste('Celadon\nCuster 40\nSilica 60\n\nLeach 4321\nCuster 40\nSilica 60', {
      isName,
      known
    });
    expect(both.map((r) => [r.title, r.lines.length])).to.eql([
      ['Celadon', 2],
      ['Leach 4321', 2]
    ]);
  });

  it('keeps a first material that only looks like such a title', () => {
    const known = (text: string) => recipe.matchName(text, LIBRARY).how !== 'none';
    // A local clay not in the library, at less than the rest together.
    expect(lines(one('Hawthorn Bond 40\nCuster Feldspar 30\nSilica 30', { known }))[0]).to.eql([
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
      expect(one(text, { known }).title, text).to.equal(null);
    }
  });

  it('ignores blank lines, trailing spaces, Windows line ends and a byte order mark', () => {
    const read = one('﻿Celadon\r\n\r\nCuster 50   \r\n\r\n\r\nSilica 50\r\n');
    expect(read.title).to.equal('Celadon');
    expect(read.lines.map((l) => l.line)).to.eql([3, 6]);
  });
});

describe('Paste-in import: several recipes', () => {
  it('starts a new recipe at a line of text after materials, with materials under it', () => {
    const read = recipe.parsePaste('Glaze A\nCuster 50\nSilica 50\n\nGlaze B\nNeph Sy 60\nSilica 40\nFire slowly');
    expect(read.map((r) => [r.title, r.lines.map((l) => l.name), r.notes])).to.eql([
      ['Glaze A', ['Custer', 'Silica'], []],
      ['Glaze B', ['Neph Sy', 'Silica'], ['Fire slowly']]
    ]);
  });

  it('starts a new recipe after a line of dashes', () => {
    const read = recipe.parsePaste('Custer 50\nSilica 50\n---\nWhiting 20\nEPK 80\n=====\nTalc 100');
    expect(read.map((r) => r.lines.length)).to.eql([2, 2, 1]);
  });

  it('starts a new recipe after a blank line when a material comes again', () => {
    const read = recipe.parsePaste('Custer 50\nSilica 50\n\nCuster 40\nSilica 60');
    expect(read.map((r) => r.lines.length)).to.eql([2, 2]);
  });

  it('keeps one recipe across a blank line when nothing comes again', () => {
    expect(recipe.parsePaste('Custer 50\nSilica 50\n\nWhiting 10')).to.have.length(1);
  });

  it('a heading over additions does not start a new recipe', () => {
    expect(recipe.parsePaste('Custer 50\nSilica 50\nColorants\nRutile 4')).to.have.length(1);
  });

  it('reads nothing from empty text, or from text with no materials but a title', () => {
    expect(recipe.parsePaste('')).to.eql([]);
    expect(recipe.parsePaste('  \n\n ')).to.eql([]);
    expect(recipe.parsePaste('Just a note')).to.eql([{ title: 'Just a note', notes: [], lines: [], skipped: [] }]);
  });
});

describe('Paste-in import: amounts as kept', () => {
  it('gives additions as a percent when the base adds up to 100', () => {
    const read = one('Custer 60\nSilica 40\nAdditions\nRutile 4\nTin 1 g');
    expect(recipe.importAmounts(read)).to.eql([
      { amount: '60' },
      { amount: '40' },
      { amount: '4', unit: 'percent' },
      { amount: '1', unit: 'grams' }
    ]);
  });

  it('gives additions in parts when the base does not add up to 100, unless marked %', () => {
    const read = one('Custer 600\nSilica 400\n+ Rutile 40\n+ Tin 1%');
    expect(recipe.importAmounts(read).slice(2)).to.eql([
      { amount: '40', unit: 'parts' },
      { amount: '1', unit: 'percent' }
    ]);
  });

  it('keeps grams as grams, and no amount as blank', () => {
    const read = one('Custer 1 kg\nFrit 3124');
    expect(recipe.importAmounts(read)).to.eql([{ amount: '1000' }, { amount: '' }]);
  });
});

describe('Paste-in import: finding the material', () => {
  it('finds a material by its name, whatever the case, width or punctuation', () => {
    expect(matched('Silica')).to.eql(['name', 'Silica']);
    expect(matched('WHITING')).to.eql(['name', 'Whiting']);
    expect(matched('ｓｉｌｉｃａ')).to.eql(['name', 'Silica']);
    expect(matched('g-200  feldspar.')).to.eql(['name', 'G-200 Feldspar']);
  });

  it('finds a material by another name', () => {
    expect(matched('EPK')).to.eql(['alias', 'EPK Kaolin']);
    expect(matched('Calcium carbonate')).to.eql(['alias', 'Whiting']);
    expect(matched('G200')).to.eql(['alias', 'G-200 Feldspar']);
    expect(matched('Feldspar, potash')).to.eql(['alias', 'Potash Feldspar (Potterycrafts P3296)']);
    expect(matched('Kalifeldspat K 11')).to.eql(['alias', 'Norflux Potash Feldspar (Sibelco, K 11 / LIS D75)']);
    // It offered barium, lithium and strontium carbonate, whiting and potassium bichromate, but not Pearl Ash.
    expect(matched('Potassium carbonate')).to.eql(['alias', 'Pearl Ash']);
  });

  it('takes a close name when one stands out', () => {
    expect(matched('Custer Feldspar')).to.eql(['close', 'Custer Spar']);
    expect(matched('Frit 3134')).to.eql(['close', 'Ferro Frit 3134']);
    expect(matched('Nephaline Syenite A270')).to.eql(['close', 'Nepheline Syenite A270']);
    expect(matched('Copper carb')).to.eql(['close', 'Copper carbonate']);
    expect(matched('Gerstley')).to.eql(['close', 'Gerstley Borate']);
  });

  it('does not take a frit with another number', () => {
    const match = recipe.matchName('Frit 3135', LIBRARY);
    expect(match.record).to.equal(null);
  });

  it('asks the person to choose when several are as close', () => {
    const feldspar = recipe.matchName('Feldspar', LIBRARY);
    expect(feldspar.how).to.equal('choose');
    expect(feldspar.record).to.equal(null);
    expect(feldspar.candidates.length).to.be.within(2, 5);
    expect(recipe.matchName('Kaolin', LIBRARY).how).to.equal('choose');
    expect(recipe.matchName('Ball clay', LIBRARY).how).to.equal('choose');
  });

  it('offers every product that differs only by a qualifier, as Nickel Oxide is green or black', () => {
    const match = recipe.matchName('Nickel Oxide', LIBRARY);
    expect(match.how).to.equal('choose');
    expect(match.record).to.equal(null);
    expect(match.candidates.slice(0, 2).map((r) => r.name)).to.have.members([
      'Nickel oxide, green',
      'Nickel oxide, black'
    ]);
    // One product with the words is still taken.
    expect(matched('Tin Oxide')).to.eql(['name', 'Tin oxide']);
  });

  it('never takes a mesh size silently, nor reads it as an amount', () => {
    for (const name of ['Silica 200 mesh', '325 mesh silica', 'silica 200 Mesh']) {
      const match = recipe.matchName(name, LIBRARY);
      expect(match.how, name).to.equal('choose');
      expect(match.record, name).to.equal(null);
      expect(
        match.candidates.map((r) => r.name),
        name
      ).to.include('Silica');
    }
    expect(
      lines(one('Silica 200 mesh\n325 mesh silica\nSilica mesh 200 5\nSilica 200 mesh 25\n325 mesh silica 10'))
    ).to.eql([
      ['Silica 200 mesh', null, null, false],
      ['325 mesh silica', null, null, false],
      ['Silica mesh 200', 5, null, false],
      ['Silica 200 mesh', 25, null, false],
      ['325 mesh silica', 10, null, false]
    ]);
  });

  it('finds nothing for a name the library does not have', () => {
    expect(recipe.matchName('Plutonium', LIBRARY)).to.eql({ how: 'none', record: null, candidates: [] });
    expect(recipe.matchName('  ', LIBRARY).how).to.equal('none');
  });

  it('offers the products of a generic word as a choice, most common first, never picking one', () => {
    const names = (word: string) => recipe.matchName(word, LIBRARY).candidates.map((r) => r.name);
    for (const word of ['Kaolin', 'ball clay', 'Feldspar', 'Frit', 'Zircopax', 'Superpax', 'Soda spar', 'Titanium']) {
      const match = recipe.matchName(word, LIBRARY);
      expect(match.how, word).to.equal('choose');
      expect(match.record, word).to.equal(null);
    }
    expect(names('Kaolin').slice(0, 3)).to.eql(['EPK Kaolin', 'Grolleg China Clay', 'Tile #6 Kaolin']);
    expect(names('Ball Clay')[0]).to.equal('OM-4 Ball Clay');
    expect(names('Zircopax')).to.eql(['Zircon', 'Zirconium oxide']);
    expect(names('Zirconium silicate')[0]).to.equal('Zircon');
    expect(names('FELDSPAR')[0]).to.equal('Custer Spar');
    expect(names('Frit')[0]).to.equal('Ferro Frit 3134');
    expect(names('Nepheline Syenite')).to.eql([
      'Nepheline Syenite (typical)',
      'Nepheline Syenite A270',
      'Nepheline Syenite (Norwegian, UK)'
    ]);
    expect(names('Kaolin').length).to.be.at.most(5);
    expect(recipe.matchName('Kaolin', LIBRARY, 2).candidates).to.have.length(2);
  });

  it('still takes a library name or alias exactly, though the table offers it for a generic word', () => {
    expect(matched('Silica')).to.eql(['name', 'Silica']);
    expect(matched('Flint')).to.eql(['name', 'Flint']);
    expect(matched('Whiting')).to.eql(['name', 'Whiting']);
    expect(matched('Talc')).to.eql(['name', 'Talc']);
    expect(matched('Quartz')).to.eql(['alias', 'Silica']);
    expect(matched('Zircon')).to.eql(['name', 'Zircon']);
    expect(matched('Nepheline Syenite 270')).to.eql(['alias', 'Nepheline Syenite A270']);
  });

  it('takes a potter’s own record named like a generic word before the table', () => {
    const own = { name: 'Kaolin', aliases: [], ownedBy: 'me' };
    expect(recipe.matchName('kaolin', [own, ...LIBRARY]).record).to.equal(own);
  });

  // A name or alias the library has is taken before the table is read, so a word that is one would never offer
  // its choice: "Nepheline Syenite" took the 2017 typical formula, "Sodium feldspar" the UK Potclays spar.
  it('has no word the library has as a name or another name, so each one offers its choice', () => {
    const names = new Set(LIBRARY.flatMap((r) => [r.name, ...(r.aliases ?? [])]).map(recipe.compactName));
    const shadowed = GENERIC_NAMES.flatMap((entry) => entry.words).filter((word) =>
      names.has(recipe.compactName(word))
    );
    expect(shadowed).to.eql([]);
    for (const word of ['Nepheline Syenite', 'Sodium feldspar', 'Calcined China Clay', 'Zirconia']) {
      const match = recipe.matchName(word, LIBRARY);
      expect(match.how, word).to.equal('choose');
      expect(match.record, word).to.equal(null);
    }
  });

  it('keeps the table to words, in the library, once each', () => {
    const seen = new Set<string>();
    for (const entry of GENERIC_NAMES) {
      expect(entry.offer.length, entry.words[0]).to.be.greaterThan(0);
      for (const name of entry.offer) {
        expect(
          LIBRARY.some((r) => r.name === name),
          `${name} is not a library material`
        ).to.equal(true);
      }
      expect(new Set(entry.offer).size).to.equal(entry.offer.length);
      for (const word of entry.words) {
        const key = recipe.compactName(word);
        expect(seen.has(key), `${word} is in the table twice`).to.equal(false);
        seen.add(key);
      }
    }
  });

  it('finds a potter’s own record first, when listed first', () => {
    const own = { name: 'Silica', aliases: [], ownedBy: 'me' };
    expect(recipe.matchName('silica', [own, ...LIBRARY]).record).to.equal(own);
  });

  it('chooses among records that share a name loosely', () => {
    expect(recipe.matchName('Spar X', [{ name: 'Spar-X' }, { name: 'Other' }]).how).to.equal('name');
    expect(recipe.matchName('Spar X', [{ name: 'Spar-X' }, { name: 'Spar X.' }]).how).to.equal('choose');
    const twoAliases = recipe.matchName('abc', [
      { name: 'One', aliases: ['A.B.C.'] },
      { name: 'Two', aliases: ['A-B-C'] }
    ]);
    expect(twoAliases.how).to.equal('choose');
    expect(twoAliases.candidates.map((r) => r.name)).to.eql(['One', 'Two']);
  });

  it('prepares each record’s name once for a paste’s names, not once a line, and keeps none after it', () => {
    const typed = ['Custer Feldspar', 'Silca', 'Whitting', 'EPK kaolin clay', 'Neph Sy 270', 'Gerstly borate'];
    const names = Array.from({ length: 300 }, (_, i) => typed[i % typed.length] + (i % 7 ? '' : ' x'));
    // Counted, not timed, so a busy machine cannot fail it.
    const normalize = String.prototype.normalize;
    let normalized = 0;
    const counted = <T>(run: () => T): T => {
      normalized = 0;
      String.prototype.normalize = function (this: string, form?: 'NFC' | 'NFD' | 'NFKC' | 'NFKD') {
        normalized++;
        return normalize.call(this, form);
      };
      try {
        return run();
      } finally {
        String.prototype.normalize = normalize;
      }
    };
    // One matcher for the paste: each record's names and each pasted name worked out once, so the paste's 300
    // names cost about what the library's names do. Before, each line normalized every record's names and aliases
    // several times over (3.4 million times for these 300, about 14 ms a name).
    const match = recipe.nameMatcher();
    const first = counted(() => names.map((name) => match(name, LIBRARY)));
    const texts = new Set([...LIBRARY.flatMap((r) => [r.name, ...(r.aliases ?? [])]), ...names]).size;
    expect(normalized)
      .to.be.above(0)
      .and.at.most(3 * texts);
    // Matching them again with it works nothing out again.
    const again = counted(() => names.map((name) => match(name, LIBRARY)));
    expect(normalized).to.equal(0);
    expect(again.map((m) => [m.how, m.record?.name, m.candidates.length])).to.eql(
      first.map((m) => [m.how, m.record?.name, m.candidates.length])
    );
    // Nothing is kept outside a matcher: another, or matchName, works the library's names out again, so a
    // server keeps no one's pasted names between requests.
    counted(() => recipe.nameMatcher()('Silca', LIBRARY));
    expect(normalized).to.be.above(LIBRARY.length);
    counted(() => recipe.matchName('Silca', LIBRARY));
    expect(normalized).to.be.above(LIBRARY.length);
    expect(matched('Silca')).to.eql(['close', 'Silica']);
  });

  it('compares accented and plain letters loosely, and Turkish dotless i', () => {
    expect(recipe.compactName('Feldspäth')).to.equal(recipe.compactName('Feldspath'));
    expect(recipe.compactName('SİLİCA')).to.equal('silica');
    expect(recipe.compactName('sılıca')).to.equal('silica');
    expect(recipe.likeness('Caolin Nacional', 'Caolín nacional superfino')).to.be.above(0.7);
  });
});
