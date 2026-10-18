import { TestBed } from '@angular/core/testing';
import { Additive, Material, Recipe } from '../../core/models';
import { API, answer, httpMock, settle, skippedHeadings, testProviders, text } from '../../testing/test-providers';
import { ImportPage } from './import-page';

const material = (
  name: string,
  fields: Array<[string, number]>,
  loi: number,
  extra: Partial<Material> = {}
): Material => ({
  _id: name,
  name,
  percentmole: 'molecular',
  loi,
  fields: fields.map(([oxide, amount]) => ({ name: oxide, amount })),
  ...extra
});

const WHITING = material('Whiting', [['CaO', 1]], 43.97, { aliases: ['Calcium carbonate'] });
const SILICA = material('Silica', [['SiO2', 1]], 0, { aliases: ['Quartz'] });
const CUSTER = material(
  'Custer Spar',
  [
    ['K2O', 1],
    ['Al2O3', 1],
    ['SiO2', 6]
  ],
  0,
  { aliases: ['Custer'] }
);
const EPK = material(
  'EPK Kaolin',
  [
    ['Al2O3', 1],
    ['SiO2', 2]
  ],
  13.96,
  { aliases: ['EPK'] }
);
const SODA_SPAR = material(
  'Soda Feldspar',
  [
    ['Na2O', 1],
    ['Al2O3', 1],
    ['SiO2', 6]
  ],
  0
);
const POTASH_SPAR = material(
  'Potash Feldspar',
  [
    ['K2O', 1],
    ['Al2O3', 1],
    ['SiO2', 6]
  ],
  0
);
const IRON: Additive = {
  _id: 'rio',
  name: 'Red iron oxide',
  percentmole: 'molecular',
  loi: 0,
  fields: [{ name: 'Fe2O3', amount: '1' }]
};
const MY_SILICA = material('Silica', [['SiO2', 1]], 0, { _id: 'mine', ownedBy: 'me' });

type Page = Record<string, any>;

