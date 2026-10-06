import { amountOf, formatAmount, rebase, totalOf, wholePartsFactor } from './rebase';

describe('rebasing a recipe', () => {
  it('turns parts into percent, with additives scaled the same way', () => {
    const result = rebase(['3', '2', '5'], ['1'], { to: 'percent' });
    expect(result).toEqual({ materials: ['30', '20', '50'], additives: ['10'] });
  });

  it('rounds percent to two places', () => {
    expect(rebase(['1', '2'], [], { to: 'percent' })!.materials).toEqual(['33.33', '66.67']);
  });

  it('turns a percent recipe into the smallest whole parts', () => {
    expect(rebase(['40', '30', '20', '10'], ['5'], { to: 'parts' })).toEqual({
      materials: ['4', '3', '2', '1'],
      additives: ['0.5']
    });
    // Rounded percents still come back as whole numbers.
    expect(rebase(['33.33', '66.67'], [], { to: 'parts' })!.materials).toEqual(['1', '2']);
  });

  it('keeps exact values for the materials that do not come out whole', () => {
    // 3 parts flint, 2 dolomite, 1.477 soda feldspar and 5.3 whiting, as percent.
    const percent = rebase(['3', '2', '1.477', '5.3'], [], { to: 'percent' })!.materials;
    expect(percent).toEqual(['25.47', '16.98', '12.54', '45']);
    expect(rebase(percent, [], { to: 'parts' })!.materials).toEqual(['3', '2', '1.477', '5.3']);
  });

  it('prefers more whole numbers, then the smallest ones', () => {
    // 1.5 and 1 make 3 and 2 whole; 1.5 alone would make 1 and 0.667.
    expect(rebase(['1.5', '1'], [], { to: 'parts' })!.materials).toEqual(['3', '2']);
    expect(wholePartsFactor([10, 10])).toBe(0.1);
  });

  it('scales to the grams of a batch', () => {
    expect(rebase(['40', '30', '20', '10'], ['2'], { to: 'batch', grams: 500 })).toEqual({
      materials: ['200', '150', '100', '50'],
      additives: ['10']
    });
    expect(rebase(['1', '2'], [], { to: 'batch', grams: 100 })!.materials).toEqual(['33.3', '66.7']);
  });

  it('leaves blank or unreadable amounts as they are, and needs something to scale', () => {
    expect(rebase(['10', '', 'abc'], [''], { to: 'percent' })).toEqual({
      materials: ['100', '', 'abc'],
      additives: ['']
    });
    expect(rebase(['', '0'], ['5'], { to: 'percent' })).toBeNull();
    expect(rebase(['10'], [], { to: 'batch', grams: 0 })).toBeNull();
  });

  it('reads amounts and totals forgivingly', () => {
    expect(amountOf(' 12.5 ')).toBe(12.5);
    expect(amountOf('-3')).toBe(0);
    expect(amountOf(undefined)).toBe(0);
    expect(totalOf(['1', '2.5', '', 'x'])).toBe(3.5);
    expect(formatAmount(12.5, 3)).toBe('12.5');
  });
});
