import { HttpClient, HttpContext, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { IDBFactory } from 'fake-indexeddb';
import { firstValueFrom } from 'rxjs';
import { API, httpMock } from '../testing/test-providers';
import { provideEnglish } from '../testing/i18n';
import { API_BASE } from './api-base';
import { AuthService, SIGN_IN_PROVIDERS } from './auth.service';
import { FIRST_RENDER } from './first-render';
import { COPY_REFRESH, OfflineRecords, RECORDS_DB, RECORDS_FLAG, RECORD_KEYS } from './offline-records';
import { changedBy, copyOf, offlineRecordsInterceptor } from './offline-records.interceptor';
import { sessionExpiredInterceptor } from './session-expired.interceptor';

const network = { status: 0, statusText: 'Unknown Error' };
const RECIPES = [{ _id: 'r1', title: 'Celadon' }];
const DAY = 24 * 60 * 60 * 1000;

function setUp(session: 'account' | 'trial' | null = 'account'): void {
  if (session) localStorage.setItem('session', session);
  if (session === 'trial')
    localStorage.setItem('trial', JSON.stringify({ name: 'Blue Heron', expiresAt: '2099-01-01T00:00:00Z' }));
  TestBed.configureTestingModule({
    providers: [
      ...provideEnglish(),
      provideHttpClient(withInterceptors([sessionExpiredInterceptor, offlineRecordsInterceptor])),
      provideHttpClientTesting(),
      provideRouter([{ path: '**', children: [] }]),
      { provide: API_BASE, useValue: API },
      { provide: FIRST_RENDER, useFactory: () => signal(false) },
      { provide: SIGN_IN_PROVIDERS, useValue: () => Promise.resolve([]) }
    ]
  });
}

/** The app starting again on the same browser (the same IndexedDB and storage). */
function restart(): OfflineRecords {
  TestBed.resetTestingModule();
  setUp(null);
  return TestBed.inject(OfflineRecords);
}

async function databases(): Promise<string[]> {
  return (await indexedDB.databases()).map((db) => db.name ?? '');
}

/** Waits for a request to the address and answers it. */
async function answerNext(
  address: string,
  body: unknown,
  init?: { status: number; statusText: string }
): Promise<void> {
  let req!: TestRequest;
  await vi.waitFor(() => {
    req = httpMock().expectOne(address);
  });
  req.flush(body as object, init);
}

interface Session {
  id?: string;
  sessionEndsAt?: string;
  sessionOnly?: boolean;
}

/** Turns the copy on: answers /verify (who, until when), then the fetch of every record and setting. */
async function turnOn(records: OfflineRecords, session: Session = {}): Promise<boolean> {
  const on = records.setEnabled(true);
  await answerNext(API + '/verify', {
    id: 'u1',
    email: 'a@b.c',
    sessionEndsAt: new Date(Date.now() + 7 * DAY).toISOString(),
    ...session
  });
  for (const key of RECORD_KEYS) await answerNext(records.addressOf(key), key === 'recipe' ? RECIPES : []);
  return on;
}

function get(address: string, context?: HttpContext): Promise<unknown> {
  return firstValueFrom(TestBed.inject(HttpClient).get(address, { context })).catch((e: unknown) => e);
}

/** A records GET that the network fails. */
async function offlineGet(address: string): Promise<unknown> {
  const reply = get(address);
  await answerNext(address, null, network);
  return reply;
}

describe('the records kept on this device', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.stubGlobal('indexedDB', new IDBFactory());
  });
  afterEach(async () => {
    // Lets the last test's writes and deletes finish on its own database before the next one starts.
    await new Promise((resolve) => setTimeout(resolve, 50));
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('names the copies by API path, and what a change makes out of date', () => {
    expect(copyOf('/recipe/getAll')).toBe('recipe');
    expect(copyOf('/notes/getAll')).toBe('notes');
    expect(copyOf('/preferences')).toBe('preferences');
    expect(copyOf('/prices')).toBe('prices');
    expect(copyOf('/recipe/getStandard')).toBeNull();
    expect(copyOf('/materials/getAll/x')).toBeNull();
    expect(copyOf('/tokens')).toBeNull();
    expect(copyOf('/trash')).toBeNull();
    expect(changedBy('/recipe/change/r1')).toEqual(['recipe']);
    expect(changedBy('/trash/restore/t1')).toEqual(['recipe', 'materials', 'additives', 'firing', 'notes']);
    expect(changedBy('/prices')).toEqual(['prices']);
    expect(changedBy('/signout')).toEqual([]);
  });

  it('sends every API request past the service worker, so no network is status 0 and not its made-up 504', () => {
    setUp();
    TestBed.inject(OfflineRecords);
    void get(API + '/recipe/getAll');
    void get('/i18n/en.json');
    const api = httpMock().expectOne(API + '/recipe/getAll');
    expect(api.request.headers.get('ngsw-bypass')).toBe('1');
    const other = httpMock().expectOne('/i18n/en.json');
    expect(other.request.headers.has('ngsw-bypass')).toBe(false);
    api.flush([]);
    other.flush({});
  });

  it('never answers a 504 from the copy, even "Gateway Timeout": past the worker it is the server', async () => {
    setUp();
    const records = TestBed.inject(OfflineRecords);
    await turnOn(records);
    await vi.waitFor(async () => expect(await records.read('recipe')).not.toBeNull());
    const reply = get(API + '/recipe/getAll');
    await answerNext(API + '/recipe/getAll', null, { status: 504, statusText: 'Gateway Timeout' });
    expect(((await reply) as HttpErrorResponse).status).toBe(504);
    expect(records.readOnly()).toBe(false);
  });

  it('keeps nothing while the switch is off, and fails offline as before, saying the records are not saved', async () => {
    setUp();
    const records = TestBed.inject(OfflineRecords);
    expect(records.enabled()).toBe(false);
    const online = get(API + '/recipe/getAll');
    httpMock()
      .expectOne(API + '/recipe/getAll')
      .flush(RECIPES);
    expect(await online).toEqual(RECIPES);
    expect(await offlineGet(API + '/recipe/getAll')).toBeInstanceOf(HttpErrorResponse);
    expect(records.notSaved()).toBe(true);
    expect(records.showingCopy()).toBeNull();
    expect(await databases()).not.toContain(RECORDS_DB);
  });

  it('fetches every record and setting when turned on, and answers from the copy only when the network fails', async () => {
    setUp();
    const records = TestBed.inject(OfflineRecords);
    expect(await turnOn(records)).toBe(true);
    expect(localStorage.getItem(RECORDS_FLAG)).toBe('1');
    await vi.waitFor(async () => expect((await records.read('recipe'))?.body).toEqual(RECIPES));

    expect(await offlineGet(API + '/recipe/getAll')).toEqual(RECIPES);
    expect(records.showingCopy()).toBeInstanceOf(Date);
    expect(records.readOnly()).toBe(true);
    expect(records.note()).toContain("Glazecalc can't be reached.");

    // A server's error is never answered from the copy.
    for (const init of [
      { status: 500, statusText: 'Server Error' },
      { status: 404, statusText: 'Not Found' }
    ]) {
      const reply = get(API + '/recipe/getAll');
      await answerNext(API + '/recipe/getAll', null, init);
      expect(((await reply) as HttpErrorResponse).status).toBe(init.status);
    }
  });

  it('stays read-only until the page fetches what it shows again; another answer, or a refresh of the copy, does not end it', async () => {
    setUp();
    const records = TestBed.inject(OfflineRecords);
    await turnOn(records);
    await vi.waitFor(async () => expect(await records.read('recipe')).not.toBeNull());
    await offlineGet(API + '/recipe/getAll');
    expect(records.readOnly()).toBe(true);

    // An unrelated answer (prices) comes through.
    const prices = get(API + '/prices');
    await answerNext(API + '/prices', { prices: [] });
    await prices;
    expect(records.readOnly()).toBe(true);

    // The network comes back: the copy shown is fetched again for the copy, and the page stays read-only.
    window.dispatchEvent(new Event('online'));
    let refetch!: TestRequest;
    await vi.waitFor(() => {
      refetch = httpMock().expectOne(API + '/recipe/getAll');
    });
    expect(refetch.request.context.get(COPY_REFRESH)).toBe(true);
    refetch.flush([...RECIPES, { _id: 'r2', title: 'Shino' }]);
    await vi.waitFor(async () => expect((await records.read('recipe'))?.body).toHaveLength(2));
    expect(records.readOnly()).toBe(true);

    // The page loads its records from the server: it now shows what the server holds.
    const fresh = get(API + '/recipe/getAll');
    await answerNext(API + '/recipe/getAll', RECIPES);
    await fresh;
    expect(records.readOnly()).toBe(false);
  });

  it('keeps the time each copy was saved, and the banner gives the oldest shown', async () => {
    setUp();
    const records = TestBed.inject(OfflineRecords);
    await turnOn(records);
    await vi.waitFor(async () => expect(await records.read('prices')).not.toBeNull());
    const first = (await records.read('recipe'))!.savedAt.getTime();
    const later = Date.now() + 3 * 60 * 60 * 1000;
    vi.spyOn(Date, 'now').mockReturnValue(later);
    const prices = get(API + '/prices');
    await answerNext(API + '/prices', { prices: [{ key: 'silica', perKg: 2 }] });
    await prices;
    await vi.waitFor(async () => expect((await records.read('prices'))!.savedAt.getTime()).toBe(later));
    expect((await records.read('recipe'))!.savedAt.getTime()).toBe(first);

    await offlineGet(API + '/prices');
    expect(records.showingCopy()?.getTime()).toBe(later);
    await offlineGet(API + '/recipe/getAll');
    expect(records.showingCopy()?.getTime()).toBe(first);
  });

  it('does not answer a 401 from the copy, and the session it ends deletes the copy', async () => {
    setUp();
    const records = TestBed.inject(OfflineRecords);
    await turnOn(records);
    const reply = get(API + '/recipe/getAll');
    await answerNext(API + '/recipe/getAll', null, { status: 401, statusText: 'Unauthorized' });
    expect(((await reply) as HttpErrorResponse).status).toBe(401);
    expect(localStorage.getItem(RECORDS_FLAG)).toBeNull();
    await vi.waitFor(async () => expect(await databases()).not.toContain(RECORDS_DB));
  });

  it('writes through: a saved change has its collection fetched again', async () => {
    setUp();
    const records = TestBed.inject(OfflineRecords);
    await turnOn(records);
    const saved = firstValueFrom(TestBed.inject(HttpClient).post(API + '/recipe/create', { title: 'Shino' }));
    httpMock()
      .expectOne(API + '/recipe/create')
      .flush({ _id: 'r2', title: 'Shino' });
    await saved;
    const both = [...RECIPES, { _id: 'r2', title: 'Shino' }];
    await answerNext(API + '/recipe/getAll', both);
    await vi.waitFor(async () => expect(await records.read('recipe')).toMatchObject({ body: both }));
  });

  it("drops a copy of another user's records", async () => {
    setUp();
    const records = TestBed.inject(OfflineRecords);
    await turnOn(records, { id: 'alice' });
    await vi.waitFor(async () => expect(await records.read('recipe')).not.toBeNull());
    records.noteUser({ id: 'bob', endsAt: null, sessionOnly: false });
    expect(await records.read('recipe')).toBeNull();
    expect(await offlineGet(API + '/recipe/getAll')).toBeInstanceOf(HttpErrorResponse);
  });

  it('writes nothing for a user this tab does not know: it asks /verify first, and keeps nothing when that fails', async () => {
    localStorage.setItem(RECORDS_FLAG, '1');
    setUp();
    const records = TestBed.inject(OfflineRecords);
    expect(records.enabled()).toBe(true);
    const reply = get(API + '/recipe/getAll');
    await answerNext(API + '/recipe/getAll', RECIPES);
    await reply;
    await answerNext(API + '/verify', null, network);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(await records.read('recipe')).toBeNull();
  });

  it('notes the user /verify names, and when the sign-in ends', async () => {
    setUp();
    const records = TestBed.inject(OfflineRecords);
    const spy = vi.spyOn(records, 'noteUser');
    const verify = get(API + '/verify');
    await answerNext(API + '/verify', {
      id: 'u1',
      email: 'a@b.c',
      sessionEndsAt: '2099-01-01T00:00:00.000Z',
      sessionOnly: true
    });
    await verify;
    expect(spy).toHaveBeenCalledWith({ id: 'u1', endsAt: Date.parse('2099-01-01T00:00:00.000Z'), sessionOnly: true });
    expect(sessionStorage.getItem(RECORDS_FLAG)).toBe('1');
  });

  it('removes the copy once the sign-in has run out, even with no network, and at the next start', async () => {
    setUp();
    let records = TestBed.inject(OfflineRecords);
    await turnOn(records);
    await vi.waitFor(async () => expect(await records.read('recipe')).not.toBeNull());
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 8 * DAY);
    expect(await records.read('recipe')).toBeNull();
    await vi.waitFor(async () => expect(await databases()).not.toContain(RECORDS_DB));

    // At start: a copy whose sign-in has run out goes before any page reads it.
    vi.restoreAllMocks();
    localStorage.setItem('session', 'account');
    records = restart();
    await turnOn(records);
    await vi.waitFor(async () => expect(await records.read('recipe')).not.toBeNull());
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 8 * DAY);
    records = restart();
    await vi.waitFor(async () => expect(await databases()).not.toContain(RECORDS_DB));
    expect(localStorage.getItem(RECORDS_FLAG)).toBeNull();
  });

  it('a sign-in without "keep me signed in": after the browser closed, the copy is never shown, and goes when /verify fails', async () => {
    setUp();
    let records = TestBed.inject(OfflineRecords);
    await turnOn(records, { sessionOnly: true });
    await vi.waitFor(async () => expect(await records.read('recipe')).not.toBeNull());
    expect(sessionStorage.getItem(RECORDS_FLAG)).toBe('1');

    // The same browser session (a reload): shown as before.
    records = restart();
    expect(await offlineGet(API + '/recipe/getAll')).toEqual(RECIPES);

    // The browser was closed (sessionStorage is gone), and it starts again with no network.
    sessionStorage.clear();
    records = restart();
    expect(await offlineGet(API + '/recipe/getAll')).toBeInstanceOf(HttpErrorResponse);
    expect(records.readOnly()).toBe(false);
    const verify = get(API + '/verify');
    await answerNext(API + '/verify', null, network);
    await verify;
    await vi.waitFor(async () => expect(await databases()).not.toContain(RECORDS_DB));
    expect(localStorage.getItem(RECORDS_FLAG)).toBeNull();
  });

  it('a session-only sign-in in a new tab, online: /verify confirms it and the copy is used again', async () => {
    setUp();
    let records = TestBed.inject(OfflineRecords);
    await turnOn(records, { sessionOnly: true });
    await vi.waitFor(async () => expect(await records.read('recipe')).not.toBeNull());
    sessionStorage.clear();
    records = restart();
    const verify = get(API + '/verify');
    await answerNext(API + '/verify', {
      id: 'u1',
      email: 'a@b.c',
      sessionEndsAt: new Date(Date.now() + DAY).toISOString(),
      sessionOnly: true
    });
    await verify;
    expect(await offlineGet(API + '/recipe/getAll')).toEqual(RECIPES);
  });

  it('a new sign-in deletes the copy and turns it off, even without a sign-out first', async () => {
    setUp();
    const records = TestBed.inject(OfflineRecords);
    await turnOn(records);
    await vi.waitFor(async () => expect(await databases()).toContain(RECORDS_DB));
    const signIn = TestBed.inject(AuthService).signIn('b@b.c', 'password123');
    await answerNext(API + '/signin', { msg: 'Signed in.', email: 'b@b.c', kept: 0 });
    await signIn;
    expect(records.enabled()).toBe(false);
    expect(localStorage.getItem(RECORDS_FLAG)).toBeNull();
    await vi.waitFor(async () => expect(await databases()).not.toContain(RECORDS_DB));
  });

  it("turned on where the browser won't keep anything, it switches back off and says so", async () => {
    setUp();
    const records = TestBed.inject(OfflineRecords);
    vi.spyOn(indexedDB, 'open').mockImplementation(() => {
      const failing = {} as IDBOpenDBRequest;
      setTimeout(() => failing.onerror?.(new Event('error')));
      return failing;
    });
    const on = records.setEnabled(true);
    await answerNext(API + '/verify', { id: 'u1', email: 'a@b.c' });
    expect(await on).toBe(false);
    expect(records.enabled()).toBe(false);
    expect(records.notKept()).toBe(true);
    expect(localStorage.getItem(RECORDS_FLAG)).toBeNull();
    httpMock().expectNone(API + '/recipe/getAll');
  });

  it('fetches in full at most once a day', async () => {
    setUp();
    const records = TestBed.inject(OfflineRecords);
    await turnOn(records);
    await vi.waitFor(async () => expect(await records.read('prices')).not.toBeNull());
    await records.refresh();
    httpMock().expectNone(API + '/recipe/getAll');
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 25 * 60 * 60 * 1000);
    const again = records.refresh();
    for (const key of RECORD_KEYS) await answerNext(records.addressOf(key), []);
    await again;
  });

  it('turned off, deletes the copy and the flag at once', async () => {
    setUp();
    const records = TestBed.inject(OfflineRecords);
    await turnOn(records);
    await vi.waitFor(async () => expect(await databases()).toContain(RECORDS_DB));
    await records.setEnabled(false);
    expect(localStorage.getItem(RECORDS_FLAG)).toBeNull();
    expect(await databases()).not.toContain(RECORDS_DB);
  });

  it('another tab clearing the storage deletes the copy', async () => {
    setUp();
    const records = TestBed.inject(OfflineRecords);
    await turnOn(records);
    await vi.waitFor(async () => expect(await databases()).toContain(RECORDS_DB));
    window.dispatchEvent(new StorageEvent('storage', { key: null }));
    expect(records.enabled()).toBe(false);
    await vi.waitFor(async () => expect(await databases()).not.toContain(RECORDS_DB));
  });

  for (const end of ['signOut', 'sessionEnded', 'signOutEverywhere'] as const) {
    it(`deletes the copy and the flag when the session ends (${end})`, async () => {
      setUp();
      const records = TestBed.inject(OfflineRecords);
      await turnOn(records);
      await vi.waitFor(async () => expect(await databases()).toContain(RECORDS_DB));
      const auth = TestBed.inject(AuthService);
      const ending = end === 'signOutEverywhere' ? auth.signOutEverywhere() : Promise.resolve(auth[end]());
      if (end === 'signOutEverywhere')
        httpMock()
          .expectOne(API + '/signout-everywhere')
          .flush({});
      else if (end === 'signOut')
        httpMock()
          .expectOne(API + '/signout')
          .flush({});
      await ending;
      expect(localStorage.getItem(RECORDS_FLAG)).toBeNull();
      expect(records.enabled()).toBe(false);
      await vi.waitFor(async () => expect(await databases()).not.toContain(RECORDS_DB));
    });
  }

  it('deletes the copy when the account is deleted', async () => {
    setUp();
    const records = TestBed.inject(OfflineRecords);
    await turnOn(records);
    await vi.waitFor(async () => expect(await databases()).toContain(RECORDS_DB));
    const deleting = TestBed.inject(AuthService).deleteAccount('pw');
    await answerNext(API + '/verify', { id: 'u1' });
    await answerNext(API + '/deleteuser/u1', {});
    await deleting;
    expect(localStorage.getItem(RECORDS_FLAG)).toBeNull();
    await vi.waitFor(async () => expect(await databases()).not.toContain(RECORDS_DB));
  });

  it('deletes a copy left behind when the app starts with no session', async () => {
    const opening = indexedDB.open(RECORDS_DB, 1);
    await new Promise((resolve) => (opening.onsuccess = resolve));
    opening.result.close();
    localStorage.setItem(RECORDS_FLAG, '1');
    setUp(null);
    const records = TestBed.inject(OfflineRecords);
    expect(records.enabled()).toBe(false);
    expect(localStorage.getItem(RECORDS_FLAG)).toBeNull();
    await vi.waitFor(async () => expect(await databases()).not.toContain(RECORDS_DB));
  });

  it('is not offered during a trial, and keeps nothing for one', async () => {
    setUp('trial');
    const records = TestBed.inject(OfflineRecords);
    expect(records.available()).toBe(false);
    await records.setEnabled(true);
    expect(localStorage.getItem(RECORDS_FLAG)).toBeNull();
    httpMock().expectNone(API + '/recipe/getAll');
    expect(await databases()).not.toContain(RECORDS_DB);
  });
});
