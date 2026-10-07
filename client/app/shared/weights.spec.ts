import { GRAMS_PER_OUNCE, GRAMS_PER_POUND, formatWeight, fromGrams, toGrams } from './weights';

describe('weights', () => {
  it('shows grams to a tenth, or a hundredth under 10 g', () => {
    expect(formatWeight(312.46, 'g')).toBe('312.5 g');
    expect(formatWeight(4938.23517, 'g')).toBe('4938.2 g');
    expect(formatWeight(5000, 'g')).toBe('5000 g');
    expect(formatWeight(2.346, 'g')).toBe('2.35 g');
    expect(formatWeight(0, 'g')).toBe('0 g');
  });

  it('shows grams in full when chosen: up to 5 decimal places, without trailing zeros', () => {
    expect(formatWeight(4938.235171, 'g', 'full')).toBe('4938.23517 g');
    expect(formatWeight(2.5, 'g', 'full')).toBe('2.5 g');
    expect(formatWeight(5000, 'g', 'full')).toBe('5000 g');
    // Pounds and ounces are as a scale reads them either way.
    expect(formatWeight(1000, 'lb', 'full')).toBe('2 lb 3.3 oz');
  });

  it('shows pounds and ounces as a scale reads them', () => {
    expect(formatWeight(2 * GRAMS_PER_POUND + 3.5 * GRAMS_PER_OUNCE, 'lb')).toBe('2 lb 3.5 oz');
    expect(formatWeight(1000, 'lb')).toBe('2 lb 3.3 oz');
    expect(formatWeight(GRAMS_PER_POUND, 'lb')).toBe('1 lb');
    // Rounded before it is split, so never "0 lb 16 oz".
    expect(formatWeight(15.96 * GRAMS_PER_OUNCE, 'lb')).toBe('1 lb');
    expect(formatWeight(3.5 * GRAMS_PER_OUNCE, 'lb')).toBe('3.5 oz');
    expect(formatWeight(0.25 * GRAMS_PER_OUNCE, 'lb')).toBe('0.25 oz');
    expect(formatWeight(0, 'lb')).toBe('0 oz');
  });

  it('reads a batch size typed in either unit', () => {
    expect(toGrams('500', 'g')).toBe(500);
    expect(toGrams(' 2.5 ', 'lb')).toBeCloseTo(1133.981, 3);
    for (const unreadable of ['', 'abc', '-3', '0', '1,5']) expect(toGrams(unreadable, 'g')).toBe(0);
    expect(fromGrams(GRAMS_PER_POUND, 'lb')).toBe(1);
    expect(fromGrams(250, 'g')).toBe(250);
  });
});
