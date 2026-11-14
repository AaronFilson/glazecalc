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
import { FiringLog } from './firing-log';
import { FiringPage } from './firing-page';
import { OfflineRecords } from '../../core/offline-records';
import { PreferencesService } from '../../core/preferences.service';
import { PAGE_LANGUAGE } from '../../i18n/language';

describe('FiringPage', () => {
  beforeEach(() => {
    // Dates in English and no settings stored, whatever a test in another file left behind
    // (the guides' tests leave °C, which would start a log in Celsius).
    formatLocale.set('en');
    localStorage.clear();
    TestBed.configureTestingModule({ providers: testProviders() });
  });
  afterEach(() => httpMock().verify());

  // A new log starts with columns; most tests here begin from an empty one (starter: false).
  const create = async (stored: Firing[] = [], recipes: Recipe[] = [], starter = false) => {
    const fixture = TestBed.createComponent(FiringPage);
    await fixture.whenStable();
    answer('/recipe/getAll', recipes);
    answer('/firing/getAll', stored);
    await settle(fixture);
    const page = fixture.componentInstance as unknown as Record<string, any>;
    if (!starter) {
      page['log'].set(new FiringLog());
      page['selectedField'].set('Time');
      await fixture.whenStable();
    }
    return { fixture, page };
  };

  it('says what to do while there is nothing yet: no saved firings, no fields, no rows', async () => {
    const { fixture, page } = await create();
    expect(text(fixture, '#stored-heading + p')).toBe('None yet. Saved firings appear here.');
    expect(fixture.nativeElement.querySelector('.firing-table-empty')).toBeNull();
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

  it('starts a new log with Time, Temperature and Cone, which can all be removed', async () => {
    const { fixture, page } = await create([], [], true);
    expect(page['log']().fields).toEqual(['Time', 'Temperature F', 'Cone']);
    expect(fixture.nativeElement.querySelector('.firing-table')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#add-row-why')).toBeNull();
    for (let i = 0; i < 3; i++) page['removeField'](0);
    await fixture.whenStable();
    expect(page['log']().fields).toEqual([]);
    expect(text(fixture, '#add-row-why')).toBe('Add a field first.');
  });

  it('starts with the temperature in the scale chosen, and Celsius for Kelvin readers', async () => {
    const preferences = TestBed.inject(PreferencesService);
    preferences.remember('temperature', 'C');
    const { fixture, page } = await create([], [], true);
    expect(page['log']().fields).toEqual(['Time', 'Temperature C', 'Cone']);
    // Until the log is changed, the columns follow the scale (the preferences may arrive late).
    preferences.remember('temperature', 'F');
    await fixture.whenStable();
    expect(page['log']().fields).toEqual(['Time', 'Temperature F', 'Cone']);
    page['removeField'](2);
    preferences.remember('temperature', 'C');
    await fixture.whenStable();
    expect(page['log']().fields).toEqual(['Time', 'Temperature F']);
    preferences.remember('temperature', 'F');
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

  it('moves a field left or right as the table is drawn, mirrored on a right-to-left page', async () => {
    const buttons = (fixture: { nativeElement: HTMLElement }) =>
      [...fixture.nativeElement.querySelectorAll('.included-buttons button')].map((b) => b.textContent!.trim());
    const ltr = await create([], [], true);
    expect(buttons(ltr.fixture).slice(0, 2)).toEqual(['Move field left', 'Move field right']);
    ltr.fixture.destroy();
    // On a mirrored page the first column is on the right: moving a field earlier moves it right.
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [...testProviders(), { provide: PAGE_LANGUAGE, useValue: 'ar-XD' }] });
    const rtl = await create([], [], true);
    expect(buttons(rtl.fixture).slice(0, 2)).toEqual(['Move field right', 'Move field left']);
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

    // A new log starts over with the starting columns and no rows.
    expect(page['log']().fields).toEqual(['Time', 'Temperature F', 'Cone']);
    expect(page['log']().rows).toEqual([]);
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

  describe('as a potter fills it in', () => {
    const use = (fixture: { nativeElement: HTMLElement; whenStable(): Promise<unknown> }) => {
      const root = fixture.nativeElement;
      const type = async (field: HTMLInputElement | HTMLTextAreaElement, value: string) => {
        field.value = value;
        field.dispatchEvent(new Event('input'));
        await settle(fixture as never);
      };
      const press = async (label: string, nth = 0) => {
        [...root.querySelectorAll('button')].filter((b) => b.textContent?.trim() === label)[nth]!.click();
        await settle(fixture as never);
      };
      const fields = () => [...root.querySelectorAll('.included-name')].map((name) => name.textContent?.trim());
      const cells = () => [...root.querySelectorAll<HTMLInputElement>('.firing-table input')];
      return { root, type, press, fields, cells };
    };

    it('builds a log field by field and row by row, and keeps it when it could not be saved', async () => {
      const { fixture } = await create([], [], true);
      const { root, type, press, fields, cells } = use(fixture);
      await type(root.querySelector('#firing-title') as HTMLInputElement, 'Glaze 14');
      await type(root.querySelector('#firing-kiln') as HTMLInputElement, 'Skutt');
      await type(root.querySelector('#firing-date') as HTMLInputElement, '2026-10-04');
      await type(root.querySelector('#firing-notes') as HTMLTextAreaElement, 'Cone 6 down at 11:40.');
      const pick = root.querySelector('#fieldselect') as HTMLSelectElement;
      pick.value = 'Atmosphere';
      pick.dispatchEvent(new Event('change'));
      await settle(fixture);
      await press('Add the field');
      expect(fields()).toEqual(['Time', 'Temperature F', 'Cone', 'Atmosphere']);
      // Time moves right of the temperature, the atmosphere left of the cone, and the cone goes.
      await press('Move field right', 0);
      await press('Move field left', 3);
      await press('Remove the field', 3);
      expect(fields()).toEqual(['Temperature F', 'Time', 'Atmosphere']);

      await press('Add a row to the firing table');
      await press('Add a row to the firing table');
      await type(cells()[0]!, '1000');
      await type(cells()[3]!, '1830');
      await press('Remove row', 0);
      expect(cells().map((cell) => cell.value)).toEqual(['1830', '', '']);

      await press('Save');
      const req = httpMock().expectOne(API + '/firing/create');
      expect(req.request.body).toEqual({
        title: 'Glaze 14',
        kiln: 'Skutt',
        date: '2026-10-04',
        notes: 'Cone 6 down at 11:40.',
        fieldsIncluded: ['Temperature F', 'Time', 'Atmosphere'],
        rows: [['1830', '', '']]
      });
      req.flush(null, { status: 500, statusText: 'Server Error' });
      await settle(fixture);
      expect(text(fixture, '.errors-section')).toContain('Error: the request to the server failed.');
      expect(fields()).toEqual(['Temperature F', 'Time', 'Atmosphere']);
      expect((root.querySelector('#firing-title') as HTMLInputElement).value).toBe('Glaze 14');
    });

    it('asks for a field to be chosen once every field is in the log', async () => {
      const { fixture } = await create();
      const { root, press, fields } = use(fixture);
      const offered = root.querySelector('#fieldselect') as HTMLSelectElement;
      const add = [...root.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Add the field')!;
      while (offered.options.length) {
        add.click();
        await fixture.whenStable();
      }
      expect(fields().length).toBeGreaterThan(10);
      await press('Add the field');
      expect(fieldProblem(fixture, 'fieldselect')).toBe('Choose a field to add, then Add the field.');
    });

    it('moves a stored log to the Trash once its Remove is confirmed', async () => {
      const stored: Firing = { _id: 'f1', title: 'Old', fieldsIncluded: ['Time'], rows: [['1:00']] };
      const { fixture } = await create([stored]);
      const { root, press } = use(fixture);
      (root.querySelector('button[aria-label="Remove Old"]') as HTMLButtonElement).click();
      await settle(fixture);
      await press('Yes, remove');
      httpMock()
        .expectOne({ method: 'DELETE', url: API + '/firing/delete/f1' })
        .flush({});
      await settle(fixture);
      expect(root.querySelector('.stored-firing')).toBeNull();
      expect(text(fixture, '.server-msg')).toContain('Moved "Old" to the Trash.');
    });
  });

  it('says when the logs, or the recipes to link them to, could not be fetched', async () => {
    const fixture = TestBed.createComponent(FiringPage);
    await fixture.whenStable();
    httpMock()
      .expectOne(API + '/recipe/getAll')
      .flush(null, { status: 500, statusText: 'Server Error' });
    answer('/firing/getAll', [{ _id: 'f1', title: 'Glaze 14', fieldsIncluded: ['Cone'], rows: [['6']] }]);
    await settle(fixture);
    expect(text(fixture, '.fired-recipes')).toContain('Your recipes could not be fetched, so none can be linked now.');

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: testProviders() });
    const again = TestBed.createComponent(FiringPage);
    await again.whenStable();
    answer('/recipe/getAll', []);
    httpMock()
      .expectOne(API + '/firing/getAll')
      .flush(null, { status: 500, statusText: 'Server Error' });
    await settle(again);
    expect(text(again, '.errors-section')).toContain('There was an error in getting the firing records information.');
  });

  it('says when a recipe could not be linked, and that links wait for the network while the saved copy is shown', async () => {
    const stored: Firing = { _id: 'f1', title: 'Glaze 14', fieldsIncluded: ['Cone'], rows: [['6']] };
    const { fixture } = await create([stored], [{ _id: 'r1', title: 'Clear', materials: [] }]);
    const link = fixture.nativeElement.querySelector('#fired-add-f1') as HTMLButtonElement;
    link.click();
    httpMock()
      .expectOne({ method: 'POST', url: API + '/recipe/firings/r1' })
      .flush(null, { status: 500, statusText: 'Server Error' });
    await settle(fixture);
    expect(text(fixture, '.errors-section')).toContain('The link could not be saved.');

    const records = TestBed.inject(OfflineRecords);
    records.showingCopy.set(new Date(2026, 9, 12, 14, 30));
    await fixture.whenStable();
    link.click();
    await settle(fixture);
    httpMock().expectNone(API + '/recipe/firings/r1');
    expect(text(fixture, '.errors-section')).toContain(records.note()!);
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
