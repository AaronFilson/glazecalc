import { TestBed } from '@angular/core/testing';
import { calculateUMF } from '../../../../lib/chemistry';
import { Additive, Material, RecipeMaterial } from '../../core/models';
import { provideEnglish } from '../../testing/i18n';
import { text } from '../../testing/test-providers';
import { evaluate } from './recipe-analysis';
import { WorkedCalculation, workedResult } from './worked-calculation';

const WHITING: Material = {
  name: 'Whiting',
  percentmole: 'molecular',
  loi: 43.97,
  fields: [{ name: 'CaO', amount: 1 }]
};
const FELDSPAR: Material = {
  name: 'Potash feldspar',
  percentmole: 'molecular',
  loi: 0,
  fields: [
    { name: 'K2O', amount: 1 },
    { name: 'Al2O3', amount: 1 },
    { name: 'SiO2', amount: 6 }
  ]
};
const SILICA: Material = { name: 'Silica', percentmole: 'molecular', loi: 0, fields: [{ name: 'SiO2', amount: 1 }] };
const MATERIALS: RecipeMaterial[] = [
  { ...FELDSPAR, amount: '40' },
  { ...WHITING, amount: '20' },
  { ...SILICA, amount: '40' },
  { ...SILICA, name: 'Left out', amount: '' }
];
const IRON: Additive = {
  name: 'Red iron oxide',
  percentmole: 'molecular',
  loi: 0,
  fields: [{ name: 'Fe2O3', amount: 1 }],
  amount: '2',
  unit: 'percent'
};

/** The cells of each row the selector finds, as text. */
const rows = (root: Element, selector: string) =>
  [...root.querySelectorAll(selector)].map((row) =>
    [...row.children].map((cell) => (cell.textContent ?? '').replace(/\s+/g, ' ').trim())
  );

describe('workedResult', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: provideEnglish() }));

  it("comes to the recipe page's unity formula, from the same lines", () => {
    for (const includeAdditives of [false, true]) {
      const { working } = workedResult(MATERIALS, [IRON], includeAdditives);
      const page = evaluate(MATERIALS, [IRON], { includeAdditives }).analysis!;
      expect(working!.oxides.map((o) => o.oxide).sort()).toEqual(Object.keys(page.uList).sort());
      for (const total of working!.oxides) expect(total.unity).toBeCloseTo(page.uList[total.oxide], 12);
    }
    // Counted, the iron is one more line, at 2% of the base's 100.
    expect(workedResult(MATERIALS, [IRON], true).working!.materials.at(-1)).toMatchObject({
      name: 'Red iron oxide',
      grams: 2
    });
  });

  it('says why there is no working', () => {
    expect(workedResult([], [], false)).toEqual({ working: null, problem: null, leftOut: [] });
    const silicaOnly = workedResult([{ ...SILICA, amount: '10' }], [], false);
    expect(silicaOnly.working).toBeNull();
    expect(silicaOnly.problem).toMatch(/flux/i);
  });
});

describe('WorkedCalculation', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: provideEnglish() }));

  const create = async (materials: RecipeMaterial[] = MATERIALS, level?: number) => {
    const fixture = TestBed.createComponent(WorkedCalculation);
    fixture.componentRef.setInput('materials', materials);
    if (level) fixture.componentRef.setInput('level', level);
    await fixture.whenStable();
    return { fixture, root: fixture.nativeElement as HTMLElement };
  };

  it("shows each step with the recipe's numbers, and the unity formula it comes to", async () => {
    const { fixture, root } = await create();
    const tables = [...root.querySelectorAll('.worked-table')];
    // Grams, one table per material with an amount, the totals, the division.
    expect(tables).toHaveLength(6);
    expect(rows(tables[0], 'tbody tr')).toEqual([
      ['Potash feldspar', '40'],
      ['Whiting', '20'],
      ['Silica', '40']
    ]);
    expect(rows(tables[0], 'tfoot tr')).toEqual([['Total', '100']]);

    const whiting = tables[2];
    expect(whiting.querySelector('caption')?.textContent).toContain('Whiting: 20 g');
    expect(whiting.querySelector('caption')?.textContent).toContain('Loss on ignition 43.97%');
    const [[oxide, percent, grams, molarMass, moles]] = rows(whiting, 'tbody tr');
    expect([oxide, percent]).toEqual(['CaO', '56.03']);
    expect(Number(grams)).toBeCloseTo((20 * 56.03) / 100, 2);
    expect(Number(moles)).toBeCloseTo(Number(grams) / Number(molarMass), 3);

    const umf = calculateUMF(
      MATERIALS.filter((m) => m.amount).map((material) => ({ material, amount: material.amount }))
    ).umf;
    const division = rows(tables[5], 'tbody tr');
    expect(division.map((row) => row[0])).toEqual(['K₂O', 'CaO', 'Al₂O₃', 'SiO₂']);
    const keys: Record<string, string> = { 'K₂O': 'K2O', CaO: 'CaO', 'Al₂O₃': 'Al2O3', 'SiO₂': 'SiO2' };
    for (const [label, , , unity] of division) expect(unity).toBe(umf[keys[label]].toFixed(3));
    expect(rows(tables[5], 'tfoot tr')).toEqual([['The fluxes together', '1.000']]);
    // The fluxes' moles, added up, as a sum to check by hand.
    expect(text(fixture, '.worked-math')).toMatch(/^0\.\d{4} \+ 0\.\d{4} = 0\.\d{4}$/);
    expect(text(fixture, '.worked-answer')).toContain('CaO : ' + umf['CaO'].toFixed(3));
  });

  it('names its headings at the level it is given, each step one below', async () => {
    const { root } = await create(MATERIALS, 2);
    expect(root.querySelector('#worked-heading')?.getAttribute('aria-level')).toBe('2');
    const steps = [...root.querySelectorAll('.worked-subheading')].map((h) => h.getAttribute('aria-level'));
    expect(steps.length).toBe(5);
    expect(new Set(steps)).toEqual(new Set(['3']));
  });

  it('says when there is nothing to work out', async () => {
    const { fixture } = await create([{ ...SILICA, amount: '' }]);
    expect(text(fixture)).toContain('There is nothing to work out: the materials have no amounts.');
  });
});
