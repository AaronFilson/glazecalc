import { expect } from 'chai';
import recipe from '../../lib/recipe/index.js';
import type { PastedRecipe } from '../../lib/recipe/index.js';
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

  it('reads a decimal comma in a line of text as a decimal, not a column', () => {
    expect(lines(one('Custer Feldspar 25,5'))).to.eql([['Custer Feldspar', 25.5, null, false]]);
  });

  it('reads Arabic-Indic digits and the Arabic decimal mark', () => {
    expect(one('Silica ٢٥٫٥').lines[0].amount).to.equal(25.5);
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

  it('does not take "Red iron oxide" for a reduction note', () => {
    expect(one('Red iron oxide 2').lines[0].name).to.equal('Red iron oxide');
  });

  it('gives no title when the paste starts with materials', () => {
    expect(one('Custer 50\nSilica 50').title).to.equal(null);
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
  });

  it('takes a close name when one stands out', () => {
    expect(matched('Custer Feldspar')).to.eql(['close', 'Custer Spar']);
    expect(matched('Frit 3134')).to.eql(['close', 'Ferro Frit 3134']);
    expect(matched('Nephaline Syenite')).to.eql(['close', 'Nepheline Syenite']);
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

  it('finds nothing for a name the library does not have', () => {
    expect(recipe.matchName('Zircopax', LIBRARY)).to.eql({ how: 'none', record: null, candidates: [] });
    expect(recipe.matchName('  ', LIBRARY).how).to.equal('none');
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

  it('compares accented and plain letters loosely, and Turkish dotless i', () => {
    expect(recipe.compactName('Feldspäth')).to.equal(recipe.compactName('Feldspath'));
    expect(recipe.compactName('SİLİCA')).to.equal('silica');
    expect(recipe.compactName('sılıca')).to.equal('silica');
    expect(recipe.likeness('Caolin Nacional', 'Caolín nacional superfino')).to.be.above(0.7);
  });
});
