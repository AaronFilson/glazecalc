import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { calculateUMF } from '../../../../lib/chemistry';
import { RecipeMaterial } from '../../core/models';
import { provideEnglish } from '../../testing/i18n';
import { LibraryMaterial } from './compare';
import { matchFromShelf } from './shelf';

const material = (
  name: string,
  fields: Array<[string, number]>,
  loi: number,
  info: Partial<LibraryMaterial> = {}
): LibraryMaterial => ({
  _id: name,
  name,
  percentmole: 'molecular',
  loi,
  fields: fields.map(([oxide, amount]) => ({ name: oxide, amount })),
  ...info
});

// What changed and what to watch for are messages.
beforeEach(() => {
  TestBed.configureTestingModule({ providers: provideEnglish() });
  TestBed.inject(TranslocoService);
});

const CUSTER = material(
  'Custer',
  [
    ['K2O', 0.7],
    ['Na2O', 0.3],
    ['Al2O3', 1],
    ['SiO2', 6.5]
  ],
  0,
  { category: 'feldspar' }
);
const MINSPAR = material(
  'Soda spar',
  [
    ['Na2O', 0.75],
    ['K2O', 0.25],
    ['Al2O3', 1],
    ['SiO2', 6.2]
  ],
  0,
  { category: 'feldspar' }
);
const WHITING = material('Whiting', [['CaO', 1]], 43.97);
const WOLLASTONITE = material(
  'Wollastonite',
  [
    ['CaO', 1],
    ['SiO2', 1]
  ],
  0
);
const KAOLIN = material(
  'Kaolin',
  [
    ['Al2O3', 1],
    ['SiO2', 2]
  ],
  13.96,
  { category: 'clay' }
);
const SILICA = material('Silica', [['SiO2', 1]], 0, { category: 'silica' });
const TALC = material(
  'Talc',
  [
    ['MgO', 3],
    ['SiO2', 4]
  ],
  4.75
);

const recipe = (lines: Array<[LibraryMaterial, string]>): RecipeMaterial[] =>
  lines.map(([m, amount]) => ({ ...structuredClone(m), amount }));
const unity = (lines: RecipeMaterial[]): Record<string, number> =>
  calculateUMF(lines.map((m) => ({ material: m, amount: m.amount ?? '' }))).umf;
const CELADON = recipe([
  [CUSTER, '30'],
  [SILICA, '30'],
  [WHITING, '20'],
  [KAOLIN, '20']
]);
const shelf = (...materials: LibraryMaterial[]) => materials.map((m) => ({ material: m, must: false }));

describe('making a recipe from what is on hand', () => {
  it('uses only what is on hand, keeping a material the recipe has near its amount', () => {
    const match = matchFromShelf(CELADON, shelf(MINSPAR, WHITING, KAOLIN, SILICA, TALC));
    const names = match.materials.map((m) => m.name);
    expect(names).not.toContain('Custer');
    expect(names).toContain('Soda spar');
    // Talc's magnesia is not wanted.
    expect(names).not.toContain('Talc');
    expect(match.materials.reduce((sum, m) => sum + Number(m.amount), 0)).toBeCloseTo(100, 0);
    expect(match.changes).toContain('Custer 30 → 0');
    expect(match.changes.some((c) => c.startsWith('Soda spar ') && c.endsWith(', new'))).toBe(true);
    const [was, now] = [unity(CELADON), unity(match.materials)];
    for (const oxide of ['CaO', 'Al2O3', 'SiO2']) expect(now[oxide]).toBeCloseTo(was[oxide], 1);
    expect(now['K2O'] + now['Na2O']).toBeCloseTo(was['K2O'] + was['Na2O'], 1);
    expect(match.report.uses.find((use) => use.name === 'Soda spar')!.supplies).toMatch(/soda/);
  });

  it('says what nothing on hand supplies, and keeps a must', () => {
    const match = matchFromShelf(CELADON, [
      { material: WOLLASTONITE, must: false },
      { material: KAOLIN, must: false },
      { material: SILICA, must: false },
      { material: TALC, must: true }
    ]);
    expect(match.report.unreachable.sort()).toEqual(['K2O', 'Na2O']);
    expect(match.materials.map((m) => m.name)).toContain('Talc');
  });

  it('leaves out what it is told to, and needs something on hand', () => {
    const match = matchFromShelf(CELADON, shelf(CUSTER, MINSPAR, WHITING, KAOLIN, SILICA), { avoid: ['Custer'] });
    expect(match.materials.map((m) => m.name)).not.toContain('Custer');
    expect(() => matchFromShelf(CELADON, [])).toThrowError(/no materials on hand/);
  });
});
