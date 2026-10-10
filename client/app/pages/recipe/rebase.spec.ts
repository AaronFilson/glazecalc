import {
  amountOf,
  batchWeights,
  formatAmount,
  formatScaled,
  isAmount,
  rebase,
  totalOf,
  unitOf,
  wholePartsFactor
} from './rebase';

describe('rebasing a recipe', () => {
  it('turns parts into percent; colorants in parts change with the base, those in percent do not', () => {
    const result = rebase(
      ['3', '2', '5'],
      [
        { amount: '1', unit: 'parts' },
        { amount: '2', unit: 'percent' }
      ],
      { to: 'percent' }
    );
    expect(result).toEqual({ materials: ['30', '20', '50'], additives: ['10', '2'] });
  });

  it('keeps up to five decimal places, without trailing zeros', () => {
    expect(rebase(['1', '2'], [], { to: 'percent' })!.materials).toEqual(['33.33333', '66.66667']);
    expect(formatScaled(7.00001)).toBe('7.00001');
    expect(formatScaled(4.01)).toBe('4.01');
  });

  it('turns a percent recipe into the smallest whole parts', () => {
    expect(rebase(['40', '30', '20', '10'], [{ amount: '5', unit: 'parts' }], { to: 'parts' })).toEqual({
      materials: ['4', '3', '2', '1'],
      additives: ['0.5']
    });
    // Rounded percents still come back as whole numbers.
    expect(rebase(['33.33', '66.67'], [], { to: 'parts' })!.materials).toEqual(['1', '2']);
  });

  it('keeps exact values for the materials that do not come out whole', () => {
    // 3 parts flint, 2 dolomite, 1.477 soda feldspar and 5.3 whiting, as percent and back.
    const percent = rebase(['3', '2', '1.477', '5.3'], [], { to: 'percent' })!.materials;
    expect(percent).toEqual(['25.47338', '16.98225', '12.54139', '45.00297']);
    expect(rebase(percent, [], { to: 'parts' })!.materials).toEqual(['3', '2', '1.477', '5.3']);
  });

  it('prefers more whole numbers, then the smallest ones', () => {
    // 1.5 and 1 make 3 and 2 whole; 1.5 alone would make 1 and 0.667.
    expect(rebase(['1.5', '1'], [], { to: 'parts' })!.materials).toEqual(['3', '2']);
    expect(wholePartsFactor([10, 10])).toBe(0.1);
  });

  it('scales to the grams of a batch: grams change with it, percent stays', () => {
    const additives = [
      { amount: '2', unit: 'grams' as const },
      { amount: '2', unit: 'percent' as const }
    ];
    expect(rebase(['40', '30', '20', '10'], additives, { to: 'batch', weight: 500 })).toEqual({
      materials: ['200', '150', '100', '50'],
      additives: ['10', '2']
    });
  });

  it('keeps small amounts small, never rounding them away', () => {
    // A 10 g test batch: 0.3% becomes 0.03 g, and 0.05 g of a colorant 0.005 g.
    expect(rebase(['99.7', '0.3'], [{ amount: '0.05', unit: 'grams' }], { to: 'batch', weight: 10 })).toEqual({
      materials: ['9.97', '0.03'],
      additives: ['0.005']
    });
    expect(rebase(['1000000000', '1'], [], { to: 'percent' })!.materials[1]).not.toBe('0');
  });

  it('leaves blank or unreadable amounts as they are, and needs something to scale', () => {
    expect(rebase(['10', '', 'abc'], [{ amount: '', unit: 'parts' }], { to: 'percent' })).toEqual({
      materials: ['100', '', 'abc'],
      additives: ['']
    });
    expect(rebase(['', '0'], [{ amount: '5', unit: 'parts' }], { to: 'percent' })).toBeNull();
    expect(rebase(['10'], [], { to: 'batch', weight: 0 })).toBeNull();
  });

  it('reads amounts, totals and units forgivingly', () => {
    expect(amountOf(' 12.5 ')).toBe(12.5);
    expect(amountOf('-3')).toBe(0);
    expect(amountOf(undefined)).toBe(0);
    expect(totalOf(['1', '2.5', '', 'x'])).toBe(3.5);
    expect(formatAmount(12.5, 3)).toBe('12.5');
    // Recipes saved before colorants had units read as percent.
    expect(unitOf({})).toBe('percent');
    expect(unitOf({ unit: 'grams' })).toBe('grams');
  });

  it('tells a number from something that only looks like one', () => {
    expect(['', ' ', '0', '12.5', ' 7 ', '.5', '0.0000001'].every(isAmount)).toBe(true);
    // Number() reads these, but the number parser does not, so they are not amounts and count as 0.
    const notAmounts = ['12,5', '1o', '-3', 'abc', '1e3', '0x10', '12.', 'Infinity'];
    expect(notAmounts.some(isAmount)).toBe(false);
    expect(totalOf(notAmounts)).toBe(0);
  });
});

describe('batch weights', () => {
  it('scale the materials to the batch; a colorant in % is that % of it, in parts or grams it scales too', () => {
    const weights = batchWeights(
      ['60', '40', ''],
      [
        { amount: '2', unit: 'percent' },
        { amount: '1', unit: 'parts' },
        { amount: '5', unit: 'grams' }
      ],
      1000
    );
    expect(weights).toEqual({ materials: [600, 400, 0], additives: [20, 10, 50], base: 1000, total: 1080 });
  });

  it('need amounts and a batch size', () => {
    expect(batchWeights(['', '0'], [], 500)).toBeNull();
    expect(batchWeights(['1'], [], 0)).toBeNull();
  });
});
