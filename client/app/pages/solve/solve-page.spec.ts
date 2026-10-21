import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { molesOf, unityOf } from '../../../../lib/recipe/materials';
import { Material } from '../../core/models';
import { PendingRecipeService } from '../../core/pending-recipe.service';
import {
  answer,
  fieldProblem,
  httpMock,
  settle,
  skippedHeadings,
  testProviders,
  text
} from '../../testing/test-providers';
import { SolvePage } from './solve-page';

const material = (
  name: string,
  fields: Array<[string, number]>,
  loi: number,
  more: Partial<Material> = {}
): Material => ({
  _id: 'id-' + name,
  ownedBy: 'Standard',
  name,
  percentmole: 'molecular',
  loi,
  fields: fields.map(([oxide, amount]) => ({ name: oxide, amount })),
  ...more
});
const WHITING = material('Whiting', [['CaO', 1]], 43.97);
const SILICA = material('Silica', [['SiO2', 1]], 0);
const SPAR = material(
  'Potash feldspar',
  [
    ['K2O', 1],
    ['Al2O3', 1],
    ['SiO2', 6]
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
  { category: 'clay', hazards: 'H373: may cause damage to the lungs through long or repeated breathing in.' }
);
const STANDARD = [WHITING, SILICA, SPAR, KAOLIN];

type Page = Record<string, any>;

describe('SolvePage', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [testProviders()] }));
  afterEach(() => httpMock().verify());

  const create = async (shelf: string[] = STANDARD.map((m) => m._id!)) => {
    const fixture = TestBed.createComponent(SolvePage);
    await fixture.whenStable();
    answer('/materials/getStandard', STANDARD);
    answer('/materials/getAll', []);
    answer('/shelf', { shelf });
    await settle(fixture);
    await settle(fixture);
    const root: HTMLElement = fixture.nativeElement;
    const page = fixture.componentInstance as unknown as Page;
    const type = async (oxide: string, value: string) => {
      const input = root.querySelector('#solve-oxide-' + oxide) as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new Event('blur'));
      await settle(fixture);
    };
    const click = async (selector: string) => {
      (root.querySelector(selector) as HTMLElement).click();
      await settle(fixture);
    };
    return { fixture, root, page, type, click };
  };

  /** A glaze of 40 feldspar, 20 whiting, 10 kaolin and 30 silica, by its unity formula. */
  const GLOSSY = unityOf(
    molesOf([
      { ...SPAR, amount: '40' },
      { ...WHITING, amount: '20' },
      { ...KAOLIN, amount: '10' },
      { ...SILICA, amount: '30' }
    ])
  );
  const typeGlossy = async (type: (oxide: string, value: string) => Promise<void>) => {
    for (const oxide of ['K2O', 'CaO', 'Al2O3', 'SiO2']) await type(oxide, GLOSSY[oxide]!.toFixed(4));
  };

  it('starts from the materials on hand, and lays out every oxide field with a label', async () => {
    const { fixture, root } = await create([KAOLIN._id!, SILICA._id!]);
    expect([...root.querySelectorAll('.solve-try-name')].map((el) => el.textContent?.trim())).toEqual([
      'Kaolin',
      'Silica'
    ]);
    for (const input of root.querySelectorAll('.solve-field input')) {
      expect(root.querySelector(`label[for="${input.id}"]`)?.textContent?.trim()).toBeTruthy();
    }
    expect(text(fixture, 'label[for="solve-oxide-K2O"]')).toBe('potash (K₂O)');
    expect(skippedHeadings(fixture)).toEqual([]);
  });

  it('solves a unity formula into a recipe in percent, close, with the cautions and hazards', async () => {
    const { fixture, root, type, click } = await create();
    await typeGlossy(type);
    expect(text(fixture, '#solve-sum')).toBe('The fluxes add up to 1.00.');
    await click('#solve-run');
    const rows = [...root.querySelectorAll('.solve-recipe tbody tr')].map((row) => [
      row.querySelector('th')?.textContent?.trim(),
      Number(row.querySelector('td')?.textContent?.trim())
    ]);
    const amount = (name: string) => rows.find((row) => row[0] === name)?.[1] as number;
    expect(amount('Potash feldspar')).toBeCloseTo(40, 0);
    expect(amount('Whiting')).toBeCloseTo(20, 0);
    expect(amount('Kaolin')).toBeCloseTo(10, 0);
    expect(amount('Silica')).toBeCloseTo(30, 0);
    expect(text(fixture, '.solve-verdict')).toMatch(/^Close: every oxide is within/);
    const near = [...root.querySelectorAll('.solve-near tbody th')].map((th) => th.textContent?.trim());
    expect(near).toContain('SiO₂');
    expect(near).toContain('KNaO (potash and soda together)');
    expect(text(fixture, '#limits-heading')).toBeTruthy();
    expect(text(fixture, '.recipe-hazards')).toContain('H373');
    expect(document.activeElement?.id).toBe('solve-result-heading');
    expect(skippedHeadings(fixture)).toEqual([]);
    // Changing the target marks the recipe as out of date.
    await type('CaO', '0.8');
    expect(text(fixture, '.solve-stale')).toContain('Solve again');
  });

  it('ties a typed mistake to its field, and says what the target needs by the button', async () => {
    const { fixture, type, click } = await create();
    await type('SiO2', 'lots');
    expect(fieldProblem(fixture, 'solve-oxide-SiO2')).toContain('Enter a number');
    await type('SiO2', '3');
    await click('#solve-run');
    expect(text(fixture, '#solve-problem')).toBe('The target needs at least one flux, such as CaO, K₂O or Na₂O.');
    expect(document.activeElement?.id).toBe('solve-oxide-CaO');
  });

  it('says what nothing chosen supplies, and that the recipe is poor', async () => {
    const { fixture, type, click } = await create();
    await typeGlossy(type);
    await type('B2O3', '0.4');
    await click('#solve-run');
    expect(text(fixture, '.solve-verdict')).toMatch(/^Poor: .*B₂O₃/);
    expect(text(fixture)).toContain('Nothing you chose has boron.');
  });

  it('asks for materials when none are left, and leaves one out from the report', async () => {
    const { fixture, root, page, type, click } = await create();
    await typeGlossy(type);
    await click('#solve-run');
    // Leave out the whiting: no calcium can be had, and the recipe says so.
    const leave = [...root.querySelectorAll('.solve-uses button')].find((b) =>
      b.getAttribute('aria-label')?.includes('Whiting')
    ) as HTMLElement;
    leave.click();
    await settle(fixture);
    expect(text(fixture)).toContain('Left out: Whiting.');
    expect(page['result']().solved.materials.map((m: Material) => m.name)).not.toContain('Whiting');
    page['tries'].set([]);
    await settle(fixture);
    await click('#solve-run');
    expect(text(fixture, '#solve-problem')).toBe('Add at least one material to make the recipe from.');
  });

  it('fills the fields from text pasted from another app, saying what it could not read', async () => {
    const { fixture, root, page } = await create();
    page['paste'].set('SiO₂ 3.2\nAl2O3: 0,35\nCaO 0.7 K2O 0.3\nXx2O 0.1');
    page['readPaste']();
    await settle(fixture);
    expect((root.querySelector('#solve-oxide-SiO2') as HTMLInputElement).value).toBe('3.2');
    expect((root.querySelector('#solve-oxide-Al2O3') as HTMLInputElement).value).toBe('0.35');
    expect(text(fixture, '.solve-paste-status')).toBe('Filled in 4 oxides. Not known, so left out: Xx2O.');
    page['paste'].set('KNaO 0.3 CaO 0.7');
    page['readPaste']();
    await settle(fixture);
    expect(text(fixture, '.solve-paste-status')).toContain('not together as KNaO');
  });

  it('solves an oxide analysis too', async () => {
    const { fixture, page, click } = await create();
    page['kind'].set('analysis');
    page['values'].set({ SiO2: '70.4', Al2O3: '12.8', CaO: '12.6', K2O: '4.2' });
    await settle(fixture);
    expect(text(fixture, '#solve-sum')).toBe('The oxides add up to 100.0%. Loss on ignition is left out.');
    await click('#solve-run');
    expect(page['result']().solved.closeness.verdict).not.toBe('poor');
  });

  it('opens the recipe on the recipe page as a new recipe, with the target in its notes', async () => {
    const { type, click } = await create();
    const router = TestBed.inject(Router);
    const navigated = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    await typeGlossy(type);
    await click('#solve-run');
    await click('#solve-open');
    expect(navigated).toHaveBeenCalledWith('/recipe');
    const recipe = TestBed.inject(PendingRecipeService).take()!;
    expect(recipe.title).toBe('Solved for a target');
    expect(recipe.notes).toMatch(/from the unity formula K₂O 0\.26\d · CaO 0\.73\d · Al₂O₃ /);
    expect(recipe.notes).toContain('How near: close.');
    expect(recipe.materials.map((m) => m.name)).toContain('Potash feldspar');
    // Taken once.
    expect(TestBed.inject(PendingRecipeService).take()).toBeNull();
  });
});
