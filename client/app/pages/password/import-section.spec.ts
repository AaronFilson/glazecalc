import { TestBed } from '@angular/core/testing';
import { API, httpMock, settle, testProviders, text } from '../../testing/test-providers';
import { IMPORT_MOST_BYTES, ImportSection, type ImportPreview } from './import-section';

const FILE = { format: 'glazecalc-export', version: 1, records: {} };

const PREVIEW: ImportPreview = {
  version: 1,
  counts: {
    recipes: { inFile: 3, new: 1, identical: 0, similar: 2 },
    materials: { inFile: 1, new: 0, identical: 1, similar: 0 }
  },
  similar: [
    { kind: 'recipes', index: 0, title: 'Satin white', existingId: 'a', existingTitle: 'Satin White' },
    { kind: 'recipes', index: 2, title: 'Celadon', existingId: 'b', existingTitle: 'Celadon' }
  ],
  warnings: { 'firing-link-dropped': 1 },
  preferences: 2,
  prices: 3,
  shelf: 0,
  accountHasPrices: false,
  adding: 3,
  roomLeft: 1000,
  fits: true
};

interface Page {
  chosen(input: { files: unknown[]; value: string }): Promise<void>;
}

describe('ImportSection', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: testProviders() }));
  afterEach(() => httpMock().verify());

  const fileOf = (body: string, size = body.length) => ({ size, text: () => Promise.resolve(body) });

  const create = async () => {
    const fixture = TestBed.createComponent(ImportSection);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const page = fixture.componentInstance as unknown as Page;
    return { fixture, root, page };
  };

  const previewed = async (preview: ImportPreview = PREVIEW) => {
    const made = await create();
    const done = made.page.chosen({ files: [fileOf(JSON.stringify(FILE))], value: 'x' });
    await settle(made.fixture);
    const req = httpMock().expectOne({ method: 'POST', url: API + '/import/preview' });
    expect(req.request.body).toEqual({ file: FILE });
    req.flush(preview);
    await done;
    await settle(made.fixture);
    return made;
  };

  const click = (root: HTMLElement, label: string) =>
    ([...root.querySelectorAll('button')].find((b) => b.textContent?.trim() === label) as HTMLButtonElement).click();

  it('shows what the file holds, with plural counts, warnings and the never-imported line', async () => {
    const { fixture, root } = await previewed();
    expect(text(fixture, 'h2')).toBe('Import my data');
    expect(root.textContent).toContain('Never the account');
    const rows = [...root.querySelectorAll('.import-counts li')].map((li) => li.textContent?.trim());
    expect(rows).toEqual([
      '3 recipes: 1 to add, 0 already here (skipped), 2 with the same name as one of yours',
      '1 material: 0 to add, 1 already here (skipped), 0 with the same name as one of yours'
    ]);
    expect(text(fixture, '.import-warning')).toBe('1 link to a firing log that is not in the file is left out.');
    expect(root.querySelectorAll('.import-similar li').length).toBe(2);
    expect(root.textContent).toContain('Yours: Satin White');
    // Prices are offered on by default to an account without its own; settings stay off.
    expect((root.querySelector('#import-prices') as HTMLInputElement).checked).toBe(true);
    expect((root.querySelector('#import-preferences') as HTMLInputElement).checked).toBe(false);
    expect(root.querySelector('#import-shelf')).toBeNull();
  });

  it('asks for a choice for each same-name record, then sends the choices, with "apply to all"', async () => {
    const { fixture, root } = await previewed();
    click(root, 'Import');
    await settle(fixture);
    expect(text(fixture, '.import-problem')).toContain('Please choose what to do with each record');
    click(root, 'Replace all');
    await settle(fixture);
    const second = root.querySelectorAll('.import-similar li')[1]!;
    (second.querySelector('input[value="skip"]') as HTMLInputElement).click();
    await settle(fixture);
    click(root, 'Import');
    const req = httpMock().expectOne({ method: 'POST', url: API + '/import' });
    expect(req.request.body).toEqual({
      file: FILE,
      choices: { 'recipes:0': 'replace', 'recipes:2': 'skip' },
      include: { preferences: false, prices: true, shelf: false }
    });
    req.flush({
      code: 'import-done',
      importId: 'run1',
      undoUntil: '2026-11-03T10:00:00Z',
      counts: { recipes: { added: 1, replaced: 1, skipped: 1 } },
      warnings: {}
    });
    await settle(fixture);
    expect(text(fixture, '.import-result li')).toBe('3 recipes: 1 added, 1 replaced, 1 skipped');

    click(root, 'Undo this import');
    httpMock()
      .expectOne({ method: 'POST', url: API + '/import/undo/run1' })
      .flush({ code: 'import-undone' });
    await settle(fixture);
    expect(text(fixture, '.import-undone')).toBe('The import was taken back.');
  });

  it('lists the records the server could not read', async () => {
    const { fixture, root, page } = await create();
    const done = page.chosen({ files: [fileOf(JSON.stringify(FILE))], value: 'x' });
    await settle(fixture);
    httpMock()
      .expectOne({ method: 'POST', url: API + '/import/preview' })
      .flush(
        {
          code: 'import-invalid',
          msg: '1 record in this file cannot be read. Nothing was imported.',
          params: { count: 1 },
          problems: [{ kind: 'recipes', index: 4, title: 'Bad', reason: 'missing', field: 'materials' }]
        },
        { status: 422, statusText: 'Unprocessable' }
      );
    await done;
    await settle(fixture);
    expect(text(fixture, '.import-problem')).toContain('1 record in this file cannot be read');
    expect(text(fixture, '.import-problems li')).toBe('Recipe 5 Bad: materials is missing');
    expect(root.querySelector('.import-preview')).toBeNull();
  });

  it('refuses a file too big or not JSON without sending it', async () => {
    const { fixture, page } = await create();
    await page.chosen({ files: [fileOf('{}', IMPORT_MOST_BYTES + 1)], value: 'x' });
    await settle(fixture);
    expect(text(fixture, '.import-problem')).toContain('larger than 20 MB');
    await page.chosen({ files: [fileOf('not json')], value: 'x' });
    await settle(fixture);
    expect(text(fixture, '.import-problem')).toContain('cannot be read');
  });
});
