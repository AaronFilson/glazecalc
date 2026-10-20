import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { API, httpMock, settle, testProviders, text } from '../../testing/test-providers';
import { ConfirmPage, type PendingChangeView } from './confirm-page';

const CHANGE: PendingChangeView = {
  id: 'abc123',
  status: 'pending',
  summary: {
    code: 'pending-trash',
    msg: 'Move the recipe “Celadon” to the Trash.',
    params: { kind: 'recipe', title: 'Celadon', named: 'yes' }
  },
  removal: true,
  client: 'Claude',
  via: 'oauth',
  selfDescribed: false,
  tokenId: 't1',
  createdAt: '2026-10-19T10:00:00Z',
  expiresAt: '2026-10-19T10:30:00Z',
  changes: [],
  history: null,
  others: []
};

/** Another change waiting from the same app. */
const OTHER = {
  id: 'def456',
  status: 'pending',
  summary: { code: 'pending-create', msg: 'Save a new notebook entry “Rim test”.', params: {} },
  removal: false,
  createdAt: '2026-10-19T10:01:00Z',
  expiresAt: '2026-10-19T10:31:00Z',
  changes: [{ field: 'title', after: 'Rim test' }],
  history: null
};

describe('ConfirmPage', () => {
  const setUp = (signedIn = true) =>
    TestBed.configureTestingModule({
      providers: [
        ...testProviders(),
        {
          provide: AuthService,
          useValue: {
            whenChecked: () => Promise.resolve(),
            hasSession: () => signedIn,
            sessionVersion: () => 0,
            trial: () => null,
            sessionEnded: () => undefined
          }
        },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'abc123' }) } } }
      ]
    });
  afterEach(() => httpMock().verify());

  const create = async (change: PendingChangeView | null = CHANGE, status = 200) => {
    const fixture = TestBed.createComponent(ConfirmPage);
    await settle(fixture);
    const req = httpMock().expectOne(API + '/pending-changes/abc123');
    if (change) req.flush(change);
    else req.flush({ code: 'pending-not-found', msg: 'Not here.' }, { status, statusText: 'Not Found' });
    await settle(fixture);
    return { fixture, root: fixture.nativeElement as HTMLElement };
  };

  it('shows the change in the server’s words and who asked, without focusing Approve', async () => {
    setUp();
    const { fixture, root } = await create();
    expect(text(fixture, '.summary')).toBe('Move the recipe “Celadon” to the Trash.');
    expect(text(fixture, '.from')).toContain('Asked by Claude');
    expect(text(fixture, '.from')).toContain('a connected app');
    expect(root.querySelector('.badge-self')).toBeNull();
    expect(text(fixture, '.removal')).toContain('Trash');
    expect(document.activeElement).not.toBe(root.querySelector('.approve'));
    expect(root.querySelector('.approve')!.hasAttribute('autofocus')).toBe(false);
    expect(root.querySelector('.approve-all')).toBeNull();
  });

  it('approves the change, and says what came of it', async () => {
    setUp();
    const { fixture, root } = await create();
    (root.querySelector('.approve') as HTMLElement).click();
    await settle(fixture);
    httpMock()
      .expectOne((req) => req.method === 'POST' && req.url === API + '/pending-changes/abc123/approve')
      .flush({ code: 'pending-made', msg: 'Done: the change was made.', status: 'done' });
    await settle(fixture);
    expect(text(fixture, '.answer')).toBe('Done: the change was made.');
  });

  it('declines the change', async () => {
    setUp();
    const { fixture, root } = await create();
    (root.querySelector('.decline') as HTMLElement).click();
    await settle(fixture);
    httpMock()
      .expectOne(API + '/pending-changes/abc123/decline')
      .flush({
        code: 'pending-declined',
        msg: 'Nothing was changed: the person did not approve this change.',
        status: 'declined'
      });
    await settle(fixture);
    expect(text(fixture, '.answer')).toBe('Nothing was changed: the person did not approve this change.');
  });

  it('shows every other change waiting from the same app, and approves exactly those shown', async () => {
    setUp();
    const { fixture, root } = await create({ ...CHANGE, others: [OTHER] });
    expect(text(fixture, '#others-heading')).toBe('1 more change is waiting from Claude');
    expect(text(fixture, '.other-summary')).toBe('Save a new notebook entry “Rim test”.');
    expect(text(fixture, '.other .after')).toContain('Rim test');
    expect(text(fixture, '.approve-all')).toBe('Approve all 2 changes from Claude');
    (root.querySelector('.approve-all') as HTMLElement).click();
    await settle(fixture);
    const req = httpMock().expectOne(API + '/pending-changes/approve-all?tokenId=t1');
    expect(req.request.body).toEqual({ ids: ['abc123', 'def456'] });
    req.flush({ code: 'pending-approved-all', msg: '2 changes were made.', params: { made: 2, notMade: 0 }, made: 2 });
    await settle(fixture);
    expect(text(fixture, '.answer')).toBe('2 changes were made.');
  });

  it('declines all the changes shown from the same app', async () => {
    setUp();
    const { fixture, root } = await create({ ...CHANGE, others: [OTHER] });
    expect(text(fixture, '.decline-all')).toBe('Decline all 2 changes from Claude');
    (root.querySelector('.decline-all') as HTMLElement).click();
    await settle(fixture);
    const req = httpMock().expectOne(API + '/pending-changes/decline-all?tokenId=t1');
    expect(req.request.body).toEqual({ ids: ['abc123', 'def456'] });
    req.flush({ code: 'pending-declined-all', msg: '2 changes were declined: nothing was changed.', declined: 2 });
    await settle(fixture);
    expect(text(fixture, '.answer')).toBe('2 changes were declined: nothing was changed.');
  });

  it('shows each field as it is now and would be, long text cut short with a way to see it all', async () => {
    setUp();
    const long = 'Wax resist on the foot. '.repeat(30);
    const { fixture, root } = await create({
      ...CHANGE,
      summary: { code: 'pending-change', msg: 'Change the recipe “Celadon”: title, notes.', params: {} },
      removal: false,
      changes: [
        { field: 'title', before: 'Celadon', after: 'Celadon blue' },
        { field: 'notes', before: '', after: long }
      ]
    });
    const fields = root.querySelectorAll('.field-change');
    expect(fields.length).toBe(2);
    expect(fields[0]!.querySelector('.before .value')!.textContent).toBe('Celadon');
    expect(fields[0]!.querySelector('.after .value')!.textContent).toBe('Celadon blue');
    const after = () => fields[1]!.querySelector('.after .value')!.textContent!;
    expect(after().endsWith('…')).toBe(true);
    expect(after().length).toBeLessThan(long.length);
    (fields[1]!.querySelector('.after .show-all') as HTMLElement).click();
    await settle(fixture);
    expect(after()).toBe(long);
  });

  it('says for a removal what the record was called before this app changed it, and when', async () => {
    setUp();
    const { fixture } = await create({ ...CHANGE, history: { titleBefore: 'Glaze test', minutesAgo: 3 } });
    expect(text(fixture, '.history')).toContain('Before this app changed it, it was called “Glaze test”.');
    expect(text(fixture, '.history')).toContain('This app changed it 3 minutes ago.');
  });

  it('marks an app that registered itself as self-described', async () => {
    setUp();
    const { fixture } = await create({ ...CHANGE, selfDescribed: true });
    expect(text(fixture, '.badge-self')).toBe('self-described');
    expect(text(fixture, '.self-note')).toContain('only what it says about itself');
  });

  it('says what came of a change decided already', async () => {
    setUp();
    const { fixture, root } = await create({
      ...CHANGE,
      status: 'done',
      result: { code: 'pending-made', msg: 'Done: the change was made.' }
    });
    expect(text(fixture, '.decided')).toContain('Done: the change was made.');
    expect(root.querySelector('.approve')).toBeNull();
  });

  it('says when there is no such change, or it is another account’s', async () => {
    setUp();
    const { fixture } = await create(null, 404);
    expect(text(fixture, '.missing')).toContain('There is no change waiting at this address.');
  });

  it('asks to sign in first, and asks the server nothing', async () => {
    setUp(false);
    const fixture = TestBed.createComponent(ConfirmPage);
    await settle(fixture);
    expect(text(fixture, '.signed-out')).toContain('Sign in to Glazecalc with the account the change is for');
  });
});
