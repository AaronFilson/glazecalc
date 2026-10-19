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
  tokenId: 't1',
  createdAt: '2026-10-19T10:00:00Z',
  expiresAt: '2026-10-19T10:30:00Z',
  othersWaiting: 0
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
    expect(text(fixture, '.from')).toContain('the name is the one it gave itself');
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

  it('offers to approve the others waiting from the same app', async () => {
    setUp();
    const { fixture, root } = await create({ ...CHANGE, othersWaiting: 2 });
    expect(text(fixture, '.approve-all')).toBe('Also approve the 2 other changes waiting from Claude');
    (root.querySelector('.approve-all') as HTMLElement).click();
    await settle(fixture);
    httpMock()
      .expectOne(API + '/pending-changes/abc123/approve')
      .flush({ code: 'pending-made', msg: 'Done: the change was made.', status: 'done' });
    await settle(fixture);
    httpMock()
      .expectOne(API + '/pending-changes/approve-all?tokenId=t1')
      .flush({ code: 'pending-approved-all', msg: '2 changes were made.', params: { made: 2, notMade: 0 } });
    await settle(fixture);
    expect(text(fixture, '.answer')).toBe('Done: the change was made. 2 changes were made.');
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
