import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { Material, Recipe } from '../../core/models';
import { API, answer, httpMock, settle, skippedHeadings, testProviders, text } from '../../testing/test-providers';
import { BlendsPage } from './blends-page';

const material = (name: string, fields: Array<[string, number]>, loi: number): Material => ({
  _id: name,
  name,
  percentmole: 'molecular',
  loi,
  fields: fields.map(([oxide, amount]) => ({ name: oxide, amount }))
});
const WHITING = material('Whiting', [['CaO', 1]], 43.97);
const SILICA = material('Silica', [['SiO2', 1]], 0);
const SPAR = material(
  'Custer',
  [
    ['K2O', 1],
    ['Al2O3', 1],
    ['SiO2', 6]
  ],
  0
);
const DOLOMITE = material(
  'Dolomite',
  [
    ['CaO', 1],
    ['MgO', 1]
  ],
  47.73
);

const CELADON: Recipe = {
  _id: 'cel',
  title: 'Celadon',
  materials: [
    { ...SPAR, amount: '40' },
    { ...WHITING, amount: '20' },
    { ...SILICA, amount: '40' }
  ],
  additives: [
    { _id: 'rio', name: 'Red iron oxide', fields: [{ name: 'Fe2O3', amount: '1' }], amount: '2', unit: 'percent' }
  ]
};
// In grams: a 500 g batch.
const MATTE: Recipe = {
  _id: 'mat',
  title: 'Matte',
  materials: [
    { ...SPAR, amount: '250' },
    { ...DOLOMITE, amount: '100' },
    { ...SILICA, amount: '150' }
  ]
};
const SHINO: Recipe = {
  _id: 'shi',
  title: 'Shino',
  materials: [
    { ...SPAR, amount: '70' },
    { ...SILICA, amount: '30' }
  ]
};
const EMPTY: Recipe = { _id: 'emp', title: 'Empty', materials: [{ ...SILICA, amount: '' }] };

type Page = Record<string, any>;

