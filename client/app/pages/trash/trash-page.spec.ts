import { TestBed } from '@angular/core/testing';
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
});
