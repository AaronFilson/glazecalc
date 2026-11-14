import { TestBed } from '@angular/core/testing';
import { OfflineRecords } from '../../core/offline-records';
import { API, httpMock, settle, testProviders, text } from '../../testing/test-providers';
import { TrashEntry, TrashPage } from './trash-page';

const ENTRIES: TrashEntry[] = [
  {
    _id: 't2',
    fromCollection: 'notes',
    recordId: 'n1',
    title: 'Cone 6 notes',
    trashedAt: '2026-10-10T12:00:00.000Z',
    expiresAt: '2026-11-09T12:00:00.000Z',
    by: 'pat'
  },
  {
    _id: 't1',
    fromCollection: 'recipes',
    recordId: 'r1',
    title: 'Celadon',
    trashedAt: '2026-10-01T12:00:00.000Z',
    expiresAt: '2026-10-31T12:00:00.000Z',
    by: 'session'
  }
];

describe('TrashPage', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: testProviders() }));
  afterEach(() => httpMock().verify());

  const create = async (entries: TrashEntry[] = ENTRIES) => {
    const fixture = TestBed.createComponent(TrashPage);
    await fixture.whenStable();
    httpMock()
      .expectOne(API + '/trash/getAll')
      .flush(entries);
    await settle(fixture);
    const root: HTMLElement = fixture.nativeElement;
    const button = (label: string) =>
      [...root.querySelectorAll('button')].find(
        (b) => (b.getAttribute('aria-label') ?? b.textContent?.trim()) === label
      ) as HTMLButtonElement;
    const press = async (label: string) => {
      button(label).click();
      await settle(fixture);
    };
    return { fixture, root, button, press };
  };

  it('lists what is in the Trash: its name, kind, when it was removed and when it goes', async () => {
    const { fixture, root } = await create();
    const items = [...root.querySelectorAll('.trash-list > li')];
    expect(items.map((li) => li.querySelector('h3')?.textContent?.trim())).toEqual(['Cone 6 notes', 'Celadon']);
    expect(text(fixture, '.trash-list > li:first-child')).toContain('Note');
    expect(text(fixture, '.trash-list > li:first-child')).toContain('Removed by a connected app');
    expect(text(fixture, '.trash-list > li:last-child')).toContain('Recipe');
    expect(text(fixture, '.trash-list > li:last-child')).toContain('Deleted for good');
    expect(text(fixture, '.trash-list > li:last-child')).not.toContain('connected app');
  });

  it('names in its lead every kind of record that can be removed to it', async () => {
    const { fixture } = await create([]);
    const lead = text(fixture, 'gc-page-header');
    for (const kind of ['recipes', 'materials', 'additives', 'notes', 'firing logs', 'advice']) {
      expect(lead).toContain(kind);
    }
  });

  it('says when the Trash is empty, and when it could not be loaded', async () => {
    const { fixture } = await create([]);
    expect(text(fixture, '.trash-none')).toBe('The Trash is empty.');

    const failing = TestBed.createComponent(TrashPage);
    await failing.whenStable();
    httpMock()
      .expectOne(API + '/trash/getAll')
      .flush({}, { status: 500, statusText: 'Server Error' });
    await settle(failing);
    expect(text(failing, '.errors-section')).toContain('The Trash could not be loaded.');
  });

  it('puts a record back where it was', async () => {
    const { fixture, root, press } = await create();
    await press('Put back Celadon');
    httpMock()
      .expectOne({ method: 'POST', url: API + '/trash/restore/t1' })
      .flush({ code: 'trash-restored', record: { _id: 'r1', title: 'Celadon' } });
    await settle(fixture);
    expect(root.querySelectorAll('.trash-list > li').length).toBe(1);
    expect(text(fixture, '.server-msg')).toContain('Put "Celadon" back where it was.');
  });

  it('deletes one for good after asking, and empties the Trash after asking', async () => {
    const { fixture, root, press } = await create();
    await press('Remove Celadon');
    expect(text(fixture, '.remove-question')).toBe('Remove "Celadon"? This can\'t be undone.');
    await press('Yes, remove');
    httpMock()
      .expectOne({ method: 'DELETE', url: API + '/trash/delete/t1' })
      .flush({ code: 'record-deleted' });
    await settle(fixture);
    expect(text(fixture, '.server-msg')).toContain('Deleted "Celadon" for good.');

    await press('Empty the Trash');
    expect(text(fixture, '#trash-empty-question')).toBe(
      'Delete the 1 record in the Trash for good? This can’t be undone.'
    );
    expect(document.activeElement?.id).toBe('trash-empty-cancel');
    await press('Yes, empty it');
    httpMock()
      .expectOne({ method: 'DELETE', url: API + '/trash/empty' })
      .flush({ code: 'trash-emptied' });
    await settle(fixture);
    expect(root.querySelector('.trash-list')).toBeNull();
    expect(text(fixture, '.trash-none')).toBe('The Trash is empty.');
  });

  it('puts one back once, however often it is pressed; says when it was back already, or could not be put back', async () => {
    const { fixture, root, button } = await create();
    const putBack = button('Put back Celadon');
    putBack.click();
    putBack.click();
    httpMock()
      .expectOne({ method: 'POST', url: API + '/trash/restore/t1' })
      .flush({ code: 'trash-not-found', msg: 'Not in the Trash.' }, { status: 404, statusText: 'Not Found' });
    await settle(fixture);
    expect(text(fixture, '.server-msg')).toContain('"Celadon" was put back already.');
    expect(root.querySelectorAll('.trash-list > li').length).toBe(1);

    button('Put back Cone 6 notes').click();
    httpMock()
      .expectOne({ method: 'POST', url: API + '/trash/restore/t2' })
      .flush({}, { status: 500, statusText: 'Server Error' });
    await settle(fixture);
    expect(text(fixture, '.errors-section')).toContain('"Cone 6 notes" could not be put back. Please try again.');
    expect(root.querySelectorAll('.trash-list > li').length).toBe(1);
  });

  it('deletes one once; one gone already leaves the list, and a failure is said beside the record', async () => {
    const { fixture, root, button, press } = await create();
    await press('Remove Celadon');
    const yes = button('Yes, remove');
    yes.click();
    yes.click();
    httpMock()
      .expectOne({ method: 'DELETE', url: API + '/trash/delete/t1' })
      .flush({}, { status: 404, statusText: 'Not Found' });
    await settle(fixture);
    expect(root.querySelectorAll('.trash-list > li').length).toBe(1);

    await press('Remove Cone 6 notes');
    await press('Yes, remove');
    httpMock()
      .expectOne({ method: 'DELETE', url: API + '/trash/delete/t2' })
      .flush({}, { status: 500, statusText: 'Server Error' });
    await settle(fixture);
    expect(text(fixture, '.remove-problem')).toBe('It could not be removed. Please try again.');
    expect(root.querySelectorAll('.trash-list > li').length).toBe(1);
  });

  it('empties the Trash only when asked: Cancel keeps everything, and a failure is said', async () => {
    const { fixture, root, press } = await create();
    await press('Empty the Trash');
    await press('Cancel');
    expect(root.querySelector('#trash-empty-question')).toBeNull();
    httpMock().expectNone(API + '/trash/empty');

    await press('Empty the Trash');
    await press('Yes, empty it');
    httpMock()
      .expectOne({ method: 'DELETE', url: API + '/trash/empty' })
      .flush({}, { status: 500, statusText: 'Server Error' });
    await settle(fixture);
    expect(text(fixture, '.errors-section')).toContain('The Trash could not be emptied. Please try again.');
    expect(root.querySelectorAll('.trash-list > li').length).toBe(2);
  });

  it('puts nothing back while the page shows the copy kept on this device, and says why', async () => {
    const { fixture, button } = await create();
    // The network failed and the recipes shown are the copy saved on this device.
    TestBed.inject(OfflineRecords).shown('recipe', new Date('2026-10-20T09:30:00Z'));
    await settle(fixture);
    const putBack = button('Put back Celadon');
    expect(putBack.getAttribute('aria-disabled')).toBe('true');
    expect(putBack.getAttribute('title')).toContain("Glazecalc can't be reached.");
    putBack.click();
    await settle(fixture);
    httpMock().expectNone(API + '/trash/restore/t1');
    expect(text(fixture, '.errors-section')).toContain("Glazecalc can't be reached.");
  });
});
