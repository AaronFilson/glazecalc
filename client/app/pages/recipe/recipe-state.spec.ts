import { TestBed } from '@angular/core/testing';
import { Material } from '../../core/models';
import { API, answer, httpMock, settle, testProviders } from '../../testing/test-providers';
import { RecipePage } from './recipe-page';

const WHITING: Material = {
  _id: 'w',
  name: 'Whiting',
  percentmole: 'molecular',
  loi: 43.97,
  fields: [{ name: 'CaO', amount: 1 }]
};
const SILICA: Material = {
  _id: 's',
  name: 'Silica',
  percentmole: 'molecular',
  loi: 0,
  fields: [{ name: 'SiO2', amount: 1 }]
};
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

// The unity result, its warnings and saving, as the recipe changes.
describe('RecipePage state', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: testProviders() }));
  afterEach(() => httpMock().verify());

  const create = async () => {
    const fixture = TestBed.createComponent(RecipePage);
    await fixture.whenStable();
    answer('/materials/getStandard', [WHITING, SILICA, HALF]);
    for (const path of ['/materials/getAll', '/additives/getAll', '/additives/getStandard', '/recipe/getAll'])
      answer(path, []);
    await settle(fixture);
    const page = fixture.componentInstance as unknown as Record<string, any>;
    page['addMaterial'](WHITING);
    page['addMaterial'](SILICA);
    page['recipeMaterials']()[0].amount = '20';
    page['recipeMaterials']()[1].amount = '30';
    return { fixture, page };
  };

  it('clears the shown unity formula when the materials or amounts change', async () => {
    const { page } = await create();
    page['compute']();
    expect(page['computed']()).not.toBeNull();
    page['removeMaterial'](1);
    expect(page['computed']()).toBeNull();

    page['compute']();
    page['addMaterial'](SILICA);
    expect(page['computed']()).toBeNull();

    page['recipeMaterials']()[1].amount = '30';
    page['compute']();
    page['recipeChanged']();
    expect(page['computed']()).toBeNull();
  });

  it('shows each warning once however often the recipe is computed', async () => {
    const { page } = await create();
    page['addMaterial'](HALF);
    page['recipeMaterials']()[2].amount = '10';
    page['compute']();
    page['compute']();
    page['compute']();
    const warnings = page['notices'].errors().filter((e: string) => e.startsWith('Warning: '));
    expect(warnings.length).toBeGreaterThan(0);
    expect(new Set(warnings).size).toBe(warnings.length);

    page['removeMaterial'](2);
    page['compute']();
    expect(page['notices'].errors().filter((e: string) => e.startsWith('Warning: '))).toEqual([]);
  });

  it('saves once when Save is pressed twice', async () => {
    const { fixture, page } = await create();
    page['title'].set('Twice');
    const first = page['save']();
    const second = page['save']();
    await fixture.whenStable();
    expect((fixture.nativeElement.querySelector('button[type=submit]') as HTMLButtonElement).disabled).toBe(true);
    httpMock()
      .expectOne(API + '/recipe/create')
      .flush({ _id: 'r1', title: 'Twice' });
    await Promise.all([first, second]);
    await fixture.whenStable();
    expect((fixture.nativeElement.querySelector('button[type=submit]') as HTMLButtonElement).disabled).toBe(false);
  });
});
