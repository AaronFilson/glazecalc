import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { Additive, Material, Recipe } from '../../core/models';
import { testProviders, text } from '../../testing/test-providers';
import { RecipeCompare } from './recipe-compare';

const material = (name: string, fields: Array<[string, number]>, loi: number): Material => ({
  _id: name,
  name,
  percentmole: 'molecular',
  loi,
  fields: fields.map(([oxide, amount]) => ({ name: oxide, amount }))
});
const WHITING = material('Whiting', [['CaO', 1]], 43.97);
const SILICA = material('Silica', [['SiO2', 1]], 0);
const KAOLIN = material(
  'Kaolin',
  [
    ['Al2O3', 1],
    ['SiO2', 2]
  ],
  13.96
);
const RUTILE: Additive = {
  name: 'Rutile',
  percentmole: 'molecular',
  loi: 0,
  fields: [{ name: 'TiO2', amount: '1' }],
  amount: '4',
  unit: 'percent'
};

const OLD: Recipe = {
  _id: 'old',
  title: 'Old matte',
  notes: ['None.'],
  materials: [
    { ...WHITING, amount: '20' },
    { ...KAOLIN, amount: '30' },
    { ...SILICA, amount: '50' }
  ],
  additives: [RUTILE],
  includeAdditives: true
};
const NEW: Recipe = {
  title: 'New matte',
  notes: 'Swapped one for one.',
  materials: [
    { ...WHITING, amount: '25' },
    { ...KAOLIN, amount: '30' },
    { ...SILICA, amount: '45' }
  ],
  additives: [RUTILE]
};

type Page = Record<string, any>;

describe('RecipeCompare', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: testProviders() }));

  const create = async (left: Recipe | null = OLD, right: Recipe | null = NEW) => {
    const fixture = TestBed.createComponent(RecipeCompare);
    fixture.componentRef.setInput('left', left);
    fixture.componentRef.setInput('right', right);
    fixture.componentRef.setInput('leftKey', left ? (left._id ?? 'draft') : '');
    fixture.componentRef.setInput('rightKey', right ? 'draft' : '');
    fixture.componentRef.setInput('choices', [
      { key: 'draft', label: 'Being edited: New matte' },
      { key: 'old', label: 'Old matte' }
    ]);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const rowOf = (label: string) =>
      [...root.querySelectorAll('.compare-table tbody tr')]
        .map((tr) => [...tr.children].map((cell) => cell.textContent?.trim()))
        .find((cells) => cells[0] === label);
    return { fixture, root, rowOf, page: fixture.componentInstance as unknown as Page };
  };

  it('lines up the two unity formulas with the change, and lists each recipe', async () => {
    const { fixture, root, rowOf } = await create();
    expect(text(fixture, '#compare-title')).toBe('Old matte and New matte');
    // The columns are named as the choices name the recipes.
    expect([...root.querySelectorAll('.compare-table thead th')].map((th) => th.textContent?.trim())).toEqual([
      'Oxide',
      'Old matte',
      'Being edited: New matte',
      'Change'
    ]);
    expect(rowOf('CaO')).toEqual(['CaO', '1.000', '1.000', 'same']);
    // More whiting, less silica: the silica to alumina ratio drops.
    expect(rowOf('Silica to alumina')?.[3]).toMatch(/^−/);
    expect([...root.querySelectorAll('.compare-recipe h3')].map((h) => h.textContent?.trim())).toEqual([
      'Old matte',
      'New matte'
    ]);
    expect(text(fixture, '.compare-recipe:nth-child(2) .compare-notes')).toBe('Swapped one for one.');
    expect(TestBed.inject(Title).getTitle()).toBe('Compare Old matte and New matte - Glazecalc');
  });

  it('counts colorants as each recipe says, or the same in both, and says when they differ', async () => {
    const { fixture, root, rowOf } = await create();
    // The old one counts its rutile; the new one does not.
    expect(text(fixture, '.compare-note')).toContain('One of these counts its colorants');
    expect(rowOf('TiO₂')?.slice(1, 3)).toEqual([expect.stringMatching(/^0\.\d+$/), '-']);

    (root.querySelector('#compare-counting-both') as HTMLInputElement).click();
    await fixture.whenStable();
    expect(root.querySelector('.compare-note')).toBeNull();
    expect(rowOf('TiO₂')?.[2]).toMatch(/^0\.\d+$/);

    (root.querySelector('#compare-counting-neither') as HTMLInputElement).click();
    await fixture.whenStable();
    expect(rowOf('TiO₂')).toBeUndefined();
    expect(text(fixture, '.compare-table caption')).toBe('Unity formulas, without colorants');
  });

  it('asks for the recipe to choose, and says which side changed', async () => {
    const { fixture, root } = await create(OLD, null);
    const right = root.querySelector('#compare-right') as HTMLSelectElement;
    expect(right.value).toBe('');
    expect(right.options[0].textContent?.trim()).toBe('Choose a recipe');
    expect(text(fixture, '#compare-title')).toBe('Old matte and a recipe to choose');

    const chosen: unknown[] = [];
    fixture.componentInstance.choose.subscribe((choice) => chosen.push(choice));
    right.value = 'draft';
    right.dispatchEvent(new Event('change'));
    expect(chosen).toEqual([{ side: 'right', key: 'draft' }]);

    let back = 0;
    fixture.componentInstance.back.subscribe(() => back++);
    [...root.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Back to the recipe')?.click();
    expect(back).toBe(1);
  });

  it('asks for a recipe again when the one asked for is not there (removed, or the page reloaded)', async () => {
    const { fixture, root } = await create(OLD, null);
    fixture.componentRef.setInput('rightKey', 'gone');
    await fixture.whenStable();
    const right = root.querySelector('#compare-right') as HTMLSelectElement;
    expect(right.value).toBe('');
    expect(right.options[0].textContent?.trim()).toBe('Choose a recipe');
  });

  it('says when a recipe has no unity formula', async () => {
    const { fixture } = await create(OLD, { title: 'Just silica', materials: [{ ...SILICA, amount: '10' }] });
    expect(text(fixture, '.compare-problem')).toContain('Just silica has no unity formula');
  });
});
