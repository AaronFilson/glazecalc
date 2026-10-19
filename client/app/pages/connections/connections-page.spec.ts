import { TestBed } from '@angular/core/testing';
import { API, httpMock, settle, testProviders, text } from '../../testing/test-providers';
import type { ConnectionRow } from '../../core/connections.service';
import { ConnectionsPage } from './connections-page';

const NONE = { create: 0, change: 0, trash: 0, restore: 0, undo: 0 };
const ROWS: ConnectionRow[] = [
  {
    id: 'c2',
    kind: 'oauth',
    name: 'Claude',
    clientHost: 'claude.ai',
    redirectHost: 'claude.ai',
    access: 'write',
    createdAt: '2026-10-10T10:00:00Z',
    lastUsedAt: '2026-10-18T10:00:00Z',
    expiresAt: '2027-01-10T10:00:00Z',
    working: true,
    changes: { ...NONE, create: 1, change: 3, trash: 2 }
  },
  {
    id: 'c1',
    kind: 'pat',
    name: 'Laptop script',
    access: 'read',
    hint: 'Ab12',
    createdAt: '2026-09-01T10:00:00Z',
    expiresAt: '2026-10-01T10:00:00Z',
    working: false,
    changes: NONE
  }
];
const MOVED = [
  {
    _id: 't1',
    fromCollection: 'recipes',
    title: 'Celadon',
    trashedAt: '2026-10-17T10:00:00Z',
    expiresAt: '2026-11-16T10:00:00Z'
  },
  {
    _id: 't2',
    fromCollection: 'notes',
    title: 'Cone 6 notes',
    trashedAt: '2026-10-17T11:00:00Z',
    expiresAt: '2026-11-16T11:00:00Z'
  }
];
const LINES = [
  { id: 'a2', at: '2026-10-17T11:00:00Z', action: 'trash', fromCollection: 'notes', title: 'Cone 6 notes' },
  { id: 'a1', at: '2026-10-17T10:00:00Z', action: 'change', fromCollection: 'recipes', title: 'Celadon' }
];