describe('BlendsPage', () => {
  const setup = (query: Record<string, string> = {}) =>
    TestBed.configureTestingModule({
      providers: [
        testProviders(),
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(query) } } }
      ]
    });
  afterEach(() => httpMock().verify());

  const create = async (recipes: Recipe[] = [CELADON, MATTE, SHINO, EMPTY], query: Record<string, string> = {}) => {
    setup(query);
    const fixture = TestBed.createComponent(BlendsPage);
    await fixture.whenStable();
    answer('/recipe/getAll', recipes);
    await settle(fixture);
    const root: HTMLElement = fixture.nativeElement;
    const page = fixture.componentInstance as unknown as Page;
    const pick = async (id: string, value: string) => {
      const select = root.querySelector('#' + id) as HTMLSelectElement;
      select.value = [...select.options].find((o) => o.textContent?.trim() === value || o.value === value)!.value;
      select.dispatchEvent(new Event('change'));
      await settle(fixture);
    };
    const tiles = () => [...root.querySelectorAll('.blend-tile')];
    return { fixture, root, page, pick, tiles };
  };

  it('starts a line blend from the recipe it was opened with, and asks for the other', async () => {
    const { fixture, root } = await create(undefined, { recipe: 'cel' });
    expect((root.querySelector('#blend-corner-0') as HTMLSelectElement).value).toBe('cel');
    expect(text(fixture, '.blend-problem')).toBe('Choose a recipe for each letter.');
    expect(root.querySelector('.blend-tile')).toBeNull();
    expect((root.querySelector('#blend-name') as HTMLInputElement | null)?.value).toBeUndefined();
  });

  it('draws a line blend’s tiles, numbered, with each tile’s mix, and lists what to weigh', async () => {
    const { fixture, root, pick, tiles } = await create(undefined, { recipe: 'cel' });
    await pick('blend-corner-1', 'Matte');
    await pick('blend-steps', '3');
    expect(tiles().map((t) => t.querySelector('.blend-tile-number')?.textContent?.trim())).toEqual(['1', '2', '3']);
    expect(tiles().map((t) => t.querySelector('.blend-tile-shares')?.textContent?.trim())).toEqual([
      'A 100%',
      'A 50% B 50%',
      'B 100%'
    ]);
    expect(text(fixture, '.blend-diagram-panel p')).toBe('A Celadon · B Matte');
    // Tile 2 of a 100 g test batch: half of each recipe as percents.
    const middle = root.querySelectorAll('.blend-list-tile')[1];
    expect(middle.querySelector('h3')?.textContent?.trim()).toBe('Tile 2: 50% A, 50% B');
    const rows = [...middle.querySelectorAll('tr')]
      .slice(1)
      .map((tr) => [...tr.querySelectorAll('th, td')].map((c) => c.textContent?.replace(/\s+/g, ' ').trim()));
    expect(rows).toEqual([
      ['Custer', '45 g'],
      ['Whiting', '10 g'],
      ['Silica', '35 g'],
      ['Dolomite', '10 g'],
      ['+ Red iron oxide', '1 g']
    ]);
    expect((root.querySelector('#blend-name') as HTMLInputElement).value).toBe('Celadon / Matte blend');
    expect(skippedHeadings(fixture)).toEqual([]);
  });

  it('weighs for the test batch chosen', async () => {
    const { fixture, root, pick } = await create(undefined, { recipe: 'shi' });
    await pick('blend-corner-1', 'Shino');
    const batch = root.querySelector('#blend-batch') as HTMLInputElement;
    batch.value = '250';
    batch.dispatchEvent(new Event('input'));
    await settle(fixture);
    expect(text(fixture, '.blend-list-tile td')).toBe('175 g');
    expect(text(fixture, '.blend-print-title')).toBe('Each tile: 250 g of base, and its additions on top.');
  });

  it('draws a biaxial blend as a square and a triaxial blend as a triangle', async () => {
    const { fixture, root, pick, tiles } = await create();
    (root.querySelector('#blend-kind-biaxial') as HTMLInputElement).click();
    await settle(fixture);
    expect(root.querySelectorAll('.blend-corner').length).toBe(4);
    await pick('blend-corner-0', 'Celadon');
    await pick('blend-corner-1', 'Matte');
    await pick('blend-corner-2', 'Shino');
    await pick('blend-corner-3', 'Celadon');
    expect(tiles().length).toBe(16);
    expect(new Set(tiles().map((t) => t.getAttribute('data-row'))).size).toBe(4);
    expect(text(fixture, '.blend-count')).toBe('16 tiles');

    (root.querySelector('#blend-kind-triaxial') as HTMLInputElement).click();
    await settle(fixture);
    expect(root.querySelectorAll('.blend-corner').length).toBe(3);
    expect(tiles().length).toBe(15);
    const perRow = [0, 1, 2, 3, 4].map(
      (row) => tiles().filter((t) => t.getAttribute('data-row') === String(row)).length
    );
    expect(perRow).toEqual([1, 2, 3, 4, 5]);
    // The top tile is in the middle, the bottom row from the edge: grid columns half a tile wide.
    expect((tiles()[0] as HTMLElement).style.gridColumn).toBe('5 / span 2');
    expect((tiles()[10] as HTMLElement).style.gridColumn).toBe('1 / span 2');
    expect(root.querySelector('.blend-diagram')?.classList).toContain('is-triaxial');
    expect(tiles()[0].querySelector('.visually-hidden')?.textContent?.trim()).toBe(
      'Tile 1: 100% A. Choose it to save.'
    );
  });

  it('says when a corner recipe has no amounts', async () => {
    const { fixture, pick } = await create(undefined, { recipe: 'cel' });
    await pick('blend-corner-1', 'Empty');
    expect(text(fixture, '.blend-problem')).toBe('Empty has no amounts to blend.');
  });

  it('says to save two recipes first when there are fewer', async () => {
    const { fixture } = await create([CELADON]);
    expect(text(fixture)).toContain('save at least two first');
  });

  it('saves the chosen tiles as recipes in percent, with the analysis', async () => {
    const { fixture, root, pick, tiles } = await create(undefined, { recipe: 'cel' });
    await pick('blend-corner-1', 'Matte');
    await pick('blend-steps', '3');
    (tiles()[1].querySelector('input') as HTMLInputElement).click();
    await settle(fixture);
    expect(tiles()[1].classList).toContain('is-chosen');
    expect(text(fixture, '.blend-save button')).toBe('Save 1 tile');
    (root.querySelector('.blend-save button') as HTMLButtonElement).click();
    await settle(fixture);
    const req = httpMock().expectOne({ method: 'POST', url: API + '/recipe/create' });
    const sent = req.request.body as Recipe;
    expect(sent.title).toBe('Celadon / Matte blend, tile 2');
    expect(sent.notes).toBe('Blend tile: 50% A, 50% B (A Celadon · B Matte).');
    expect(sent.materials.map((m) => [m.name, m.amount])).toEqual([
      ['Custer', '45'],
      ['Whiting', '10'],
      ['Silica', '35'],
      ['Dolomite', '10']
    ]);
    expect(sent.additives?.map((a) => [a.name, a.amount, a.unit])).toEqual([['Red iron oxide', '1', 'percent']]);
    expect((sent.computed as { uList: Record<string, number> }).uList['CaO']).toBeGreaterThan(0);
    req.flush({ ...sent, _id: 'new' });
    await settle(fixture);
    expect(text(fixture, '.server-msg')).toContain('Saved 1 tile as a recipe.');
    expect(tiles()[1].classList).not.toContain('is-chosen');
  });

  it('asks for tiles to save, and stops where the server refuses', async () => {
    const { fixture, root, pick } = await create(undefined, { recipe: 'cel' });
    await pick('blend-corner-1', 'Shino');
    await pick('blend-steps', '2');
    const save = async () => {
      (root.querySelector('.blend-save button') as HTMLButtonElement).click();
      await settle(fixture);
    };
    await save();
    expect(text(fixture, '.blend-save .blend-problem')).toBe('Choose at least one tile to save.');
    (root.querySelectorAll('.blend-save-fields button')[0] as HTMLButtonElement).click();
    await settle(fixture);
    await save();
    httpMock()
      .expectOne(API + '/recipe/create')
      .flush({ msg: 'A trial keeps up to 25 recipes.' }, { status: 403, statusText: 'Forbidden' });
    await settle(fixture);
    expect(text(fixture, '.blend-save .blend-problem')).toBe('Nothing was saved: A trial keeps up to 25 recipes.');
  });

  it('after a failure part way, says which tiles were saved and does not save them again on retry', async () => {
    const { fixture, root, pick, tiles } = await create(undefined, { recipe: 'cel' });
    await pick('blend-corner-1', 'Shino');
    await pick('blend-steps', '3');
    (root.querySelectorAll('.blend-save-fields button')[0] as HTMLButtonElement).click();
    await settle(fixture);
    const save = async () => {
      (root.querySelector('.blend-save button') as HTMLButtonElement).click();
      await settle(fixture);
    };
    await save();
    httpMock()
      .expectOne({ method: 'POST', url: API + '/recipe/create' })
      .flush({ _id: 'one' });
    await settle(fixture);
    httpMock()
      .expectOne(API + '/recipe/create')
      .flush({ msg: 'A trial keeps up to 25 recipes.' }, { status: 403, statusText: 'Forbidden' });
    await settle(fixture);
    expect(text(fixture, '.blend-save .blend-problem')).toBe(
      'Saved tiles: 1. Not saved: 2, 3. A trial keeps up to 25 recipes.'
    );
    expect(tiles()[0].classList).toContain('is-saved');
    expect(tiles()[1].classList).not.toContain('is-saved');
    await save();
    const titles: string[] = [];
    for (const id of ['two', 'three']) {
      const req = httpMock().expectOne(API + '/recipe/create');
      titles.push(req.request.body.title);
      req.flush({ _id: id });
      await settle(fixture);
    }
    expect(titles).toEqual(['Celadon / Shino blend, tile 2', 'Celadon / Shino blend, tile 3']);
    expect(text(fixture, '.server-msg')).toContain('Saved 2 tiles as recipes.');
    // Choosing only tiles saved already saves nothing.
    (root.querySelectorAll('.blend-save-fields button')[0] as HTMLButtonElement).click();
    await settle(fixture);
    await save();
    httpMock().expectNone(API + '/recipe/create');
    expect(text(fixture, '.blend-save .blend-problem')).toBe('The tiles chosen are saved already.');
  });

  it('carries whether additives count from the first corner, and says when the corners differ', async () => {
    const counted = {
      ...CELADON,
      includeAdditives: true,
      additives: CELADON.additives!.map((a) => ({ ...a, loi: 0, percentmole: 'molecular' as const }))
    };
    const { fixture, root, pick, tiles } = await create([counted, MATTE, SHINO, EMPTY], { recipe: 'cel' });
    await pick('blend-corner-1', 'Matte');
    expect(text(fixture, '.blend-diagram-panel .blend-problem')).toContain(
      'The tiles follow recipe A, Celadon: counted.'
    );
    await pick('blend-steps', '2');
    (tiles()[0].querySelector('input') as HTMLInputElement).click();
    await settle(fixture);
    (root.querySelector('.blend-save button') as HTMLButtonElement).click();
    await settle(fixture);
    const sent = httpMock().expectOne(API + '/recipe/create').request.body as Recipe;
    expect(sent.includeAdditives).toBe(true);
    // Counted: the iron oxide adds Fe2O3 to the analysis.
    expect(JSON.stringify(sent.computed)).toContain('Fe2O3');
  });

  it('prints the list', async () => {
    const { fixture, root, pick } = await create(undefined, { recipe: 'cel' });
    await pick('blend-corner-1', 'Shino');
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    (root.querySelector('.blend-batch button') as HTMLButtonElement).click();
    await settle(fixture);
    expect(print).toHaveBeenCalled();
  });
});
