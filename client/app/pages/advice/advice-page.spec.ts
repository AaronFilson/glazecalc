import { TestBed } from '@angular/core/testing';
import { API, answer, httpMock, settle, testProviders, text } from '../../testing/test-providers';
import { AdvicePage } from './advice-page';

// The advice page for someone signed in, as they use it: advice of their own typed and saved, and removed,
// and what it says when the server cannot be reached. (simple-pages.spec.ts has what a visitor sees.)

describe('AdvicePage, signed in', () => {
  beforeEach(() => {
    localStorage.setItem('session', 'account');
    TestBed.configureTestingModule({ providers: testProviders() });
  });
  afterEach(() => {
    httpMock().verify();
    localStorage.clear();
  });

  const create = async (mine: object[] = []) => {
    const fixture = TestBed.createComponent(AdvicePage);
    await fixture.whenStable();
    answer('/advice/getAll', mine);
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
    return { fixture, root, type, save };
  };

  it('saves advice typed in, with its tags, and says why it could not be saved', async () => {
    const { fixture, root, type, save } = await create();
    // Nothing is sent without a title and the advice.
    await save();
    httpMock().expectNone(API + '/advice/create');
    await type('advice-title', 'Wax');
    await type('advice-tags', 'glazing, foot');
    await type('advice-content', 'Wax the foot before dipping.');
    await save();
    httpMock()
      .expectOne(API + '/advice/create')
      .flush(null, { status: 500, statusText: 'Server Error' });
    await settle(fixture);
    expect(text(fixture, '.errors-section')).toContain('There was an error in submitting the advice information.');
    // What was typed stays, to try again.
    expect((root.querySelector('#advice-title') as HTMLInputElement).value).toBe('Wax');

    await save();
    const req = httpMock().expectOne(API + '/advice/create');
    expect(req.request.body).toEqual({ title: 'Wax', content: 'Wax the foot before dipping.', tags: 'glazing, foot' });
    req.flush({ ...req.request.body, _id: 'a1', tags: ['glazing', 'foot'] });
    await settle(fixture);
    expect(text(fixture, '.my-advice')).toContain('Wax the foot before dipping.');
    expect(text(fixture, '.my-advice')).toContain('Tags: glazing, foot');
    expect((root.querySelector('#advice-tags') as HTMLInputElement).value).toBe('');
  });

  it('moves advice of my own to the Trash once its Remove is confirmed', async () => {
    const { fixture, root } = await create([{ _id: 'a1', title: 'Wax', content: 'Wax the foot.', tags: ['none'] }]);
    (root.querySelector('button[aria-label="Remove Wax"]') as HTMLButtonElement).click();
    await settle(fixture);
    [...root.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Yes, remove')!.click();
    httpMock()
      .expectOne({ method: 'DELETE', url: API + '/advice/delete/a1' })
      .flush({});
    await settle(fixture);
    expect(text(fixture, '.my-advice')).toBe('Nothing saved yet.');
  });

  it('says when my advice could not be fetched', async () => {
    const fixture = TestBed.createComponent(AdvicePage);
    await fixture.whenStable();
    httpMock()
      .expectOne(API + '/advice/getAll')
      .flush(null, { status: 500, statusText: 'Server Error' });
    await settle(fixture);
    expect(text(fixture, '.errors-section')).toContain('There was an error in getting the advice information.');
  });
});
