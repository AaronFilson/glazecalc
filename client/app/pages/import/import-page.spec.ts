import { TestBed } from '@angular/core/testing';
import { Additive, Material, Recipe } from '../../core/models';
import { API, answer, httpMock, settle, skippedHeadings, testProviders, text } from '../../testing/test-providers';
import { formatLocale } from '../../shared/format';
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
    // Neither is drawn as a problem: a good guess is not an error.
    expect(root.querySelector('#import-how-0-0')?.classList.contains('is-question')).toBe(false);
    expect(root.querySelector('#import-how-0-2')?.classList.contains('is-question')).toBe(false);
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
      ['Cone 6 Wood', { scale: 'orton', low: '6', processes: ['wood'] }]
    ]);
    expect(text(fixture, '.import-firing')).toContain('cone 6');
  });

  it('reads a title that names a cone at its end as the title and its firing, not as a material', async () => {
    const { page, paste } = await create();
    // "Celadon, cone 10" over comma rows was a line of its own, "Celadon, cone" at 10.
    await paste('Celadon, cone 10\nCuster,40\nWhiting,20\nEPK,10\nSilica,30');
    const [draft] = page['drafts']() as Array<{ title: string; firedAt: unknown; lines: Array<{ name: string }> }>;
    expect(draft.title).toBe('Celadon, cone 10');
    expect(draft.firedAt).toEqual({ scale: 'orton', low: '10' });
    expect(draft.lines.map((l) => l.name)).toEqual(['Custer', 'Whiting', 'EPK', 'Silica']);
  });

  it('asks for a choice where several materials are close, and saves once one is chosen or the line is left out', async () => {
    const { fixture, root, paste, save, selects } = await create();
    await paste('Test\nFeldspar 50\nSilica 50\nZircopax 5');
    expect(selects()[0].value).toBe('');
    expect(selects()[0].getAttribute('aria-invalid')).toBe('true');
    expect(text(fixture, '#import-how-0-0')).toBe('Several materials are close. Choose one, or leave the line out.');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('#import-how-0-0')?.classList.contains('is-question')
    ).toBe(true);
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

  it('asks how to read each line whose thousands may be set apart by a space, and reads that line as chosen', async () => {
    const MINSPAR = material(
      'Minspar 200',
      [
        ['Na2O', 1],
        ['Al2O3', 1],
        ['SiO2', 6]
      ],
      0
    );
    const { fixture, root, page, paste } = await create([MINSPAR]);
    const amounts = () => page['drafts']()[0].lines.map((l: { amount: string }) => l.amount);
    const rows = () => [...root.querySelectorAll<HTMLElement>('.import-spaced-line')];
    const buttons = (row: number) => [...rows()[row]!.querySelectorAll<HTMLButtonElement>('button')];
    const pressed = (row: number) => buttons(row).map((b) => b.getAttribute('aria-pressed'));
    await paste('Test\nMinspar 200 300\nCuster 500\nSilica 1\u202f500\nWhiting 2\u202f500');
    // English writes 1,500: read as before, the 1 ending the name, and asked of each line. Minspar 200 is a name:
    // 300 of it, with nothing to ask.
    expect(amounts()).toEqual(['300', '500', '500', '500']);
    expect(text(fixture, '.import-spaced .import-ambiguous-text')).toContain(
      'can be read two ways, such as “1 500”: as 1,500, with a space setting the thousands apart, or as 1 and 500, apart.'
    );
    expect(rows().map((row) => row.querySelector('code')?.textContent)).toEqual([
      'Silica 1\u202f500',
      'Whiting 2\u202f500'
    ]);
    expect(rows()[0]!.getAttribute('aria-labelledby')).toBe('import-spaced-4');
    expect(text(fixture, '#import-spaced-4')).toBe('Line 4 as pasted:Silica 1 500');
    expect(buttons(0).map((b) => b.textContent?.trim())).toEqual(['Read 1 500 as 1,500', 'Read 1 and 500 apart']);
    expect([pressed(0), pressed(1)]).toEqual([
      ['false', 'true'],
      ['false', 'true']
    ]);
    // One number for one line sets no other line's number.
    buttons(0)[0]!.click();
    await settle(fixture);
    expect(amounts()).toEqual(['300', '500', '1500', '500']);
    expect([pressed(0), pressed(1)]).toEqual([
      ['true', 'false'],
      ['false', 'true']
    ]);
    buttons(1)[0]!.click();
    await settle(fixture);
    expect(amounts()).toEqual(['300', '500', '1500', '2500']);
    // A paste typed again is read as the language reads it until the reader chooses.
    await paste('Test\nCuster 500\nSilica 1\u202f500');
    expect(amounts()).toEqual(['500', '500']);
    // French writes 1 500: one number. Silica is a name and "Silica 1" is not, so nothing is asked.
    formatLocale.set('fr');
    try {
      await paste('Test\nCuster 500\nSilica 1\u202f500');
      expect(amounts()).toEqual(['500', '1500']);
      expect(root.querySelector('.import-spaced')).toBeNull();
      // A name the library does not have: "Local clay 1" at 500 is a reading too, so asked, one number until chosen.
      await paste('Test\nCuster 500\nLocal clay 1\u202f500');
      expect(amounts()).toEqual(['500', '1500']);
      expect(pressed(0)).toEqual(['true', 'false']);
      buttons(0)[1]!.click();
      await settle(fixture);
      expect(amounts()).toEqual(['500', '500']);
      expect(pressed(0)).toEqual(['false', 'true']);
      // Nothing to ask where no line can be read two ways.
      await paste('Test\nMinspar 200 300\nCuster 500');
      expect(amounts()).toEqual(['300', '500']);
      expect(root.querySelector('.import-spaced')).toBeNull();
    } finally {
      formatLocale.set('en');
    }
  });

  it('asks whether a comma row\u2019s last two cells are one number or two columns, where commas mark decimals', async () => {
    const { fixture, root, page, paste, chosenNames } = await create();
    const amounts = () => page['drafts']()[0].lines.map((l: { amount: string }) => l.amount);
    const buttons = () => [...root.querySelectorAll<HTMLButtonElement>('.import-joined button')];
    // German writes 30,5 for 30.5, so with no heading row "Silica,30,5" is 30.5 or 30 and 5: one number, and asked.
    formatLocale.set('de');
    try {
      await paste('Test\nCuster,50\nSilica,30,5\nWhiting,20,5');
      expect(amounts()).toEqual(['50', '30.5', '20.5']);
      expect(text(fixture, '.import-joined p')).toContain(
        'Some numbers in this paste can be read two ways, such as \u201c30,5\u201d: as one number, 30,5, or as two columns, 30 and 5.'
      );
      expect(buttons().map((b) => b.textContent?.trim())).toEqual([
        'Read 30,5 as one number, 30,5',
        'Read 30 and 5 as two columns'
      ]);
      expect(buttons().map((b) => b.getAttribute('aria-pressed'))).toEqual(['true', 'false']);
      buttons()[1].click();
      await settle(fixture);
      expect(amounts()).toEqual(['50', '30', '20']);
      expect(chosenNames()).toEqual(['Custer Spar', 'Silica', 'Whiting']);
      expect(buttons().map((b) => b.getAttribute('aria-pressed'))).toEqual(['false', 'true']);
      buttons()[0].click();
      await settle(fixture);
      expect(amounts()).toEqual(['50', '30.5', '20.5']);
      // A paste typed again is read as one number until the reader chooses.
      buttons()[1].click();
      await settle(fixture);
      await paste('Test\nCuster,50\nSilica,30,5');
      expect(amounts()).toEqual(['50', '30.5']);
      // Under a heading row that names the columns, each cell is its column: nothing to ask.
      await paste('Material,Amount,Notes\nCuster,50,1\nSilica,30,5');
      expect(amounts()).toEqual(['50', '30']);
      expect(root.querySelector('.import-joined')).toBeNull();
    } finally {
      formatLocale.set('en');
    }
    // English writes decimal points: two columns, with nothing to ask.
    await paste('Test\nCuster,50\nSilica,30,5');
    expect(amounts()).toEqual(['50', '30']);
    expect(root.querySelector('.import-joined')).toBeNull();
  });

  it('asks whether a comma row’s cells are one number with its thousands set apart, or two columns', async () => {
    const { fixture, root, page, paste } = await create();
    const amounts = () => page['drafts']()[0].lines.map((l: { amount: string }) => l.amount);
    const buttons = () => [...root.querySelectorAll<HTMLButtonElement>('.import-joined button')];
    // English writes 2,140.7: one number until the reader chooses two columns. The first cell alone was read, unasked.
    await paste('Test\nCuster,1,500\nSilica,2,140.7\nWhiting,360');
    expect(amounts()).toEqual(['1500', '2140.7', '360']);
    expect(text(fixture, '.import-joined p')).toContain(
      'Some numbers in this paste can be read two ways, such as “1,500”: as one number, 1,500, or as two columns, 1 and 500.'
    );
    expect(buttons().map((b) => b.textContent?.trim())).toEqual([
      'Read 1,500 as one number, 1,500',
      'Read 1 and 500 as two columns'
    ]);
    buttons()[1].click();
    await settle(fixture);
    expect(amounts()).toEqual(['1', '2', '360']);
    // German writes 1.161,5: one number, 1161.5.
    formatLocale.set('de');
    try {
      await paste('Test\nCuster,1.161,5\nWhiting,360');
      expect(amounts()).toEqual(['1161.5', '360']);
      expect(text(fixture, '.import-joined p')).toContain('such as “1.161,5”: as one number, 1.161,5,');
    } finally {
      formatLocale.set('en');
    }
  });

  it('asks whether a known name that ends in a number takes the number after its comma, where commas mark decimals', async () => {
    const KAOLIN_233 = material(
      'Kaolin 233',
      [
        ['Al2O3', 1],
        ['SiO2', 2]
      ],
      13.96
    );
    const { fixture, root, page, paste } = await create([KAOLIN_233]);
    const lines = () => page['drafts']()[0].lines.map((l: { name: string; amount: string }) => [l.name, l.amount]);
    const buttons = () => [...root.querySelectorAll<HTMLButtonElement>('.import-joined button')];
    // German "Kaolin 233,5": Kaolin at 233.5, or Kaolin 233 at 5. One number until the reader chooses.
    formatLocale.set('de');
    try {
      await paste('Test\nKaolin 233,5\nSilica 30');
      expect(lines()).toEqual([
        ['Kaolin', '233.5'],
        ['Silica', '30']
      ]);
      expect(text(fixture, '.import-joined p')).toContain('such as “233,5”');
      expect(buttons().map((b) => b.textContent?.trim())).toEqual([
        'Read 233,5 as one number, 233,5',
        'Read 233 and 5 as two columns'
      ]);
      buttons()[1].click();
      await settle(fixture);
      expect(lines()).toEqual([
        ['Kaolin 233', '5'],
        ['Silica', '30']
      ]);
    } finally {
      formatLocale.set('en');
    }
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

  it('reads a name with a number in it, such as Leach 4321, as the title over its materials', async () => {
    const { root, paste, chosenNames } = await create();
    await paste('Leach 4321\nCuster 40\nWhiting 20\nSilica 30\nEPK 10');
    expect((root.querySelector('#import-title-0') as HTMLInputElement).value).toBe('Leach 4321');
    expect(chosenNames()).toEqual(['Custer Spar', 'Whiting', 'Silica', 'EPK Kaolin']);
  });

  it('reads a number as a whole thousand again when asked', async () => {
    const { root, page, paste } = await create();
    await paste('Test\nCuster 50\nWhiting 22,5\nSilica 1,500');
    const press = async (label: string) => {
      [...root.querySelectorAll<HTMLButtonElement>('.import-ambiguous button')]
        .find((b) => b.textContent?.trim() === label)!
        .click();
      await settle();
    };
    await press('Read 1,500 as 1.5');
    await press('Read 1,500 as 1,500');
    expect(page['drafts']()[0].lines.map((l: { amount: string }) => l.amount)).toEqual(['50', '22.5', '1500']);
  });

  it('counts a line as an addition once its box is ticked', async () => {
    const { fixture, root, paste } = await create();
    await paste('Test\nWhiting 20\nSilica 80\nCuster 5');
    expect(text(fixture, '.import-totals')).toBe('Base materials add up to 105');
    (root.querySelector('#import-add-0-2') as HTMLInputElement).click();
    await settle(fixture);
    expect(text(fixture, '.import-totals')).toBe('Base materials add up to 100 · 1 addition');
  });

  it('asks for a base material with an amount, and for a recipe to be chosen, before saving', async () => {
    const { fixture, root, paste, save } = await create();
    await paste('Iron wash\nRed iron oxide 2');
    await save();
    httpMock().expectNone(API + '/recipe/create');
    expect(text(fixture, '.import-problems')).toBe('Keep at least one base material with an amount.');
    (root.querySelector('#import-include-0') as HTMLInputElement).click();
    await settle(fixture);
    await save();
    expect(text(fixture, '.import-save-problem')).toBe('Choose at least one recipe to save.');
  });

  it('shows the first 30 recipes of a longer paste, and says the rest come once these are saved', async () => {
    const { fixture, root, paste } = await create();
    await paste(Array.from({ length: 31 }, (_, i) => `Glaze ${i + 1}\nWhiting 20\nSilica 80`).join('\n\n'));
    expect(root.querySelectorAll('.import-recipe')).toHaveLength(30);
    expect(text(fixture)).toContain('Only the first 30 recipes are shown. Paste the rest once these are saved.');
  });

  it('waits for the lists before reading, and reads against those that came when one could not be fetched', async () => {
    const fixture = TestBed.createComponent(ImportPage);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const box = root.querySelector('#paste-text') as HTMLTextAreaElement;
    box.value = 'Test\nWhiting 20\nSilica 80';
    box.dispatchEvent(new Event('input'));
    await settle(fixture);
    const read = root.querySelector('.import-actions button') as HTMLButtonElement;
    read.click();
    await settle(fixture);
    expect(root.querySelector('.import-recipe')).toBeNull();

    httpMock()
      .expectOne(API + '/materials/getAll')
      .flush(null, { status: 500, statusText: 'Server Error' });
    answer('/materials/getStandard', [WHITING, SILICA]);
    answer('/additives/getAll', []);
    answer('/additives/getStandard', []);
    await settle(fixture);
    expect(text(fixture, '.errors-section')).not.toBe('');
    read.click();
    await settle(fixture);
    expect(root.querySelectorAll('.import-recipe')).toHaveLength(1);
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
