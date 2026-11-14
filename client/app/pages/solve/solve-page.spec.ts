import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { molesOf, unityOf } from '../../../../lib/recipe/materials';
import { Material } from '../../core/models';
import { PendingRecipeService } from '../../core/pending-recipe.service';
import {
  API,
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
const TALC = material(
  'Talc',
  [
    ['MgO', 3],
    ['SiO2', 4]
  ],
  4.8
);

type Page = Record<string, any>;

describe('SolvePage', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [testProviders()] }));
  afterEach(() => httpMock().verify());

  const create = async (
    shelf: string[] = STANDARD.map((m) => m._id!),
    standard: Material[] = STANDARD,
    mine: Material[] = []
  ) => {
    const fixture = TestBed.createComponent(SolvePage);
    await fixture.whenStable();
    answer('/materials/getStandard', standard);
    answer('/materials/getAll', mine);
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

  it('says so when the materials chosen bring no flux at all, rather than giving a recipe with no unity formula', async () => {
    const { fixture, root, type, click } = await create([KAOLIN._id!, SILICA._id!]);
    await typeGlossy(type);
    await click('#solve-run');
    // Of the materials, at the materials: the target has its fluxes ("Recipe contains no flux oxides" said otherwise).
    expect(text(fixture, '#solve-problem')).toBe(
      'None of these materials has a flux, such as CaO, K₂O or Na₂O, so no glaze can be made of them.'
    );
    expect(document.activeElement?.id).toBe('solve-materials-heading');
    expect(root.querySelector('.solve-recipe')).toBeNull();
  });

  it('says so at the materials when the one left out from the report was the only flux', async () => {
    const { fixture, root, page, type, click } = await create([WHITING._id!, KAOLIN._id!, SILICA._id!]);
    await type('CaO', '1');
    await type('Al2O3', '0.3');
    await type('SiO2', '3');
    await click('#solve-run');
    const leave = [...root.querySelectorAll('.solve-uses button')].find((b) =>
      document.getElementById(b.getAttribute('aria-describedby')!)?.textContent?.includes('Whiting')
    ) as HTMLElement;
    leave.click();
    await settle(fixture);
    expect(text(fixture, '#solve-problem')).toBe(
      'None of these materials has a flux, such as CaO, K₂O or Na₂O, so no glaze can be made of them.'
    );
    expect(document.activeElement?.id).toBe('solve-materials-heading');
    // The recipe it had stays.
    expect(page['result']().solved.materials.map((m: Material) => m.name)).toContain('Whiting');
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
      document.getElementById(b.getAttribute('aria-describedby')!)?.textContent?.includes('Whiting')
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

  /** A button by the words on it. */
  const button = (root: HTMLElement, label: string) =>
    [...root.querySelectorAll('button')].find((b) => b.textContent?.trim() === label) as HTMLButtonElement;
  const press = async (fixture: ComponentFixture<unknown>, root: HTMLElement, label: string) => {
    button(root, label).click();
    await settle(fixture);
  };
  const tries = (root: HTMLElement) =>
    [...root.querySelectorAll('.solve-try-name')].map((el) => el.textContent?.trim());
  const amounts = (root: HTMLElement): Record<string, number> =>
    Object.fromEntries(
      [...root.querySelectorAll('.solve-recipe tbody tr')].map((row) => [
        row.querySelector('th')?.textContent?.trim(),
        Number(row.querySelector('td')?.textContent?.trim())
      ])
    );
  const field = (root: HTMLElement, oxide: string) => root.querySelector('#solve-oxide-' + oxide) as HTMLInputElement;
  const typeAll = async (type: (oxide: string, value: string) => Promise<void>, oxides: Record<string, number>) => {
    for (const [oxide, amount] of Object.entries(oxides)) await type(oxide, amount.toFixed(4));
  };

  it('takes an oxide analysis chosen with its radio button, and solves when Enter is pressed in a field', async () => {
    const { fixture, root, type } = await create();
    const analysis = root.querySelector('#solve-kind-analysis') as HTMLInputElement;
    analysis.click();
    await settle(fixture);
    expect(analysis.checked).toBe(true);
    expect((root.querySelector('#solve-kind-unity') as HTMLInputElement).checked).toBe(false);
    for (const [oxide, percent] of [
      ['SiO2', '70.4'],
      ['Al2O3', '12.8'],
      ['CaO', '12.6'],
      ['K2O', '4.2']
    ]) {
      await type(oxide!, percent!);
    }
    expect(text(fixture, '#solve-sum')).toBe('The oxides add up to 100.0%. Loss on ignition is left out.');
    field(root, 'CaO').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await settle(fixture);
    expect(Object.keys(amounts(root))).toEqual(expect.arrayContaining(['Whiting', 'Potash feldspar']));
    expect(root.querySelector('.solve-verdict')?.getAttribute('data-verdict')).not.toBe('poor');
  });

  it('fills the fields from text typed into the paste box, says when it finds none, and clears the target', async () => {
    const { fixture, root, click } = await create();
    // Solving with no target says what it needs; clearing takes that away too.
    await click('#solve-run');
    expect(text(fixture, '#solve-problem')).toContain('at least one flux');
    const box = root.querySelector('#solve-paste') as HTMLTextAreaElement;
    const paste = async (words: string) => {
      box.value = words;
      box.dispatchEvent(new Event('input'));
      await settle(fixture);
      await press(fixture, root, 'Fill in from the pasted text');
    };
    // An oxide with no field of its own gets one, in its column.
    await paste('CaO 0.7 K2O 0.3 Al2O3 0.35 SiO2 3.2 MnO 0.05');
    expect(text(fixture, '.solve-paste-status')).toBe('Filled in 5 oxides.');
    expect(field(root, 'MnO').value).toBe('0.05');
    expect(field(root, 'MnO').closest('fieldset')?.querySelector('legend')?.textContent?.trim()).toBe('Fluxes');
    expect(field(root, 'SiO2').value).toBe('3.2');

    await paste('Total 100');
    expect(text(fixture, '.solve-paste-status')).toBe('No oxides with amounts were found in the pasted text.');
    // What was there stays.
    expect(field(root, 'SiO2').value).toBe('3.2');

    await press(fixture, root, 'Clear the target');
    const fields = [...root.querySelectorAll<HTMLInputElement>('.solve-field input')];
    expect(fields.every((input) => !input.value)).toBe(true);
    expect(field(root, 'MnO')).toBeNull();
    expect(text(fixture, '.solve-paste-status')).toBe('');
    expect(text(fixture, '#solve-problem')).toBe('');
    expect(document.activeElement).toBe(field(root, 'Li2O'));
  });

  it('leaves the target unsolved while a field has a mistake in it', async () => {
    const { fixture, root, type, click } = await create();
    await typeGlossy(type);
    await type('SiO2', 'lots');
    await click('#solve-run');
    expect(root.querySelector('#solve-result-heading')).toBeNull();
    expect(fieldProblem(fixture, 'solve-oxide-SiO2')).toContain('Enter a number');
    expect(text(fixture, '#solve-problem')).toBe('');
  });

  it('says when there are no materials on hand yet', async () => {
    const { fixture, root } = await create([]);
    expect(tries(root)).toEqual([]);
    expect(text(fixture)).toContain('You have no materials on hand yet.');
  });

  it('says when the materials on hand could not be fetched, and fetches the standard ones again when asked', async () => {
    const fixture = TestBed.createComponent(SolvePage);
    await fixture.whenStable();
    const failed = { status: 500, statusText: 'Server Error' };
    for (const path of ['/materials/getStandard', '/materials/getAll', '/shelf']) {
      httpMock()
        .expectOne(API + path)
        .flush(null, failed);
    }
    await settle(fixture);
    await settle(fixture);
    const root = fixture.nativeElement as HTMLElement;
    expect(text(fixture, 'p.solve-problem[role="alert"]:not(#solve-problem)')).toBe(
      'Your materials on hand could not be fetched. Please try again.'
    );
    expect(text(fixture, 'gc-recipe-library .library-empty')).toBe('The list could not be fetched. Try again');

    await press(fixture, root, 'Try again');
    answer('/materials/getStandard', STANDARD);
    await settle(fixture);
    const names = [...root.querySelectorAll('gc-recipe-library .library-item bdi')].map((name) => name.textContent);
    expect([...names].sort()).toEqual(['Kaolin', 'Potash feldspar', 'Silica', 'Whiting']);
  });

  it('takes a material off the list, adds one from the library, and starts again from those on hand', async () => {
    const { fixture, root } = await create(undefined, [...STANDARD, TALC]);
    expect(tries(root)).toEqual(['Whiting', 'Silica', 'Potash feldspar', 'Kaolin']);
    (root.querySelector('button[aria-label="Remove Kaolin from the materials to try"]') as HTMLButtonElement).click();
    await settle(fixture);
    expect(tries(root)).toEqual(['Whiting', 'Silica', 'Potash feldspar']);

    const talc = [...root.querySelectorAll<HTMLButtonElement>('gc-recipe-library button.library-item')].find(
      (item) => item.querySelector('bdi')?.textContent === 'Talc'
    )!;
    talc.click();
    await settle(fixture);
    expect(tries(root)).toEqual(['Whiting', 'Silica', 'Potash feldspar', 'Talc']);
    // Marked as added in the library, not offered again.
    const added = [...root.querySelectorAll('gc-recipe-library .in-recipe bdi')].map((name) => name.textContent);
    expect(added).toContain('Talc');

    await press(fixture, root, 'Start again from my materials on hand');
    expect(tries(root)).toEqual(['Whiting', 'Silica', 'Potash feldspar', 'Kaolin']);
  });

  it('lists a name once: a material of my own named as one already listed is not added again', async () => {
    const mine = { ...WHITING, _id: 'my-whiting', ownedBy: 'u1' };
    const { fixture, root } = await create(undefined, STANDARD, [mine]);
    // My materials come first in the library, and mine is not the standard whiting listed.
    const item = root.querySelector('gc-recipe-library button.library-item') as HTMLButtonElement;
    expect(item.querySelector('bdi')?.textContent).toBe('Whiting');
    item.click();
    await settle(fixture);
    expect(tries(root)).toEqual(['Whiting', 'Silica', 'Potash feldspar', 'Kaolin']);
  });

  it('keeps a material in with Must use, and says when the match is nearly as good without it', async () => {
    const all = [...STANDARD, TALC];
    const { fixture, root, type, click } = await create(
      all.map((m) => m._id!),
      all
    );
    const must = root.querySelector('#solve-must-4') as HTMLInputElement;
    expect(text(fixture, 'label[for="solve-must-4"]')).toBe('Must use');
    must.click();
    await settle(fixture);
    expect(must.checked).toBe(true);
    await typeGlossy(type);
    await click('#solve-run');
    expect(amounts(root)['Talc']).toBeGreaterThan(0);
    const talc = [...root.querySelectorAll('.solve-uses li')].find((li) => li.textContent?.includes('Talc'))!;
    expect(talc.textContent).toContain('The match is nearly as good without it.');
  });

  it('adds a material the report says would bring it closer, kept in as a must', async () => {
    const all = [...STANDARD, TALC];
    const { fixture, root, type, click } = await create(
      all.map((m) => m._id!),
      all
    );
    await typeAll(type, { ...GLOSSY, MgO: 0.02 });
    await click('#solve-run');
    expect(amounts(root)['Talc']).toBeUndefined();
    expect(text(fixture, '.solve-verdict')).toContain('These materials could come nearer');
    expect(text(fixture)).toContain('Not used, but would bring it a little closer:');
    expect(button(root, 'Add it').closest('li')?.querySelector('bdi')?.textContent).toBe('Talc');
    await press(fixture, root, 'Add it');
    expect(amounts(root)['Talc']).toBeGreaterThan(0);
    expect((root.querySelector('#solve-must-4') as HTMLInputElement).checked).toBe(true);
    // Worked out again from the report: the recipe is up to date.
    expect(root.querySelector('.solve-stale')).toBeNull();
  });

  it('scales a target whose fluxes do not add up to 1, and says so', async () => {
    const { fixture, root, type, click } = await create();
    await typeAll(type, Object.fromEntries(Object.entries(GLOSSY).map(([oxide, moles]) => [oxide, moles * 2])));
    expect(text(fixture, '#solve-sum')).toBe('The fluxes add up to 2.00. They will be scaled to add up to 1.');
    await click('#solve-run');
    expect(text(fixture)).toContain("The target's fluxes added up to 2.000; it was scaled to 1.");
    expect(amounts(root)['Potash feldspar']).toBeCloseTo(40, 0);
  });

  it('holds raw clay to a fifth of the batch, allows more when asked, and allows left-out materials again', async () => {
    const { fixture, root, type, click } = await create();
    await typeAll(type, { K2O: 0.2, CaO: 0.8, Al2O3: 0.45, SiO2: 2.5 });
    await click('#solve-run');
    expect(amounts(root)['Kaolin']).toBe(20);
    expect(text(fixture)).toContain(
      'A closer match needs 21% Kaolin, more than the 20% suggested: raw clay shrinks as the glaze dries'
    );
    (root.querySelector('button[aria-label="Allow more Kaolin"]') as HTMLButtonElement).click();
    await settle(fixture);
    expect(amounts(root)['Kaolin']).toBeGreaterThan(21);
    expect(text(fixture)).not.toContain('A closer match needs');

    const leave = [...root.querySelectorAll('.solve-uses button')].find((b) =>
      document.getElementById(b.getAttribute('aria-describedby')!)?.textContent?.includes('Silica')
    ) as HTMLButtonElement;
    leave.click();
    await settle(fixture);
    expect(text(fixture)).toContain('Left out: Silica.');
    expect(amounts(root)['Silica']).toBeUndefined();
    await press(fixture, root, 'Allow them again');
    expect(text(fixture)).not.toContain('Left out:');
    expect(amounts(root)['Silica']).toBeGreaterThan(0);
    // The clay is still allowed more.
    expect(amounts(root)['Kaolin']).toBeGreaterThan(21);
  });

  it('follows the firing chosen in the limits panel, in its cautions and in the recipe it opens', async () => {
    const { fixture, root, type, click } = await create();
    const navigated = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    await typeGlossy(type);
    await click('#solve-run');
    expect(root.querySelector('.solve-cautions')).toBeNull();
    const firing = root.querySelector('#limit-firing') as HTMLSelectElement;
    firing.value = 'low';
    firing.dispatchEvent(new Event('change'));
    await settle(fixture);
    expect(text(fixture, '.solve-cautions')).toMatch(/whiting/i);
    await click('#solve-open');
    expect(navigated).toHaveBeenCalledWith('/recipe');
    expect(TestBed.inject(PendingRecipeService).take()?.firing).toBe('low');
  });
});
