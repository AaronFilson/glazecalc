import { TestBed } from '@angular/core/testing';
import { API, answer, fieldProblem, httpMock, settle, testProviders, text } from '../../testing/test-providers';
import { NotesPage } from './notes-page';

// The notes page as a potter uses it: a note typed and saved, one removed, and what it says when the server
// cannot be reached. (simple-pages.spec.ts has the record a note is saved as.)

describe('NotesPage', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: testProviders() }));
  afterEach(() => httpMock().verify());

  const create = async (notes: object[] = []) => {
    const fixture = TestBed.createComponent(NotesPage);
    await fixture.whenStable();
    answer('/notes/getAll', notes);
    await settle(fixture);
    const root = fixture.nativeElement as HTMLElement;
    const type = async (id: string, value: string) => {
      const field = root.querySelector('#' + id) as HTMLInputElement | HTMLTextAreaElement;
      field.value = value;
      field.dispatchEvent(new Event('input'));
      await settle(fixture);
    };
    const save = async () => {
      (root.querySelector('form button[type="submit"]') as HTMLButtonElement).click();
      await settle(fixture);
    };
    const titles = () => [...root.querySelectorAll('.my-notes h3 bdi')].map((bdi) => bdi.textContent);
    return { fixture, root, type, save, titles };
  };

  it('saves a note typed in, lists it, and clears the form for the next', async () => {
    const { fixture, root, type, save, titles } = await create();
    await type('title', 'Kiln');
    await type('content', 'Element 3 is weak.');
    await save();
    const req = httpMock().expectOne(API + '/notes/create');
    expect(req.request.body).toEqual(expect.objectContaining({ title: 'Kiln', content: 'Element 3 is weak.' }));
    req.flush({ ...req.request.body, _id: 'n1' });
    await settle(fixture);
    expect(titles()).toEqual(['Kiln']);
    expect(text(fixture, '.server-msg')).toContain('Success in adding the note to the server.');
    expect((root.querySelector('#title') as HTMLInputElement).value).toBe('');
    expect((root.querySelector('#content') as HTMLTextAreaElement).value).toBe('');
  });

  it('asks for a title and the note itself before sending anything, and says when it could not be saved', async () => {
    const { fixture, root, type, save } = await create();
    await save();
    httpMock().expectNone(API + '/notes/create');
    expect(fieldProblem(fixture, 'title')).toBe('Give the note a title.');
    expect(fieldProblem(fixture, 'content')).toBe('Write the note.');

    await type('title', 'Kiln');
    await type('content', 'Element 3 is weak.');
    await save();
    httpMock()
      .expectOne(API + '/notes/create')
      .flush(null, { status: 500, statusText: 'Server Error' });
    await settle(fixture);
    expect(text(fixture, '.errors-section')).toContain('Error: the request to the server failed.');
    expect((root.querySelector('#title') as HTMLInputElement).value).toBe('Kiln');
  });

  it('moves a note to the Trash once its Remove is confirmed, naming one with no title as untitled', async () => {
    const { fixture, root, titles } = await create([
      { _id: 'n1', title: '', content: 'Wax the foot.', relatedCollection: 'Notes', relatedId: 'general notes' }
    ]);
    (root.querySelector('button[aria-label="Remove Untitled note"]') as HTMLButtonElement).click();
    await settle(fixture);
    const yes = [...root.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Yes, remove')!;
    yes.click();
    httpMock()
      .expectOne({ method: 'DELETE', url: API + '/notes/delete/n1' })
      .flush({});
    await settle(fixture);
    expect(titles()).toEqual([]);
    expect(text(fixture, '.server-msg')).toContain('Moved "Untitled note" to the Trash.');
  });

  it('says when the notes could not be fetched', async () => {
    const fixture = TestBed.createComponent(NotesPage);
    await fixture.whenStable();
    httpMock()
      .expectOne(API + '/notes/getAll')
      .flush(null, { status: 500, statusText: 'Server Error' });
    await settle(fixture);
    expect(text(fixture, '.errors-section')).toContain('There was an error getting the notes information.');
  });
});
