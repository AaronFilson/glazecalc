import { IcuTranspiler } from '../i18n/icu-transpiler';
import {
  FSI,
  LRI,
  PDI,
  forwardArrow,
  isolateUnits,
  isolateValues,
  isolated,
  ltr,
  mirrorArrows,
  pageDirection,
  sideAsSeen,
  withLatinIsolated
} from './bidi';
import { formatTemperature } from './format';
import { formatWeight } from './weights';

const message = (transpiler: IcuTranspiler, value: string, params: Record<string, unknown> = {}) =>
  transpiler.transpile({ value, params, translation: {}, key: 'x' });

describe('right-to-left text', () => {
  afterEach(() => pageDirection.set('ltr'));

  it('changes nothing on a left-to-right page', () => {
    expect(ltr('1240 °C')).toBe('1240 °C');
    expect(isolated('Celadon (v2)')).toBe('Celadon (v2)');
    expect(withLatinIsolated('Silica, SiO₂, at https://example.com/a.')).toBe(
      'Silica, SiO₂, at https://example.com/a.'
    );
    expect(formatTemperature(1240, 'C')).toBe('1240\u00a0°C');
    expect(formatWeight(12.5, 'g')).toBe('12.5 g');
    expect(forwardArrow()).toBe('→');
    expect(sideAsSeen('recipe.blends.corners.topLeft')).toBe('recipe.blends.corners.topLeft');
  });

  it('keeps a value with a Latin unit left to right, and a name apart, on a right-to-left page', () => {
    // With its no-break space.
    const temperature = formatTemperature(1240, 'C');
    pageDirection.set('rtl');
    expect(formatTemperature(1240, 'C')).toBe(LRI + temperature + PDI);
    expect(formatWeight(12.5, 'g')).toBe(LRI + '12.5 g' + PDI);
    expect(formatWeight(1000, 'lb')).toBe(LRI + '2 lb 3.3 oz' + PDI);
    expect(isolated('Celadon (v2)')).toBe(FSI + 'Celadon (v2)' + PDI);
    expect(ltr('')).toBe('');
    expect(forwardArrow()).toBe('←');
    // The grid of tiles is mirrored, so the corner drawn at the top left is the one first in the line.
    expect(sideAsSeen('recipe.blends.corners.topLeft')).toBe('recipe.blends.corners.topRight');
    expect(sideAsSeen('notebook.firing.moveRight')).toBe('notebook.firing.moveLeft');
    expect(sideAsSeen('recipe.blends.corners.top')).toBe('recipe.blends.corners.top');
  });

  it("keeps a guide's web addresses and formulas left to right on a right-to-left page", () => {
    pageDirection.set('rtl');
    expect(withLatinIsolated('سيليكا SiO₂ و Al2O3 و K₂O·Al₂O₃·6SiO₂ من https://example.com/a-b.')).toBe(
      'سيليكا ' +
        [LRI + 'SiO₂' + PDI, LRI + 'Al2O3' + PDI, LRI + 'K₂O·Al₂O₃·6SiO₂' + PDI].join(' و ') +
        ' من ' +
        LRI +
        'https://example.com/a-b' +
        PDI +
        '.'
    );
    // Words and single letters are not formulas.
    expect(withLatinIsolated('Glazecalc A Fe')).toBe('Glazecalc A Fe');
  });

  it("isolates a message's units and values, and turns its arrows, for the transpiler", () => {
    expect(isolateUnits('عند ١٢٤٠ °C و 5–10 g و SK 6a.')).toBe(
      'عند ' + LRI + '١٢٤٠ °C' + PDI + ' و ' + LRI + '5–10 g' + PDI + ' و ' + LRI + 'SK 6a' + PDI + '.'
    );
    // A scale on its own, as in "per °C", which would read "C°".
    expect(isolateUnits('٧٫٧٥ × 10⁻⁶ بير °C')).toBe('٧٫٧٥ × 10⁻⁶ بير ' + LRI + '°C' + PDI);
    // A value already kept left to right is not wrapped again; a word is not a unit.
    expect(isolateUnits(LRI + '1240 °C' + PDI + ', 12 grams')).toBe(LRI + '1240 °C' + PDI + ', 12 grams');
    expect(isolateValues({ name: 'Celadon (v2)', amount: '12.5', count: 3, done: LRI + 'x' + PDI })).toEqual({
      name: FSI + 'Celadon (v2)' + PDI,
      amount: '12.5',
      count: 3,
      done: LRI + 'x' + PDI
    });
    expect(mirrorArrows('{name} {from} → {to}')).toBe('{name} {from} ← {to}');
  });

  it('writes messages for a right-to-left page with their arrows turned and their names and units apart', () => {
    const transpiler = new IcuTranspiler();
    transpiler.onLangChanged('ar-XD');
    expect(message(transpiler, '{name} {from} → {to}', { name: 'Whiting (fine)', from: '20', to: '18.1' })).toBe(
      FSI + 'Whiting (fine)' + PDI + ' 20 ← 18.1'
    );
    expect(message(transpiler, 'Fire to {cone} °C.', { cone: '1240' })).toBe('Fire to ' + LRI + '1240 °C' + PDI + '.');
    // Plain text too.
    expect(message(transpiler, 'At 60 °C an hour → slower.')).toBe('At ' + LRI + '60 °C' + PDI + ' an hour ← slower.');

    // A left-to-right page's messages are as they were.
    transpiler.onLangChanged('en');
    expect(message(transpiler, '{name} {from} → {to}', { name: 'Whiting (fine)', from: '20', to: '18.1' })).toBe(
      'Whiting (fine) 20 → 18.1'
    );
    expect(message(transpiler, 'At 60 °C an hour → slower.')).toBe('At 60 °C an hour → slower.');
  });
});
