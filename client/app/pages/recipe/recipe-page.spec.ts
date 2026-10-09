import { provideLocationMocks } from '@angular/common/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { Additive, Material, Recipe } from '../../core/models';
import { PreferencesService } from '../../core/preferences.service';
import { answer, API, fieldProblem, httpMock, settle, testProviders, text } from '../../testing/test-providers';
import { MOLAR_MASS } from '../../../../lib/chemistry';
import { evaluate, savedAnalysis } from './recipe-analysis';
import { RecipePage } from './recipe-page';

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
const IRON: Additive = {
  _id: 'rio',
  name: 'Iron oxide',
  percentmole: 'molecular',
  loi: 0,
  fields: [{ name: 'Fe2O3', amount: '1' }]
};
const RUTILE: Additive = {
  _id: 'rut',
  name: 'Rutile',
  percentmole: 'molecular',
  loi: 0,
  fields: [{ name: 'TiO2', amount: '1' }]
};
// Black cobalt oxide, Co3O4: CoO with a 6.64% LOI.
const COBALT: Additive = {
  _id: 'co',
  name: 'Cobalt Oxide',
  percentmole: 'molecular',
  loi: 6.64,
  fields: [{ name: 'CoO', amount: '1' }]
};
const BENTONITE: Additive = {
  _id: 'bent',
  name: 'Bentonite',
  percentmole: 'percent',
  loi: 10,
  fields: [
    { name: 'SiO2', amount: '60' },
    { name: 'Al2O3', amount: '20' },
    { name: 'MgO', amount: '10' }
  ]
};

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

  const create = async (recipes: Recipe[] = [], standardAdditives: Additive[] = [IRON]) => {
    const fixture = TestBed.createComponent(RecipePage);
    await fixture.whenStable();
    answer('/materials/getStandard', [WHITING, SILICA, DOLOMITE, HALF]);
    answer('/materials/getAll', []);
    answer('/additives/getAll', []);
    answer('/additives/getStandard', standardAdditives);
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

  it('counts colorants in the unity formula when asked, at their weight in the batch', async () => {
    const { fixture, page } = await create();
    fill(page, [
      [WHITING, '20'],
      [SILICA, '30']
    ]);
    page['addAdditive'](COBALT);
    page['setAdditiveAmount'](0, '2');
    await fixture.whenStable();
    // Left out by default, as many calculators do.
    expect(page['evaluation']().analysis.uList.CoO).toBeUndefined();

    const checkbox = fixture.nativeElement.querySelector('#include-additives') as HTMLInputElement;
    checkbox.click();
    await fixture.whenStable();
    // 2% of a 50 g base is 1 g of cobalt oxide, 93.36% of it CoO.
    const cobalt = (1 * (1 - 0.0664)) / MOLAR_MASS['CoO'];
    const calcium = 20 / (MOLAR_MASS['CaO'] / (1 - 0.4397));
    const unity = page['evaluation']().analysis.uList;
    expect(unity.CoO / unity.CaO).toBeCloseTo(cobalt / calcium, 6);
    expect(text(fixture, '.unity-result')).toContain('CoO');
    expect(text(fixture, '.unity-result')).toContain('Counted in the unity formula');

    // In parts, the amount is a weight in the base's own unit.
    page['setAdditiveUnit'](0, 'parts');
    page['setAdditiveAmount'](0, '1');
    expect(page['evaluation']().analysis.uList.CoO / page['evaluation']().analysis.uList.CaO).toBeCloseTo(
      cobalt / calcium,
      6
    );
    // The choice is remembered for new recipes.
    expect(localStorage.getItem('includeAdditives')).toBe('yes');
  });

  it('leaves out additives it cannot count, and borrows chemistry where one says to', () => {
    TestBed.inject(TranslocoService);
    const base = [
      { ...WHITING, amount: '20' },
      { ...SILICA, amount: '30' }
    ];
    const stain: Additive = { name: 'Stain 6600', noChemistry: true, fields: [], amount: '5' };
    const odd: Additive = {
      name: 'Odd ochre',
      percentmole: 'percent',
      loi: 0,
      fields: [{ name: 'Fe', amount: '100' }],
      amount: '3'
    };
    const veegum: Additive = { name: 'Suspender blend', chemistryOf: 'bentonite', fields: [], amount: '2' };
    const result = evaluate(base, [stain, odd, veegum], {
      includeAdditives: true,
      chemistryOf: (name) => (name === 'bentonite' ? BENTONITE : undefined)
    });
    expect(result.warnings).toEqual(['Odd ochre has no oxide analysis the unity formula can use, so it is left out.']);
    // The blend counts as bentonite: it brings magnesia.
    expect(result.analysis?.uList['MgO']).toBeGreaterThan(0);
    // Left out, nothing is counted or warned about.
    expect(evaluate(base, [stain, odd, veegum]).warnings).toEqual([]);
  });

  it("counts a colorant saved by an older version with the library's chemistry for it, or leaves it out", () => {
    TestBed.inject(TranslocoService);
    const base = [
      { ...WHITING, amount: '20' },
      { ...SILICA, amount: '30' }
    ];
    // Before October 2026 additives had no LOI: cobalt carbonate was saved as plain CoO.
    const oldCopy: Additive = { name: 'Cobalt Oxide', fields: [{ name: 'CoO', amount: '1' }], amount: '2' };
    const counted = evaluate(base, [oldCopy], {
      includeAdditives: true,
      chemistryOf: (name) => (name === 'Cobalt Oxide' ? COBALT : undefined)
    });
    const fresh = evaluate(base, [{ ...COBALT, amount: '2' }], { includeAdditives: true });
    expect(counted.warnings).toEqual([]);
    expect(counted.analysis?.uList['CoO']).toBeCloseTo(fresh.analysis!.uList['CoO'], 10);

    const gone = evaluate(base, [{ ...oldCopy, name: 'Old blue' }], {
      includeAdditives: true,
      chemistryOf: () => undefined
    });
    expect(gone.warnings).toEqual([
      'Old blue was saved by an older version of Glazecalc, without its LOI, so it is left out. ' +
        'Add it to the recipe again to count it.'
    ]);
    expect(gone.analysis?.uList['CoO']).toBeUndefined();
  });

  it('saves the choice with the recipe and opens a recipe with its own', async () => {
    const counted: Recipe = {
      _id: 'r1',
      title: 'Blue',
      includeAdditives: true,
      materials: [{ ...WHITING, amount: '20' }],
      additives: [{ ...COBALT, amount: '1', unit: 'percent' }]
    };
    const { fixture, page } = await create([counted], [IRON, COBALT]);
    page['open'](counted);
    await fixture.whenStable();
    expect(page['includeAdditives']()).toBe(true);
    expect((fixture.nativeElement.querySelector('#include-additives') as HTMLInputElement).checked).toBe(true);
    expect(page['dirty']()).toBe(false);

    page['setIncludeAdditives'](false);
    expect(page['status']()).toBe('Changes not saved yet');
    const saving = page['save']();
    const req = httpMock().expectOne({ method: 'PUT', url: API + '/recipe/change/r1' });
    expect(req.request.body.recipe.includeAdditives).toBe(false);
    expect(req.request.body.recipe.computed.uList.CoO).toBeUndefined();
    req.flush({ msg: 'Successfully updated recipe' });
    await saving;
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
    page['setBatchText']('500');
    page['scaleToBatch']();
    expect(amounts()).toEqual(['300', '200', '2', '100']);
    await fixture.whenStable();
    expect(text(fixture, '.recipe-scale-note')).toBe('Now in grams for the batch.');
    expect(additivesShown(fixture)).toEqual(['Iron oxide : 2%', 'Rutile : 100 parts']);

    page['setBatchText']('');
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

  it('scales to a batch in pounds when weights are in pounds and ounces, and shows each as a scale reads it', async () => {
    const weightUnit = TestBed.inject(PreferencesService).weightUnit;
    weightUnit.set('lb');
    const { fixture, page } = await create();
    fill(page, [
      [WHITING, '3'],
      [SILICA, '2']
    ]);
    page['addAdditive'](IRON);
    page['setAdditiveAmount'](0, '2');
    page['addAdditive'](RUTILE);
    page['setAdditiveAmount'](1, '0.5');
    page['setAdditiveUnit'](1, 'grams');
    const amounts = () => [
      ...page['lines']().map((l: { amount: string }) => l.amount),
      ...page['additiveLines']().map((a: { amount: string }) => a.amount)
    ];
    const weights = () =>
      [...fixture.nativeElement.querySelectorAll('.recipe-weight')].map((el: Element) => el.textContent?.trim());

    await fixture.whenStable();
    click(fixture, 'Scale to a batch');
    await fixture.whenStable();
    expect(text(fixture, 'label[for="batch-weight"]')).toBe('Batch weight (lb)');
    expect(page['batchText']()).toBe('1');
    page['setBatchText']('');
    page['scaleToBatch']();
    await fixture.whenStable();
    expect(text(fixture, '.recipe-scale-note')).toBe('Please enter the weight of the batch in pounds, such as 2.5.');

    page['setBatchText']('2.5');
    page['scaleToBatch']();
    await fixture.whenStable();
    // Pounds: 1.5 lb whiting and 1 lb silica; the iron stays 2% of the base, and the rutile scales with it.
    expect(amounts()).toEqual(['1.5', '1', '2', '0.25']);
    // In grams it would now be pounds, so it is in parts, which scale as the materials do.
    expect(page['additiveLines']()[1].unit).toBe('parts');
    expect(additivesShown(fixture)).toEqual(['Iron oxide : 2%', 'Rutile : 0.25 parts']);
    expect(text(fixture, '.recipe-scale-note')).toBe(
      'Now in pounds for the batch, with each in pounds and ounces under it.' +
        ' Colorants that were in grams are now in parts: pounds, like the materials.'
    );
    // Materials, the total, then the colorants: 2% of 2.5 lb is 0.8 oz.
    expect(weights()).toEqual(['1 lb 8 oz', '1 lb', '2 lb 8 oz', '0.8 oz', '4 oz']);
    // They follow the amounts.
    page['setAdditiveAmount'](0, '4');
    await fixture.whenStable();
    expect(weights()[3]).toBe('1.6 oz');

    // Another scale is not in pounds.
    page['scale']({ to: 'percent' });
    await fixture.whenStable();
    expect(weights()).toEqual([]);

    // Typed in pounds, so in grams it starts from the gram default.
    weightUnit.set('g');
    expect(page['batchText']()).toBe('500');
    weightUnit.set('lb');
    expect(page['batchText']()).toBe('2.5');
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
    const { fixture, page } = await create();
    const tryToSave = async (expected: string) => {
      await page['save']();
      await fixture.whenStable();
      // Beside the save buttons, not at the top of the page.
      expect(page['saveProblem']()).toBe(expected);
      expect(page['notices'].errors()).toEqual([]);
    };
    // The title is marked on its field; a missing material is said beside the buttons.
    await tryToSave('Please add at least one material.');
    expect(fieldProblem(fixture, 'recipe-name')).toBe('Give the recipe a title.');
    expect(document.activeElement?.id).toBe('recipe-name');
    page['title'].set('Matte');
    page['addMaterial'](WHITING);
    await tryToSave('');
    expect(fieldProblem(fixture, 'recipe-name')).toBe('');
    expect(fieldProblem(fixture, 'material-amount-0')).toBe('Enter an amount (0 is fine).');
    expect(document.activeElement?.id).toBe('material-amount-0');
    page['setAmount'](0, '-2');
    await tryToSave('');
    expect(fieldProblem(fixture, 'material-amount-0')).toBe('Enter a number, such as 12.5.');
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
    expect(text(fixture, ':scope > p.visually-hidden[role=status]')).toBe('Silica taken out of the recipe.');
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

  describe('printing', () => {
    // Closing the print view steps back in the (mock) browser history.
    beforeEach(() => TestBed.configureTestingModule({ providers: [provideLocationMocks()] }));

    const SAVED: Recipe = {
      _id: 'r1',
      title: 'Saved matte',
      materials: [
        { ...WHITING, amount: '20' },
        { ...SILICA, amount: '30' }
      ],
      additives: [],
      notes: ['None.']
    };

    /** Lets the print view open and fetch the weight setting. */
    const opened = async (fixture: Parameters<typeof settle>[0]) => {
      await settle(fixture);
      answer('/preferences', { weightUnit: 'g' });
      await settle(fixture);
    };

    it('prints the recipe being edited, and goes back to it just as it was', async () => {
      const { fixture, page } = await create();
      const router = TestBed.inject(Router);
      router.initialNavigation();
      page['title'].set('Matte');
      fill(page, [
        [WHITING, '20'],
        [SILICA, '30']
      ]);
      await settle(fixture);
      click(fixture, 'Print');
      await opened(fixture);
      expect(router.url).toBe('/?print=draft');
      expect(text(fixture, '.print-sheet h2')).toBe('Matte');
      expect((fixture.nativeElement.querySelector('.recipe-layout') as HTMLElement).closest('[hidden]')).not.toBeNull();
      expect(document.activeElement?.id).toBe('print-heading');

      click(fixture, 'Back to the recipe');
      await settle(fixture);
      expect(router.url).toBe('/');
      expect(fixture.nativeElement.querySelector('gc-recipe-print')).toBeNull();
      expect(page['title']()).toBe('Matte');
      expect(page['lines']().map((line: { amount: string }) => line.amount)).toEqual(['20', '30']);
      expect(document.activeElement?.id).toBe('print-draft');
    });

    it('prints a saved recipe from the list', async () => {
      const { fixture } = await create([SAVED]);
      const router = TestBed.inject(Router);
      router.initialNavigation();
      await settle(fixture);
      const button = fixture.nativeElement.querySelector('#print-r1') as HTMLButtonElement;
      expect(button.getAttribute('aria-label')).toBe('Print Saved matte');
      button.click();
      await opened(fixture);
      expect(router.url).toBe('/?print=r1');
      expect(text(fixture, '.print-sheet h2')).toBe('Saved matte');

      click(fixture, 'Back to the recipe');
      await settle(fixture);
      expect(router.url).toBe('/');
      expect(document.activeElement?.id).toBe('print-r1');
    });

    it('opens from the address once the saved recipes are in, and drops a print of what is not there', async () => {
      const router = TestBed.inject(Router);
      await router.navigateByUrl('/?print=r1');
      const fixture = TestBed.createComponent(RecipePage);
      await fixture.whenStable();
      expect(text(fixture)).toContain('Getting the recipe to print');
      answer('/materials/getStandard', [WHITING, SILICA]);
      answer('/materials/getAll', []);
      answer('/additives/getAll', []);
      answer('/additives/getStandard', []);
      answer('/recipe/getAll', [SAVED]);
      await opened(fixture);
      expect(text(fixture, '.print-sheet h2')).toBe('Saved matte');
      // Not opened from this page (a reload, or a bookmark): Back replaces the address.
      click(fixture, 'Back to the recipe');
      await settle(fixture);
      expect(router.url).toBe('/');

      // Nothing is being edited, so there is nothing to print.
      await router.navigateByUrl('/?print=draft');
      await settle(fixture);
      expect(router.url).toBe('/');
      expect(fixture.nativeElement.querySelector('gc-recipe-print')).toBeNull();
    });

    it('asks for a material, and amounts it can read, before printing', async () => {
      const { fixture, page } = await create();
      click(fixture, 'Print');
      await fixture.whenStable();
      expect(text(fixture, '.recipe-save-problem')).toBe('Please add at least one material to print.');
      fill(page, [[WHITING, '2o']]);
      click(fixture, 'Print');
      await fixture.whenStable();
      expect(text(fixture, '.recipe-save-problem')).toBe('');
      expect(fieldProblem(fixture, 'material-amount-0')).toBe('Enter a number, such as 12.5.');
      expect(document.activeElement?.id).toBe('material-amount-0');
      expect(TestBed.inject(Router).url).toBe('/');
    });
  });

  describe('comparing', () => {
    beforeEach(() => TestBed.configureTestingModule({ providers: [provideLocationMocks()] }));

    const CUSTER: Material = {
      ...material(
        'Custer Spar',
        [
          ['K2O', 1],
          ['Al2O3', 1],
          ['SiO2', 6]
        ],
        0
      ),
      status: 'discontinued',
      statusSince: '2023',
      substitutes: ['G-200 EU Feldspar']
    };
    const G200: Material = material(
      'G-200 EU Feldspar',
      [
        ['K2O', 0.8],
        ['Na2O', 0.2],
        ['Al2O3', 1],
        ['SiO2', 6.5]
      ],
      0.5
    );
    const OLD: Recipe = {
      _id: 'r1',
      title: 'Old celadon',
      materials: [
        { ...CUSTER, amount: '40' },
        { ...WHITING, amount: '20' },
        { ...SILICA, amount: '40' }
      ],
      additives: [],
      notes: ['None.']
    };

    const start = async (recipes: Recipe[] = [OLD]) => {
      const fixture = TestBed.createComponent(RecipePage);
      const router = TestBed.inject(Router);
      router.initialNavigation();
      await fixture.whenStable();
      answer('/materials/getStandard', [WHITING, SILICA, CUSTER, G200]);
      answer('/materials/getAll', []);
      answer('/additives/getAll', []);
      answer('/additives/getStandard', []);
      answer('/recipe/getAll', recipes);
      await settle(fixture);
      return { fixture, router, page: fixture.componentInstance as unknown as Page };
    };

    it('compares the recipe being edited with a saved one, and goes back to it', async () => {
      const { fixture, router, page } = await start();
      page['title'].set('Matte');
      fill(page, [
        [WHITING, '25'],
        [SILICA, '75']
      ]);
      await settle(fixture);
      click(fixture, 'Compare');
      await settle(fixture);
      expect(router.url).toBe('/?compare=draft,r1');
      expect(text(fixture, '#compare-title')).toBe('Matte and Old celadon');
      expect(document.activeElement?.id).toBe('compare-heading');

      // Another choice replaces the address, so Back still leaves the comparison.
      page['chooseCompared']({ side: 'right', key: 'draft' });
      await settle(fixture);
      expect(router.url).toBe('/?compare=draft,draft');
      click(fixture, 'Back to the recipe');
      await settle(fixture);
      expect(router.url).toBe('/');
      expect(page['lines']().map((l: { amount: string }) => l.amount)).toEqual(['25', '75']);
      expect(document.activeElement?.id).toBe('compare-draft');
    });

    it('compares a saved recipe from the list', async () => {
      const { fixture, router } = await start();
      const button = fixture.nativeElement.querySelector('#compare-r1') as HTMLButtonElement;
      expect(button.getAttribute('aria-label')).toBe('Compare Old celadon');
      button.click();
      await settle(fixture);
      // Nothing is being edited, and there is no other saved recipe: the second is to choose.
      expect(router.url).toBe('/?compare=r1,');
      expect(text(fixture, '#compare-title')).toBe('Old celadon and a recipe to choose');
    });

    it('tries modern materials as a new recipe, and compares it with the saved one', async () => {
      const { fixture, router, page } = await start();
      page['open'](OLD);
      await settle(fixture);
      expect(text(fixture, '.recipe-swap')).toContain(
        'Custer Spar (Discontinued 2023): G-200 EU Feldspar can take its place, gram for gram.'
      );

      click(fixture, 'Try modern materials and compare');
      await settle(fixture);
      expect(router.url).toBe('/?compare=r1,draft');
      expect(page['lines']().map((l: Material) => l.name)).toEqual(['G-200 EU Feldspar', 'Whiting', 'Silica']);
      expect(page['lines']()[0].amount).toBe('40');
      expect(page['title']()).toBe('Old celadon with modern materials');
      expect(page['notes']()).toBe('Swapped one for one: Custer Spar became G-200 EU Feldspar.');
      // A new recipe: saving it leaves the old one as it was.
      expect(page['savedId']()).toBeNull();
      expect(text(fixture, '#compare-title')).toBe('Old celadon and Old celadon with modern materials');
      const k2o = [...fixture.nativeElement.querySelectorAll('.compare-table tbody tr')]
        .map((tr: Element) => [...tr.children].map((cell) => cell.textContent?.trim()))
        .find((cells: Array<string | undefined>) => cells[0] === 'Na₂O');
      expect(k2o?.[1]).toBe('-');
    });

    it('undoes the swap: the saved recipe is back, as saved', async () => {
      const { fixture, page } = await start();
      page['open'](OLD);
      await settle(fixture);
      click(fixture, 'Try modern materials and compare');
      await settle(fixture);
      click(fixture, 'Back to the recipe');
      await settle(fixture);
      expect(text(fixture, '.recipe-swap')).toContain('Swapped for modern materials');
      click(fixture, 'Undo the swap');
      await settle(fixture);
      expect(page['lines']().map((l: Material) => l.name)).toEqual(['Custer Spar', 'Whiting', 'Silica']);
      expect(page['title']()).toBe('Old celadon');
      expect(page['savedId']()).toBe('r1');
      expect(page['dirty']()).toBe(false);
      expect(document.activeElement?.id).toBe('recipe-name');
    });

    it('says when a swap is not like for like, and when lead is still in it', async () => {
      // Lead is allowed in Settings.
      TestBed.inject(PreferencesService).lead.set('on');
      const LITHARGE: Material = {
        ...material('Litharge', [['PbO', 1]], 0),
        status: 'historical',
        substitutes: ['Lead Bisilicate Frit']
      };
      const BISILICATE: Material = material(
        'Lead Bisilicate Frit',
        [
          ['PbO', 1],
          ['SiO2', 2]
        ],
        0
      );
      const fixture = TestBed.createComponent(RecipePage);
      TestBed.inject(Router).initialNavigation();
      await fixture.whenStable();
      answer('/materials/getStandard', [WHITING, SILICA, LITHARGE, BISILICATE]);
      answer('/materials/getAll', []);
      answer('/additives/getAll', []);
      answer('/additives/getStandard', []);
      answer('/recipe/getAll', []);
      await settle(fixture);
      const page = fixture.componentInstance as unknown as Page;
      fill(page, [
        [LITHARGE, '60'],
        [SILICA, '40']
      ]);
      await settle(fixture);
      const note = text(fixture, '.recipe-swap');
      expect(note).toContain('Lead Bisilicate Frit is what is used now, but it is not like for like');
      expect(note).toContain('Lead Bisilicate Frit still contains lead.');
      page['tryModernMaterials']();
      await settle(fixture);
      expect(page['notes']()).toBe(
        'Swapped one for one: Litharge became Lead Bisilicate Frit (work its amount out again).'
      );
    });

    it('suggests amounts for a swap that is not like for like, asking what brings back what it leaves short', async () => {
      const NITER: Material = {
        ...material('Niter', [['K2O', 1]], 53.42),
        status: 'historical',
        substitutes: ['Soda frit']
      };
      const SODA_FRIT = material(
        'Soda frit',
        [
          ['Na2O', 0.7],
          ['CaO', 0.3],
          ['Al2O3', 0.1],
          ['B2O3', 0.1],
          ['SiO2', 3]
        ],
        0
      );
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
        13.96
      );
      const fixture = TestBed.createComponent(RecipePage);
      const router = TestBed.inject(Router);
      router.initialNavigation();
      await fixture.whenStable();
      answer('/materials/getStandard', [WHITING, SILICA, CUSTER, G200, NITER, SODA_FRIT, SPAR, KAOLIN]);
      answer('/materials/getAll', []);
      answer('/additives/getAll', []);
      answer('/additives/getStandard', []);
      answer('/recipe/getAll', []);
      await settle(fixture);
      const page = fixture.componentInstance as unknown as Page;
      const buttons = () => [...fixture.nativeElement.querySelectorAll('.recipe-swap button')].map((b) => b.id);

      // Only a swap that is not like for like needs its amounts worked out.
      fill(page, [
        [CUSTER, '40'],
        [WHITING, '20'],
        [SILICA, '40']
      ]);
      await settle(fixture);
      expect(buttons()).toEqual(['try-modern']);

      page['reset']();
      fill(page, [
        [NITER, '10'],
        [WHITING, '20'],
        [KAOLIN, '20'],
        [SILICA, '50']
      ]);
      await settle(fixture);
      expect(buttons()).toEqual(['try-modern', 'suggest-amounts']);
      click(fixture, 'Suggest amounts and compare');
      await settle(fixture);
      expect(document.activeElement?.id).toBe('suggest-heading');
      const legend = text(fixture, '.recipe-suggest legend');
      expect(legend).toMatch(/^Niter gave potash \(K₂O\): 0\.\d{3} in the unity formula\. With Soda frit it comes to/);
      const checked = fixture.nativeElement.querySelector('.recipe-suggest input:checked') as HTMLInputElement;
      expect(checked.labels?.[0].textContent?.replace(/\s+/g, ' ').trim()).toBe('Potash feldspar (17% potash (K₂O))');

      // Cancel closes it, with the focus back on the button.
      click(fixture, 'Cancel');
      await settle(fixture);
      expect(fixture.nativeElement.querySelector('.recipe-suggest')).toBeNull();
      expect(document.activeElement?.id).toBe('suggest-amounts');

      click(fixture, 'Suggest amounts and compare');
      await settle(fixture);
      click(fixture, 'Work it out and compare');
      await settle(fixture);
      expect(router.url).toBe('/?compare=before,draft');
      const amounts = Object.fromEntries(page['lines']().map((l: Material & { amount: string }) => [l.name, l.amount]));
      expect(Object.keys(amounts)).not.toContain('Niter');
      expect(Number(amounts['Potash feldspar'])).toBeGreaterThan(20);
      expect(amounts['Whiting']).toBe('20');
      expect(page['title']()).toBe('Untitled recipe with modern materials');
      expect(page['notes']()).toMatch(
        /^Amounts worked out to bring the unity formula back: Niter became Soda frit\. Changed: .*Potash feldspar [\d.]+, new.* This matches the fired oxides only; test a small batch first\.$/
      );

      // Undo puts the recipe back as it was.
      click(fixture, 'Back to the recipe');
      await settle(fixture);
      click(fixture, 'Undo the swap');
      await settle(fixture);
      expect(page['lines']().map((l: Material & { amount: string }) => [l.name, l.amount])).toEqual([
        ['Niter', '10'],
        ['Whiting', '20'],
        ['Kaolin', '20'],
        ['Silica', '50']
      ]);
    });

    it('warns of lead, hides it from the lists while it is off, and replaces it', async () => {
      const RED_LEAD: Material = { ...material('Red lead', [['PbO', 1]], 2.33), status: 'historical' };
      const BASE_FRIT: Material = {
        ...material(
          'Borosilicate frit',
          [
            ['Na2O', 0.3],
            ['CaO', 0.7],
            ['Al2O3', 0.25],
            ['B2O3', 0.6],
            ['SiO2', 2.6]
          ],
          0
        ),
        category: 'frit'
      };
      const KAOLIN: Material = {
        ...material(
          'China Clay',
          [
            ['Al2O3', 1],
            ['SiO2', 2]
          ],
          13.96
        ),
        category: 'clay'
      };
      const fixture = TestBed.createComponent(RecipePage);
      const router = TestBed.inject(Router);
      router.initialNavigation();
      await fixture.whenStable();
      answer('/materials/getStandard', [WHITING, SILICA, KAOLIN, RED_LEAD, BASE_FRIT]);
      answer('/materials/getAll', []);
      answer('/additives/getAll', []);
      answer('/additives/getStandard', []);
      answer('/recipe/getAll', []);
      await settle(fixture);
      const page = fixture.componentInstance as unknown as Page;

      // Lead is off unless chosen: red lead is not listed to add.
      const list = fixture.nativeElement.querySelector('.library') as HTMLElement;
      expect(list.textContent).not.toContain('Red lead');
      expect(text(fixture, '.library-hidden')).toBe('1 with lead is not listed: lead is off in Settings.');

      // An old recipe with lead still opens, with a warning.
      fill(page, [
        [RED_LEAD, '55'],
        [KAOLIN, '15'],
        [SILICA, '30']
      ]);
      await settle(fixture);
      expect(text(fixture, '.recipe-lead')).toMatch(
        /^Contains lead: PbO 1\.000 in the unity formula \(\d+% of the fired glaze\)/
      );

      click(fixture, 'Replace lead');
      await settle(fixture);
      expect(document.activeElement?.id).toBe('lead-heading');
      expect((fixture.nativeElement.querySelector('#lead-cone') as HTMLSelectElement).value).toBe('04');
      expect(text(fixture, 'label[for="lead-base-0"]')).toBe('Borosilicate frit (15% boron, B₂O₃)');
      page['chooseCone']('06');
      await settle(fixture);

      click(fixture, 'Replace lead and compare');
      await settle(fixture);
      expect(router.url).toBe('/?compare=before,draft');
      const names = page['lines']().map((l: Material) => l.name);
      expect(names).not.toContain('Red lead');
      expect(names).toContain('Borosilicate frit');
      expect(page['title']()).toBe('Untitled recipe without lead');
      expect(page['notes']()).toMatch(
        /^Lead replaced for cone 06 on Borosilicate frit: the old recipe's silica and alumina kept, with boron and other fluxes doing lead's work\. Changed: .*Red lead 55 → 0/
      );
      expect(page['notes']()).toContain('Having no lead does not by itself make a glaze safe with food');

      click(fixture, 'Back to the recipe');
      await settle(fixture);
      expect(fixture.nativeElement.querySelector('.recipe-lead')).toBeNull();
      click(fixture, 'Undo the swap');
      await settle(fixture);
      expect(page['lines']().map((l: Material) => l.name)).toEqual(['Red lead', 'China Clay', 'Silica']);
    });

    it('compares a changed recipe with itself before the swap', async () => {
      const { fixture, router, page } = await start([]);
      fill(page, [
        [CUSTER, '40'],
        [WHITING, '20'],
        [SILICA, '40']
      ]);
      await settle(fixture);
      page['tryModernMaterials']();
      await settle(fixture);
      expect(router.url).toBe('/?compare=before,draft');
      expect(text(fixture, '#compare-title')).toBe('Untitled recipe and Untitled recipe with modern materials');
      const choices = [...(fixture.nativeElement.querySelector('#compare-left') as HTMLSelectElement).options].map(
        (o) => o.textContent?.trim()
      );
      expect(choices).toEqual([
        'Being edited: Untitled recipe with modern materials',
        'Before the swap: Untitled recipe'
      ]);
    });

    it('makes the recipe from what is on hand, kept with the account, and works it out again from its report', async () => {
      const { fixture, router, page } = await start([]);
      fill(page, [
        [CUSTER, '40'],
        [WHITING, '20'],
        [SILICA, '40']
      ]);
      await settle(fixture);
      click(fixture, 'Match with what I have');
      await settle(fixture);
      expect(document.activeElement?.id).toBe('shelf-heading');
      // On hand: the feldspar and whiting, as fetched from the account.
      answer('/shelf', { shelf: ['G-200 EU Feldspar', 'Whiting'] });
      await settle(fixture);
      expect(text(fixture, '.recipe-shelf .try-list')).toContain('G-200 EU Feldspar');

      // The recipe's materials added in one click, saved with the account.
      click(fixture, 'Add the materials in this recipe');
      const put = httpMock().expectOne(API + '/shelf');
      expect(put.request.body).toEqual({ shelf: ['G-200 EU Feldspar', 'Whiting', 'Custer Spar', 'Silica'] });
      put.flush({ shelf: put.request.body.shelf });
      await settle(fixture);
      expect(text(fixture, '.recipe-shelf-status')).toBe('Saved with your account.');

      // Custer is not really on hand: removed, and saved again.
      (
        fixture.nativeElement.querySelector(
          '[aria-label="Remove Custer Spar from your materials on hand"]'
        ) as HTMLElement
      ).click();
      httpMock()
        .expectOne(API + '/shelf')
        .flush({ shelf: ['G-200 EU Feldspar', 'Whiting', 'Silica'] });
      await settle(fixture);

      click(fixture, 'Match and compare');
      await settle(fixture);
      expect(router.url).toBe('/?compare=before,draft');
      expect(page['title']()).toBe('Untitled recipe from what I have');
      expect(page['lines']().map((l: Material) => l.name)).toEqual(['G-200 EU Feldspar', 'Whiting', 'Silica']);
      expect(page['notes']()).toMatch(/^Made from what you have on hand.*Custer Spar 40 → 0/);
      // How it was made, beside the comparison.
      expect(text(fixture, '.compare-controls .swap-report')).toContain('G-200 EU Feldspar');

      // Left out, it is worked out again from the recipe as it was.
      (fixture.nativeElement.querySelector('[aria-label="Leave out Silica"]') as HTMLElement).click();
      await settle(fixture);
      expect(page['lines']().map((l: Material) => l.name)).not.toContain('Silica');
      expect(text(fixture, '.swap-report')).toContain('Left out: Silica.');
      expect(document.activeElement?.id).toBe('swap-report-heading');
      click(fixture, 'Back to the recipe');
      await settle(fixture);
      click(fixture, 'Undo the swap');
      await settle(fixture);
      expect(page['lines']().map((l: Material) => l.name)).toEqual(['Custer Spar', 'Whiting', 'Silica']);
    });
  });
});
