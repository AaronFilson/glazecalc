import { TestBed } from '@angular/core/testing';
import { Additive, Material, Recipe } from '../../core/models';
import { API, answer, httpMock, settle, testProviders, text } from '../../testing/test-providers';
import { RecipePage, savedAnalysis } from './recipe-page';

const material = (name: string, fields: Array<[string, number]>, loi: number): Material => ({
  _id: name,
  name,
  percentmole: 'molecular',
  loi,
  fields: fields.map(([oxide, amount]) => ({ name: oxide, amount }))
});

const WHITING = material('Whiting', [['CaO', 1]], 43.97);
const SILICA = material('Silica', [['SiO2', 1]], 0);
const DOLOMITE = material(
  'Dolomite',
  [
    ['CaO', 1],
    ['MgO', 1]
  ],
  47.73
);
// A percent analysis that totals 50%, which the chemistry warns about.
const HALF: Material = {
  _id: 'h',
  name: 'Half spar',
  percentmole: 'percent',
  loi: 0,
  fields: [
    { name: 'SiO2', amount: 30 },
    { name: 'CaO', amount: 20 }
  ]
};
const IRON: Additive = { _id: 'rio', name: 'Iron oxide', fields: [{ name: 'Fe2O3', amount: '1' }] };
const RUTILE: Additive = { _id: 'rut', name: 'Rutile', fields: [{ name: 'TiO2', amount: '1' }] };

type Page = Record<string, any>;

/** The colorants listed with the unity formula. */
const additivesShown = (fixture: { nativeElement: HTMLElement }) =>
  [...fixture.nativeElement.querySelectorAll('.unity-additives li')].map((li) => li.textContent?.trim());

