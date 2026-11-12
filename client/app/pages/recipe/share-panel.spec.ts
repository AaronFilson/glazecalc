import { TestBed } from '@angular/core/testing';
import { API, httpMock, settle, testProviders, text } from '../../testing/test-providers';
import { SharePanel, shareAddress } from './share-panel';

const URL = API + '/share/recipe/r1';
const SECRET = 'b'.repeat(43);

describe('SharePanel', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: testProviders() }));
  afterEach(() => httpMock().verify());

  const create = async (status: object | null, trial = false) => {
    const fixture = TestBed.createComponent(SharePanel);
    fixture.componentRef.setInput('recipeId', 'r1');
    fixture.componentRef.setInput('trial', trial);
    await fixture.whenStable();
    if (status) httpMock().expectOne(URL).flush(status);
    await settle(fixture);
    const root = fixture.nativeElement as HTMLElement;
    const click = async (label: string) => {
      const button = [...root.querySelectorAll('button')].find((b) => b.textContent?.trim() === label);
      if (!button) throw new Error('no button ' + label);
      button.click();
      await settle(fixture);
    };
    return { fixture, root, click };
  };

  it('puts the secret after #, which no browser sends', () => {
    expect(shareAddress(SECRET, 'https://glazecalcapp.com')).toBe('https://glazecalcapp.com/shared#' + SECRET);
  });

  it('makes a link, with the notes only when ticked, and shows it once', async () => {
    const { fixture, root, click } = await create({ shared: false });
    expect(text(fixture)).toContain('Anyone with the link can see this recipe');
    expect(root.querySelector('#share-address-r1')).toBeNull();
    (root.querySelector('#share-notes-r1') as HTMLInputElement).click();
    await settle(fixture);
    await click('Make a link');
    const made = httpMock().expectOne((req) => req.method === 'POST' && req.url === URL);
    expect(made.request.body).toEqual({ includeNotes: true });
    made.flush({ secret: SECRET, createdAt: '2026-10-16T10:00:00Z', includeNotes: true });
    await settle(fixture);
    expect((root.querySelector('#share-address-r1') as HTMLInputElement).value).toBe(
      location.origin + '/shared#' + SECRET
    );
    expect(text(fixture, '.share-status')).toBe('The link is made.');
    expect(text(fixture)).toContain('Copy it now');
  });

  it('says when a recipe is shared, without the link, and makes a new one in its place', async () => {
    const { fixture, root, click } = await create({
      shared: true,
      createdAt: '2026-10-06T10:00:00Z',
      includeNotes: false
    });
    expect(text(fixture)).toContain('Shared by link since');
    expect(root.querySelector('#share-address-r1')).toBeNull();
    await click('Make a new link');
    httpMock()
      .expectOne((req) => req.method === 'POST' && req.url === URL)
      .flush({ secret: SECRET, createdAt: '2026-10-16T10:00:00Z', includeNotes: false });
    await settle(fixture);
    expect(text(fixture, '.share-status')).toBe('A new link is made. The old one no longer works.');
  });

  it('saves whether the notes show at once, for a recipe already shared', async () => {
    const { fixture, root } = await create({ shared: true, createdAt: '2026-10-06T10:00:00Z', includeNotes: false });
    (root.querySelector('#share-notes-r1') as HTMLInputElement).click();
    await settle(fixture);
    const put = httpMock().expectOne((req) => req.method === 'PUT' && req.url === URL);
    expect(put.request.body).toEqual({ includeNotes: true });
    put.flush({ includeNotes: true });
    await settle(fixture);
    expect(text(fixture, '.share-status')).toBe('The shared recipe shows its notes now.');
  });

  it('stops sharing', async () => {
    const { fixture, click } = await create({ shared: true, createdAt: '2026-10-06T10:00:00Z', includeNotes: false });
    await click('Stop sharing');
    httpMock()
      .expectOne((req) => req.method === 'DELETE' && req.url === URL)
      .flush({ code: 'share-stopped', msg: 'The recipe is no longer shared.' });
    await settle(fixture);
    expect(text(fixture, '.share-status')).toBe('The recipe is no longer shared. Its link no longer works.');
    expect(text(fixture)).toContain('Make a link');
  });

  it('tells a trial it needs an account, asking the server nothing', async () => {
    const { fixture } = await create(null, true);
    expect(text(fixture)).toContain('Sharing a recipe by link needs an account.');
  });

  it('copies the link just made, or leaves it selected to copy by hand when the browser will not', async () => {
    const { fixture, root, click } = await create({ shared: false });
    await click('Make a link');
    httpMock()
      .expectOne((req) => req.method === 'POST' && req.url === URL)
      .flush({ secret: SECRET, createdAt: '2026-10-16T10:00:00Z', includeNotes: false });
    await settle(fixture);
    // The box takes the whole link when it gets the focus.
    const address = root.querySelector('#share-address-r1') as HTMLInputElement;
    address.focus();
    expect([address.selectionStart, address.selectionEnd]).toEqual([0, address.value.length]);

    const before = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    try {
      await click('Copy');
      expect(writeText).toHaveBeenCalledWith(location.origin + '/shared#' + SECRET);
      expect(text(fixture, '.share-status')).toBe('The link is copied.');
      writeText.mockRejectedValue(new Error('Not allowed'));
      await click('Copy');
      expect(text(fixture, '.share-status')).toBe(
        'The link could not be copied for you. It is selected: copy it from the box.'
      );
    } finally {
      if (before) Object.defineProperty(navigator, 'clipboard', before);
      else delete (navigator as { clipboard?: unknown }).clipboard;
    }
  });

  it('says when it cannot tell whether the recipe is shared, offering nothing to press', async () => {
    const fixture = TestBed.createComponent(SharePanel);
    fixture.componentRef.setInput('recipeId', 'r1');
    await fixture.whenStable();
    httpMock().expectOne(URL).flush({}, { status: 500, statusText: 'Server Error' });
    await settle(fixture);
    expect(text(fixture, '.share-problem')).toBe('That did not work. Please try again.');
    expect(text(fixture)).not.toContain('Checking whether the recipe is shared');
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });

  it('says when a link could not be made or stopped, and keeps the recipe as it was', async () => {
    const { fixture, root, click } = await create({
      shared: true,
      createdAt: '2026-10-06T10:00:00Z',
      includeNotes: false
    });
    await click('Make a new link');
    httpMock()
      .expectOne((req) => req.method === 'POST' && req.url === URL)
      .flush({ msg: 'Please try again later.' }, { status: 503, statusText: 'Unavailable' });
    await settle(fixture);
    expect(text(fixture, '.share-problem')).toBe('Please try again later.');
    expect(root.querySelector('#share-address-r1')).toBeNull();
    expect(text(fixture)).toContain('Shared by link since');

    await click('Stop sharing');
    httpMock()
      .expectOne((req) => req.method === 'DELETE' && req.url === URL)
      .flush({}, { status: 500, statusText: 'Server Error' });
    await settle(fixture);
    expect(text(fixture, '.share-problem')).toBe('That did not work. Please try again.');
    expect(text(fixture)).toContain('Stop sharing');
  });

  it('puts the notes box back when its change cannot be saved', async () => {
    const { fixture, root } = await create({ shared: true, createdAt: '2026-10-06T10:00:00Z', includeNotes: false });
    const notes = root.querySelector('#share-notes-r1') as HTMLInputElement;
    notes.click();
    await settle(fixture);
    httpMock()
      .expectOne((req) => req.method === 'PUT' && req.url === URL)
      .flush({}, { status: 500, statusText: 'Server Error' });
    await settle(fixture);
    expect(notes.checked).toBe(false);
    expect(text(fixture, '.share-problem')).toBe('That did not work. Please try again.');
  });
});
