import { TestBed } from '@angular/core/testing';
import { Material, Recipe } from '../../core/models';
import { API, answer, httpMock, settle, testProviders, text } from '../../testing/test-providers';
import { RecipePage, savedAnalysis } from './recipe-page';

const material = (name: string, fields: Array<[string, number]>, loi: number): Material => ({
  _id: name,
  name,
  percentmole: 'molecular',
  loi,
  fields: fields.map(([oxide, amount]) => ({ name: oxide, amount }))
});

const STANDARD = [
  material('Whiting', [['CaO', 1]], 43.97),
  material('Silica', [['SiO2', 1]], 0),
  material(
    'Dolomite',
    [
      ['CaO', 1],
      ['MgO', 1]
    ],
    47.73
  )
];

describe('RecipePage', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: testProviders() }));
  afterEach(() => httpMock().verify());

  const create = async () => {
    const fixture = TestBed.createComponent(RecipePage);
    await fixture.whenStable();
    answer('/materials/getStandard', STANDARD);
    answer('/materials/getAll', []);
    answer('/additives/getAll', []);
    answer('/additives/getStandard', [{ _id: 'rio', name: 'Iron oxide', fields: [{ name: 'Fe2O3', amount: '1' }] }]);
    answer('/recipe/getAll', []);
    await settle(fixture);
    // Protected members are reached through a loose view of the component.
    const page = fixture.componentInstance as unknown as Record<string, any>;
    return { fixture, page };
  };

  const click = (fixture: { nativeElement: HTMLElement }, label: string) => {
    const button = [...fixture.nativeElement.querySelectorAll('button')].find((b) => b.textContent?.trim() === label);
    if (!button) throw new Error('no button ' + label);
    button.click();
  };

  it('loads the material and additive pickers', async () => {
    const { fixture } = await create();
    const options = [...fixture.nativeElement.querySelectorAll('#std-mats option')].map((o: Element) =>
      o.textContent?.trim()
    );
    expect(options).toEqual(['none', 'Whiting', 'Silica', 'Dolomite']);
    expect(text(fixture, '#std-adds')).toContain('Iron oxide');
  });

  it('computes the unity formula of the materials and amounts entered', async () => {
    const { fixture, page } = await create();
    page['addMaterial'](STANDARD[0]);
    page['addMaterial'](STANDARD[1]);
    page['recipeMaterials']()[0].amount = '20';
    page['recipeMaterials']()[1].amount = '30';
    click(fixture, 'Compute recipe into Unity');
    await fixture.whenStable();

    const shown = text(fixture, '.unity-result');
    expect(shown).toContain('CaO : 1.000');
    // 30 g silica over (20 g whiting / 100.08 g per mole of CaO)
    expect(shown).toContain('SiO₂ : ' + (30 / 60.083 / (20 / 100.08)).toFixed(3));
  });

  it('copies picked materials so editing amounts leaves the picker list alone', async () => {
    const { page } = await create();
    page['addMaterial'](STANDARD[0]);
    page['recipeMaterials']()[0].amount = '5';
    expect((STANDARD[0] as { amount?: string }).amount).toBeUndefined();
  });

  it('reports a recipe with no flux instead of computing it', async () => {
    const { fixture, page } = await create();
    page['addMaterial'](STANDARD[1]);
    page['recipeMaterials']()[0].amount = '100';
    click(fixture, 'Compute recipe into Unity');
    await fixture.whenStable();
    expect(text(fixture, '.errors-section')).toContain('no flux');
    expect(fixture.nativeElement.querySelector('.unity-result')).toBeNull();
  });

  it('asks for a missing amount', async () => {
    const { page } = await create();
    page['addMaterial'](STANDARD[0]);
    page['compute']();
    expect(page['notices'].errors()).toEqual(['Error: Invalid amount for material Whiting']);
  });

  it('saves the recipe with a fresh analysis and adds it to the list', async () => {
    const { fixture, page } = await create();
    page['title'].set('Matte');
    page['addMaterial'](STANDARD[0]);
    page['addMaterial'](STANDARD[2]);
    page['recipeMaterials']()[0].amount = '10';
    page['recipeMaterials']()[1].amount = '20';
    page['addAdditive']({ name: 'Iron oxide', fields: [], amount: '2' });

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
    expect(body.additives?.map((a) => a.name)).toEqual(['Iron oxide']);
    expect(savedAnalysis(body)?.uList['MgO']).toBeGreaterThan(0);
    req.flush({ ...body, _id: 'r1', computed: [body.computed] });
    await saving;
    await fixture.whenStable();

    expect(page['notices'].messages()).toEqual(['Success. Recipe added to database.']);
    expect(page['recipeMaterials']()).toEqual([]);
    expect(text(fixture, '.saved-recipes')).toContain('Matte');
  });

  it('does not save without a title', async () => {
    const { page } = await create();
    page['addMaterial'](STANDARD[0]);
    await page['save']();
    httpMock().expectNone(API + '/recipe/create');
    expect(page['notices'].errors()).toEqual(['Error: there was missing info.']);
  });

  it('shows the server message when saving fails', async () => {
    const { page } = await create();
    page['title'].set('Matte');
    page['addMaterial'](STANDARD[0]);
    page['recipeMaterials']()[0].amount = '10';
    const saving = page['save']();
    httpMock()
      .expectOne(API + '/recipe/create')
      .flush({ msg: 'Missing required information' }, { status: 400, statusText: 'Bad Request' });
    await saving;
    expect(page['notices'].errors()).toEqual(['Missing required information']);
  });

  it('expands a saved recipe, including ones saved before siAlRatio existed', async () => {
    const { fixture, page } = await create();
    const old: Recipe = {
      _id: 'old',
      title: 'Old celadon',
      notes: ['Good'],
      materials: [{ ...STANDARD[0], amount: '20' }],
      computed: [{ uList: { CaO: 1, Al2O3: 0.4, SiO2: 3.7 } }]
    };
    page['myRecipes'].set([old]);
    await fixture.whenStable();
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

  it('removes a saved recipe', async () => {
    const { fixture, page } = await create();
    page['myRecipes'].set([{ _id: 'r1', title: 'Gone', materials: [] }]);
    await fixture.whenStable();
    click(fixture, 'Remove toggle');
    await fixture.whenStable();
    click(fixture, 'Remove from the server');
    httpMock()
      .expectOne({ method: 'DELETE', url: API + '/recipe/delete/r1' })
      .flush({});
    await settle(fixture);
    expect(page['myRecipes']()).toEqual([]);
  });

  it('reports a list that fails to load', async () => {
    const fixture = TestBed.createComponent(RecipePage);
    await fixture.whenStable();
    httpMock()
      .match(() => true)
      .forEach((req) => req.flush({}, { status: 500, statusText: 'Server Error' }));
    await settle(fixture);
    const errors = (fixture.componentInstance as unknown as Record<string, any>)['notices'].errors();
    expect(errors).toContain('There was an error in getting the recipe information.');
    expect(errors).toHaveLength(5);
  });
});