describe('RecipePage', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: testProviders() });
  });
  afterEach(() => httpMock().verify());

  const create = async (recipes: Recipe[] = []) => {
    const fixture = TestBed.createComponent(RecipePage);
    await fixture.whenStable();
    answer('/materials/getStandard', [WHITING, SILICA, DOLOMITE, HALF]);
    answer('/materials/getAll', []);
    answer('/additives/getAll', []);
    answer('/additives/getStandard', [IRON]);
    answer('/recipe/getAll', recipes);
    await settle(fixture);
    // Protected members are reached through a loose view of the component.
    const page = fixture.componentInstance as unknown as Page;
    return { fixture, page };
  };

  /** Adds materials with amounts, as picking from the list and typing would. */
  const fill = (page: Page, lines: Array<[Material, string]>) => {
    for (const [m, amount] of lines) {
      page['addMaterial'](m);
      page['setAmount'](page['lines']().length - 1, amount);
    }
  };

  const click = (fixture: { nativeElement: HTMLElement }, label: string) => {
    const button = [...fixture.nativeElement.querySelectorAll('button')].find((b) => b.textContent?.trim() === label);
    if (!button) throw new Error('no button ' + label);
    button.click();
  };

  it('shows the unity formula as amounts are typed, with each share and the total', async () => {
    const { fixture, page } = await create();
    expect(text(fixture, '.unity-result')).toContain('Add materials and their amounts');
    fill(page, [
      [WHITING, '20'],
      [SILICA, '30']
    ]);
    await fixture.whenStable();

    const shown = text(fixture, '.unity-result');
    expect(shown).toContain('CaO : 1.000');
    // 30 g silica over (20 g whiting / 100.08 g per mole of CaO)
    expect(shown).toContain('SiO₂ : ' + (30 / 60.083 / (20 / 100.08)).toFixed(3));
    const shares = [...fixture.nativeElement.querySelectorAll('tbody .recipe-share')].map((td: Element) =>
      td.textContent?.trim()
    );
    expect(shares).toEqual(['40%', '60%']);
    expect(text(fixture, '.recipe-total')).toBe('50');
    // The one-line summary for phones.
    expect(text(fixture, '.unity-inline')).toContain('CaO 1.000');

    page['setAmount'](1, '60');
    await fixture.whenStable();
    expect(text(fixture, '.unity-result')).toContain('SiO₂ : ' + (60 / 60.083 / (20 / 100.08)).toFixed(3));
  });

  it('copies picked materials, so amounts leave the lists alone', async () => {
    const { page } = await create();
    fill(page, [[WHITING, '5']]);
    expect((WHITING as { amount?: string }).amount).toBeUndefined();
    expect(page['standardMaterials']()[0]).toBe(WHITING);
  });

  it('says why there is no unity formula instead of showing an error', async () => {
    const { fixture, page } = await create();
    fill(page, [[SILICA, '100']]);
    await fixture.whenStable();
    expect(text(fixture, '.unity-problem')).toContain('no flux');

    page['setAmount'](0, 'lots');
    await fixture.whenStable();
    expect(text(fixture, '.unity-problem')).toContain('Invalid amount for material Silica');
    expect(page['notices'].errors()).toEqual([]);
  });

  it("lists the chemistry's warnings in the panel, each once", async () => {
    const { fixture, page } = await create();
    fill(page, [
      [WHITING, '20'],
      [HALF, '10']
    ]);
    await fixture.whenStable();
    const warnings = [...fixture.nativeElement.querySelectorAll('.unity-warnings li')].map((li: Element) =>
      li.textContent?.trim()
    );
    expect(warnings.length).toBeGreaterThan(0);
    expect(new Set(warnings).size).toBe(warnings.length);
    page['removeMaterial'](1);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.unity-warnings')).toBeNull();
  });

  it('changes the scale; colorants in parts change with it, those in percent stay', async () => {
    const { fixture, page } = await create();
    fill(page, [
      [WHITING, '3'],
      [SILICA, '2']
    ]);
    page['addAdditive'](IRON);
    page['setAdditiveAmount'](0, '2');
    page['addAdditive'](RUTILE);
    page['setAdditiveAmount'](1, '1');
    page['setAdditiveUnit'](1, 'parts');
    // Colorants start as a percent of the base, as most recipes give them.
    expect(page['additiveLines']()[0].unit).toBe('percent');
    const amounts = () => [
      ...page['lines']().map((l: { amount: string }) => l.amount),
      ...page['additiveLines']().map((a: { amount: string }) => a.amount)
    ];

    page['scale']({ to: 'percent' });
    expect(amounts()).toEqual(['60', '40', '2', '20']);
    page['scale']({ to: 'parts' });
    expect(amounts()).toEqual(['3', '2', '2', '1']);
    page['batchGrams'].set('500');
    page['scaleToBatch']();
    expect(amounts()).toEqual(['300', '200', '2', '100']);
    await fixture.whenStable();
    expect(text(fixture, '.recipe-scale-note')).toBe('Now in grams for the batch.');
    expect(additivesShown(fixture)).toEqual(['Iron oxide : 2%', 'Rutile : 100 parts']);

    page['batchGrams'].set('');
    page['scaleToBatch']();
    await fixture.whenStable();
    expect(text(fixture, '.recipe-scale-note')).toBe('Please enter the weight of the batch, in grams.');

    // An amount it cannot read stops it, rather than changing the proportions around it.
    page['setAmount'](1, '12,5');
    page['scale']({ to: 'percent' });
    expect(amounts()).toEqual(['300', '12,5', '2', '100']);
    await fixture.whenStable();
    expect(text(fixture, '.recipe-scale-note')).toBe(
      'The amount for Silica is not a number ("12,5"). Please fix it first.'
    );
    expect(page['notices'].errors()).toEqual([]);
  });

  it("chooses and saves each colorant's unit; recipes saved without one read as percent", async () => {
    const old: Recipe = {
      _id: 'r1',
      title: 'Old',
      materials: [{ ...WHITING, amount: '10' }],
      additives: [{ ...IRON, amount: '2' }]
    };
    const { fixture, page } = await create([old]);
    page['open'](old);
    await fixture.whenStable();
    const radio = (unit: string) => fixture.nativeElement.querySelector('#additive-unit-0-' + unit) as HTMLInputElement;
    expect(radio('percent').checked).toBe(true);
    expect(page['dirty']()).toBe(false);

    radio('grams').click();
    await fixture.whenStable();
    expect(page['additiveLines']()[0].unit).toBe('grams');
    expect(page['status']()).toBe('Changes not saved yet');
    expect(additivesShown(fixture)).toEqual(['Iron oxide : 2 g']);
    const saving = page['save']();
    const req = httpMock().expectOne({ method: 'PUT', url: API + '/recipe/change/r1' });
    expect(req.request.body.recipe.additives[0]).toEqual(expect.objectContaining({ amount: '2', unit: 'grams' }));
    req.flush({ msg: 'Successfully updated recipe' });
    await saving;
  });

  it('saves without clearing the page, then updates the same recipe', async () => {
    const { fixture, page } = await create();
    page['title'].set('Matte');
    fill(page, [
      [WHITING, '10'],
      [DOLOMITE, '20']
    ]);
    page['addAdditive'](IRON);
    page['setAdditiveAmount'](0, '2');
    expect(page['status']()).toBe('Not saved yet');

    const saving = page['save']();
    const req = httpMock().expectOne(API + '/recipe/create');
    const body = req.request.body as Recipe;
    expect(body.title).toBe('Matte');
    expect(body.notes).toBe('None.');
    expect(body.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(body.materials.map((m) => [m.name, m.amount])).toEqual([
      ['Whiting', '10'],
      ['Dolomite', '20']
    ]);
    expect(body.additives?.map((a) => [a.name, a.amount])).toEqual([['Iron oxide', '2']]);
    expect(savedAnalysis(body)?.uList['MgO']).toBeGreaterThan(0);
    req.flush({ ...body, _id: 'r1', computed: [body.computed] });
    await saving;
    await fixture.whenStable();

    expect(page['notices'].messages()).toEqual(['Saved "Matte".']);
    expect(page['lines']().length).toBe(2);
    expect(page['status']()).toMatch(/^Saved at /);
    expect(text(fixture, '.saved-recipes')).toContain('Matte');
    expect(text(fixture, '.saved-recipes')).toContain('Open above');

    page['setAmount'](1, '25');
    expect(page['status']()).toBe('Changes not saved yet');
    const again = page['save']();
    const change = httpMock().expectOne({ method: 'PUT', url: API + '/recipe/change/r1' });
    expect(change.request.body.recipe.materials[1].amount).toBe('25');
    change.flush({ msg: 'Successfully updated recipe' });
    await again;
    expect(page['myRecipes']().length).toBe(1);
    expect(page['myRecipes']()[0].materials[1].amount).toBe('25');
    expect(page['status']()).toMatch(/^Saved at /);
    // One message: the latest save's.
    expect(page['notices'].messages()).toEqual(['Saved "Matte".']);
  });

  it('"Save and add next recipe" saves, then clears the page for the next recipe', async () => {
    const { page } = await create();
    page['title'].set('First');
    fill(page, [[WHITING, '10']]);
    const saving = page['saveAndNext']();
    httpMock()
      .expectOne(API + '/recipe/create')
      .flush({ _id: 'r1', title: 'First', materials: [] });
    await saving;
    expect(page['title']()).toBe('');
    expect(page['lines']()).toEqual([]);
    expect(page['savedId']()).toBeNull();
    expect(page['status']()).toBe('');
    expect(page['notices'].messages()).toEqual(['Saved "First". Ready for the next recipe.']);
  });

  it('"Save as a copy" saves a new recipe and leaves the original as it was', async () => {
    const original: Recipe = { _id: 'r1', title: 'Base', materials: [{ ...WHITING, amount: '10' }] };
    const { page } = await create([original]);
    page['open'](original);
    page['title'].set('Base, more iron');
    const saving = page['saveAsCopy']();
    httpMock()
      .expectOne(API + '/recipe/create')
      .flush({ _id: 'r2', title: 'Base, more iron', materials: [] });
    await saving;
    expect(page['savedId']()).toBe('r2');
    expect(page['myRecipes']().map((r: Recipe) => r.title)).toEqual(['Base', 'Base, more iron']);
  });

  it('opens a saved recipe to change it, and asks before dropping unsaved changes', async () => {
    const first: Recipe = {
      _id: 'r1',
      title: 'Celadon',
      date: '2026-10-01',
      notes: ['None.'],
      materials: [{ ...WHITING, amount: '20' }],
      additives: [{ ...IRON, amount: '1.5' }]
    };
    const second: Recipe = { _id: 'r2', title: 'Shino', materials: [{ ...SILICA, amount: '50' }] };
    const { fixture, page } = await create([first, second]);

    page['open'](first);
    expect(page['title']()).toBe('Celadon');
    expect(page['notes']()).toBe('');
    expect(page['lines']()[0].amount).toBe('20');
    expect(page['additiveLines']()[0].amount).toBe('1.5');
    expect(page['dirty']()).toBe(false);

    page['setAmount'](0, '25');
    page['open'](second);
    await fixture.whenStable();
    expect(page['title']()).toBe('Celadon');
    expect(text(fixture, '.recipe-unsaved')).toContain('changes that are not saved');
    click(fixture, 'Keep editing');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.recipe-unsaved')).toBeNull();
    expect(page['lines']()[0].amount).toBe('25');

    page['open'](second);
    await fixture.whenStable();
    click(fixture, 'Discard them');
    expect(page['title']()).toBe('Shino');
    expect(page['savedId']()).toBe('r2');
  });

  it('asks for a title, a material and every amount before saving', async () => {
    const { page } = await create();
    const tryToSave = async (expected: string) => {
      await page['save']();
      // Beside the save buttons, not at the top of the page.
      expect(page['saveProblem']()).toBe(expected);
      expect(page['notices'].errors()).toEqual([]);
    };
    await tryToSave('Please give the recipe a title.');
    page['title'].set('Matte');
    await tryToSave('Please add at least one material.');
    page['addMaterial'](WHITING);
    await tryToSave('Please enter an amount for Whiting (0 is fine).');
    page['setAmount'](0, '-2');
    await tryToSave('The amount for Whiting is not a number ("-2"). Use a point for decimals, such as 12.5.');
    page['setAmount'](0, '0');
    page['addMaterial'](SILICA);
    page['setAmount'](1, '30');
    await tryToSave('Not saved: Recipe contains no flux oxides, so the UMF is undefined');
    httpMock().expectNone(API + '/recipe/create');
  });

  it('shows the server message when saving fails', async () => {
    const { fixture, page } = await create();
    page['title'].set('Matte');
    fill(page, [[WHITING, '10']]);
    const saving = page['save']();
    httpMock()
      .expectOne(API + '/recipe/create')
      .flush({ msg: 'Missing required information' }, { status: 400, statusText: 'Bad Request' });
    await saving;
    await fixture.whenStable();
    expect(text(fixture, '.recipe-save-problem')).toBe('Missing required information');
    expect(page['savedId']()).toBeNull();
  });

  it('saves once when Save is pressed twice', async () => {
    const { fixture, page } = await create();
    page['title'].set('Twice');
    fill(page, [[WHITING, '10']]);
    const first = page['save']();
    const second = page['save']();
    await fixture.whenStable();
    const saveButton = () =>
      [...fixture.nativeElement.querySelectorAll('.recipe-save button')].find(
        (b: Element) => b.textContent?.trim() === 'Save'
      ) as HTMLButtonElement;
    expect(saveButton().getAttribute('aria-disabled')).toBe('true');
    httpMock()
      .expectOne(API + '/recipe/create')
      .flush({ _id: 'r1', title: 'Twice', materials: [] });
    await Promise.all([first, second]);
    await fixture.whenStable();
    expect(saveButton().getAttribute('aria-disabled')).toBeNull();
  });

  it('leaves a save that returns after the page moved on out of the page it moved to', async () => {
    const { fixture, page } = await create();
    page['title'].set('First');
    fill(page, [[WHITING, '10']]);
    const saving = page['save']();
    // While it saves: New recipe, and drop the changes.
    page['startNew']();
    await fixture.whenStable();
    click(fixture, 'Discard them');
    httpMock()
      .expectOne(API + '/recipe/create')
      .flush({ _id: 'r1', title: 'First', materials: [] });
    await saving;
    expect(page['myRecipes']().map((r: Recipe) => r.title)).toEqual(['First']);
    expect(page['savedId']()).toBeNull();
    expect(page['title']()).toBe('');

    // The next recipe is saved as its own, not over the first.
    page['title'].set('Second');
    fill(page, [[WHITING, '20']]);
    const next = page['save']();
    httpMock()
      .expectOne({ method: 'POST', url: API + '/recipe/create' })
      .flush({ _id: 'r2', title: 'Second', materials: [] });
    await next;
    expect(page['savedId']()).toBe('r2');
  });

  it('counts changes made while saving as not saved; "Save and add next recipe" keeps them', async () => {
    const { page } = await create();
    page['title'].set('Matte');
    fill(page, [[WHITING, '10']]);
    const saving = page['saveAndNext']();
    page['setAmount'](0, '12');
    const req = httpMock().expectOne(API + '/recipe/create');
    expect(req.request.body.materials[0].amount).toBe('10');
    req.flush({ _id: 'r1', title: 'Matte', materials: [] });
    await saving;
    expect(page['title']()).toBe('Matte');
    expect(page['lines']()[0].amount).toBe('12');
    expect(page['savedId']()).toBe('r1');
    expect(page['status']()).toBe('Changes not saved yet');
    expect(page['notices'].messages()).toEqual(['Saved "Matte".']);
  });

  it('asks about unsaved changes at the top of the editor, starting on Keep editing', async () => {
    const { fixture, page } = await create();
    page['title'].set('Draft');
    await fixture.whenStable();
    const newRecipe = [...fixture.nativeElement.querySelectorAll('button')].find(
      (b: Element) => b.textContent?.trim() === 'New recipe'
    ) as HTMLButtonElement;
    newRecipe.focus();
    newRecipe.click();
    await fixture.whenStable();
    const question = fixture.nativeElement.querySelector('.recipe-editor .recipe-unsaved') as HTMLElement;
    // Before the fields, where the button that asked is.
    expect(question.compareDocumentPosition(fixture.nativeElement.querySelector('#recipe-name'))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
    expect(document.activeElement?.id).toBe('unsaved-keep');

    // Escape keeps editing, and the focus goes back to the button.
    question.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.recipe-unsaved')).toBeNull();
    expect(document.activeElement).toBe(newRecipe);
    expect(page['title']()).toBe('Draft');
  });

  it('keeps the focus in the list when a material is taken out, and says so', async () => {
    const { fixture, page } = await create();
    fill(page, [
      [WHITING, '1'],
      [SILICA, '2']
    ]);
    await fixture.whenStable();
    page['removeMaterial'](1);
    await fixture.whenStable();
    expect(document.activeElement?.id).toBe('material-remove-0');
    expect(text(fixture, '.recipe-editor p.visually-hidden[role=status]')).toBe('Silica taken out of the recipe.');
    page['removeMaterial'](0);
    await fixture.whenStable();
    expect(document.activeElement?.id).toBe('materials-heading');
  });

  it('expands a saved recipe, including ones saved before siAlRatio existed', async () => {
    const old: Recipe = {
      _id: 'old',
      title: 'Old celadon',
      notes: ['Good'],
      materials: [{ ...WHITING, amount: '20' }],
      computed: [{ uList: { CaO: 1, Al2O3: 0.4, SiO2: 3.7 } }]
    };
    const { fixture } = await create([old]);
    click(fixture, 'Expand to View');
    await fixture.whenStable();

    const shown = text(fixture, '.saved-recipe');
    expect(shown).toContain('Whiting : 20');
    expect(shown).toContain('SiO₂ : 3.700');
    expect(shown).toContain('Ratio of Silica to Alumina : 9.25');
    expect(shown).toContain('Notes: Good');
    click(fixture, 'Hide');
    await fixture.whenStable();
    expect(text(fixture, '.saved-recipe')).not.toContain('Whiting : 20');
  });

  it('removes a saved recipe; if it was open, it stays on the page as not saved', async () => {
    const saved: Recipe = { _id: 'r1', title: 'Gone', materials: [{ ...WHITING, amount: '10' }] };
    const { fixture, page } = await create([saved]);
    page['open'](saved);
    await fixture.whenStable();
    click(fixture, 'Remove');
    await fixture.whenStable();
    expect(text(fixture, '.remove-confirm')).toContain(
      'Remove "Gone"? It stays open above, as a recipe not saved yet.'
    );
    click(fixture, 'Yes, remove');
    httpMock()
      .expectOne({ method: 'DELETE', url: API + '/recipe/delete/r1' })
      .flush({});
    await settle(fixture);
    expect(page['myRecipes']()).toEqual([]);
    expect(page['title']()).toBe('Gone');
    expect(page['status']()).toBe('Not saved yet');
    expect(page['notices'].messages()).toEqual(['Removed "Gone".']);
  });

  it('drops a question about opening a recipe that has since been removed', async () => {
    const two: Recipe = { _id: 'r2', title: 'Two', materials: [{ ...SILICA, amount: '50' }] };
    const { fixture, page } = await create([two]);
    page['title'].set('Draft');
    page['open'](two);
    await fixture.whenStable();
    expect(page['pendingLeave']()).not.toBeNull();
    const removing = page['remove'](two);
    httpMock()
      .expectOne({ method: 'DELETE', url: API + '/recipe/delete/r2' })
      .flush({});
    await removing;
    expect(page['pendingLeave']()).toBeNull();
    expect(page['title']()).toBe('Draft');
  });

  it('reports lists that fail to load', async () => {
    const fixture = TestBed.createComponent(RecipePage);
    await fixture.whenStable();
    httpMock()
      .match(() => true)
      .forEach((req) => req.flush({}, { status: 500, statusText: 'Server Error' }));
    await settle(fixture);
    const errors = (fixture.componentInstance as unknown as Page)['notices'].errors();
    expect(errors).toContain('There was an error in getting your recipes.');
    expect(errors).toHaveLength(5);
  });
});
