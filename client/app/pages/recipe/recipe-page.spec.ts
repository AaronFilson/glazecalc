import { provideLocationMocks } from '@angular/common/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { TranslocoService } from '@jsverse/transloco';
import { AuthService } from '../../core/auth.service';
import { routes } from '../../app.routes';
import { askBeforeLeaving } from '../../core/leave.guard';
import { Additive, Material, Recipe, RecipeMaterial } from '../../core/models';
import { PendingRecipeService } from '../../core/pending-recipe.service';
import { PreferencesService } from '../../core/preferences.service';
import { answer, API, fieldProblem, httpMock, settle, testProviders, text } from '../../testing/test-providers';
import { MOLAR_MASS } from '../../../../lib/chemistry';
import { formatLocale } from '../../shared/format';
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

/** Another page of the app, to leave the recipe page for. */
@Component({ template: 'Another page' })
class OtherPage {}

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
      page['edit'].addMaterial(m);
      page['edit'].setAmount(page['lines']().length - 1, amount);
    }
  };

  const click = (fixture: { nativeElement: HTMLElement }, label: string) => {
    const button = [...fixture.nativeElement.querySelectorAll('button')].find((b) => b.textContent?.trim() === label);
    if (!button) throw new Error('no button ' + label);
    button.click();
  };

  /** Types into a field as a person does: the text, then the input event the field listens for. */
  const type = async (
    fixture: { nativeElement: HTMLElement; whenStable(): Promise<unknown> },
    id: string,
    value: string
  ) => {
    const field = fixture.nativeElement.querySelector<HTMLInputElement | HTMLTextAreaElement>('#' + id);
    if (!field) throw new Error('no field #' + id);
    field.value = value;
    field.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };

  it('opens a recipe handed over by Solve for a target as a new recipe, not saved yet, and links to it', async () => {
    TestBed.inject(PendingRecipeService).put({
      title: 'Solved for a target',
      notes: 'Made by Solve for a target.',
      materials: [
        { ...WHITING, amount: '20.0' },
        { ...SILICA, amount: '80.0' }
      ],
      firing: 'mid'
    });
    const { fixture, page } = await create();
    expect(page['title']()).toBe('Solved for a target');
    expect(page['notes']()).toBe('Made by Solve for a target.');
    expect(page['lines']().map((line: Material) => line.name)).toEqual(['Whiting', 'Silica']);
    expect(page['firing']()).toBe('mid');
    expect(page['savedId']()).toBeNull();
    expect(text(fixture, '.recipe-status')).toBe('Not saved yet');
    // Taken once: the next visit starts empty.
    expect(TestBed.inject(PendingRecipeService).take()).toBeNull();
    const links = [...(fixture.nativeElement as HTMLElement).querySelectorAll('.recipe-tools a')];
    expect(links.map((a) => [a.textContent?.trim(), a.getAttribute('href')])).toContainEqual([
      'Solve for a target',
      '/solve'
    ]);
  });

  it("lists the hazards of the recipe's materials from the library as it is now, and offers its cost", async () => {
    const fixture = TestBed.createComponent(RecipePage);
    await fixture.whenStable();
    const dusty = (m: Material, hazards: string): Material => ({ ...m, ownedBy: 'Standard', hazards });
    answer('/materials/getStandard', [
      dusty(WHITING, 'Fine dust; avoid breathing it.'),
      dusty(SILICA, 'Contains crystalline silica; do not breathe the dust.')
    ]);
    answer('/materials/getAll', []);
    answer('/additives/getAll', []);
    answer('/additives/getStandard', [IRON]);
    answer('/recipe/getAll', []);
    await settle(fixture);
    const page = fixture.componentInstance as unknown as Page;
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('gc-recipe-hazards')).toBeNull();
    // A line saved with an older sheet's words reads the library's current ones.
    fill(page, [
      [{ ...WHITING, ownedBy: 'Standard', hazards: 'An old sheet.' }, '20'],
      [{ ...SILICA, ownedBy: 'Standard' }, '80']
    ]);
    page['edit'].addAdditive(IRON);
    await fixture.whenStable();
    expect([...root.querySelectorAll('.recipe-hazards li')].map((li) => li.textContent?.trim())).toEqual([
      'Whiting: Fine dust; avoid breathing it.',
      'Silica: Contains crystalline silica; do not breathe the dust.'
    ]);
    expect(text(fixture, '.recipe-hazards')).toContain('No hazards are given for Iron oxide');
    // The prices are fetched only when the cost is asked for.
    httpMock().expectNone(API + '/prices');
    click(fixture, 'Cost of a batch');
    await fixture.whenStable();
    answer('/prices', { prices: [] });
    await settle(fixture);
    // Nothing has a price yet: what to do, not a total of nothing.
    expect(text(fixture, '.recipe-cost-summary')).toBe(
      "Give each material's price per kilogram to see what a batch costs."
    );
  });

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

    page['edit'].setAmount(1, '60');
    await fixture.whenStable();
    expect(text(fixture, '.unity-result')).toContain('SiO₂ : ' + (60 / 60.083 / (20 / 100.08)).toFixed(3));
  });

  it('counts colorants in the unity formula when asked, at their weight in the batch', async () => {
    const { fixture, page } = await create();
    fill(page, [
      [WHITING, '20'],
      [SILICA, '30']
    ]);
    page['edit'].addAdditive(COBALT);
    page['edit'].setAdditiveAmount(0, '2');
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
    page['edit'].setAdditiveUnit(0, 'parts');
    page['edit'].setAdditiveAmount(0, '1');
    expect(page['evaluation']().analysis.uList.CoO / page['evaluation']().analysis.uList.CaO).toBeCloseTo(
      cobalt / calcium,
      6
    );
    // The choice is remembered for new recipes.
    expect(localStorage.getItem('includeAdditives')).toBe('yes');
  });

  it("estimates the dry SG with a colorant in percent at its weight in the batch, and the standard records' minerals", async () => {
    const { page } = await create();
    const standard = (m: Material): Material => ({ ...m, ownedBy: 'Standard' });
    fill(page, [
      [standard(WHITING), '100'],
      [standard(SILICA), '100']
    ]);
    page['edit'].addAdditive({ ...BENTONITE, ownedBy: 'Standard' });
    page['edit'].setAdditiveAmount(0, '2');
    const estimate = page['drySgEstimate']();
    // 2% of a 200 g base is 4 g of bentonite: left out, 4 of 204 g.
    expect(estimate.parts.find((part: { name: string }) => part.name === 'Bentonite').grams).toBeCloseTo(4, 9);
    expect(estimate.unknownShare).toBeCloseTo(4 / 204, 9);
    expect(estimate.unknown).toEqual(['Bentonite']);
    expect(estimate.sg).toBe(Math.round((200 / (100 / 2.71 + 100 / 2.65)) * 100) / 100);
    // A trace too: 0.0000001% of the base is 0.0000002 g, which String() wrote "2e-7", read as none.
    page['edit'].setAdditiveAmount(0, '0.0000001');
    const trace = page['drySgEstimate']().parts.find((part: { name: string }) => part.name === 'Bentonite');
    expect(trace.grams).toBeCloseTo(0.0000002, 15);
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

  it('counts nothing for a colorant with no amount yet, and does not warn about it', () => {
    TestBed.inject(TranslocoService);
    const base = [
      { ...WHITING, amount: '20' },
      { ...SILICA, amount: '30' }
    ];
    const odd: Additive = {
      name: 'Odd ochre',
      percentmole: 'percent',
      loi: 0,
      fields: [{ name: 'Fe', amount: '100' }],
      amount: ''
    };
    const counted = evaluate(base, [{ ...COBALT, amount: '0' }, odd], { includeAdditives: true });
    expect(counted.warnings).toEqual([]);
    expect(counted.analysis?.uList['CoO']).toBeUndefined();
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

  it('folds the firing part under a summary line: open when empty and on wide screens, closed on a phone once set', async () => {
    const fired: Recipe = {
      _id: 'r3',
      title: 'Cone 6 clear',
      firedAt: { scale: 'orton', low: '6', atmospheres: ['oxidation'] },
      materials: [{ ...WHITING, amount: '20' }]
    };
    const { fixture, page } = await create([fired]);
    const root = fixture.nativeElement as HTMLElement;
    const fold = () => root.querySelector('#firing-fold') as HTMLDetailsElement;
    expect(fold().open).toBe(true);
    expect(fold().querySelector('summary')?.textContent).toBe('Firing: not set');
    expect(fold().querySelector('gc-recipe-firing')).not.toBeNull();

    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({ matches: true, media: query })) as unknown as typeof window.matchMedia;
    try {
      page['open'](fired);
      await fixture.whenStable();
      expect(fold().querySelector('summary')?.textContent).toBe('Firing: cone 6, oxidation');
      expect(fold().open).toBe(false);
      // Asked to open, it stays open.
      fold().open = true;
      fold().dispatchEvent(new Event('toggle'));
      await fixture.whenStable();
      expect(fold().open).toBe(true);
      // A recipe with no firing opens it again.
      page['open']({ _id: 'r4', title: 'Bare', materials: [] } as Recipe);
      await fixture.whenStable();
      expect(fold().open).toBe(true);
    } finally {
      window.matchMedia = original;
    }
    // On a wide screen a set firing stays open.
    page['open'](fired);
    await fixture.whenStable();
    expect(fold().open).toBe(true);
  });

  it('shows the analysis, limits and Stull chart under the recipe, and saves the firing chosen for its limits', async () => {
    const fired: Recipe = {
      _id: 'r2',
      title: 'Cone 10 white',
      firing: 'high',
      materials: [{ ...WHITING, amount: '20' }]
    };
    const { fixture, page } = await create([fired]);
    page['open'](fired);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('#numbers-heading')?.textContent).toContain('Analysis and limits');
    expect((root.querySelector('#limit-firing') as HTMLSelectElement).value).toBe('high');
    expect(root.querySelector('gc-stull-chart svg')).not.toBeNull();
    expect(root.querySelector('#slurry-heading')).not.toBeNull();
    expect(page['dirty']()).toBe(false);

    const firing = root.querySelector('#limit-firing') as HTMLSelectElement;
    firing.value = 'mid';
    firing.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(page['status']()).toBe('Changes not saved yet');
    const saving = page['save']();
    const req = httpMock().expectOne({ method: 'PUT', url: API + '/recipe/change/r2' });
    expect(req.request.body.recipe.firing).toBe('mid');
    req.flush({ msg: 'Successfully updated recipe' });
    await saving;
  });

  it('takes the firing off a saved recipe with null when unknown is chosen', async () => {
    const fired: Recipe = {
      _id: 'r2b',
      title: 'Cone 10 white',
      firing: 'high',
      materials: [{ ...WHITING, amount: '20' }]
    };
    const { fixture, page } = await create([fired]);
    page['open'](fired);
    await fixture.whenStable();
    const firing = (fixture.nativeElement as HTMLElement).querySelector('#limit-firing') as HTMLSelectElement;
    firing.value = '';
    firing.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(page['dirty']()).toBe(true);
    const saving = page['save']();
    const req = httpMock().expectOne({ method: 'PUT', url: API + '/recipe/change/r2b' });
    expect(req.request.body.recipe.firing).toBeNull();
    req.flush({ msg: 'Successfully updated recipe' });
    await saving;
  });

  it('saves the SG target the calculator sets as sgTarget, and takes it off a saved recipe with null', async () => {
    const mixed: Recipe = { _id: 'r3', title: 'Dipping', sgTarget: 1.4, materials: [{ ...WHITING, amount: '20' }] };
    const { fixture, page } = await create([mixed]);
    page['open'](mixed);
    await fixture.whenStable();
    expect(page['sgTarget']()).toBe(1.4);
    expect(page['dirty']()).toBe(false);
    page['sgTarget'].set(1.55);
    let saving = page['save']();
    let req = httpMock().expectOne({ method: 'PUT', url: API + '/recipe/change/r3' });
    expect(req.request.body.recipe.sgTarget).toBe(1.55);
    req.flush({ msg: 'Successfully updated recipe' });
    await saving;
    page['sgTarget'].set(null);
    expect(page['dirty']()).toBe(true);
    saving = page['save']();
    req = httpMock().expectOne({ method: 'PUT', url: API + '/recipe/change/r3' });
    expect(req.request.body.recipe.sgTarget).toBeNull();
    req.flush({ msg: 'Successfully updated recipe' });
    await saving;
  });

  it('saves the firing block and the food-surface flag, and clears them with null on a saved recipe, never sending its links', async () => {
    const fired: Recipe = {
      _id: 'r4',
      title: 'Liner',
      materials: [{ ...WHITING, amount: '20' }],
      firedAt: { scale: 'orton', low: '6', high: '10', tested: ['6'] },
      foodSurface: true,
      firings: [{ firing: 'f1', result: 'glossy' }]
    };
    const { fixture, page } = await create([fired]);
    page['open'](fired);
    await fixture.whenStable();
    answer('/firing/getAll', [{ _id: 'f1', title: 'Glaze 14', fieldsIncluded: ['Cone'], rows: [['6']] }]);
    await settle(fixture);
    expect(page['dirty']()).toBe(false);
    expect(text(fixture, '.firing-tested')).toBe('Tested at cone 6');
    expect(text(fixture, '.firings-list')).toContain('Glaze 14');
    page['firedAt'].set({ scale: 'orton', low: '6', tested: ['6'], atmospheres: ['oxidation'] });
    let saving = page['save']();
    let req = httpMock().expectOne({ method: 'PUT', url: API + '/recipe/change/r4' });
    expect(req.request.body.recipe).toMatchObject({
      firedAt: { scale: 'orton', low: '6', tested: ['6'], atmospheres: ['oxidation'] },
      foodSurface: true
    });
    // A saved recipe's links change one at a time on the server: a save never sends the list.
    expect(req.request.body.recipe.firings).toBeUndefined();
    req.flush({ msg: 'Successfully updated recipe' });
    await saving;
    page['firedAt'].set(null);
    page['foodSurface'].set(false);
    await fixture.whenStable();
    saving = page['save']();
    req = httpMock().expectOne({ method: 'PUT', url: API + '/recipe/change/r4' });
    expect(req.request.body.recipe).toMatchObject({ firedAt: null, foodSurface: false });
    expect(req.request.body.recipe.firings).toBeUndefined();
    req.flush({ msg: 'Successfully updated recipe' });
    await saving;
  });

  it("changes a saved recipe's firing log links one at a time on the server, hides a log in the Trash, and copies none", async () => {
    const fired: Recipe = {
      _id: 'r6',
      title: 'Liner',
      materials: [{ ...WHITING, amount: '20' }],
      firings: [{ firing: 'f1', result: 'glossy' }, { firing: 'f2' }]
    };
    const { fixture, page } = await create([fired]);
    page['open'](fired);
    await fixture.whenStable();
    // f2 is in the Trash: its link stays on the recipe, but is not shown.
    answer('/firing/getAll', [
      { _id: 'f1', title: 'Glaze 14', fieldsIncluded: ['Cone'], rows: [['6']] },
      { _id: 'f3', title: 'Bisque 3', fieldsIncluded: ['Cone'], rows: [['04']] }
    ]);
    await settle(fixture);
    expect(fixture.nativeElement.querySelectorAll('.firings-list li').length).toBe(1);
    const result = fixture.nativeElement.querySelector('#firing-result-0') as HTMLInputElement;
    result.value = 'matte';
    result.dispatchEvent(new Event('change'));
    const put = httpMock().expectOne({ method: 'PUT', url: API + '/recipe/firings/r6/f1' });
    expect(put.request.body).toEqual({ result: 'matte' });
    put.flush({ firings: [{ firing: 'f1', result: 'matte' }, { firing: 'f2' }] });
    await settle(fixture);
    (fixture.nativeElement.querySelector('#firing-link') as HTMLButtonElement).click();
    const post = httpMock().expectOne({ method: 'POST', url: API + '/recipe/firings/r6' });
    expect(post.request.body).toEqual({ firing: 'f3' });
    post.flush({ firings: [{ firing: 'f1', result: 'matte' }, { firing: 'f2' }, { firing: 'f3' }] });
    await settle(fixture);
    expect(page['firings']().map((l: { firing: string }) => l.firing)).toEqual(['f1', 'f2', 'f3']);
    // Saved already: the recipe does not count as changed.
    expect(page['dirty']()).toBe(false);
    page['title'].set('Liner copy');
    const saving = page['saveAsCopy']();
    const created = httpMock().expectOne({ method: 'POST', url: API + '/recipe/create' });
    expect(created.request.body.firings).toBeUndefined();
    created.flush({ ...created.request.body, _id: 'r7' });
    await saving;
    expect(page['firings']()).toEqual([]);
    expect(page['dirty']()).toBe(false);
  });

  it('duplicates a saved recipe for another cone: a copy not saved yet, its firing to set again, and why', async () => {
    const fired: Recipe = {
      _id: 'r5',
      title: 'Celadon',
      materials: [{ ...WHITING, amount: '20' }],
      firing: 'mid',
      firedAt: { scale: 'orton', low: '6', tested: ['6'] },
      firings: [{ firing: 'f1' }]
    };
    const { fixture, page } = await create([fired]);
    page['duplicateForCone'](fired);
    await fixture.whenStable();
    expect(page['title']()).toBe('Celadon (another cone)');
    expect(page['savedId']()).toBeNull();
    expect(page['firedAt']()).toBeNull();
    expect(page['firings']()).toEqual([]);
    expect(page['firing']()).toBe('');
    expect(page['lines']().map((l: RecipeMaterial) => l.name)).toEqual(['Whiting']);
    expect(page['notices'].messages()[0]).toContain('usually means reformulating it');
  });

  it('saves the results by cone with the recipe and clears them with null; a copy and a duplicate start with none', async () => {
    const fired: Recipe = {
      _id: 'r8',
      title: 'Celadon',
      materials: [{ ...WHITING, amount: '20' }],
      firedAt: { scale: 'orton', low: '10', atmospheres: ['reduction'] },
      coneResults: [{ cone: '10', atmosphere: 'reduction', summary: 'Pale green' }]
    };
    const { fixture, page } = await create([fired]);
    page['open'](fired);
    await fixture.whenStable();
    expect(page['dirty']()).toBe(false);
    const box = fixture.nativeElement.querySelector('#cone-summary-0') as HTMLTextAreaElement;
    expect(box.value).toBe('Pale green');
    box.value = 'Deep green where thick';
    box.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(page['dirty']()).toBe(true);
    let saving = page['save']();
    let req = httpMock().expectOne({ method: 'PUT', url: API + '/recipe/change/r8' });
    expect(req.request.body.recipe.coneResults).toEqual([
      { cone: '10', atmosphere: 'reduction', summary: 'Deep green where thick' }
    ]);
    req.flush({ msg: 'Successfully updated recipe' });
    await saving;
    page['coneResults'].set([]);
    saving = page['save']();
    req = httpMock().expectOne({ method: 'PUT', url: API + '/recipe/change/r8' });
    expect(req.request.body.recipe.coneResults).toBeNull();
    req.flush({ msg: 'Successfully updated recipe' });
    await saving;

    page['open'](fired);
    await fixture.whenStable();
    page['title'].set('Celadon copy');
    saving = page['saveAsCopy']();
    const created = httpMock().expectOne({ method: 'POST', url: API + '/recipe/create' });
    expect(created.request.body.coneResults).toBeUndefined();
    created.flush({ ...created.request.body, _id: 'r9' });
    await saving;
    expect(page['coneResults']()).toEqual([]);
    expect(page['dirty']()).toBe(false);

    page['duplicateForCone'](fired);
    await fixture.whenStable();
    expect(page['coneResults']()).toEqual([]);
  });

  it('filters the saved recipes by cone, a range matching any cone inside it and the tested ones first, and by atmosphere', async () => {
    const recipes: Recipe[] = [
      { _id: 'a', title: 'Ranged', materials: [], firedAt: { scale: 'orton', low: '5', high: '7' } },
      {
        _id: 'b',
        title: 'Tested six',
        materials: [],
        firedAt: { scale: 'orton', low: '6', tested: ['6'], atmospheres: ['reduction'] }
      },
      { _id: 'c', title: 'Low fire', materials: [], firedAt: { scale: 'orton', low: '06' } },
      { _id: 'd', title: 'No firing', materials: [] }
    ];
    const { fixture } = await create(recipes);
    const root = fixture.nativeElement as HTMLElement;
    const titles = () => [...root.querySelectorAll('.saved-recipe-open')].map((b) => b.textContent?.trim());
    const choose = async (id: string, value: string) => {
      const select = root.querySelector('#' + id) as HTMLSelectElement;
      select.value = value;
      select.dispatchEvent(new Event('change'));
      await fixture.whenStable();
    };
    const options = [...root.querySelectorAll('#saved-cone-filter option')].map((o) => o.textContent?.trim());
    expect(options).toEqual(['Any cone', 'cone 06', 'cone 5', 'cone 6', 'cone 7']);
    await choose('saved-cone-filter', 'orton:6');
    expect(titles()).toEqual(['Tested six', 'Ranged']);
    await choose('saved-cone-filter', 'orton:06');
    expect(titles()).toEqual(['Low fire']);
    await choose('saved-cone-filter', '');
    await choose('saved-atmosphere-filter', 'reduction');
    expect(titles()).toEqual(['Tested six']);
    expect(text(fixture, '.saved-firing')).toBe('Tested at cone 6 · reduction');
  });

  it('copies picked materials, so amounts leave the lists alone', async () => {
    const { page } = await create();
    fill(page, [[WHITING, '5']]);
    expect((WHITING as { amount?: string }).amount).toBeUndefined();
    expect(page['libraries'].standardMaterials()[0]).toBe(WHITING);
  });

  it('says why there is no unity formula instead of showing an error', async () => {
    const { fixture, page } = await create();
    fill(page, [[SILICA, '100']]);
    await fixture.whenStable();
    expect(text(fixture, '.unity-problem')).toContain('no flux');

    page['edit'].setAmount(0, 'lots');
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
    page['edit'].removeMaterial(1);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.unity-warnings')).toBeNull();
  });

  it('changes the scale; colorants in parts change with it, those in percent stay', async () => {
    const { fixture, page } = await create();
    fill(page, [
      [WHITING, '3'],
      [SILICA, '2']
    ]);
    page['edit'].addAdditive(IRON);
    page['edit'].setAdditiveAmount(0, '2');
    page['edit'].addAdditive(RUTILE);
    page['edit'].setAdditiveAmount(1, '1');
    page['edit'].setAdditiveUnit(1, 'parts');
    // Colorants start as a percent of the base, as most recipes give them.
    expect(page['additiveLines']()[0].unit).toBe('percent');
    const amounts = () => [
      ...page['lines']().map((l: { amount: string }) => l.amount),
      ...page['additiveLines']().map((a: { amount: string }) => a.amount)
    ];

    page['edit'].scale({ to: 'percent' });
    expect(amounts()).toEqual(['60', '40', '2', '20']);
    page['edit'].scale({ to: 'parts' });
    expect(amounts()).toEqual(['3', '2', '2', '1']);
    page['edit'].setBatchText('500');
    page['edit'].scaleToBatch();
    expect(amounts()).toEqual(['300', '200', '2', '100']);
    await fixture.whenStable();
    expect(text(fixture, '.recipe-scale-note')).toBe('Now in grams for the batch.');
    expect(additivesShown(fixture)).toEqual(['Iron oxide : 2%', 'Rutile : 100 parts']);

    page['edit'].setBatchText('');
    page['edit'].scaleToBatch();
    await fixture.whenStable();
    expect(text(fixture, '.recipe-scale-note')).toBe('Please enter the weight of the batch, in grams.');

    // An amount it cannot read stops it, rather than changing the proportions around it.
    page['edit'].setAmount(1, '12,5');
    page['edit'].scale({ to: 'percent' });
    expect(amounts()).toEqual(['300', '12,5', '2', '100']);
    await fixture.whenStable();
    expect(text(fixture, '.recipe-scale-note')).toBe(
      'The amount for Silica is not a number ("12,5"). Please fix it first.'
    );
    expect(page['notices'].errors()).toEqual([]);
  });

  it('scales to a batch in pounds when weights are in pounds and ounces, and shows each as a scale reads it', async () => {
    const preferences = TestBed.inject(PreferencesService);
    preferences.remember('weightUnit', 'lb');
    const { fixture, page } = await create();
    fill(page, [
      [WHITING, '3'],
      [SILICA, '2']
    ]);
    page['edit'].addAdditive(IRON);
    page['edit'].setAdditiveAmount(0, '2');
    page['edit'].addAdditive(RUTILE);
    page['edit'].setAdditiveAmount(1, '0.5');
    page['edit'].setAdditiveUnit(1, 'grams');
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
    expect(page['edit'].batchText()).toBe('1');
    page['edit'].setBatchText('');
    page['edit'].scaleToBatch();
    await fixture.whenStable();
    expect(text(fixture, '.recipe-scale-note')).toBe('Please enter the weight of the batch in pounds, such as 2.5.');

    page['edit'].setBatchText('2.5');
    page['edit'].scaleToBatch();
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
    page['edit'].setAdditiveAmount(0, '4');
    await fixture.whenStable();
    expect(weights()[3]).toBe('1.6 oz');

    // Another scale is not in pounds.
    page['edit'].scale({ to: 'percent' });
    await fixture.whenStable();
    expect(weights()).toEqual([]);

    // Typed in pounds, so in grams it starts from the gram default.
    preferences.remember('weightUnit', 'g');
    expect(page['edit'].batchText()).toBe('500');
    preferences.remember('weightUnit', 'lb');
    expect(page['edit'].batchText()).toBe('2.5');
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

  it('undoes a save of a saved recipe, showing it as it was', async () => {
    const old: Recipe = { _id: 'r1', title: 'Old', materials: [{ ...WHITING, amount: '10' }] };
    const { fixture, page } = await create([old]);
    page['open'](old);
    await fixture.whenStable();
    page['title'].set('New');
    const saving = page['save']();
    httpMock()
      .expectOne({ method: 'PUT', url: API + '/recipe/change/r1' })
      .flush({ code: 'record-updated' });
    await saving;
    expect(page['notices'].actions().get('Saved "New".')?.label).toBe('Undo');

    page['notices'].act(0);
    httpMock()
      .expectOne({ method: 'POST', url: API + '/recipe/undo/r1' })
      .flush({ code: 'record-undone', record: old });
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
    expect(page['title']()).toBe('Old');
    expect(page['dirty']()).toBe(false);
    expect(page['myRecipes']().map((r: Recipe) => r.title)).toEqual(['Old']);
    expect(page['notices'].messages()).toEqual(['Went back to the version of "Old" before you saved.']);
  });

  it('offers no Undo for a recipe saved for the first time', async () => {
    const { page } = await create([]);
    fill(page, [[WHITING, '10']]);
    page['title'].set('Fresh');
    const saving = page['save']();
    httpMock()
      .expectOne({ method: 'POST', url: API + '/recipe/create' })
      .flush({ _id: 'r9', title: 'Fresh', materials: [] });
    await saving;
    expect(page['notices'].actions().size).toBe(0);
  });

  it("writes colorant amounts the reader's way, as it does the materials'", async () => {
    const { fixture, page } = await create([], [IRON, RUTILE, COBALT]);
    formatLocale.set('de-DE');
    try {
      fill(page, [[WHITING, '10']]);
      page['edit'].addAdditive(IRON);
      page['edit'].setAdditiveAmount(0, '0.5');
      page['edit'].addAdditive(RUTILE);
      page['edit'].setAdditiveAmount(1, '1.5');
      page['edit'].setAdditiveUnit(1, 'parts');
      page['edit'].addAdditive(COBALT);
      page['edit'].setAdditiveAmount(2, '1');
      page['edit'].setAdditiveUnit(2, 'parts');
      await fixture.whenStable();
      expect(additivesShown(fixture)).toEqual(['Iron oxide : 0,5%', 'Rutile : 1,5 parts', 'Cobalt Oxide : 1 part']);
    } finally {
      formatLocale.set('en');
    }
  });

  it('saves without clearing the page, then updates the same recipe', async () => {
    const { fixture, page } = await create();
    page['title'].set('Matte');
    fill(page, [
      [WHITING, '10'],
      [DOLOMITE, '20']
    ]);
    page['edit'].addAdditive(IRON);
    page['edit'].setAdditiveAmount(0, '2');
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
    expect(text(fixture, '.saved-recipes')).toContain('Open in the editor');
    // The editor's heading is the recipe's title.
    expect(text(fixture, '#editor-heading')).toBe('Matte');

    page['edit'].setAmount(1, '25');
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

    page['edit'].setAmount(0, '25');
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
    page['edit'].addMaterial(WHITING);
    await tryToSave('');
    expect(fieldProblem(fixture, 'recipe-name')).toBe('');
    expect(fieldProblem(fixture, 'material-amount-0')).toBe('Enter an amount (0 is fine).');
    expect(document.activeElement?.id).toBe('material-amount-0');
    page['edit'].setAmount(0, '-2');
    await tryToSave('');
    expect(fieldProblem(fixture, 'material-amount-0')).toBe('Enter a number, such as 12.5.');
    page['edit'].setAmount(0, '0');
    page['edit'].addMaterial(SILICA);
    page['edit'].setAmount(1, '30');
    await tryToSave('Not saved: Recipe contains no flux oxides, so the UMF is undefined');
    httpMock().expectNone(API + '/recipe/create');
  });

  it('sends the focus back to the list to add from on Enter in an amount, once the amount is right', async () => {
    const { fixture, page } = await create();
    const root = fixture.nativeElement as HTMLElement;
    const enter = async (id: string, init: KeyboardEventInit = {}) => {
      const field = root.querySelector<HTMLInputElement>('#' + id)!;
      field.focus();
      const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, ...init });
      field.dispatchEvent(event);
      await fixture.whenStable();
      return event;
    };
    page['edit'].addMaterial(WHITING);
    await fixture.whenStable();
    // Empty: it stays, marked, and nothing is sent.
    const empty = await enter('material-amount-0');
    expect(empty.defaultPrevented).toBe(true);
    expect(document.activeElement?.id).toBe('material-amount-0');
    expect(fieldProblem(fixture, 'material-amount-0')).toBe('Enter an amount (0 is fine).');
    // An Enter that ends a composition is left to it.
    page['edit'].setAmount(0, '20');
    await fixture.whenStable();
    const composing = await enter('material-amount-0', { isComposing: true });
    expect(composing.defaultPrevented).toBe(false);
    expect(document.activeElement?.id).toBe('material-amount-0');
    await enter('material-amount-0');
    expect(document.activeElement?.id).toBe('materials-filter');
    expect(fieldProblem(fixture, 'material-amount-0')).toBe('');
    // An additive's amount goes back to the additives' list.
    page['edit'].addAdditive(IRON);
    page['edit'].setAdditiveAmount(0, '2');
    await fixture.whenStable();
    await enter('additive-amount-0');
    expect(document.activeElement?.id).toBe('additives-filter');
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
    page['edit'].setAmount(0, '12');
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
      (b: Element) => b.textContent?.trim() === 'Start a new recipe'
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
    page['edit'].removeMaterial(1);
    await fixture.whenStable();
    expect(document.activeElement?.id).toBe('material-remove-0');
    expect(text(fixture, ':scope > p.visually-hidden[role=status]')).toBe('Silica taken out of the recipe.');
    page['edit'].removeMaterial(0);
    await fixture.whenStable();
    expect(document.activeElement?.id).toBe('materials-heading');
  });

  it('expands a saved recipe, including ones saved before siAlRatio existed', async () => {
    const old: Recipe = {
      _id: 'old',
      title: 'Old celadon',
      notes: ['Good\nGlossy at cone 6'],
      materials: [{ ...WHITING, amount: '20' }],
      computed: [{ uList: { CaO: 1, Al2O3: 0.4, SiO2: 3.7 } }]
    };
    const { fixture } = await create([old]);
    click(fixture, 'Show details');
    await fixture.whenStable();

    const shown = text(fixture, '.saved-recipe');
    expect(shown).toContain('Whiting : 20');
    expect(shown).toContain('SiO₂ : 3.700');
    expect(shown).toContain('Ratio of Silica to Alumina : 9.25');
    // The notes keep their line breaks (.keep-lines in styles.scss).
    expect(fixture.nativeElement.querySelector('.saved-recipe .keep-lines').textContent).toBe(
      'Notes: Good\nGlossy at cone 6'
    );
    click(fixture, 'Hide details');
    await fixture.whenStable();
    expect(text(fixture, '.saved-recipe')).not.toContain('Whiting : 20');
  });

  it('lists the saved recipes first, newest first, with their dates; a name opens it', async () => {
    const recipes: Recipe[] = Array.from({ length: 10 }, (_, i) => ({
      _id: 'r' + i,
      title: (i === 3 ? 'Celadon ' : 'Matte ') + i,
      date: i === 9 ? '2026-10-01' : undefined,
      materials: [{ ...WHITING, amount: '10' }]
    }));
    const { fixture, page } = await create(recipes);
    // Before the editor, so a returning potter finds them first.
    const list = fixture.nativeElement.querySelector('#saved-recipes') as HTMLElement;
    expect(list.compareDocumentPosition(fixture.nativeElement.querySelector('.recipe-editor'))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
    expect(text(fixture, '#saved-heading')).toBe('My saved recipes (10 recipes)');
    const names = () =>
      [...fixture.nativeElement.querySelectorAll('.saved-recipe-open')].map((b: Element) => b.textContent?.trim());
    expect(names()).toEqual(['Matte 9', 'Matte 8', 'Matte 7', 'Matte 6', 'Matte 5', 'Matte 4', 'Celadon 3', 'Matte 2']);
    expect(text(fixture, '.saved-recipe-date')).toBe('Oct 1, 2026');
    click(fixture, 'Show all 10 recipes');
    await fixture.whenStable();
    expect(names().length).toBe(10);

    // Filtered by title.
    const filter = fixture.nativeElement.querySelector('.saved-filter') as HTMLInputElement;
    expect(filter.getAttribute('aria-label')).toBe('Find a saved recipe');
    filter.value = 'celadon';
    filter.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(names()).toEqual(['Celadon 3']);
    filter.value = 'tenmoku';
    filter.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(text(fixture, '.saved-list')).toBe('No saved recipe has that in its title.');
    filter.value = '';
    filter.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    // The name opens it in the editor; the rest waits under More.
    const open = fixture.nativeElement.querySelector('.saved-recipe-open') as HTMLButtonElement;
    expect(open.getAttribute('aria-label')).toBe('Open Matte 9');
    expect(fixture.nativeElement.querySelector('#print-r9')).toBeNull();
    open.click();
    await fixture.whenStable();
    expect(page['title']()).toBe('Matte 9');
    expect(document.activeElement?.id).toBe('recipe-name');
    const more = fixture.nativeElement.querySelector('#more-r9') as HTMLButtonElement;
    expect([more.getAttribute('aria-label'), more.getAttribute('aria-expanded')]).toEqual([
      'More for Matte 9',
      'false'
    ]);
    more.click();
    await fixture.whenStable();
    expect(more.getAttribute('aria-expanded')).toBe('true');
    expect(text(fixture, '#more-actions-r9')).toBe('Print Compare Blend Duplicate for another cone Share Remove');
    const blend = fixture.nativeElement.querySelector('#more-actions-r9 a') as HTMLAnchorElement;
    expect([blend.getAttribute('aria-label'), blend.getAttribute('href')]).toEqual([
      'Make a blend from Matte 9',
      '/blends?recipe=r9'
    ]);
  });

  it('stops filtering the saved recipes when the filter box goes', async () => {
    const recipes: Recipe[] = Array.from({ length: 6 }, (_, i) => ({
      _id: 'r' + i,
      title: (i === 3 ? 'Celadon ' : 'Matte ') + i,
      materials: [{ ...WHITING, amount: '10' }]
    }));
    const { fixture, page } = await create(recipes);
    const names = () =>
      [...fixture.nativeElement.querySelectorAll('.saved-recipe-open')].map((b: Element) => b.textContent?.trim());
    const filter = fixture.nativeElement.querySelector('.saved-filter') as HTMLInputElement;
    filter.value = 'cel';
    filter.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(names()).toEqual(['Celadon 3']);

    // Five left: no filter box, and every one listed.
    page['myRecipes'].set(recipes.slice(1));
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.saved-filter')).toBeNull();
    expect(names()).toEqual(['Matte 5', 'Matte 4', 'Celadon 3', 'Matte 2', 'Matte 1']);
  });

  it('has no saved list until there is a recipe, and calls the editor "New recipe" until it has a title', async () => {
    const { fixture, page } = await create();
    expect(fixture.nativeElement.querySelector('#saved-recipes')).toBeNull();
    expect(text(fixture, '#editor-heading')).toBe('New recipe');
    page['title'].set('Shino');
    await fixture.whenStable();
    expect(text(fixture, '#editor-heading')).toBe('Shino');
  });

  it('removes a saved recipe; if it was open, it stays on the page as not saved', async () => {
    const saved: Recipe = { _id: 'r1', title: 'Gone', materials: [{ ...WHITING, amount: '10' }] };
    const { fixture, page } = await create([saved]);
    page['open'](saved);
    await fixture.whenStable();
    // Remove is under More, last, in the danger color.
    click(fixture, 'More');
    await fixture.whenStable();
    const remove = fixture.nativeElement.querySelector('.saved-recipe-more .remove-start') as HTMLElement;
    expect(remove.classList).toContain('btn-outline-danger');
    expect(fixture.nativeElement.querySelector('.saved-recipe-more > :last-child').tagName).toBe('GC-REMOVE-BUTTON');
    click(fixture, 'Remove');
    await fixture.whenStable();
    expect(text(fixture, '.remove-confirm')).toContain(
      'Remove "Gone"? It stays open in the editor, as a recipe not saved yet.'
    );
    click(fixture, 'Yes, remove');
    httpMock()
      .expectOne({ method: 'DELETE', url: API + '/recipe/delete/r1' })
      .flush({});
    await settle(fixture);
    expect(page['myRecipes']()).toEqual([]);
    expect(page['title']()).toBe('Gone');
    expect(page['status']()).toBe('Not saved yet');
    expect(page['notices'].messages()).toEqual(['Moved "Gone" to the Trash.']);
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

  it('says in the list when the standard materials could not be fetched, and asks again', async () => {
    const fixture = TestBed.createComponent(RecipePage);
    await fixture.whenStable();
    httpMock()
      .match((req) => req.url.endsWith('/getStandard'))
      .forEach((req) => req.flush({}, { status: 503, statusText: 'Unavailable' }));
    answer('/materials/getAll', []);
    answer('/additives/getAll', []);
    answer('/recipe/getAll', []);
    await settle(fixture);
    const page = fixture.componentInstance as unknown as Page;
    const library = () => fixture.nativeElement.querySelector('.library') as HTMLElement;
    expect(library().querySelector('.library-empty')?.textContent?.trim()).toBe(
      'The list could not be fetched. Try again'
    );

    // Failing again is not said twice above.
    click({ nativeElement: library() }, 'Try again');
    httpMock()
      .expectOne(API + '/materials/getStandard')
      .flush({}, { status: 503, statusText: 'Unavailable' });
    await settle(fixture);
    expect(page['notices'].errors()).toHaveLength(2);

    click({ nativeElement: library() }, 'Try again');
    answer('/materials/getStandard', [WHITING]);
    await settle(fixture);
    expect(library().textContent).toContain('Whiting');
    expect(page['libraries'].standardMaterialsFailed()).toBe(false);
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

  it('after its own recipes fail to load, opens no first-run help, and fetches them again on Try again', async () => {
    const fixture = TestBed.createComponent(RecipePage);
    await fixture.whenStable();
    answer('/materials/getStandard', [WHITING]);
    answer('/materials/getAll', []);
    answer('/additives/getAll', []);
    answer('/additives/getStandard', [IRON]);
    httpMock()
      .expectOne(API + '/recipe/getAll')
      .flush({}, { status: 500, statusText: 'Server Error' });
    await settle(fixture);
    const page = fixture.componentInstance as unknown as Page;
    // Not known to be empty: the help is not opened for a first visit.
    expect(page['recipesLoaded']()).toBe(false);
    expect(text(fixture, '.recipe-retry')).toBe(
      'Your own records were not all loaded. Check your connection, then try again.'
    );
    const retry = [
      ...fixture.nativeElement.querySelectorAll('.recipe-retry a, .recipe-retry button')
    ][0] as HTMLElement;
    retry.click();
    answer('/recipe/getAll', [{ _id: 'r1', title: 'Celadon', materials: [] }]);
    await settle(fixture);
    expect(page['recipesLoaded']()).toBe(true);
    expect(page['myRecipes']().map((r: Recipe) => r.title)).toEqual(['Celadon']);
    expect(fixture.nativeElement.querySelector('.recipe-retry')).toBeNull();
    expect(page['notices'].errors()).not.toContain('There was an error in getting your recipes.');
  });

  it('fetches again only the lists of its own that failed, on Try again', async () => {
    const fixture = TestBed.createComponent(RecipePage);
    await fixture.whenStable();
    answer('/materials/getStandard', [WHITING, SILICA]);
    for (const path of ['/materials/getAll', '/additives/getAll']) {
      httpMock()
        .expectOne(API + path)
        .flush({}, { status: 500, statusText: 'Server Error' });
    }
    answer('/additives/getStandard', [IRON]);
    answer('/recipe/getAll', []);
    await settle(fixture);
    expect(text(fixture, '.errors-section')).toContain('There was an error in getting your materials.');
    expect(text(fixture, '.errors-section')).toContain('There was an error in getting your additives.');
    (fixture.nativeElement.querySelector('.recipe-retry a, .recipe-retry button') as HTMLElement).click();
    httpMock().expectNone(API + '/recipe/getAll');
    answer('/materials/getAll', [{ ...DOLOMITE, _id: 'my-dolomite', name: 'My dolomite' }]);
    answer('/additives/getAll', []);
    await settle(fixture);
    expect(fixture.nativeElement.querySelector('.recipe-retry')).toBeNull();
    expect(fixture.nativeElement.querySelector('.errors-section')).toBeNull();
    expect(text(fixture, '.library')).toContain('My dolomite');
  });

  it('asks for the standard colorants and additives again from their own list', async () => {
    const fixture = TestBed.createComponent(RecipePage);
    await fixture.whenStable();
    answer('/materials/getStandard', [WHITING, SILICA]);
    answer('/materials/getAll', []);
    answer('/additives/getAll', []);
    httpMock()
      .expectOne(API + '/additives/getStandard')
      .flush({}, { status: 503, statusText: 'Unavailable' });
    answer('/recipe/getAll', []);
    await settle(fixture);
    const additives = (fixture.nativeElement.querySelector('#additives-filter') as HTMLElement).closest(
      '.library'
    ) as HTMLElement;
    expect(additives.querySelector('.library-empty')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'The list could not be fetched. Try again'
    );
    click({ nativeElement: additives }, 'Try again');
    answer('/additives/getStandard', [IRON]);
    await settle(fixture);
    expect(additives.textContent).toContain('Iron oxide');
  });

  it('builds a recipe from the lists and its fields, keeps the SG target the calculator saves, and saves it with Save', async () => {
    const { fixture } = await create();
    const root = fixture.nativeElement as HTMLElement;
    /** Adds an item from a list by its name, as a click on it does. */
    const pick = async (filterId: string, name: string) => {
      const library = (root.querySelector('#' + filterId) as HTMLElement).closest('.library') as HTMLElement;
      const item = [...library.querySelectorAll<HTMLButtonElement>('button.library-item')].find(
        (button) => button.querySelector('bdi')?.textContent?.trim() === name
      );
      if (!item) throw new Error('no ' + name + ' to add');
      item.click();
      await fixture.whenStable();
    };
    await pick('materials-filter', 'Whiting');
    expect(document.activeElement?.id).toBe('material-amount-0');
    await type(fixture, 'material-amount-0', '20');
    await pick('materials-filter', 'Silica');
    await type(fixture, 'material-amount-1', '30');
    await pick('additives-filter', 'Iron oxide');
    expect(document.activeElement?.id).toBe('additive-amount-0');
    await type(fixture, 'additive-amount-0', '2');
    await type(fixture, 'recipe-name', 'Matte white');
    await type(fixture, 'recipe-date', '2026-11-01');
    await type(fixture, 'recipe-notes', 'Sieve twice.');
    expect(text(fixture, '#editor-heading')).toBe('Matte white');
    expect(text(fixture, '.recipe-share')).toBe('40%');
    expect(additivesShown(fixture)).toEqual(['Iron oxide : 2%']);
    // The SG it is mixed to, from the calculator under the recipe.
    const keep = root.querySelector('.slurry-target button') as HTMLButtonElement;
    expect(keep.textContent?.trim()).toBe("Save SG 1.45 as this recipe's target");
    keep.click();
    await fixture.whenStable();

    click(fixture, 'Save');
    const req = httpMock().expectOne({ method: 'POST', url: API + '/recipe/create' });
    const body = req.request.body as Recipe;
    expect(body).toMatchObject({ title: 'Matte white', date: '2026-11-01', notes: 'Sieve twice.', sgTarget: 1.45 });
    expect(body.materials.map((m) => [m.name, m.amount])).toEqual([
      ['Whiting', '20'],
      ['Silica', '30']
    ]);
    expect(body.additives?.map((a) => [a.name, a.amount, a.unit])).toEqual([['Iron oxide', '2', 'percent']]);
    req.flush({ ...body, _id: 'r1' });
    await settle(fixture);
    expect(text(fixture, '.recipe-status')).toMatch(/^Saved at /);
    expect(text(fixture, '.server-msg')).toContain('Saved "Matte white".');
  });

  it('takes a material and a colorant out by their ✕ buttons, the focus staying in each list', async () => {
    const { fixture, page } = await create();
    fill(page, [
      [WHITING, '20'],
      [SILICA, '30']
    ]);
    page['edit'].addAdditive(IRON);
    page['edit'].setAdditiveAmount(0, '2');
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const materials = () => [...root.querySelectorAll('.recipe-materials tbody bdi')].map((b) => b.textContent);
    (root.querySelector('#material-remove-0') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(materials()).toEqual(['Silica']);
    expect(document.activeElement?.id).toBe('material-remove-0');
    (root.querySelector('#additive-remove-0') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(root.querySelector('.recipe-additives')).toBeNull();
    expect(document.activeElement?.id).toBe('additives-heading');
    expect(text(fixture, ':scope > p.visually-hidden[role=status]')).toBe('Iron oxide taken out of the recipe.');
  });

  it('changes the scale by its buttons, and scales to a batch typed in, by Enter or by Scale', async () => {
    const { fixture, page } = await create();
    fill(page, [
      [WHITING, '3'],
      [SILICA, '2']
    ]);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const amounts = () => [...root.querySelectorAll<HTMLInputElement>('.material-amount')].map((input) => input.value);
    click(fixture, 'To percent');
    await fixture.whenStable();
    expect(amounts()).toEqual(['60', '40']);
    expect(text(fixture, '.recipe-scale-note')).toBe('Now in percent: the materials add up to 100.');
    click(fixture, 'To parts');
    await fixture.whenStable();
    expect(amounts()).toEqual(['3', '2']);

    click(fixture, 'Scale to a batch');
    await fixture.whenStable();
    expect((root.querySelector('#batch-weight') as HTMLInputElement).value).toBe('500');
    await type(fixture, 'batch-weight', '1000');
    root.querySelector('#batch-weight')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await fixture.whenStable();
    expect(amounts()).toEqual(['600', '400']);
    expect(root.querySelector('#batch-weight')).toBeNull();

    click(fixture, 'Scale to a batch');
    await fixture.whenStable();
    await type(fixture, 'batch-weight', '250');
    click(fixture, 'Scale');
    await fixture.whenStable();
    expect(amounts()).toEqual(['150', '100']);
    expect(text(fixture, '.recipe-scale-note')).toBe('Now in grams for the batch.');
  });

  it("shows a saved recipe's colorants and its date among its details", async () => {
    const saved: Recipe = {
      _id: 'r1',
      title: 'Blue',
      date: '2026-10-01',
      materials: [{ ...WHITING, amount: '20' }],
      additives: [
        { ...COBALT, amount: '1', unit: 'percent' },
        { ...RUTILE, amount: '2', unit: 'parts' }
      ]
    };
    const { fixture } = await create([saved]);
    click(fixture, 'Show details');
    await fixture.whenStable();
    const lists = [...fixture.nativeElement.querySelectorAll('.saved-recipe-details ol')].map((ol: Element) =>
      [...ol.querySelectorAll('li')].map((li) => li.textContent?.replace(/\s+/g, ' ').trim())
    );
    expect(lists).toEqual([['Whiting : 20'], ['Cobalt Oxide : 1%', 'Rutile : 2 parts']]);
    expect(text(fixture, '.saved-recipe-details em:nth-of-type(2)')).toBe('Additives:');
    expect(text(fixture, '.saved-recipe-details')).toContain('Date: Thursday, October 1, 2026');
  });

  it('duplicates a saved recipe for another cone from its More, the focus on the cone', async () => {
    const fired: Recipe = {
      _id: 'r5',
      title: 'Celadon',
      materials: [{ ...WHITING, amount: '20' }],
      firedAt: { scale: 'orton', low: '6', tested: ['6'] }
    };
    const { fixture } = await create([fired]);
    const root = fixture.nativeElement as HTMLElement;
    (root.querySelector('#more-r5') as HTMLButtonElement).click();
    await fixture.whenStable();
    const duplicate = root.querySelector('#duplicate-r5') as HTMLButtonElement;
    expect(duplicate.getAttribute('aria-label')).toBe('Duplicate Celadon for another cone');
    duplicate.click();
    await settle(fixture);
    expect((root.querySelector('#recipe-name') as HTMLInputElement).value).toBe('Celadon (another cone)');
    expect(text(fixture, '#firing-fold summary')).toBe('Firing: not set');
    expect(document.activeElement?.id).toBe('firing-low');
    expect(text(fixture, '.recipe-status')).toBe('Not saved yet');
  });

  it('saves by its other buttons: says what is missing, keeps a saved recipe as it was with Save as a copy, then clears for the next', async () => {
    const original: Recipe = { _id: 'r1', title: 'Base', materials: [{ ...WHITING, amount: '10' }] };
    const { fixture } = await create([original]);
    const root = fixture.nativeElement as HTMLElement;
    // Nothing to save yet: said beside the buttons, and nothing is sent.
    click(fixture, 'Save and add next recipe');
    await settle(fixture);
    expect(text(fixture, '.recipe-save-problem')).toBe('Please add at least one material.');

    (root.querySelector('.saved-recipe-open') as HTMLButtonElement).click();
    await settle(fixture);
    await type(fixture, 'recipe-name', 'Base, more whiting');
    click(fixture, 'Save as a copy');
    const created = httpMock().expectOne({ method: 'POST', url: API + '/recipe/create' });
    expect(created.request.body.title).toBe('Base, more whiting');
    created.flush({ ...created.request.body, _id: 'r2' });
    await settle(fixture);
    expect(text(fixture, '.server-msg')).toContain('Saved as a new recipe: "Base, more whiting".');
    expect([...root.querySelectorAll('.saved-recipe-open')].map((b) => b.textContent?.trim())).toEqual([
      'Base, more whiting',
      'Base'
    ]);

    // The copy is the one on the page now.
    click(fixture, 'Save and add next recipe');
    httpMock()
      .expectOne({ method: 'PUT', url: API + '/recipe/change/r2' })
      .flush({ msg: 'Successfully updated recipe' });
    await settle(fixture);
    expect((root.querySelector('#recipe-name') as HTMLInputElement).value).toBe('');
    expect(text(fixture, '.server-msg')).toContain('Saved "Base, more whiting". Ready for the next recipe.');
  });

  it('says when a save cannot be undone, and undoes one while the page has changed since, keeping the changes', async () => {
    const old: Recipe = { _id: 'r1', title: 'Old', materials: [{ ...WHITING, amount: '10' }] };
    const { fixture } = await create([old]);
    const root = fixture.nativeElement as HTMLElement;
    (root.querySelector('.saved-recipe-open') as HTMLButtonElement).click();
    await settle(fixture);
    const saveAs = async (title: string) => {
      await type(fixture, 'recipe-name', title);
      click(fixture, 'Save');
      httpMock()
        .expectOne({ method: 'PUT', url: API + '/recipe/change/r1' })
        .flush({ code: 'record-updated' });
      await settle(fixture);
    };
    await saveAs('New');
    click(fixture, 'Undo');
    httpMock()
      .expectOne({ method: 'POST', url: API + '/recipe/undo/r1' })
      .flush({ msg: 'Please try again later.' }, { status: 500, statusText: 'Server Error' });
    await settle(fixture);
    expect(text(fixture, '.errors-section')).toContain('Please try again later.');

    await saveAs('Newer');
    await type(fixture, 'recipe-name', 'Newest');
    click(fixture, 'Undo');
    httpMock()
      .expectOne({ method: 'POST', url: API + '/recipe/undo/r1' })
      .flush({ code: 'record-undone', record: old });
    await settle(fixture);
    // The saved list goes back; the page keeps what was typed since, as not saved.
    expect(text(fixture, '.saved-recipe-open')).toBe('Old');
    expect((root.querySelector('#recipe-name') as HTMLInputElement).value).toBe('Newest');
    expect(text(fixture, '.recipe-status')).toBe('Changes not saved yet');
    expect(text(fixture, '.server-msg')).toContain('Went back to the version of "Old" before you saved.');
  });

  it('names a recipe that could not be saved once the page has moved on to another', async () => {
    const { fixture, page } = await create();
    await type(fixture, 'recipe-name', 'First');
    fill(page, [[WHITING, '10']]);
    await fixture.whenStable();
    click(fixture, 'Save');
    click(fixture, 'Start a new recipe');
    await fixture.whenStable();
    click(fixture, 'Discard them');
    httpMock()
      .expectOne({ method: 'POST', url: API + '/recipe/create' })
      .flush({ msg: 'Missing required information' }, { status: 400, statusText: 'Bad Request' });
    await settle(fixture);
    expect(text(fixture, '.errors-section')).toContain('"First" was not saved: Missing required information');
    expect(text(fixture, '.recipe-save-problem')).toBe('');
    expect((fixture.nativeElement.querySelector('#recipe-name') as HTMLInputElement).value).toBe('');
  });

  it('keeps a saved recipe the server could not remove, and says why', async () => {
    const saved: Recipe = { _id: 'r1', title: 'Kept', materials: [{ ...WHITING, amount: '10' }] };
    const { fixture } = await create([saved]);
    click(fixture, 'More');
    await fixture.whenStable();
    click(fixture, 'Remove');
    await fixture.whenStable();
    click(fixture, 'Yes, remove');
    httpMock()
      .expectOne({ method: 'DELETE', url: API + '/recipe/delete/r1' })
      .flush({ msg: 'Please try again later.' }, { status: 500, statusText: 'Server Error' });
    await settle(fixture);
    expect(text(fixture, '.saved-recipe-open')).toBe('Kept');
    expect(text(fixture, '.remove-problem')).toBe('Please try again later.');
  });

  it("closes a saved recipe's Share with its More", async () => {
    const saved: Recipe = { _id: 'r1', title: 'Shared', materials: [{ ...WHITING, amount: '10' }] };
    const { fixture } = await create([saved]);
    const root = fixture.nativeElement as HTMLElement;
    const more = root.querySelector('#more-r1') as HTMLButtonElement;
    more.click();
    await settle(fixture);
    (root.querySelector('#share-r1') as HTMLButtonElement).click();
    await settle(fixture);
    answer('/share/recipe/r1', { shared: false });
    await settle(fixture);
    expect(root.querySelector('gc-share-panel')).not.toBeNull();
    more.click();
    await settle(fixture);
    expect(root.querySelector('gc-share-panel')).toBeNull();
    // Open again, More shows Share closed.
    more.click();
    await settle(fixture);
    expect(root.querySelector('gc-share-panel')).toBeNull();
    expect(root.querySelector('#share-r1')?.getAttribute('aria-expanded')).toBe('false');
  });

  it('counts no colorants in a new recipe when this browser will not say what was chosen last', async () => {
    localStorage.setItem('includeAdditives', 'yes');
    const getItem = Storage.prototype.getItem;
    const blocked = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (this: Storage, key: string) {
      if (key === 'includeAdditives') throw new Error('Storage is blocked');
      return getItem.call(this, key);
    });
    try {
      const { fixture } = await create();
      expect((fixture.nativeElement.querySelector('#include-additives') as HTMLInputElement).checked).toBe(false);
    } finally {
      blocked.mockRestore();
    }
  });

  it("counts a colorant saved by an older version under another of its names, by the library's record", async () => {
    // Before October 2026 additives had no LOI; this one was saved by a name the library has as another name.
    const oldCopy: Additive = { name: 'Black cobalt oxide', fields: [{ name: 'CoO', amount: '1' }], amount: '2' };
    const blue: Recipe = {
      _id: 'r1',
      title: 'Blue',
      includeAdditives: true,
      materials: [
        { ...WHITING, amount: '20' },
        { ...SILICA, amount: '30' }
      ],
      additives: [oldCopy]
    };
    const { fixture } = await create([blue], [IRON, { ...COBALT, aliases: ['Black cobalt oxide'] }]);
    (fixture.nativeElement.querySelector('.saved-recipe-open') as HTMLButtonElement).click();
    await settle(fixture);
    expect(text(fixture, '.unity-result')).toContain('CoO');
    expect(fixture.nativeElement.querySelector('.unity-warnings')).toBeNull();
  });

  it('states the firing in its part, links a firing log, ticks the cone it names and places another on a card, all saved with a new recipe', async () => {
    const { fixture, page } = await create();
    const root = fixture.nativeElement as HTMLElement;
    const choose = async (id: string, value: string) => {
      const select = root.querySelector('#' + id) as HTMLSelectElement;
      select.value = value;
      select.dispatchEvent(new Event('change'));
      await settle(fixture);
    };
    await choose('firing-low', '6');
    expect(text(fixture, '#firing-fold summary')).toBe('Firing: cone 6');
    (root.querySelector('#food-surface') as HTMLInputElement).click();
    await fixture.whenStable();
    // A card for the cone at once, before there is a unity formula to check it with.
    expect(text(fixture, '.cone-card summary')).toMatch(/^cone 6 · /);
    expect(text(fixture, '.cone-card summary')).not.toContain('caution');

    click(fixture, 'Link firing logs');
    await fixture.whenStable();
    answer('/firing/getAll', [
      { _id: 'f1', title: 'Glaze 14', fieldsIncluded: ['Cone'], rows: [['6']] },
      { _id: 'f2', title: 'Glaze 15', fieldsIncluded: ['Notes'], rows: [['ran hot']] }
    ]);
    await settle(fixture);
    await choose('firing-link-choice', 'f1');
    click(fixture, 'Link');
    await settle(fixture);
    click(fixture, 'Tick the cones these logs name: cone 6');
    await settle(fixture);
    expect(text(fixture, '.firing-tested')).toBe('Tested at cone 6');
    // A log that names no cone waits on a card of its own, to be placed.
    await choose('firing-link-choice', 'f2');
    click(fixture, 'Link');
    await settle(fixture);
    await choose('cone-place-1-f2', '6|');
    expect(root.querySelectorAll('details.cone-card').length).toBe(1);

    await type(fixture, 'recipe-name', 'Liner');
    fill(page, [[WHITING, '20']]);
    await fixture.whenStable();
    click(fixture, 'Save');
    const req = httpMock().expectOne({ method: 'POST', url: API + '/recipe/create' });
    expect(req.request.body).toMatchObject({
      firedAt: { scale: 'orton', low: '6', tested: ['6'] },
      foodSurface: true,
      firings: [
        { firing: 'f1', cone: '6' },
        { firing: 'f2', cone: '6' }
      ]
    });
    req.flush({ ...req.request.body, _id: 'r1' });
    await settle(fixture);
  });

  it("places a saved recipe's firing log on a result card on the server, the recipe still counting as saved", async () => {
    const fired: Recipe = {
      _id: 'r1',
      title: 'Celadon',
      materials: [{ ...WHITING, amount: '20' }],
      firedAt: { scale: 'orton', low: '6', atmospheres: ['oxidation', 'reduction'] },
      firings: [{ firing: 'f2' }]
    };
    const { fixture } = await create([fired]);
    const root = fixture.nativeElement as HTMLElement;
    (root.querySelector('.saved-recipe-open') as HTMLButtonElement).click();
    await settle(fixture);
    answer('/firing/getAll', [{ _id: 'f2', title: 'Glaze 15', fieldsIncluded: ['Cone'], rows: [['6']] }]);
    await settle(fixture);
    const place = root.querySelector('#cone-place-0-f2') as HTMLSelectElement;
    place.value = '6|reduction';
    place.dispatchEvent(new Event('change'));
    const put = httpMock().expectOne({ method: 'PUT', url: API + '/recipe/firings/r1/f2' });
    expect(put.request.body).toEqual({ cone: '6', atmosphere: 'reduction' });
    put.flush({ firings: [{ firing: 'f2', cone: '6', atmosphere: 'reduction' }] });
    await settle(fixture);
    expect(text(fixture, '.cone-card summary')).toMatch(/^cone 6 · reduction/);
    expect(text(fixture, '.recipe-status')).toBe('Saved');
  });

  describe('leaving the page', () => {
    beforeEach(() => {
      localStorage.setItem('session', 'account');
      TestBed.configureTestingModule({
        providers: [
          provideLocationMocks(),
          provideRouter([
            { path: 'recipe', component: RecipePage, canDeactivate: [askBeforeLeaving] },
            { path: 'material', component: OtherPage },
            { path: 'signin', component: OtherPage }
          ])
        ]
      });
    });

    const openPage = async (recipes: Recipe[] = []) => {
      const harness = await RouterTestingHarness.create();
      const page = (await harness.navigateByUrl('/recipe', RecipePage)) as unknown as Page;
      answer('/materials/getStandard', [WHITING, SILICA]);
      answer('/materials/getAll', []);
      answer('/additives/getAll', []);
      answer('/additives/getStandard', []);
      answer('/recipe/getAll', recipes);
      await settle(harness.fixture);
      return { harness, page, router: TestBed.inject(Router) };
    };

    /** Renders while a navigation waits on the question (whenStable would wait for the navigation too). */
    const render = async () => {
      await new Promise((resolve) => setTimeout(resolve));
      TestBed.tick();
    };

    it('asks before a link in the app takes away changes not saved, at the top of the page whatever is open', async () => {
      const { harness, page, router } = await openPage();
      page['title'].set('My celadon');
      fill(page, [[WHITING, '20']]);
      // The compare view hides the editor; the question still shows.
      page['views'].compareDraft();
      await settle(harness.fixture);
      const root = harness.routeNativeElement!;
      expect(root.querySelector('.recipe-editor')!.closest('[hidden]')).not.toBeNull();

      const leaving = router.navigateByUrl('/material');
      await render();
      const question = root.querySelector('.recipe-unsaved') as HTMLElement;
      expect(question.closest('[hidden]')).toBeNull();
      expect(question.textContent).toContain('This recipe has changes that are not saved.');
      expect(document.activeElement?.id).toBe('unsaved-keep');
      click({ nativeElement: root }, 'Keep editing');
      expect(await leaving).toBe(false);
      await settle(harness.fixture);
      expect(root.querySelector('.recipe-unsaved')).toBeNull();
      expect(page['title']()).toBe('My celadon');

      const again = router.navigateByUrl('/material');
      await render();
      click({ nativeElement: root }, 'Discard them');
      expect(await again).toBe(true);
      expect(router.url).toBe('/material');
    });

    it("is asked by the app's route to the recipe page", () => {
      expect(routes.find((route) => route.path === 'recipe')?.canDeactivate).toEqual([askBeforeLeaving]);
    });

    it('leaves at once when nothing would be lost', async () => {
      const saved: Recipe = { _id: 'r1', title: 'Celadon', materials: [{ ...WHITING, amount: '20' }] };
      const { page, router } = await openPage([saved]);
      page['open'](saved);
      expect(await router.navigateByUrl('/material')).toBe(true);
    });

    it('asks the browser to ask before a reload or a link out of the app, when there are changes not saved', async () => {
      const { harness, page } = await openPage();
      const unload = () => {
        const event = new Event('beforeunload', { cancelable: true });
        window.dispatchEvent(event);
        return event.defaultPrevented;
      };
      expect(unload()).toBe(false);
      page['title'].set('My celadon');
      await settle(harness.fixture);
      expect(unload()).toBe(true);
    });

    it('goes when the session has ended, and the next page says what was lost', async () => {
      const { page, router } = await openPage();
      page['title'].set('My celadon');
      fill(page, [[WHITING, '20']]);
      const auth = TestBed.inject(AuthService);
      auth.sessionEnded();
      expect(await router.navigateByUrl('/signin', { state: { sessionEnded: true } })).toBe(true);
      expect(auth.lostRecipe()).toBe('My celadon');
    });
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
      (fixture.nativeElement.querySelector('#more-r1') as HTMLButtonElement).click();
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

    it('shows the working of the recipe being edited, and goes back to its button', async () => {
      const { fixture, page } = await create();
      const router = TestBed.inject(Router);
      router.initialNavigation();
      fill(page, [
        [WHITING, '20'],
        [SILICA, '30']
      ]);
      await settle(fixture);
      click(fixture, 'Show the working');
      await opened(fixture);
      expect(router.url).toBe('/?print=draft&sheet=worked');
      expect(fixture.nativeElement.querySelector('gc-worked-calculation')).not.toBeNull();
      expect(localStorage.getItem('printMode')).not.toBe('worked');

      click(fixture, 'Back to the recipe');
      await settle(fixture);
      expect(router.url).toBe('/');
      expect(document.activeElement?.id).toBe('worked-draft');
    });

    it('shares a saved recipe from the list by a link shown once', async () => {
      const { fixture } = await create([SAVED]);
      await settle(fixture);
      (fixture.nativeElement.querySelector('#more-r1') as HTMLButtonElement).click();
      await settle(fixture);
      const button = fixture.nativeElement.querySelector('#share-r1') as HTMLButtonElement;
      expect(button.getAttribute('aria-label')).toBe('Share Saved matte');
      button.click();
      await settle(fixture);
      answer('/share/recipe/r1', { shared: false });
      await settle(fixture);
      expect(document.activeElement?.id).toBe('share-heading-r1');
      click(fixture, 'Make a link');
      const made = httpMock().expectOne((req) => req.method === 'POST' && req.url === API + '/share/recipe/r1');
      expect(made.request.body).toEqual({ includeNotes: false });
      made.flush({ secret: 'a'.repeat(43), createdAt: '2026-10-16T00:00:00Z', includeNotes: false });
      await settle(fixture);
      const link = fixture.nativeElement.querySelector('#share-address-r1') as HTMLInputElement;
      expect(link.value).toBe(location.origin + '/shared#' + 'a'.repeat(43));
    });

    it('back from printing a saved recipe the list leaves out, lists them all so the focus can go to its Print', async () => {
      const recipes: Recipe[] = Array.from({ length: 10 }, (_, i) => ({ ...SAVED, _id: 'r' + i, title: 'Matte ' + i }));
      const router = TestBed.inject(Router);
      await router.navigateByUrl('/?print=r0');
      const fixture = TestBed.createComponent(RecipePage);
      await fixture.whenStable();
      answer('/materials/getStandard', [WHITING, SILICA]);
      answer('/materials/getAll', []);
      answer('/additives/getAll', []);
      answer('/additives/getStandard', []);
      answer('/recipe/getAll', recipes);
      await opened(fixture);
      expect(text(fixture, '.print-sheet h2')).toBe('Matte 0');
      click(fixture, 'Back to the recipe');
      await settle(fixture);
      expect(fixture.nativeElement.querySelectorAll('.saved-recipe-open').length).toBe(10);
      expect(document.activeElement?.id).toBe('print-r0');
    });

    it('opens the saved recipe the address names (the account page links to it), and ignores one that is not there', async () => {
      const router = TestBed.inject(Router);
      for (const [id, title] of [
        ['r1', 'Saved matte'],
        ['nope', '']
      ]) {
        await router.navigateByUrl('/?open=' + id);
        const fixture = TestBed.createComponent(RecipePage);
        await fixture.whenStable();
        answer('/materials/getStandard', [WHITING, SILICA]);
        answer('/materials/getAll', []);
        answer('/additives/getAll', []);
        answer('/additives/getStandard', []);
        answer('/recipe/getAll', [SAVED]);
        await settle(fixture);
        expect((fixture.nativeElement.querySelector('#recipe-name') as HTMLInputElement).value).toBe(title);
      }
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

    it("prints a colorant saved by an older version with the library's chemistry for it", async () => {
      // Before October 2026 additives had no LOI: this copy has oxides but no analysis type.
      const oldCopy: Additive = { name: 'Cobalt Oxide', fields: [{ name: 'CoO', amount: '1' }], amount: '2' };
      const blue: Recipe = { ...SAVED, title: 'Blue', includeAdditives: true, additives: [oldCopy] };
      const { fixture } = await create([blue], [IRON, COBALT]);
      TestBed.inject(Router).initialNavigation();
      await settle(fixture);
      (fixture.nativeElement.querySelector('#more-r1') as HTMLButtonElement).click();
      await settle(fixture);
      (fixture.nativeElement.querySelector('#print-r1') as HTMLButtonElement).click();
      await opened(fixture);
      expect(text(fixture, '.print-chemistry')).toContain('CoO');
      expect(fixture.nativeElement.querySelector('.print-warnings')).toBeNull();
    });

    it("goes to the saved recipes when the address asks for them (Home's Recipes card), once they are in", async () => {
      // jsdom does not scroll: the scroll is recorded instead.
      const scrolled = vi.fn();
      const own = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView');
      Element.prototype.scrollIntoView = scrolled;
      try {
        await TestBed.inject(Router).navigateByUrl('/#saved-recipes');
        const fixture = TestBed.createComponent(RecipePage);
        await fixture.whenStable();
        expect(scrolled).not.toHaveBeenCalled();
        answer('/materials/getStandard', [WHITING, SILICA]);
        answer('/materials/getAll', []);
        answer('/additives/getAll', []);
        answer('/additives/getStandard', []);
        answer('/recipe/getAll', [SAVED]);
        await settle(fixture);
        expect(document.activeElement?.id).toBe('saved-heading');
        expect(scrolled).toHaveBeenCalledOnce();
        expect(scrolled.mock.contexts[0]).toBe(document.getElementById('saved-heading'));
        expect(scrolled).toHaveBeenCalledWith({ block: 'start' });
      } finally {
        if (own) Object.defineProperty(Element.prototype, 'scrollIntoView', own);
        else delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
      }
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

    /** The materials on hand that Match with what I have lists, by name. */
    const onHand = (fixture: { nativeElement: HTMLElement }) =>
      [...fixture.nativeElement.querySelectorAll('.recipe-shelf .try-list .try-name')].map((name) =>
        name.textContent?.trim()
      );

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
      page['views'].chooseCompared({ side: 'right', key: 'draft' });
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
      (fixture.nativeElement.querySelector('#more-r1') as HTMLButtonElement).click();
      await settle(fixture);
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

    it('undoes the swap of a recipe removed meanwhile as one not saved yet', async () => {
      const { fixture, page } = await start();
      page['open'](OLD);
      await settle(fixture);
      click(fixture, 'Try modern materials and compare');
      await settle(fixture);
      page['views'].closeCompare();
      await settle(fixture);
      const removing = page['remove'](OLD);
      httpMock()
        .expectOne({ method: 'DELETE', url: API + '/recipe/delete/r1' })
        .flush({});
      await removing;
      click(fixture, 'Undo the swap');
      await settle(fixture);
      expect(page['title']()).toBe('Old celadon');
      expect(page['savedId']()).toBeNull();
      expect(page['status']()).toBe('Not saved yet');
      // Saving it makes a new recipe, not a change to the one removed.
      const saving = page['save']();
      httpMock()
        .expectOne({ method: 'POST', url: API + '/recipe/create' })
        .flush({ ...OLD, _id: 'r2' });
      await saving;
      expect(page['savedId']()).toBe('r2');
    });

    it('offers "before the swap" to compare only while that recipe is on the page', async () => {
      const { fixture, page } = await start([]);
      page['title'].set('Celadon A');
      fill(page, [
        [CUSTER, '40'],
        [WHITING, '20'],
        [SILICA, '40']
      ]);
      await settle(fixture);
      click(fixture, 'Try modern materials and compare');
      await settle(fixture);
      page['views'].closeCompare();
      await settle(fixture);
      const labels = () => page['views'].compareChoices().map((choice: { label: string }) => choice.label);
      expect(labels()).toContain('Before the swap: Celadon A');
      page['startNew']();
      page['discardAndLeave']();
      page['title'].set('Matte B');
      fill(page, [[WHITING, '10']]);
      expect(labels()).toEqual(['Being edited: Matte B']);
    });

    it('says when a swap is not like for like, and when lead is still in it', async () => {
      // Lead is allowed in Settings.
      TestBed.inject(PreferencesService).remember('lead', 'on');
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
      click(fixture, 'Try modern materials and compare');
      await settle(fixture);
      expect(page['notes']()).toBe(
        'Swapped one for one: Litharge became Lead Bisilicate Frit (work its amount out again).'
      );
    });

    it('says where an old colorant among the materials is now, when it is among the additives', async () => {
      const BICHROMATE: Material = {
        ...material(
          'Potassium Bichromate',
          [
            ['K2O', 1],
            ['Cr2O3', 1]
          ],
          16.32
        ),
        category: 'colorant',
        status: 'historical',
        substitutes: ['Chromium Oxide']
      };
      const CHROME: Additive = {
        _id: 'cr',
        name: 'Chromium Oxide',
        percentmole: 'molecular',
        loi: 0,
        fields: [{ name: 'Cr2O3', amount: '1' }],
        category: 'colorant',
        status: 'current'
      };
      const fixture = TestBed.createComponent(RecipePage);
      TestBed.inject(Router).initialNavigation();
      await fixture.whenStable();
      answer('/materials/getStandard', [WHITING, SILICA, BICHROMATE]);
      answer('/materials/getAll', []);
      answer('/additives/getAll', []);
      answer('/additives/getStandard', [CHROME]);
      answer('/recipe/getAll', []);
      await settle(fixture);
      const page = fixture.componentInstance as unknown as Page;
      fill(page, [
        [BICHROMATE, '2'],
        [WHITING, '38'],
        [SILICA, '60']
      ]);
      await settle(fixture);
      expect(text(fixture, '.recipe-swap')).toContain(
        'Potassium Bichromate (Historical): Chromium Oxide is what is used now, under Colorants and additives.'
      );
      // Nothing among the materials to swap it for.
      expect(fixture.nativeElement.querySelector('#try-modern')).toBeNull();
    });

    it("takes a recipe's material for the potter's own before a standard one that also goes by its name", async () => {
      const MINE: Material = {
        ...material(
          'Potash Feldspar',
          [
            ['K2O', 1],
            ['Al2O3', 1],
            ['SiO2', 6]
          ],
          0
        ),
        _id: 'mine',
        ownedBy: 'u1'
      };
      const POTCLAYS: Material = {
        ...MINE,
        _id: 'potclays',
        name: 'Potash Feldspar (Potclays 3426)',
        ownedBy: 'Standard',
        aliases: ['Potash Feldspar']
      };
      const fixture = TestBed.createComponent(RecipePage);
      TestBed.inject(Router).initialNavigation();
      await fixture.whenStable();
      answer('/materials/getStandard', [WHITING, SILICA, POTCLAYS]);
      answer('/materials/getAll', [MINE]);
      answer('/additives/getAll', []);
      answer('/additives/getStandard', []);
      answer('/recipe/getAll', []);
      await settle(fixture);
      const page = fixture.componentInstance as unknown as Page;
      fill(page, [
        [MINE, '40'],
        [WHITING, '20'],
        [SILICA, '40']
      ]);
      await settle(fixture);
      click(fixture, 'Match with what I have');
      await settle(fixture);
      answer('/shelf', { shelf: [] });
      await settle(fixture);
      click(fixture, 'Add the materials in this recipe');
      const put = httpMock().expectOne(API + '/shelf');
      expect(put.request.body).toEqual({ shelf: ['mine', 'Whiting', 'Silica'] });
      put.flush({ shelf: put.request.body.shelf });
      await settle(fixture);
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
      const cone = fixture.nativeElement.querySelector('#lead-cone') as HTMLSelectElement;
      cone.value = '06';
      cone.dispatchEvent(new Event('change'));
      await settle(fixture);

      click(fixture, 'Replace lead and compare');
      await settle(fixture);
      expect(router.url).toBe('/?compare=before,draft');
      const names = page['lines']().map((l: Material) => l.name);
      expect(names).not.toContain('Red lead');
      expect(names).toContain('Borosilicate frit');
      expect(page['title']()).toBe('Untitled recipe without lead');
      // Cone 06 was the firing chosen, so the recipe's limits are checked for low fire.
      expect(page['firing']()).toBe('low');
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
      expect(page['firing']()).toBe('');
    });

    it('compares a changed recipe with itself before the swap', async () => {
      const { fixture, router, page } = await start([]);
      fill(page, [
        [CUSTER, '40'],
        [WHITING, '20'],
        [SILICA, '40']
      ]);
      await settle(fixture);
      click(fixture, 'Try modern materials and compare');
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
      const silica = [...fixture.nativeElement.querySelectorAll('.swap-uses li')].find((li: Element) =>
        li.textContent?.includes('Silica')
      ) as HTMLElement;
      (silica.querySelector('button') as HTMLElement).click();
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

    it('changes nothing on hand it could not fetch, and keeps on it what it cannot list', async () => {
      const { fixture, page } = await start([]);
      fill(page, [
        [CUSTER, '40'],
        [WHITING, '20'],
        [SILICA, '40']
      ]);
      await settle(fixture);
      click(fixture, 'Match with what I have');
      await settle(fixture);
      httpMock()
        .expectOne(API + '/shelf')
        .flush({}, { status: 500, statusText: 'Server Error' });
      await settle(fixture);
      // Nothing to change, so nothing can replace the list kept with the account.
      expect(text(fixture, '.recipe-shelf')).toContain('Your materials on hand could not be fetched.');
      expect(text(fixture, '.recipe-shelf')).not.toContain('Add the materials in this recipe');
      expect(text(fixture, '.recipe-shelf')).not.toContain('Getting your materials on hand');

      click(fixture, 'Try again');
      // On hand: whiting, the feldspar, and one of the potter's own that this page does not have.
      answer('/shelf', { shelf: ['Whiting', 'mine-1', 'G-200 EU Feldspar'] });
      await settle(fixture);
      expect(onHand(fixture)).toEqual(['Whiting', 'G-200 EU Feldspar']);
      click(fixture, 'Add the materials in this recipe');
      const put = httpMock().expectOne(API + '/shelf');
      expect(put.request.body).toEqual({ shelf: ['Whiting', 'mine-1', 'G-200 EU Feldspar', 'Custer Spar', 'Silica'] });
      put.flush({});
      await settle(fixture);
    });

    it('leaves materials with lead on hand out of a match while lead is off, and says so', async () => {
      const LEAD_FRIT: Material = {
        ...material(
          'Lead bisilicate',
          [
            ['PbO', 1],
            ['Al2O3', 0.1],
            ['SiO2', 2]
          ],
          0
        ),
        category: 'frit'
      };
      const fixture = TestBed.createComponent(RecipePage);
      TestBed.inject(Router).initialNavigation();
      await fixture.whenStable();
      answer('/materials/getStandard', [WHITING, SILICA, CUSTER, G200, LEAD_FRIT]);
      answer('/materials/getAll', []);
      answer('/additives/getAll', []);
      answer('/additives/getStandard', []);
      answer('/recipe/getAll', []);
      await settle(fixture);
      const page = fixture.componentInstance as unknown as Page;
      fill(page, [
        [CUSTER, '40'],
        [WHITING, '20'],
        [SILICA, '40']
      ]);
      await settle(fixture);
      click(fixture, 'Match with what I have');
      await settle(fixture);
      answer('/shelf', { shelf: ['Lead bisilicate', 'G-200 EU Feldspar', 'Whiting', 'Silica'] });
      await settle(fixture);
      expect(text(fixture, '.recipe-shelf-lead')).toBe('1 with lead is not used: lead is off in Settings.');
      expect(onHand(fixture)).not.toContain('Lead bisilicate');

      // Still on hand, for when lead is on: a change keeps it.
      (
        fixture.nativeElement.querySelector('[aria-label="Remove Silica from your materials on hand"]') as HTMLElement
      ).click();
      const put = httpMock().expectOne(API + '/shelf');
      expect(put.request.body).toEqual({ shelf: ['Lead bisilicate', 'G-200 EU Feldspar', 'Whiting'] });
      put.flush({});
      await settle(fixture);

      click(fixture, 'Match and compare');
      await settle(fixture);
      expect(page['lines']().map((l: Material) => l.name)).not.toContain('Lead bisilicate');
    });

    it('opens the comparison the address names once the recipes are in, changes it by its lists, and leaves it for the editor', async () => {
      const router = TestBed.inject(Router);
      await router.navigateByUrl('/?compare=r1,r2');
      const fixture = TestBed.createComponent(RecipePage);
      await fixture.whenStable();
      expect(text(fixture)).toContain('Getting the recipes to compare...');
      answer('/materials/getStandard', [WHITING, SILICA, CUSTER, G200]);
      answer('/materials/getAll', []);
      answer('/additives/getAll', []);
      answer('/additives/getStandard', []);
      answer('/recipe/getAll', [OLD, { ...OLD, _id: 'r2', title: 'Second' }]);
      await settle(fixture);
      expect(text(fixture, '#compare-title')).toBe('Old celadon and Second');
      const left = fixture.nativeElement.querySelector('#compare-left') as HTMLSelectElement;
      left.value = 'r2';
      left.dispatchEvent(new Event('change'));
      await settle(fixture);
      expect(router.url).toBe('/?compare=r2,r2');
      // Not opened from this page (a reload, or a bookmark): Back replaces the address.
      click(fixture, 'Back to the recipe');
      await settle(fixture);
      expect(router.url).toBe('/');
      expect(fixture.nativeElement.querySelector('gc-recipe-compare')).toBeNull();

      // Neither recipe there: the editor, and the address without them.
      await router.navigateByUrl('/?compare=gone,removed');
      await settle(fixture);
      expect(router.url).toBe('/');
      expect(fixture.nativeElement.querySelector('gc-recipe-compare')).toBeNull();
    });

    it('goes back from comparing a saved recipe to its Compare button', async () => {
      const { fixture, router } = await start();
      (fixture.nativeElement.querySelector('#more-r1') as HTMLButtonElement).click();
      await settle(fixture);
      (fixture.nativeElement.querySelector('#compare-r1') as HTMLButtonElement).click();
      await settle(fixture);
      expect(router.url).toBe('/?compare=r1,');
      click(fixture, 'Back to the recipe');
      await settle(fixture);
      expect(router.url).toBe('/');
      expect(document.activeElement?.id).toBe('compare-r1');
    });

    it('asks for a material, and amounts it can read, before comparing', async () => {
      const { fixture, router, page } = await start();
      click(fixture, 'Compare');
      await fixture.whenStable();
      expect(text(fixture, '.recipe-save-problem')).toBe('Please add at least one material to compare.');
      fill(page, [[WHITING, '20']]);
      page['edit'].addAdditive(RUTILE);
      page['edit'].setAdditiveAmount(0, '2 %');
      await fixture.whenStable();
      click(fixture, 'Compare');
      await fixture.whenStable();
      expect(text(fixture, '.recipe-save-problem')).toBe('');
      expect(fieldProblem(fixture, 'additive-amount-0')).toBe('Enter a number, such as 12.5.');
      expect(document.activeElement?.id).toBe('additive-amount-0');
      expect(router.url).toBe('/');
    });

    describe('by the questions’ own controls', () => {
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
      const RED_LEAD: Material = { ...material('Red lead', [['PbO', 1]], 2.33), status: 'historical' };
      const CHINA_CLAY: Material = {
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
      const frit = (name: string, boron: number): Material => ({
        ...material(
          name,
          [
            ['Na2O', 0.3],
            ['CaO', 0.7],
            ['Al2O3', 0.25],
            ['B2O3', boron],
            ['SiO2', 2.6]
          ],
          0
        ),
        category: 'frit'
      });
      /** One of the potter's own, whose analysis the unity formula cannot read. */
      const MYSTERY: Material = {
        _id: 'mystery',
        name: 'Mystery spar',
        ownedBy: 'u1',
        percentmole: 'percent',
        loi: 0,
        fields: [{ name: 'Fe', amount: 100 }]
      };
      const NITER_RECIPE: Array<[Material, string]> = [
        [NITER, '10'],
        [WHITING, '20'],
        [KAOLIN, '20'],
        [SILICA, '50']
      ];
      const LEAD_RECIPE: Array<[Material, string]> = [
        [RED_LEAD, '55'],
        [CHINA_CLAY, '15'],
        [SILICA, '30']
      ];

      /** The page, with these standard materials and the potter's own. */
      const startWith = async (standard: Material[], mine: Material[] = []) => {
        const fixture = TestBed.createComponent(RecipePage);
        const router = TestBed.inject(Router);
        router.initialNavigation();
        await fixture.whenStable();
        answer('/materials/getStandard', standard);
        answer('/materials/getAll', mine);
        answer('/additives/getAll', []);
        answer('/additives/getStandard', []);
        answer('/recipe/getAll', []);
        await settle(fixture);
        const root = fixture.nativeElement as HTMLElement;
        return { fixture, router, root, page: fixture.componentInstance as unknown as Page };
      };
      /** Adds a material from a list of materials to try, by its name. */
      const tryMaterial = async (fixture: Parameters<typeof settle>[0], list: HTMLElement, name: string) => {
        const item = [...list.querySelectorAll<HTMLButtonElement>('button.library-item')].find(
          (button) => button.querySelector('bdi')?.textContent?.trim() === name
        );
        if (!item) throw new Error('no ' + name + ' to try');
        item.click();
        await settle(fixture);
      };
      const materialsShown = (root: HTMLElement) =>
        [...root.querySelectorAll('.recipe-materials tbody bdi')].map((b) => b.textContent);

      it('asks what brings each oxide back by its radios, takes materials to try, and works it out again from its report', async () => {
        const { fixture, router, root, page } = await startWith([
          WHITING,
          SILICA,
          NITER,
          SODA_FRIT,
          SPAR,
          KAOLIN,
          G200
        ]);
        fill(page, NITER_RECIPE);
        await settle(fixture);
        click(fixture, 'Suggest amounts and compare');
        await settle(fixture);
        const radio = (id: string) => root.querySelector('#' + id) as HTMLInputElement;
        expect(radio('bring-K2O-0').checked).toBe(true);
        radio('bring-K2O-none').click();
        await settle(fixture);
        expect([radio('bring-K2O-0').checked, radio('bring-K2O-none').checked]).toEqual([false, true]);
        radio('bring-K2O-0').click();
        await settle(fixture);
        expect([radio('bring-K2O-0').checked, radio('bring-K2O-none').checked]).toEqual([true, false]);

        click(fixture, 'Materials to try (0)');
        await settle(fixture);
        await tryMaterial(
          fixture,
          root.querySelector('.recipe-suggest gc-try-materials') as HTMLElement,
          'G-200 EU Feldspar'
        );
        expect(text(fixture, '.recipe-suggest .try-list')).toContain('G-200 EU Feldspar');
        click(fixture, 'Materials to try (1)');
        await settle(fixture);
        expect(root.querySelector('.recipe-suggest gc-try-materials')).toBeNull();
        click(fixture, 'Work it out and compare');
        await settle(fixture);
        expect(router.url).toBe('/?compare=before,draft');

        // Under the materials, the report works it out again from the recipe as it was, leaving one out.
        click(fixture, 'Back to the recipe');
        await settle(fixture);
        const use = [...root.querySelectorAll('.recipe-swap .swap-uses li')].find((li) =>
          [...li.querySelectorAll('button')].some((b) => b.textContent?.trim() === 'Leave it out')
        ) as HTMLElement;
        const name = use.querySelector('b')!.textContent!;
        click({ nativeElement: use }, 'Leave it out');
        await settle(fixture);
        expect(text(fixture, '.recipe-swap .swap-report')).toContain(`Left out: ${name}.`);
        expect(materialsShown(root)).not.toContain(name);
        expect(document.activeElement?.id).toBe('swap-report-heading');
        expect(router.url).toBe('/');
      });

      it('says when nothing sold has the oxide a swap leaves short, and leaves it out', async () => {
        // No potash but the niter itself, which is no longer sold.
        const { fixture, root, page } = await startWith([WHITING, SILICA, NITER, SODA_FRIT, KAOLIN]);
        fill(page, NITER_RECIPE);
        await settle(fixture);
        click(fixture, 'Suggest amounts and compare');
        await settle(fixture);
        expect(text(fixture, '.recipe-suggest fieldset')).toContain(
          'No current material sold in your region has much of it.'
        );
        expect((root.querySelector('#bring-K2O-none') as HTMLInputElement).checked).toBe(true);
      });

      it('says which amount stops Suggest amounts', async () => {
        const { fixture, router, page } = await startWith([WHITING, SILICA, NITER, SODA_FRIT, SPAR, KAOLIN]);
        fill(page, [...NITER_RECIPE.slice(0, 3), [SILICA, 'lots']]);
        await settle(fixture);
        click(fixture, 'Suggest amounts and compare');
        await settle(fixture);
        expect(text(fixture, '.recipe-swap-problem')).toBe(
          'The amount for Silica is not a number ("lots"). Please fix it first.'
        );
        expect(router.url).toBe('/');
      });

      it('says when the amounts cannot be worked out for a material with no analysis to work from', async () => {
        const { fixture, router, page } = await startWith([WHITING, SILICA, NITER, SODA_FRIT, SPAR, KAOLIN], [MYSTERY]);
        fill(page, [...NITER_RECIPE, [MYSTERY, '5']]);
        await settle(fixture);
        click(fixture, 'Suggest amounts and compare');
        await settle(fixture);
        expect(text(fixture, '.recipe-swap-problem')).toBe(
          'The amounts cannot be worked out: a material in the recipe has no analysis to work from.'
        );
        expect(router.url).toBe('/');
      });

      it('works the amounts out at once when a swap leaves no oxide short', async () => {
        TestBed.inject(PreferencesService).remember('lead', 'on');
        const LITHARGE: Material = {
          ...material('Litharge', [['PbO', 1]], 0),
          status: 'historical',
          substitutes: ['Lead Bisilicate Frit']
        };
        const BISILICATE = material(
          'Lead Bisilicate Frit',
          [
            ['PbO', 1],
            ['SiO2', 2]
          ],
          0
        );
        const { fixture, router, root, page } = await startWith([WHITING, SILICA, LITHARGE, BISILICATE]);
        fill(page, [
          [LITHARGE, '60'],
          [SILICA, '40']
        ]);
        await settle(fixture);
        click(fixture, 'Suggest amounts and compare');
        await settle(fixture);
        expect(root.querySelector('.recipe-suggest')).toBeNull();
        expect(router.url).toBe('/?compare=before,draft');
        expect(text(fixture, '#compare-title')).toBe('Untitled recipe and Untitled recipe with modern materials');
      });

      it('replaces lead as its form says: the firing, rebuilding or keeping the colour, the frit, materials to try, or not at all', async () => {
        const { fixture, root, page } = await startWith([
          WHITING,
          SILICA,
          CHINA_CLAY,
          RED_LEAD,
          frit('Borosilicate frit', 0.6),
          frit('Soft borosilicate frit', 1.2)
        ]);
        fill(page, LEAD_RECIPE);
        await settle(fixture);
        click(fixture, 'Replace lead');
        await settle(fixture);
        const cone = root.querySelector('#lead-cone') as HTMLSelectElement;
        cone.value = '06';
        cone.dispatchEvent(new Event('change'));
        await settle(fixture);
        expect(cone.value).toBe('06');
        const radio = (id: string) => root.querySelector('#' + id) as HTMLInputElement;
        const tries = () =>
          [...root.querySelectorAll('.recipe-lead button')].some((b) =>
            /^Materials to try/.test(b.textContent?.trim() ?? '')
          );
        // Keeping the colour builds on the frit and kaolin alone: no materials to try.
        radio('lead-mode-colour').click();
        await settle(fixture);
        expect(radio('lead-mode-colour').checked).toBe(true);
        expect(tries()).toBe(false);
        radio('lead-mode-rebuild').click();
        await settle(fixture);
        expect(tries()).toBe(true);
        radio('lead-base-1').click();
        await settle(fixture);
        expect([radio('lead-base-0').checked, radio('lead-base-1').checked]).toEqual([false, true]);
        click(fixture, 'Materials to try (0)');
        await settle(fixture);
        await tryMaterial(fixture, root.querySelector('.recipe-lead gc-try-materials') as HTMLElement, 'Whiting');
        expect(text(fixture, '.recipe-lead .try-list')).toContain('Whiting');

        click(fixture, 'Cancel');
        await settle(fixture);
        expect(root.querySelector('#lead-heading')).toBeNull();
        expect(document.activeElement?.id).toBe('replace-lead');
        expect(materialsShown(root)).toEqual(['Red lead', 'China Clay', 'Silica']);
      });

      it('keeps the colour on the recipe’s own clay, and names it: Redart, not kaolin', async () => {
        // A red earthenware clay, neither kaolin nor ball clay: the recipe's only clay, so the colour is kept on it.
        const REDART: Material = {
          ...material(
            'Redart',
            [
              ['Al2O3', 1],
              ['SiO2', 4],
              ['Fe2O3', 0.2],
              ['K2O', 0.05]
            ],
            5
          ),
          category: 'clay'
        };
        const { fixture, router, root, page } = await startWith([
          WHITING,
          SILICA,
          CHINA_CLAY,
          RED_LEAD,
          REDART,
          frit('Borosilicate frit', 0.6)
        ]);
        fill(page, [
          [RED_LEAD, '55'],
          [REDART, '15'],
          [SILICA, '30']
        ]);
        await settle(fixture);
        click(fixture, 'Replace lead');
        await settle(fixture);
        expect(text(fixture, 'label[for="lead-mode-colour"]')).toBe(
          "Keep the colour on a lead-free base: the frit and Redart, 85 to 15, with the recipe's colorants"
        );
        (root.querySelector('#lead-mode-colour') as HTMLInputElement).click();
        await settle(fixture);
        click(fixture, 'Replace lead and compare');
        await settle(fixture);
        expect(router.url).toBe('/?compare=before,draft');
        expect(page['lines']().map((l: Material) => l.name)).toEqual(['Borosilicate frit', 'Redart']);
        expect(page['notes']()).toMatch(
          /^Lead replaced: the colorants carried onto a lead-free base of Borosilicate frit and Redart, 85 to 15\. /
        );
      });

      it('works a lead replacement out again from its report under the materials', async () => {
        const { fixture, router, root, page } = await startWith([
          WHITING,
          SILICA,
          CHINA_CLAY,
          RED_LEAD,
          frit('Borosilicate frit', 0.6)
        ]);
        fill(page, LEAD_RECIPE);
        await settle(fixture);
        click(fixture, 'Replace lead');
        await settle(fixture);
        click(fixture, 'Replace lead and compare');
        await settle(fixture);
        expect(router.url).toBe('/?compare=before,draft');
        click(fixture, 'Back to the recipe');
        await settle(fixture);
        const use = [...root.querySelectorAll('.recipe-swap .swap-uses li')].find((li) =>
          [...li.querySelectorAll('button')].some((b) => b.textContent?.trim() === 'Leave it out')
        ) as HTMLElement;
        const name = use.querySelector('b')!.textContent!;
        click({ nativeElement: use }, 'Leave it out');
        await settle(fixture);
        expect(text(fixture, '.recipe-swap .swap-report')).toContain(`Left out: ${name}.`);
        expect(materialsShown(root)).not.toContain(name);
        expect(materialsShown(root)).not.toContain('Red lead');
        expect(router.url).toBe('/');
      });

      it('says when there is no lead-free frit to build on, and replaces nothing', async () => {
        const { fixture, router, root, page } = await startWith([WHITING, SILICA, CHINA_CLAY, RED_LEAD]);
        fill(page, LEAD_RECIPE);
        await settle(fixture);
        click(fixture, 'Replace lead');
        await settle(fixture);
        expect(text(fixture, '.recipe-lead fieldset:last-of-type')).toContain(
          'No lead-free frit sold in your region is in the library.'
        );
        const replace = [...root.querySelectorAll('.recipe-lead button')].find(
          (b) => b.textContent?.trim() === 'Replace lead and compare'
        ) as HTMLButtonElement;
        expect(replace.getAttribute('aria-disabled')).toBe('true');
        replace.click();
        await settle(fixture);
        expect(router.url).toBe('/');
        expect(materialsShown(root)).toEqual(['Red lead', 'China Clay', 'Silica']);
      });

      it('says when the lead cannot be replaced for a material with no analysis to work from', async () => {
        const { fixture, root, page } = await startWith(
          [WHITING, SILICA, CHINA_CLAY, RED_LEAD, frit('Borosilicate frit', 0.6)],
          [MYSTERY]
        );
        fill(page, [...LEAD_RECIPE, [MYSTERY, '5']]);
        await settle(fixture);
        click(fixture, 'Replace lead');
        await settle(fixture);
        expect(root.querySelector('#lead-heading')).toBeNull();
        expect(text(fixture, '.recipe-swap-problem')).toBe(
          'The lead cannot be replaced: a material in the recipe has no analysis to work from.'
        );
      });

      it('says which amount stops a match for a recipe with nothing to swap', async () => {
        const { fixture, router, page } = await startWith([WHITING, SILICA, G200]);
        fill(page, [
          [WHITING, '20'],
          [SILICA, 'lots']
        ]);
        await settle(fixture);
        click(fixture, 'Match with what I have');
        await settle(fixture);
        answer('/shelf', { shelf: ['Whiting', 'Silica', 'G-200 EU Feldspar'] });
        await settle(fixture);
        click(fixture, 'Match and compare');
        await settle(fixture);
        expect(router.url).toBe('/');
        expect(text(fixture, '.recipe-swap-problem')).toBe(
          'The amount for Silica is not a number ("lots"). Please fix it first.'
        );
      });

      it('closes Match with what I have by its own button or Cancel, keeping what must be used, and saves nothing for a tick', async () => {
        const { fixture, root, page } = await startWith([WHITING, SILICA, CUSTER, G200]);
        fill(page, [
          [CUSTER, '40'],
          [WHITING, '20'],
          [SILICA, '40']
        ]);
        await settle(fixture);
        click(fixture, 'Match with what I have');
        await settle(fixture);
        answer('/shelf', { shelf: ['Whiting', 'G-200 EU Feldspar'] });
        await settle(fixture);
        const must = () =>
          [...root.querySelectorAll('.recipe-shelf .try-list li')]
            .find((li) => li.textContent?.includes('Whiting'))!
            .querySelector('input[type=checkbox]') as HTMLInputElement;
        must().click();
        await settle(fixture);
        // The same materials on hand: nothing to save.
        httpMock().expectNone(API + '/shelf');

        click(fixture, 'Match with what I have');
        await settle(fixture);
        expect(root.querySelector('#shelf-heading')).toBeNull();
        click(fixture, 'Match with what I have');
        await settle(fixture);
        expect(must().checked).toBe(true);

        click(fixture, 'Cancel');
        await settle(fixture);
        expect(root.querySelector('#shelf-heading')).toBeNull();
        expect(document.activeElement?.id).toBe('match-shelf');
      });

      it('matches nothing with nothing on hand, and says which amount stops a match', async () => {
        const { fixture, router, page } = await startWith([WHITING, SILICA, CUSTER, G200]);
        fill(page, [
          [CUSTER, '40'],
          [WHITING, '20'],
          [SILICA, 'lots']
        ]);
        await settle(fixture);
        click(fixture, 'Match with what I have');
        await settle(fixture);
        answer('/shelf', { shelf: [] });
        await settle(fixture);
        click(fixture, 'Match and compare');
        await settle(fixture);
        expect(router.url).toBe('/');
        expect(text(fixture, '.recipe-swap-problem')).toBe('');

        click(fixture, 'Add the materials in this recipe');
        const put = httpMock().expectOne(API + '/shelf');
        put.flush({ shelf: put.request.body.shelf });
        await settle(fixture);
        click(fixture, 'Match and compare');
        await settle(fixture);
        expect(router.url).toBe('/');
        expect(text(fixture, '.recipe-swap-problem')).toBe(
          'The amount for Silica is not a number ("lots"). Please fix it first.'
        );
      });

      it('says when a material on hand, or one tried in the report, has no analysis to match with', async () => {
        const { fixture, router, root, page } = await startWith([WHITING, SILICA, CUSTER, G200], [MYSTERY]);
        fill(page, [
          [CUSTER, '40'],
          [WHITING, '20'],
          [SILICA, '40']
        ]);
        await settle(fixture);
        click(fixture, 'Match with what I have');
        await settle(fixture);
        answer('/shelf', { shelf: ['mystery', 'G-200 EU Feldspar', 'Whiting', 'Silica'] });
        await settle(fixture);
        click(fixture, 'Match and compare');
        await settle(fixture);
        expect(text(fixture, '.recipe-swap-problem')).toBe(
          'It cannot be matched: a material has no analysis to work from.'
        );
        expect(router.url).toBe('/');

        // Without it, the match is made.
        (root.querySelector('[aria-label="Remove Mystery spar from your materials on hand"]') as HTMLElement).click();
        httpMock()
          .expectOne(API + '/shelf')
          .flush({});
        await settle(fixture);
        click(fixture, 'Match and compare');
        await settle(fixture);
        expect(router.url).toBe('/?compare=before,draft');
        click(fixture, 'Back to the recipe');
        await settle(fixture);

        // Tried again from the report, with it: the recipe goes back to how it was, and says why.
        const report = root.querySelector('.recipe-swap .swap-report') as HTMLElement;
        click({ nativeElement: report }, 'Try other materials');
        await settle(fixture);
        await tryMaterial(fixture, report, 'Mystery spar');
        click({ nativeElement: report }, 'Work it out again');
        await settle(fixture);
        expect(text(fixture, '.recipe-swap-problem')).toBe(
          'It cannot be worked out that way: a material has no analysis to work from.'
        );
        expect(materialsShown(root)).toEqual(['Custer Spar', 'Whiting', 'Silica']);
      });

      const NO_FLUX = 'It cannot be worked out: none of the materials it may use has a flux, such as CaO, K₂O or Na₂O.';
      const LINER: Array<[Material, string]> = [
        [CUSTER, '40'],
        [WHITING, '20'],
        [SILICA, '30'],
        [KAOLIN, '10']
      ];

      it('says when none of the materials on hand has a flux, not that a material has no analysis', async () => {
        const { fixture, router, page } = await startWith([WHITING, SILICA, CUSTER, G200, KAOLIN]);
        fill(page, LINER);
        await settle(fixture);
        click(fixture, 'Match with what I have');
        await settle(fixture);
        answer('/shelf', { shelf: ['Silica', 'Kaolin'] });
        await settle(fixture);
        click(fixture, 'Match and compare');
        await settle(fixture);
        expect(text(fixture, '.recipe-swap-problem')).toBe(NO_FLUX);
        expect(router.url).toBe('/');
      });

      it('says so when worked out again without the only flux it had', async () => {
        const { fixture, router, root, page } = await startWith([WHITING, SILICA, CUSTER, G200, KAOLIN]);
        fill(page, LINER);
        await settle(fixture);
        click(fixture, 'Match with what I have');
        await settle(fixture);
        answer('/shelf', { shelf: ['Whiting', 'Silica', 'Kaolin'] });
        await settle(fixture);
        click(fixture, 'Match and compare');
        await settle(fixture);
        expect(router.url).toBe('/?compare=before,draft');
        click(fixture, 'Back to the recipe');
        await settle(fixture);
        const whiting = [...root.querySelectorAll('.recipe-swap .swap-uses li')].find(
          (li) => li.querySelector('b')?.textContent === 'Whiting'
        ) as HTMLElement;
        click({ nativeElement: whiting }, 'Leave it out');
        await settle(fixture);
        expect(text(fixture, '.recipe-swap-problem')).toBe(NO_FLUX);
        // The recipe goes back to how it was.
        expect(materialsShown(root)).toEqual(['Custer Spar', 'Whiting', 'Silica', 'Kaolin']);
      });

      it('says why it could not be worked out again in the compare view too, where it was asked', async () => {
        const { fixture, router, root, page } = await startWith([WHITING, SILICA, CUSTER, G200], [MYSTERY]);
        fill(page, [
          [CUSTER, '40'],
          [WHITING, '20'],
          [SILICA, '40']
        ]);
        await settle(fixture);
        click(fixture, 'Match with what I have');
        await settle(fixture);
        answer('/shelf', { shelf: ['G-200 EU Feldspar', 'Whiting', 'Silica'] });
        await settle(fixture);
        click(fixture, 'Match and compare');
        await settle(fixture);
        expect(router.url).toBe('/?compare=before,draft');

        // From the report in the compare view, with a material that has no analysis.
        const compare = root.querySelector('gc-recipe-compare') as HTMLElement;
        const report = compare.querySelector('.swap-report') as HTMLElement;
        click({ nativeElement: report }, 'Try other materials');
        await settle(fixture);
        await tryMaterial(fixture, report, 'Mystery spar');
        click({ nativeElement: report }, 'Work it out again');
        await settle(fixture);
        const problem = root.querySelector('gc-recipe-compare .recipe-swap-problem');
        expect(problem?.textContent?.trim()).toBe(
          'It cannot be worked out that way: a material has no analysis to work from.'
        );
        expect(problem?.getAttribute('role')).toBe('alert');
      });

      it('asks for the standard list again from the materials on hand', async () => {
        const fixture = TestBed.createComponent(RecipePage);
        TestBed.inject(Router).initialNavigation();
        await fixture.whenStable();
        httpMock()
          .expectOne(API + '/materials/getStandard')
          .flush({}, { status: 503, statusText: 'Unavailable' });
        answer('/materials/getAll', []);
        answer('/additives/getAll', []);
        answer('/additives/getStandard', []);
        answer('/recipe/getAll', []);
        await settle(fixture);
        fill(fixture.componentInstance as unknown as Page, [
          [WHITING, '20'],
          [SILICA, '80']
        ]);
        await settle(fixture);
        click(fixture, 'Match with what I have');
        await settle(fixture);
        answer('/shelf', { shelf: [] });
        await settle(fixture);
        const shelf = fixture.nativeElement.querySelector('.recipe-shelf') as HTMLElement;
        click({ nativeElement: shelf }, 'Try again');
        answer('/materials/getStandard', [WHITING, SILICA, G200]);
        await settle(fixture);
        expect(text(fixture, '.recipe-shelf .library')).toContain('G-200 EU Feldspar');
      });
    });
  });
});