describe('ConnectionsPage', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: testProviders() }));
  afterEach(() => httpMock().verify());

  const create = async (rows: ConnectionRow[] = ROWS) => {
    const fixture = TestBed.createComponent(ConnectionsPage);
    await fixture.whenStable();
    httpMock()
      .expectOne(API + '/connections')
      .flush({ connections: rows });
    await settle(fixture);
    const root: HTMLElement = fixture.nativeElement;
    const click = async (selector: string) => {
      const el = root.querySelector<HTMLElement>(selector);
      if (!el) throw new Error('nothing at ' + selector);
      el.click();
      await settle(fixture);
    };
    const open = async (id: string, lines: object[] = LINES, moved: object[] = MOVED, next: string | null = null) => {
      await click(`button[aria-controls="details-${id}"]`);
      httpMock()
        .expectOne(API + `/connections/${id}/activity`)
        .flush({ activity: lines, next });
      httpMock()
        .expectOne(API + `/connections/${id}/trash`)
        .flush({ entries: moved });
      await settle(fixture);
    };
    return { fixture, root, click, open };
  };

  it('lists each connection with what it may do, its hosts, dates and what it did in 90 days', async () => {
    const { fixture } = await create();
    const [claude, script] = [...(fixture.nativeElement as HTMLElement).querySelectorAll('.connection-row')];
    const first = claude!.textContent!.replace(/\s+/g, ' ');
    expect(first).toContain('Claude');
    expect(first).toContain('Connected app');
    expect(first).toContain('Read and change');
    expect(first).toContain('App address: claude.ai');
    expect(first).toContain('Sends you back to: claude.ai');
    expect(first).toContain('1 record made, 3 records changed, 2 records moved to the Trash.');
    const second = script!.textContent!.replace(/\s+/g, ' ');
    expect(second).toContain('Access token');
    expect(second).toContain('ending Ab12');
    expect(second).toContain('Read only');
    expect(second).toContain('never used');
    expect(second).toContain('expired');
    expect(second).toContain('It has not changed anything in the last 90 days.');
    // Only the one still working can be revoked.
    expect(claude!.querySelector('.revoke-one')).not.toBeNull();
    expect(script!.querySelector('.revoke-one')).toBeNull();
    // The spot for the confirm setting, and the way to make a token, are on the page.
    expect(text(fixture)).toContain('Make an access token');
  });

  it('says when nothing is connected', async () => {
    const { fixture } = await create([]);
    expect(text(fixture, '.apps-none')).toBe('Nothing is connected to your account.');
    expect((fixture.nativeElement as HTMLElement).querySelector('.revoke-all')).toBeNull();
  });

  it('opens a row to show what it moved to the Trash and what it did, and closes it again', async () => {
    const { fixture, root, open, click } = await create();
    const toggle = root.querySelector<HTMLElement>('button[aria-controls="details-c2"]')!;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    await open('c2');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(text(fixture, '#details-c2')).toContain('Celadon');
    expect(text(fixture, '.moved-list')).toContain('Recipe');
    expect(text(fixture, '.activity-list')).toContain('Moved to the Trash: Cone 6 notes');
    expect(text(fixture, '.activity-list')).toContain('Changed Celadon');
    await click('button[aria-controls="details-c2"]');
    expect(root.querySelector('#details-c2')).toBeNull();
  });

  it('shows older activity a page at a time', async () => {
    const { fixture, root, open, click } = await create();
    await open('c2', LINES, [], 'cursor-1');
    expect(text(fixture, '#details-c2')).toContain('Nothing it moved is still in the Trash.');
    await click('.older');
    const req = httpMock().expectOne(API + '/connections/c2/activity?before=cursor-1');
    req.flush({
      activity: [
        { id: 'a0', at: '2026-10-01T10:00:00Z', action: 'create', fromCollection: 'recipes', title: 'First one' }
      ],
      next: null
    });
    await settle(fixture);
    expect(root.querySelectorAll('.activity-list > li')).toHaveLength(3);
    expect(root.querySelector('.older')).toBeNull();
  });

  it('puts one back, and all back, then reads the list again', async () => {
    const { fixture, root, open, click } = await create();
    await open('c2');
    await click('.moved-list button');
    const one = httpMock().expectOne(API + '/trash/restore/t1');
    expect(one.request.method).toBe('POST');
    one.flush({ code: 'trash-restored', msg: 'Put the recipe back.' });
    await settle(fixture);
    httpMock()
      .expectOne(API + '/connections')
      .flush({ connections: ROWS });
    await settle(fixture);
    httpMock()
      .expectOne(API + '/connections/c2/activity')
      .flush({ activity: LINES, next: null });
    httpMock()
      .expectOne(API + '/connections/c2/trash')
      .flush({ entries: [MOVED[1]] });
    await settle(fixture);
    expect(root.querySelectorAll('.moved-list > li')).toHaveLength(1);

    await click('.put-all-back');
    const all = httpMock().expectOne(API + '/connections/c2/restore-all');
    expect(all.request.method).toBe('POST');
    all.flush({ code: 'connection-restored', msg: '1 record was put back from the Trash.', params: { count: 1 } });
    await settle(fixture);
    httpMock()
      .expectOne(API + '/connections')
      .flush({ connections: ROWS });
    await settle(fixture);
    httpMock()
      .expectOne(API + '/connections/c2/activity')
      .flush({ activity: LINES, next: null });
    httpMock()
      .expectOne(API + '/connections/c2/trash')
      .flush({ entries: [] });
    await settle(fixture);
    expect(text(fixture, '.server-msg')).toContain('1 record was put back from the Trash.');
    expect(root.querySelector('.put-all-back')).toBeNull();
  });

  it('asks before revoking one, and revokes it after the confirming click', async () => {
    const { fixture, root, click } = await create();
    await click('.revoke-one');
    expect(text(fixture, '.confirm')).toContain('Revoke Claude? It stops working at once.');
    // Cancel leaves it as it was.
    await click('.confirm button.btn-light');
    expect(root.querySelector('.confirm')).toBeNull();
    await click('.revoke-one');
    await click('.confirm button.btn-outline-danger');
    const req = httpMock().expectOne(API + '/connections/c2');
    expect(req.request.method).toBe('DELETE');
    req.flush({ code: 'token-revoked', msg: 'The access token was revoked. It no longer works.' });
    await settle(fixture);
    httpMock()
      .expectOne(API + '/connections')
      .flush({ connections: [{ ...ROWS[0], working: false, revokedAt: '2026-10-19T10:00:00Z' }, ROWS[1]] });
    await settle(fixture);
    expect(text(fixture, '.server-msg')).toContain('The access token was revoked.');
    expect(root.querySelector('.revoke-one')).toBeNull();
    expect(root.querySelector('.revoke-all')).toBeNull();
  });

  it('asks before revoking all, and says how many', async () => {
    const { fixture, root, click } = await create();
    await click('.revoke-all');
    expect(text(fixture, '.confirm')).toContain('Revoke the 1 connection still working?');
    httpMock().expectNone(API + '/connections');
    await click('.revoke-all-yes');
    const req = httpMock().expectOne((r) => r.url === API + '/connections' && r.method === 'DELETE');
    req.flush({ code: 'tokens-revoked', msg: '1 access token was revoked.', params: { count: 1 } });
    await settle(fixture);
    httpMock()
      .expectOne(API + '/connections')
      .flush({ connections: [{ ...ROWS[0], working: false }, ROWS[1]] });
    await settle(fixture);
    expect(text(fixture, '.server-msg')).toContain('1 access token was revoked.');
    expect(root.querySelector('.confirm')).toBeNull();
  });

  it('says when the list or the details cannot be loaded', async () => {
    const fixture = TestBed.createComponent(ConnectionsPage);
    await fixture.whenStable();
    httpMock()
      .expectOne(API + '/connections')
      .flush({}, { status: 500, statusText: 'Server Error' });
    await settle(fixture);
    expect(text(fixture)).toContain('Your connected apps could not be loaded.');
  });

  it('shows when changes need approval, and saves a new choice at once', async () => {
    const { fixture, root } = await create();
    const off = root.querySelector<HTMLInputElement>('#confirm-off')!;
    expect(off.checked).toBe(true);
    expect(text(fixture, '.confirm-choices')).toContain('Ask before removals');
    root.querySelector<HTMLInputElement>('#confirm-all')!.click();
    await settle(fixture);
    const req = httpMock().expectOne(API + '/connections/confirm-setting');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ confirmChanges: 'all' });
    req.flush({ code: 'confirm-setting-saved', msg: 'Saved.', confirmChanges: 'all' });
    await settle(fixture);
    expect(root.querySelector<HTMLInputElement>('#confirm-all')!.checked).toBe(true);
    expect(text(fixture, '.server-msg')).toContain('Saved.');
  });

  it('puts the choice back when it cannot be saved, and marks a token that is never asked', async () => {
    const { fixture, root } = await create([{ ...ROWS[1]!, working: true, access: 'write', noConfirm: true }]);
    expect(text(fixture, '.connection-row')).toContain('Its changes need no confirmation.');
    root.querySelector<HTMLInputElement>('#confirm-removals')!.click();
    await settle(fixture);
    httpMock()
      .expectOne(API + '/connections/confirm-setting')
      .flush({}, { status: 500, statusText: 'Server Error' });
    await settle(fixture);
    expect(root.querySelector<HTMLInputElement>('#confirm-off')!.checked).toBe(true);
    expect(text(fixture)).toContain('could not save your choice');
  });
});
