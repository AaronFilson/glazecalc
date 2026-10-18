import { TestBed } from '@angular/core/testing';
import { Firing, Recipe } from '../../core/models';
import {
  answer,
  API,
  fieldProblem,
  httpMock,
  settle,
  skippedHeadings,
  testProviders,
  text
} from '../../testing/test-providers';
import { formatLocale } from '../../shared/format';
import { FiringPage } from './firing-page';

describe('FiringPage', () => {
  beforeEach(() => {
    // Dates in English, whatever locale a test in another file left behind.
    formatLocale.set('en');
    TestBed.configureTestingModule({ providers: testProviders() });
  });
  afterEach(() => httpMock().verify());

  const create = async (stored: Firing[] = [], recipes: Recipe[] = []) => {
    const fixture = TestBed.createComponent(FiringPage);
    await fixture.whenStable();
    answer('/recipe/getAll', recipes);
    answer('/firing/getAll', stored);
    await settle(fixture);
    return { fixture, page: fixture.componentInstance as unknown as Record<string, any> };
  };

  it('says what to do while there is nothing yet: no saved firings, no fields, no rows', async () => {
    const { fixture, page } = await create();
    expect(text(fixture, '#stored-heading + p')).toBe('None yet. Saved firings appear here.');
    expect(text(fixture, '.firing-table-empty')).toBe('Add a field above, then add rows.');
    expect(fixture.nativeElement.querySelector('.firing-table')).toBeNull();
    // Add a row waits for a field, and says so beside it.
    const addRow = [...fixture.nativeElement.querySelectorAll('button')].find(
      (b: Element) => b.textContent?.trim() === 'Add a row to the firing table'
    ) as HTMLButtonElement;
    expect(addRow.disabled).toBe(true);
    expect(addRow.getAttribute('aria-describedby')).toBe('add-row-why');
    expect(text(fixture, '#add-row-why')).toBe('Add a field first.');
    // Labels above their fields, without colons.
    expect(text(fixture, 'label[for=firing-title]')).toBe('Title');
    expect(fixture.nativeElement.querySelector('#firing-title').classList).toContain('form-control');
    page['addField']();
    await fixture.whenStable();
    expect(addRow.disabled).toBe(false);
    expect(addRow.getAttribute('aria-describedby')).toBeNull();
    expect(fixture.nativeElement.querySelector('#add-row-why')).toBeNull();
    expect(skippedHeadings(fixture)).toEqual([]);
  });

  it('builds a log table from the chosen fields and typed cells', async () => {
    const { fixture, page } = await create();
    page['selectedField'].set('Time');
    page['addField']();
    page['selectedField'].set('Cone');
    page['addField']();
    page['addRow']();
    await fixture.whenStable();

    const inputs = fixture.nativeElement.querySelectorAll('.firing-table input') as NodeListOf<HTMLInputElement>;
    expect(inputs).toHaveLength(2);
    expect(inputs[1].getAttribute('aria-label')).toBe('Cone row 1');
    inputs[0].value = '1:00';
    inputs[0].dispatchEvent(new Event('input'));
    expect(page['log']().rows).toEqual([['1:00', '']]);

    page['moveField'](1, -1);
    await fixture.whenStable();
    expect(text(fixture, '.firing-table tr')).toContain('ConeTime');
    expect(page['log']().rows).toEqual([['', '1:00']]);
  });

  it('offers only the fields not added yet, moving on to the next after each', async () => {
    const { fixture, page } = await create();
    const offered = () =>
      [...(fixture.nativeElement.querySelector('#fieldselect') as HTMLSelectElement).options].map((o) => o.value);
    expect(offered()[0]).toBe('Time');
    expect(page['selectedField']()).toBe('Time');
    page['addField']();
    await fixture.whenStable();
    expect(offered()).not.toContain('Time');
    expect(page['selectedField']()).toBe('Gas');
    // Chosen elsewhere, it is kept while it is still offered.
    page['selectedField'].set('Cone');
    page['addField']();
    page['addField']();
    await fixture.whenStable();
    expect(page['log']().fields).toEqual(['Time', 'Cone', 'Gas']);
    // Removed, a field is offered again.
    page['removeField'](0);
    await fixture.whenStable();
    expect(offered()).toContain('Time');
  });

  it('shows what is in each cell after a column moves or is removed', async () => {
    const { fixture, page } = await create();
    const boxes = () => [...fixture.nativeElement.querySelectorAll('.firing-cell')] as HTMLInputElement[];
    page['selectedField'].set('Time');
    page['addField']();
    page['selectedField'].set('Cone');
    page['addField']();
    page['addRow']();
    await fixture.whenStable();
    boxes()[0].value = '1';
    boxes()[0].dispatchEvent(new Event('input'));
    await fixture.whenStable();

    page['moveField'](0, 1);
    await fixture.whenStable();
    expect(boxes().map((b) => b.value)).toEqual(['', '1']);

    page['removeField'](1);
    await fixture.whenStable();
    expect(boxes().map((b) => b.value)).toEqual(['']);
  });

  it('saves the log and resets the form', async () => {
    const { fixture, page } = await create();
    page['title'].set('Bisque');
    page['kiln'].set('Electric');
    page['selectedField'].set('Time');
    page['addField']();
    page['addRow']();
    page['setCell'](0, 0, '1:00');

    const saving = page['save']();
    const req = httpMock().expectOne(API + '/firing/create');
    expect(req.request.body).toEqual(
      expect.objectContaining({
        title: 'Bisque',
        kiln: 'Electric',
        fieldsIncluded: ['Time'],
        rows: [['1:00']]
      })
    );
    req.flush({ ...req.request.body, _id: 'f1', date: '2026-10-04' });
    await saving;
    await fixture.whenStable();

    expect(page['log']().fields).toEqual([]);
    expect(page['title']()).toBe('');
    expect(text(fixture, '.stored-firing h3')).toBe('Bisque');
    expect(text(fixture, '.stored-firing')).toContain('Fired in Electric on Sunday, October 4, 2026.');
    expect(text(fixture, '.stored-firing')).toContain('Sunday, October 4, 2026');
  });

  it('needs a title and a field before saving, and marks what is missing', async () => {
    const { fixture, page } = await create();
    await page['save']();
    await fixture.whenStable();
    httpMock().expectNone(API + '/firing/create');
    expect(fieldProblem(fixture, 'firing-title')).toBe('Give the firing a title.');
    expect(fieldProblem(fixture, 'fieldselect')).toBe('Add at least one field to record, such as Time.');
    expect(document.activeElement?.id).toBe('firing-title');

    // Adding a field clears its mark.
    page['addField']();
    await fixture.whenStable();
    expect(fieldProblem(fixture, 'fieldselect')).toBe('');
    expect(page['notices'].errors()).toEqual([]);
  });

  it('removes a stored firing and a row', async () => {
    const stored: Firing = { _id: 'f1', title: 'Old', fieldsIncluded: ['Time'], rows: [['1:00']] };
    const { fixture, page } = await create([stored]);
    // The log being made and those stored are each a part of the page under its title.
    expect(skippedHeadings(fixture)).toEqual([]);
    page['selectedField'].set('Time');
    page['addField']();
    page['addRow']();
    page['removeRow'](0);
    page['removeField'](0);
    expect(page['log']().rows).toEqual([]);

    const removing = page['removal'].remove(stored);
    httpMock()
      .expectOne({ method: 'DELETE', url: API + '/firing/delete/f1' })
      .flush({});
    await removing;
    expect(page['myFirings']()).toEqual([]);
    expect(page['notices'].messages()).toEqual(['Moved "Old" to the Trash.']);
  });

  it('picks the recipes fired in a log, keeping the link on the recipe, and takes one off again', async () => {
    const stored: Firing = { _id: 'f1', title: 'Glaze 14', fieldsIncluded: ['Cone'], rows: [['6']] };
    const recipes: Recipe[] = [
      { _id: 'r1', title: 'Clear', materials: [] },
      { _id: 'r2', title: 'Celadon', materials: [], firings: [{ firing: 'f0', result: 'pale' }] }
    ];
    const { fixture } = await create([stored], recipes);
    expect(text(fixture, '#fired-heading-f1')).toBe('Recipes fired in it');
    expect(text(fixture, '.fired-recipes p')).toBe('No recipes linked yet.');
    const pick = fixture.nativeElement.querySelector('#fired-pick-f1') as HTMLSelectElement;
    pick.value = 'r2';
    (fixture.nativeElement.querySelector('#fired-add-f1') as HTMLButtonElement).click();
    // One link is added on the server, never the recipe's whole list, so the recipe page loses nothing.
    const req = httpMock().expectOne({ method: 'POST', url: API + '/recipe/firings/r2' });
    expect(req.request.body).toEqual({ firing: 'f1' });
    req.flush({ firings: [{ firing: 'f0', result: 'pale' }, { firing: 'f9' }, { firing: 'f1' }] });
    await settle(fixture);
    expect(text(fixture, '.fired-list')).toContain('Celadon');
    (fixture.nativeElement.querySelector('.fired-list button') as HTMLButtonElement).click();
    const off = httpMock().expectOne({ method: 'DELETE', url: API + '/recipe/firings/r2/f1' });
    off.flush({ firings: [{ firing: 'f0', result: 'pale' }, { firing: 'f9' }] });
    await settle(fixture);
    expect(fixture.nativeElement.querySelector('.fired-list')).toBeNull();
    expect(skippedHeadings(fixture)).toEqual([]);
  });
});