describe('ImportPage', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: testProviders() }));
  afterEach(() => httpMock().verify());

  const create = async (mine: Material[] = []) => {
    const fixture = TestBed.createComponent(ImportPage);
    await fixture.whenStable();
    answer('/materials/getAll', mine);
    answer('/materials/getStandard', [WHITING, SILICA, CUSTER, EPK, SODA_SPAR, POTASH_SPAR]);
    answer('/additives/getAll', []);
    answer('/additives/getStandard', [IRON]);
    await settle(fixture);
    const root: HTMLElement = fixture.nativeElement;
    const page = fixture.componentInstance as unknown as Page;
    const paste = async (value: string) => {
      const box = root.querySelector('#paste-text') as HTMLTextAreaElement;
      box.value = value;
      box.dispatchEvent(new Event('input'));
      await settle(fixture);
      (root.querySelector('.import-actions button') as HTMLButtonElement).click();
      await settle(fixture);
    };
    const selects = () => [...root.querySelectorAll<HTMLSelectElement>('.import-line select')];
    const chosenNames = () => selects().map((s) => s.selectedOptions[0]?.textContent?.trim());
    const save = async () => {
      (root.querySelector('.import-save button') as HTMLButtonElement).click();
      await settle(fixture);
    };
    return { fixture, root, page, paste, selects, chosenNames, save };
  };

  it('reads a pasted recipe and shows each line with the material found for it', async () => {
    const { fixture, root, paste, chosenNames } = await create();
    await paste(
      'Celadon\nCone 10\n\nCuster Feldspar 40\nWhiting 20\nEPK 10\nSilica 30\nTotal 100\n\nAdditions\nRed iron oxide 1,5'
    );
    expect(text(fixture, '#import-recipe-0')).toBe('Celadon');
    expect((root.querySelector('#import-title-0') as HTMLInputElement).value).toBe('Celadon');
    expect(chosenNames()).toEqual(['Custer Spar', 'Whiting', 'EPK Kaolin', 'Silica', 'Red iron oxide']);
    expect([...root.querySelectorAll('.import-pasted code')].map((c) => c.textContent)).toEqual([
      'Custer Feldspar 40',
      'Whiting 20',
      'EPK 10',
      'Silica 30',
      'Red iron oxide 1,5'
    ]);
    // A close name says it is a guess; another name says what it is for.
    expect(text(fixture, '#import-how-0-0')).toBe('Best guess: Custer Spar. Check that it is the one meant.');
    expect(text(fixture, '#import-how-0-2')).toBe('Another name for EPK Kaolin.');
    expect(text(fixture, '.import-totals')).toBe('Base materials add up to 100 · 1 addition');
    expect(text(fixture, '.import-recipe')).toContain("Kept as the recipe's notes: Cone 10");
    expect(text(fixture, '.import-recipe')).toContain('Not read as materials: Total 100');
    expect(text(fixture, '[role="status"].visually-hidden')).toBe('Read 1 recipe, 5 lines in all.');
    expect(skippedHeadings(fixture)).toEqual([]);
  });

  it('saves nothing until Save, then saves the recipe with copies of the materials and the analysis', async () => {
    const { fixture, paste, save } = await create();
    await paste('Celadon\nCuster 40\nWhiting 20\nEPK 10\nSilica 30\n+ Red iron oxide 2');
    httpMock().expectNone(API + '/recipe/create');
    await save();
    const req = httpMock().expectOne({ method: 'POST', url: API + '/recipe/create' });
    const sent = req.request.body as Recipe;
    expect(sent.title).toBe('Celadon');
    expect(sent.materials.map((m) => [m.name, m.amount, m._id])).toEqual([
      ['Custer Spar', '40', 'Custer Spar'],
      ['Whiting', '20', 'Whiting'],
      ['EPK Kaolin', '10', 'EPK Kaolin'],
      ['Silica', '30', 'Silica']
    ]);
    expect(sent.materials[0].fields).toEqual(CUSTER.fields);
    expect(sent.additives?.map((a) => [a.name, a.amount, a.unit])).toEqual([['Red iron oxide', '2', 'percent']]);
    expect((sent.computed as { uList: Record<string, number> }).uList['K2O']).toBeGreaterThan(0);
    expect(sent.includeAdditives).toBe(false);
    expect(sent.notes).toBe('');
    req.flush({ ...sent, _id: 'new' });
    await settle(fixture);
    expect(text(fixture, '.server-msg')).toContain('Saved 1 recipe.');
    expect(text(fixture, '#import-recipe-0')).toBe('Celadon Saved');
    expect(fixture.nativeElement.querySelector('.import-save')).toBeNull();
    expect(text(fixture, 'a[fragment="saved-recipes"]')).toBe('Open your recipes');
  });

  it('reads the firing from the notes into the recipe’s firing, keeping the text as pasted in the notes', async () => {
    const { fixture, paste, save } = await create();
    await paste('Tenmoku\ncone 5-6\nox/red\nCuster 40\nWhiting 20\nEPK 10\nSilica 30');
    expect(text(fixture, '.import-firing')).toBe(
      'Firing read from the notes: Range cone 5–6; no cone ticked as tested · oxidation, reduction'
    );
    await save();
    const sent = httpMock().expectOne(API + '/recipe/create').request.body as Recipe;
    expect(sent.firedAt).toEqual({ scale: 'orton', low: '5', high: '6', atmospheres: ['oxidation', 'reduction'] });
    expect(sent.notes).toBe('cone 5-6\nox/red');
  });

  it('reads a firing from a title only when it names a cone or a temperature, never from a one-word name', async () => {
    const { fixture, page, paste } = await create();
    await paste('Red\nCuster 40\nWhiting 20\n\nSalt\nCuster 50\nSilica 50\n\nCone 6 Wood\nCuster 60\nSilica 40');
    const drafts = page['drafts']() as Array<{ title: string; firedAt: unknown }>;
    expect(drafts.map((d) => [d.title, d.firedAt ?? null])).toEqual([
      ['Red', null],
      ['Salt', null],
      ['Cone 6 Wood', { scale: 'orton', low: '6', tested: ['6'], processes: ['wood'] }]
    ]);
    expect(text(fixture, '.import-firing')).toContain('cone 6');
  });

  it('asks for a choice where several materials are close, and saves once one is chosen or the line is left out', async () => {
    const { fixture, root, paste, save, selects } = await create();
    await paste('Test\nFeldspar 50\nSilica 50\nZircopax 5');
    expect(selects()[0].value).toBe('');
    expect(selects()[0].getAttribute('aria-invalid')).toBe('true');
    expect(text(fixture, '#import-how-0-0')).toBe('Several materials are close. Choose one, or leave the line out.');
    expect(text(fixture, '#import-how-0-2')).toBe(
      'Not found in the library. Choose a material, or leave the line out.'
    );
    const closest = [...selects()[0].querySelectorAll('optgroup')][0];
    expect(closest.label).toBe('Closest');
    expect([...closest.querySelectorAll('option')].map((o) => o.textContent?.trim()).sort()).toEqual([
      'Custer Spar',
      'Potash Feldspar',
      'Soda Feldspar'
    ]);

    await save();
    httpMock().expectNone(API + '/recipe/create');
    expect(text(fixture, '.import-save-problem')).toBe(
      'Nothing was saved. Put right what is listed under each recipe first.'
    );
    expect(text(fixture, '.import-problems')).toBe('Choose a material for 2 lines, or leave them out.');

    const choose = async (select: HTMLSelectElement, label: string) => {
      select.value = [...select.options].find((o) => o.textContent?.trim() === label)!.value;
      select.dispatchEvent(new Event('change'));
      await settle(fixture);
    };
    await choose(selects()[0], 'Soda Feldspar');
    await choose(selects()[2], 'Leave this line out');
    expect(root.querySelectorAll('.import-line.is-out').length).toBe(1);
    expect(root.querySelector('.import-problems')).toBeNull();
    await save();
    const sent = httpMock().expectOne(API + '/recipe/create').request.body as Recipe;
    expect(sent.materials.map((m) => m.name)).toEqual(['Soda Feldspar', 'Silica']);
    expect(sent.additives).toEqual([]);
  });

  it('takes a potter’s own material of the same name before the standard one', async () => {
    const { page, paste } = await create([MY_SILICA]);
    await paste('Silica 100');
    const line = page['drafts']()[0].lines[0];
    expect(page['byKey']().get(line.choice).record).toBe(MY_SILICA);
  });

  it('reads several recipes in one paste and saves those chosen, one at a time', async () => {
    const { fixture, root, paste, save } = await create();
    await paste('Glaze A\nCuster 50\nSilica 50\n\nGlaze B\nWhiting 30\nSilica 70');
    expect(root.querySelectorAll('.import-recipe').length).toBe(2);
    const include = root.querySelector('#import-include-1') as HTMLInputElement;
    include.click();
    await settle(fixture);
    expect(text(fixture, '.import-save button')).toBe('Save 1 recipe');
    include.click();
    await settle(fixture);
    expect(text(fixture, '.import-save button')).toBe('Save 2 recipes');
    await save();
    const first = httpMock().expectOne(API + '/recipe/create');
    expect(first.request.body.title).toBe('Glaze A');
    first.flush({ _id: 'a' });
    await settle(fixture);
    const second = httpMock().expectOne(API + '/recipe/create');
    expect(second.request.body.title).toBe('Glaze B');
    second.flush({ _id: 'b' });
    await settle(fixture);
    expect(text(fixture, '.server-msg')).toContain('Saved 2 recipes.');
  });

  it('stops at a trial’s limit and says how many were saved', async () => {
    const { fixture, paste, save } = await create();
    await paste('Glaze A\nCuster 50\nSilica 50\n---\nGlaze B\nWhiting 30\nSilica 70');
    await save();
    httpMock()
      .expectOne(API + '/recipe/create')
      .flush({ _id: 'a' });
    await settle(fixture);
    httpMock()
      .expectOne(API + '/recipe/create')
      .flush({ msg: 'A trial keeps up to 25 recipes.' }, { status: 403, statusText: 'Forbidden' });
    await settle(fixture);
    expect(text(fixture, '.import-save-problem')).toContain('Saved 1 of 2. The rest were not saved:');
    expect(text(fixture, '#import-recipe-0')).toContain('Saved');
    expect(text(fixture, '#import-recipe-1')).not.toContain('Saved');
  });

  it('asks for a name, and refuses a recipe whose unity formula cannot be worked out', async () => {
    const { fixture, root, paste, save } = await create();
    await paste('Silica 100');
    await save();
    expect(text(fixture, '.import-problems')).toBe('Give the recipe a name.');
    const title = root.querySelector('#import-title-0') as HTMLInputElement;
    title.value = 'Just silica';
    title.dispatchEvent(new Event('input'));
    await settle(fixture);
    await save();
    httpMock().expectNone(API + '/recipe/create');
    expect(text(fixture, '.import-problems')).toContain("Its unity formula can't be worked out");
  });

  it('lets an amount be corrected, and marks a line with none', async () => {
    const { fixture, root, page, paste, save } = await create();
    await paste('Test\nWhiting 20\nCuster 40\nSilica');
    // "Silica" alone is a name, read with no amount.
    const amount = root.querySelector('#import-amount-0-2') as HTMLInputElement;
    expect(amount.value).toBe('');
    await save();
    expect(text(fixture, '.import-problems')).toBe('Line 4 has no amount.');
    amount.value = '40';
    amount.dispatchEvent(new Event('input'));
    await settle(fixture);
    expect(page['drafts']()[0].lines[2].amount).toBe('40');
    expect(root.querySelector('.import-problems')).toBeNull();
    await save();
    httpMock().expectOne(API + '/recipe/create');
  });

  it('asks how to read a number that can be read two ways, and reads the paste again as chosen', async () => {
    const { fixture, root, page, paste } = await create();
    await paste('Test\nCuster 50\nWhiting 22,5\nSilica 1,500');
    const amounts = () => page['drafts']()[0].lines.map((l: { amount: string }) => l.amount);
    // Read as the reader's locale does, but asked.
    expect(amounts()).toEqual(['50', '22.5', '1500']);
    expect(text(fixture, '.import-ambiguous-text')).toContain('can be read two ways, such as “1,500”: 1.5 or 1,500');
    const buttons = [...root.querySelectorAll<HTMLButtonElement>('.import-ambiguous button')];
    expect(buttons.map((b) => b.textContent?.trim())).toEqual(['Read 1,500 as 1.5', 'Read 1,500 as 1,500']);
    expect(buttons.map((b) => b.getAttribute('aria-pressed'))).toEqual(['false', 'true']);
    buttons[0].click();
    await settle(fixture);
    expect(amounts()).toEqual(['50', '22.5', '1.5']);
    expect(
      [...root.querySelectorAll<HTMLButtonElement>('.import-ambiguous button')].map((b) =>
        b.getAttribute('aria-pressed')
      )
    ).toEqual(['true', 'false']);
    // A paste with nothing to ask shows no choice.
    await paste('Test\nCuster 50\nWhiting 22,5');
    expect(root.querySelector('.import-ambiguous')).toBeNull();
  });

  it('limits the box, and says so when the paste is too long instead of reading part of it', async () => {
    const { fixture, root, paste } = await create();
    expect((root.querySelector('#paste-text') as HTMLTextAreaElement).getAttribute('maxlength')).toBe('50000');
    await paste('Custer 50\n'.repeat(2001));
    expect(text(fixture, '.import-too-long')).toBe(
      'That is more than 2,000 lines. Nothing was read. Paste fewer recipes at a time.'
    );
    expect(root.querySelector('.import-recipe')).toBeNull();
    await paste('x'.repeat(50000));
    expect(text(fixture, '.import-too-long')).toContain('50,000 characters or more');
    await paste('Custer 50\nSilica 50');
    expect(root.querySelector('.import-too-long')).toBeNull();
    expect(root.querySelectorAll('.import-recipe').length).toBe(1);
  });

  it('says when nothing could be read', async () => {
    const { fixture, paste } = await create();
    await paste('Hello there');
    expect(text(fixture, '[role="status"].visually-hidden')).toBe(
      'No materials were found in the text. Put each material on a line of its own, with its amount.'
    );
    expect(fixture.nativeElement.querySelector('.import-recipe')).toBeNull();
  });
});
