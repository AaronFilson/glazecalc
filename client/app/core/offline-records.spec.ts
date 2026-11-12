import { HttpClient, HttpContext, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { IDBFactory } from 'fake-indexeddb';
import { firstValueFrom } from 'rxjs';
import { API, httpMock, waitFor } from '../testing/test-providers';
import { provideEnglish } from '../testing/i18n';
import { API_BASE } from './api-base';
import { AuthService, SIGN_IN_PROVIDERS } from './auth.service';
import { FIRST_RENDER } from './first-render';
import { OfflineAsk } from './offline-ask';
import {
  COPY_REFRESH,
  OFFLINE_GONE,
  OfflineRecords,
  keepExpired,
  RECORDS_DB,
  RECORDS_FLAG,
  RECORDS_LOCKED,
  RECORD_KEYS,
  iosEvictionRisk
} from './offline-records';
import { changedBy, copyOf, offlineRecordsInterceptor } from './offline-records.interceptor';
import { OUTBOX_SYNC_MESSAGE, OUTBOX_SYNC_TAG, Outbox } from './outbox';
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
  await waitFor(() => {
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

/** Answers the question on screen (core/offline-ask.ts) once it is there. */
async function answerAsk(id: string): Promise<void> {
  const ask = TestBed.inject(OfflineAsk);
  await waitFor(() => expect(ask.open()).not.toBeNull());
  ask.open()!.answer(id);
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
    await waitFor(async () => expect(await records.read('recipe')).not.toBeNull());
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
    await waitFor(async () => expect((await records.read('recipe'))?.body).toEqual(RECIPES));

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
    await waitFor(async () => expect(await records.read('recipe')).not.toBeNull());
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
    await waitFor(() => {
      refetch = httpMock().expectOne(API + '/recipe/getAll');
    });
    expect(refetch.request.context.get(COPY_REFRESH)).toBe(true);
    refetch.flush([...RECIPES, { _id: 'r2', title: 'Shino' }]);
    await waitFor(async () => expect((await records.read('recipe'))?.body).toHaveLength(2));
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
    await waitFor(async () => expect(await records.read('prices')).not.toBeNull());
    const first = (await records.read('recipe'))!.savedAt.getTime();
    const later = Date.now() + 3 * 60 * 60 * 1000;
    vi.spyOn(Date, 'now').mockReturnValue(later);
    const prices = get(API + '/prices');
    await answerNext(API + '/prices', { prices: [{ key: 'silica', perKg: 2 }] });
    await prices;
    await waitFor(async () => expect((await records.read('prices'))!.savedAt.getTime()).toBe(later));
    expect((await records.read('recipe'))!.savedAt.getTime()).toBe(first);

    // Settings alone do not make a page read-only; beside the recipes, whose page saves with them, they count.
    await offlineGet(API + '/prices');
    expect(records.showingCopy()).toBeNull();
    expect(records.readOnly()).toBe(false);
    await offlineGet(API + '/recipe/getAll');
    expect(records.showingCopy()?.getTime()).toBe(first);
  });

  it('counts a settings copy beside the recipes when it is the oldest', async () => {
    setUp();
    const records = TestBed.inject(OfflineRecords);
    await turnOn(records);
    await waitFor(async () => expect(await records.read('prices')).not.toBeNull());
    const prices = (await records.read('prices'))!.savedAt.getTime();
    vi.spyOn(Date, 'now').mockReturnValue(prices + 3 * 60 * 60 * 1000);
    const recipes = get(API + '/recipe/getAll');
    await answerNext(API + '/recipe/getAll', RECIPES);
    await recipes;
    await waitFor(async () => expect((await records.read('recipe'))!.savedAt.getTime()).toBeGreaterThan(prices));
    await offlineGet(API + '/prices');
    await offlineGet(API + '/recipe/getAll');
    expect(records.showingCopy()?.getTime()).toBe(prices);
  });

  it('is read-only per page: a new page starts afresh, and its date is its own collection', async () => {
    setUp();
    const records = TestBed.inject(OfflineRecords);
    await turnOn(records);
    await waitFor(async () => expect(await records.read('notes')).not.toBeNull());
    const recipeAt = (await records.read('recipe'))!.savedAt.getTime();
    const later = recipeAt + 3 * 60 * 60 * 1000;
    vi.spyOn(Date, 'now').mockReturnValue(later);
    const notes = get(API + '/notes/getAll');
    await answerNext(API + '/notes/getAll', []);
    await notes;
    await waitFor(async () => expect((await records.read('notes'))!.savedAt.getTime()).toBe(later));

    // Offline on the recipe page.
    await offlineGet(API + '/recipe/getAll');
    expect(records.showingCopy()?.getTime()).toBe(recipeAt);
    // Then the notes page, still offline: its own copy's date.
    records.pageStarted();
    expect(records.readOnly()).toBe(false);
    await offlineGet(API + '/notes/getAll');
    expect(records.showingCopy()?.getTime()).toBe(later);
    // The network is back and another page loads fresh: not read-only, though a copy was shown before.
    records.pageStarted();
    const fresh = get(API + '/notes/getAll');
    await answerNext(API + '/notes/getAll', []);
    await fresh;
    expect(records.readOnly()).toBe(false);
    expect(records.showingCopy()).toBeNull();
  });

  it('forgets "not saved on this device" when a new page starts', async () => {
    setUp();
    const records = TestBed.inject(OfflineRecords);
    await offlineGet(API + '/recipe/getAll');
    expect(records.notSaved()).toBe(true);
    records.pageStarted();
    expect(records.notSaved()).toBe(false);
  });

  it('offers to reload when the network comes back, until the page loads again or another starts', async () => {
    setUp();
    const records = TestBed.inject(OfflineRecords);
    await turnOn(records);
    await waitFor(async () => expect(await records.read('recipe')).not.toBeNull());
    await offlineGet(API + '/recipe/getAll');
    expect(records.backOnline()).toBe(false);
    window.dispatchEvent(new Event('online'));
    expect(records.backOnline()).toBe(true);
    await answerNext(API + '/recipe/getAll', RECIPES);
    expect(records.backOnline()).toBe(true);
    expect(records.readOnly()).toBe(true);
    const fresh = get(API + '/recipe/getAll');
    await answerNext(API + '/recipe/getAll', RECIPES);
    await fresh;
    expect(records.backOnline()).toBe(false);
    expect(records.readOnly()).toBe(false);

    await offlineGet(API + '/recipe/getAll');
    window.dispatchEvent(new Event('online'));
    await answerNext(API + '/recipe/getAll', RECIPES);
    records.pageStarted();
    expect(records.backOnline()).toBe(false);
  });

  it('does not answer a 401 from the copy, and the session it ends deletes nothing', async () => {
    setUp();
    const records = TestBed.inject(OfflineRecords);
    await turnOn(records);
    await waitFor(async () => expect(await records.read('recipe')).not.toBeNull());
    const reply = get(API + '/recipe/getAll');
    await answerNext(API + '/recipe/getAll', null, { status: 401, statusText: 'Unauthorized' });
    expect(((await reply) as HttpErrorResponse).status).toBe(401);
    expect(localStorage.getItem(RECORDS_FLAG)).toBe('1');
    expect(records.enabled()).toBe(true);
    expect(await databases()).toContain(RECORDS_DB);
  });

  it('writes through: a saved change has its collection fetched again', async () => {
    setUp();
    const records = TestBed.inject(OfflineRecords);
    await turnOn(records);
    const saved = firstValueFrom(TestBed.inject(HttpClient).post(API + '/recipe/create', { title: 'Shino' }));
    await answerNext(API + '/recipe/create', { _id: 'r2', title: 'Shino' });
    await saved;
    const both = [...RECIPES, { _id: 'r2', title: 'Shino' }];
    await answerNext(API + '/recipe/getAll', both);
    await waitFor(async () => expect(await records.read('recipe')).toMatchObject({ body: both }));
  });

  it("drops a copy of another user's records", async () => {
    setUp();
    const records = TestBed.inject(OfflineRecords);
    await turnOn(records, { id: 'alice' });
    await waitFor(async () => expect(await records.read('recipe')).not.toBeNull());
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
    // An answer that names nobody notes nobody.
    spy.mockClear();
    const nobody = get(API + '/verify');
    await answerNext(API + '/verify', { msg: 'No user' });
    await nobody;
    expect(spy).not.toHaveBeenCalled();
  });

  it('keeps the copy when the sign-in has run out, offline, and at the next start', async () => {
    setUp();
    let records = TestBed.inject(OfflineRecords);
    await turnOn(records);
    await waitFor(async () => expect(await records.read('recipe')).not.toBeNull());
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 8 * DAY);
    expect((await records.read('recipe'))?.body).toEqual(RECIPES);
    expect(await offlineGet(API + '/recipe/getAll')).toEqual(RECIPES);

    // At start, still offline: the copy is read as before.
    records = restart();
    expect(await offlineGet(API + '/recipe/getAll')).toEqual(RECIPES);
    expect(localStorage.getItem(RECORDS_FLAG)).toBe('1');
    expect(await databases()).toContain(RECORDS_DB);
  });

  it('a sign-in without "keep me signed in": after the browser closed, offline, the copy is still read, and a failed /verify deletes nothing', async () => {
    setUp();
    let records = TestBed.inject(OfflineRecords);
    await turnOn(records, { sessionOnly: true });
    await waitFor(async () => expect(await records.read('recipe')).not.toBeNull());

    // The browser was closed (sessionStorage is gone), and it starts again with no network.
    sessionStorage.clear();
    records = restart();
    expect(await offlineGet(API + '/recipe/getAll')).toEqual(RECIPES);
    const verify = get(API + '/verify');
    await answerNext(API + '/verify', null, network);
    await verify;
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(await offlineGet(API + '/recipe/getAll')).toEqual(RECIPES);
    expect(localStorage.getItem(RECORDS_FLAG)).toBe('1');
    expect(await databases()).toContain(RECORDS_DB);
  });

  it('a session-only sign-in in a new tab, online: /verify confirms it and the copy is used again', async () => {
    setUp();
    let records = TestBed.inject(OfflineRecords);
    await turnOn(records, { sessionOnly: true });
    await waitFor(async () => expect(await records.read('recipe')).not.toBeNull());
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

  /** Signs in as someone and answers the /verify that follows. */
  async function signInAs(email: string, id: string): Promise<void> {
    const signIn = TestBed.inject(AuthService).signIn(email, 'password123');
    await answerNext(API + '/signin', { msg: 'Signed in.', email, kept: 0 });
    await signIn;
    await answerNext(API + '/verify', { id, email });
  }

  it('the same user signing in again keeps the copy', async () => {
    setUp();
    const records = TestBed.inject(OfflineRecords);
    await turnOn(records);
    await waitFor(async () => expect(await records.read('recipe')).not.toBeNull());
    await signInAs('a@b.c', 'u1');
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(records.enabled()).toBe(true);
    expect(localStorage.getItem(RECORDS_FLAG)).toBe('1');
    expect((await records.read('recipe'))?.body).toEqual(RECIPES);
  });

  it("a different user signing in locks the first user's copy away: not shown, counted, kept for their next sign-in", async () => {
    setUp();
    const records = TestBed.inject(OfflineRecords);
    await turnOn(records);
    await waitFor(async () => expect(await records.read('recipe')).not.toBeNull());
    await signInAs('b@b.c', 'u2');
    await waitFor(() => expect(records.enabled()).toBe(false));
    expect(localStorage.getItem(RECORDS_FLAG)).toBe(RECORDS_LOCKED);
    expect(await records.read('recipe')).toBeNull();
    expect(await databases()).toContain(RECORDS_DB);

    // The first user comes back: their copy is theirs again.
    await signInAs('a@b.c', 'u1');
    await waitFor(() => expect(records.enabled()).toBe(true));
    expect(localStorage.getItem(RECORDS_FLAG)).toBe('1');
    expect((await records.read('recipe'))?.body).toEqual(RECIPES);
  });

  it("the new user turning their own copy on and off leaves the other account's locked copy", async () => {
    setUp();
    const records = TestBed.inject(OfflineRecords);
    await turnOn(records);
    await waitFor(async () => expect(await records.read('recipe')).not.toBeNull());
    await signInAs('b@b.c', 'u2');
    await waitFor(() => expect(localStorage.getItem(RECORDS_FLAG)).toBe(RECORDS_LOCKED));
    await records.clear();
    expect(localStorage.getItem(RECORDS_FLAG)).toBe(RECORDS_LOCKED);
    expect(await databases()).toContain(RECORDS_DB);

    await signInAs('a@b.c', 'u1');
    await waitFor(() => expect(records.enabled()).toBe(true));
    expect((await records.read('recipe'))?.body).toEqual(RECIPES);
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
    await waitFor(async () => expect(await records.read('prices')).not.toBeNull());
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
    await waitFor(async () => expect(await databases()).toContain(RECORDS_DB));
    await records.setEnabled(false);
    expect(localStorage.getItem(RECORDS_FLAG)).toBeNull();
    expect(await databases()).not.toContain(RECORDS_DB);
  });

  it('another tab clearing the storage deletes the copy', async () => {
    setUp();
    const records = TestBed.inject(OfflineRecords);
    await turnOn(records);
    await waitFor(async () => expect(await databases()).toContain(RECORDS_DB));
    window.dispatchEvent(new StorageEvent('storage', { key: null }));
    expect(records.enabled()).toBe(false);
    await waitFor(async () => expect(await databases()).not.toContain(RECORDS_DB));
  });

  it('keeps the copy and the flag when the server ends the session (it ran out)', async () => {
    setUp();
    const records = TestBed.inject(OfflineRecords);
    await turnOn(records);
    await waitFor(async () => expect(await databases()).toContain(RECORDS_DB));
    TestBed.inject(AuthService).sessionEnded();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(localStorage.getItem(RECORDS_FLAG)).toBe('1');
    expect(records.enabled()).toBe(true);
    expect(await databases()).toContain(RECORDS_DB);
  });

  for (const end of ['signOut', 'signOutEverywhere'] as const) {
    it(`keeps the copy and the flag when the person signs out and chose Keep on this device (${end})`, async () => {
      setUp();
      const records = TestBed.inject(OfflineRecords);
      await turnOn(records);
      await waitFor(async () => expect(await databases()).toContain(RECORDS_DB));
      const asking = records.askSignOut();
      await answerAsk('keep');
      expect(await asking).toBe('keep');
      const auth = TestBed.inject(AuthService);
      const ending = end === 'signOutEverywhere' ? auth.signOutEverywhere() : auth.signOut();
      httpMock()
        .expectOne(API + (end === 'signOutEverywhere' ? '/signout-everywhere' : '/signout'))
        .flush({});
      await ending;
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(localStorage.getItem(RECORDS_FLAG)).toBe('1');
      expect(await databases()).toContain(RECORDS_DB);
      // Signed out, nothing is read; the same person signing in again has it.
      expect(await records.read('recipe')).toBeNull();
      await signInAs('a@b.c', 'u1');
      await waitFor(async () => expect((await records.read('recipe'))?.body).toEqual(RECIPES));
    });
  }

  it('deletes the copy and the flag when the person chose Delete from this device', async () => {
    setUp();
    const records = TestBed.inject(OfflineRecords);
    await turnOn(records);
    await waitFor(async () => expect(await databases()).toContain(RECORDS_DB));
    const asking = records.askSignOut();
    await answerAsk('delete');
    expect(await asking).toBe('delete');
    await records.clear();
    const out = TestBed.inject(AuthService).signOut();
    httpMock()
      .expectOne(API + '/signout')
      .flush({});
    await out;
    expect(localStorage.getItem(RECORDS_FLAG)).toBeNull();
    expect(records.enabled()).toBe(false);
    await waitFor(async () => expect(await databases()).not.toContain(RECORDS_DB));
  });

  it('Cancel at sign-out changes nothing and Escape counts as Cancel', async () => {
    setUp();
    const records = TestBed.inject(OfflineRecords);
    await turnOn(records);
    await waitFor(async () => expect(await databases()).toContain(RECORDS_DB));
    const asking = records.askSignOut();
    await answerAsk('cancel');
    expect(await asking).toBe('cancel');
    expect(localStorage.getItem(RECORDS_FLAG)).toBe('1');
    expect(records.enabled()).toBe(true);
    expect(await databases()).toContain(RECORDS_DB);
  });

  it('asks the browser to keep the storage when the copy is turned on', async () => {
    setUp();
    const persist = vi.fn(() => Promise.resolve(true));
    Object.defineProperty(navigator, 'storage', { value: { persist }, configurable: true });
    try {
      const records = TestBed.inject(OfflineRecords);
      await turnOn(records);
      expect(persist).toHaveBeenCalledTimes(1);
    } finally {
      delete (navigator as unknown as Record<string, unknown>)['storage'];
    }
  });

  it('notices an iPhone or iPad browser that is not the home-screen app', () => {
    const iphone = { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1' };
    expect(iosEvictionRisk(iphone, false)).toBe(true);
    expect(iosEvictionRisk({ ...iphone, standalone: true }, false)).toBe(false);
    expect(iosEvictionRisk(iphone, true)).toBe(false);
    // An iPad that says it is a Mac.
    const ipad = {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      platform: 'MacIntel',
      maxTouchPoints: 5
    };
    expect(iosEvictionRisk(ipad, false)).toBe(true);
    expect(iosEvictionRisk({ ...ipad, maxTouchPoints: 0 }, false)).toBe(false);
    expect(iosEvictionRisk({ userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/120' }, false)).toBe(false);
  });

  it('shows the iOS notice when the copy is turned on there, and not on other browsers', async () => {
    setUp();
    const records = TestBed.inject(OfflineRecords);
    await turnOn(records);
    expect(records.iosNotice()).toBe(false);

    TestBed.resetTestingModule();
    localStorage.clear();
    setUp();
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)');
    const ios = TestBed.inject(OfflineRecords);
    await turnOn(ios);
    expect(ios.iosNotice()).toBe(true);
  });

  it('deletes the copy when the account is deleted', async () => {
    setUp();
    const records = TestBed.inject(OfflineRecords);
    await turnOn(records);
    await waitFor(async () => expect(await databases()).toContain(RECORDS_DB));
    const deleting = TestBed.inject(AuthService).deleteAccount('pw');
    await answerNext(API + '/verify', { id: 'u1' });
    await answerNext(API + '/deleteuser/u1', {});
    await deleting;
    expect(localStorage.getItem(RECORDS_FLAG)).toBeNull();
    await waitFor(async () => expect(await databases()).not.toContain(RECORDS_DB));
  });

  it('keeps a copy when the app starts with no session (the sign-in ended): the same user signing in carries on', async () => {
    const opening = indexedDB.open(RECORDS_DB, 1);
    await new Promise((resolve) => (opening.onsuccess = resolve));
    opening.result.close();
    localStorage.setItem(RECORDS_FLAG, '1');
    setUp(null);
    const records = TestBed.inject(OfflineRecords);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(records.enabled()).toBe(true);
    expect(localStorage.getItem(RECORDS_FLAG)).toBe('1');
    expect(await databases()).toContain(RECORDS_DB);
  });

  it('deletes a database left behind when nothing asks for it (no flag, no waiting change)', async () => {
    const opening = indexedDB.open(RECORDS_DB, 1);
    await new Promise((resolve) => (opening.onsuccess = resolve));
    opening.result.close();
    setUp(null);
    TestBed.inject(OfflineRecords);
    await waitFor(async () => expect(await databases()).not.toContain(RECORDS_DB));
  });

  it('sends the waiting changes when the page is shown again, not only on the online event', () => {
    setUp();
    TestBed.inject(OfflineRecords);
    const flush = vi.spyOn(TestBed.inject(Outbox), 'flush').mockResolvedValue();
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('pageshow'));
    window.dispatchEvent(new Event('online'));
    expect(flush).toHaveBeenCalledTimes(3);
  });

  it('asks for Background Sync where the browser has it, and does without elsewhere', async () => {
    setUp();
    const outbox = TestBed.inject(Outbox);
    const register = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', {
      ...navigator,
      serviceWorker: { getRegistration: () => Promise.resolve({ sync: { register } }) }
    });
    expect(await outbox.requestSync()).toBe(true);
    expect(register).toHaveBeenCalledWith(OUTBOX_SYNC_TAG);
    // Firefox and Safari: a registration with no sync.
    vi.stubGlobal('navigator', { ...navigator, serviceWorker: { getRegistration: () => Promise.resolve({}) } });
    expect(await outbox.requestSync()).toBe(false);
    // A browser that says no (no worker in charge yet, or the permission refused).
    const refused = vi.fn().mockRejectedValue(new DOMException('No active registration.', 'InvalidStateError'));
    vi.stubGlobal('navigator', {
      ...navigator,
      serviceWorker: { getRegistration: () => Promise.resolve({ sync: { register: refused } }) }
    });
    expect(await outbox.requestSync()).toBe(false);
  });

  it('counts the keep window from the last open, and keeps forever by default', () => {
    const now = Date.now();
    expect(keepExpired({ savedAt: now - 1000 * DAY }, now)).toBe(false);
    expect(keepExpired({ keepDays: null, usedAt: now - 1000 * DAY, savedAt: 0 }, now)).toBe(false);
    expect(keepExpired({ keepDays: 7, usedAt: now - 6 * DAY, savedAt: 0 }, now)).toBe(false);
    expect(keepExpired({ keepDays: 7, usedAt: now - 8 * DAY, savedAt: 0 }, now)).toBe(true);
    // No open noted yet: from when it was saved.
    expect(keepExpired({ keepDays: 30, savedAt: now - 31 * DAY }, now)).toBe(true);
  });

  it('removes the copy when the site opens after the chosen time unused, and says so; not before', async () => {
    setUp();
    const records = TestBed.inject(OfflineRecords);
    await turnOn(records);
    expect(records.keepDays()).toBeNull();
    await records.setKeepDays(7);
    expect(records.keepDays()).toBe(7);

    // Opened again 6 days later: kept, and the setting is read back.
    const start = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(start + 6 * DAY);
    const again = restart();
    await waitFor(() => expect(again.keepDays()).toBe(7));
    expect(again.keepRemoved()).toBe(false);
    expect(await databases()).toContain(RECORDS_DB);

    // Then 8 days after that open: removed as the site opens.
    vi.spyOn(Date, 'now').mockReturnValue(start + 14 * DAY);
    const late = restart();
    await waitFor(() => expect(late.keepRemoved()).toBe(true));
    expect(localStorage.getItem(RECORDS_FLAG)).toBeNull();
    await waitFor(async () => expect(await databases()).not.toContain(RECORDS_DB));
  });

  it('keeps the chosen time when the copy is saved again', async () => {
    setUp();
    const records = TestBed.inject(OfflineRecords);
    await turnOn(records);
    await records.setKeepDays(30);
    await records.save('recipe', RECIPES);
    const again = restart();
    await waitFor(() => expect(again.keepDays()).toBe(30));
  });

  it('account deleted elsewhere: asks, keeps everything on Later, exports, and clears only when chosen', async () => {
    setUp();
    const records = TestBed.inject(OfflineRecords);
    await turnOn(records);
    await waitFor(async () => expect((await records.read('recipe'))?.body).toEqual(RECIPES));
    const reply = get(API + '/recipe/getAll');
    await answerNext(
      API + '/recipe/getAll',
      { code: 'account-gone', msg: 'This account no longer exists.' },
      { status: 401, statusText: 'Unauthorized' }
    );
    await reply;
    const ask = TestBed.inject(OfflineAsk);
    await waitFor(() => expect(ask.open()?.question.title).toBe('Your account was deleted'));
    expect(ask.open()!.question.choices.map((choice) => choice.id)).toEqual(['export', 'clear', 'later']);
    ask.open()!.answer('later');
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(localStorage.getItem(OFFLINE_GONE)).toBe('u1');
    expect(await databases()).toContain(RECORDS_DB);

    // Opened again (nobody signed in): asked again. Export saves a file, then Clear removes it.
    const saved: Blob[] = [];
    vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
      saved.push(blob as Blob);
      return 'blob:offline';
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const again = restart();
    expect(again.goneId()).toBe('u1');
    await answerAsk('export');
    await waitFor(() => expect(saved).toHaveLength(1));
    const file = JSON.parse(await saved[0].text()) as { format: string; account: { id: string }; records: object };
    expect(file.format).toBe('glazecalc-export');
    expect(file.account.id).toBe('u1');
    expect(file.records).toMatchObject({ recipes: RECIPES });
    expect(await databases()).toContain(RECORDS_DB);
    await answerAsk('clear');
    await waitFor(() => expect(localStorage.getItem(OFFLINE_GONE)).toBeNull());
    await waitFor(async () => expect(await databases()).not.toContain(RECORDS_DB));
  });

  it('account deleted elsewhere: Clear without exporting removes it at once', async () => {
    setUp();
    const records = TestBed.inject(OfflineRecords);
    await turnOn(records);
    TestBed.inject(AuthService).sessionEnded(true);
    await answerAsk('clear');
    await waitFor(async () => expect(await databases()).not.toContain(RECORDS_DB));
    expect(localStorage.getItem(OFFLINE_GONE)).toBeNull();
  });

  it('a session that only ran out never asks about a deleted account', async () => {
    setUp();
    const records = TestBed.inject(OfflineRecords);
    await turnOn(records);
    TestBed.inject(AuthService).sessionEnded(false);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(TestBed.inject(OfflineAsk).open()).toBeNull();
    expect(localStorage.getItem(OFFLINE_GONE)).toBeNull();
  });

  it('is not offered during a trial, and keeps nothing for one', async () => {
    setUp('trial');
    const records = TestBed.inject(OfflineRecords);
    expect(records.available()).toBe(false);
    await records.setEnabled(true);
    expect(localStorage.getItem(RECORDS_FLAG)).toBeNull();
    httpMock().expectNone(API + '/recipe/getAll');
    expect(await databases()).not.toContain(RECORDS_DB);
    // Nothing to ask about when the trial signs out.
    expect(await records.askSignOut()).toBe('keep');
    expect(TestBed.inject(OfflineAsk).open()).toBeNull();
  });

  it('on the server (the prerender), keeps nothing, offers nothing and asks nothing', async () => {
    localStorage.setItem(RECORDS_FLAG, '1');
    localStorage.setItem(OFFLINE_GONE, 'u1');
    setUp();
    TestBed.overrideProvider(PLATFORM_ID, { useValue: 'server' });
    const records = TestBed.inject(OfflineRecords);
    expect(records.enabled()).toBe(false);
    expect(records.available()).toBe(false);
    expect(records.keepsAnything()).toBe(false);
    expect(records.goneId()).toBeNull();
    expect(await records.askSignOut()).toBe('keep');
    expect(TestBed.inject(OfflineAsk).open()).toBeNull();
    expect(await databases()).not.toContain(RECORDS_DB);
  });

  it('sends the waiting changes when the service worker says the browser fired Background Sync', () => {
    const worker = new EventTarget();
    Object.defineProperty(navigator, 'serviceWorker', { value: worker, configurable: true });
    try {
      setUp();
      TestBed.inject(OfflineRecords);
      const flush = vi.spyOn(TestBed.inject(Outbox), 'flush').mockResolvedValue();
      worker.dispatchEvent(new MessageEvent('message', { data: { type: OUTBOX_SYNC_MESSAGE } }));
      // Any other message from the worker is not about the outbox.
      worker.dispatchEvent(new MessageEvent('message', { data: { type: 'SKIP_WAITING' } }));
      worker.dispatchEvent(new MessageEvent('message', { data: null }));
      expect(flush).toHaveBeenCalledTimes(1);
    } finally {
      Reflect.deleteProperty(navigator, 'serviceWorker');
    }
  });

  it('turns on all the same when the browser will not promise to keep the storage', async () => {
    setUp();
    const persist = vi.fn(() => Promise.reject(new DOMException('Not allowed.', 'NotAllowedError')));
    Object.defineProperty(navigator, 'storage', { value: { persist }, configurable: true });
    try {
      const records = TestBed.inject(OfflineRecords);
      expect(await turnOn(records)).toBe(true);
      expect(persist).toHaveBeenCalledTimes(1);
      expect(records.notKept()).toBe(false);
    } finally {
      Reflect.deleteProperty(navigator, 'storage');
    }
  });

  it("says it won't keep a copy where this browser's storage refuses the switch", async () => {
    setUp();
    const records = TestBed.inject(OfflineRecords);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
    });
    expect(await records.setEnabled(true)).toBe(false);
    expect(records.notKept()).toBe(true);
    expect(records.enabled()).toBe(false);
    httpMock().expectNone(API + '/verify');
  });

  it('keeps and asks nothing where this browser blocks its storage', async () => {
    setUp();
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    });
    const records = TestBed.inject(OfflineRecords);
    const outbox = TestBed.inject(Outbox);
    expect(TestBed.inject(AuthService).hasSession()).toBe(false);
    expect(records.enabled()).toBe(false);
    expect(records.keepsAnything()).toBe(false);
    expect(records.goneId()).toBeNull();
    expect(outbox.noted()).toBe(false);
    expect(await records.askSignOut()).toBe('keep');
    expect(TestBed.inject(OfflineAsk).open()).toBeNull();
  });

  it('turned on in a tab that knows who is signed in, asks /verify nothing more', async () => {
    setUp();
    const records = TestBed.inject(OfflineRecords);
    const verify = get(API + '/verify');
    await answerNext(API + '/verify', { id: 'u1', email: 'a@b.c' });
    await verify;
    const on = records.setEnabled(true);
    for (const key of RECORD_KEYS) await answerNext(records.addressOf(key), key === 'recipe' ? RECIPES : []);
    expect(await on).toBe(true);
    httpMock().expectNone(API + '/verify');
    await waitFor(async () => expect((await records.read('recipe'))?.body).toEqual(RECIPES));
  });

  it('fetches nothing again after a change is saved while the copy is off', async () => {
    setUp();
    TestBed.inject(OfflineRecords);
    const saved = firstValueFrom(TestBed.inject(HttpClient).post(API + '/recipe/create', { title: 'Shino' }));
    await answerNext(API + '/recipe/create', { _id: 'r2', title: 'Shino' });
    await saved;
    await new Promise((resolve) => setTimeout(resolve, 20));
    httpMock().expectNone(API + '/recipe/getAll');
  });

  it('a refresh of the copy that the network fails changes nothing on the page', async () => {
    setUp();
    const records = TestBed.inject(OfflineRecords);
    await turnOn(records);
    await waitFor(async () => expect(await records.read('recipe')).not.toBeNull());
    const refreshing = records.refetch(['recipe']);
    await answerNext(API + '/recipe/getAll', null, network);
    await refreshing;
    // Not answered from the copy: the page did not ask for it, so it does not turn read-only or warn.
    expect(records.showingCopy()).toBeNull();
    expect(records.notSaved()).toBe(false);
    expect((await records.read('recipe'))?.body).toEqual(RECIPES);
  });

  it('where the database cannot be opened, answers nothing from a copy, and a refresh fetches everything', async () => {
    localStorage.setItem(RECORDS_FLAG, '1');
    setUp();
    vi.spyOn(indexedDB, 'open').mockImplementation(() => {
      const failing = {} as IDBOpenDBRequest;
      setTimeout(() => failing.onerror?.(new Event('error')));
      return failing;
    });
    const records = TestBed.inject(OfflineRecords);
    expect(await records.read('recipe')).toBeNull();
    expect(await offlineGet(API + '/recipe/getAll')).toBeInstanceOf(HttpErrorResponse);
    expect(records.notSaved()).toBe(true);
    // How old the copy is cannot be read: it is all fetched again.
    const refreshing = records.refresh();
    for (const key of RECORD_KEYS) await answerNext(records.addressOf(key), []);
    await refreshing;
    await answerNext(API + '/verify', null, network);
  });

  it('asks nothing about a deleted account when this device keeps nothing of it', async () => {
    setUp();
    TestBed.inject(OfflineRecords);
    TestBed.inject(AuthService).sessionEnded(true);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(TestBed.inject(OfflineAsk).open()).toBeNull();
    expect(localStorage.getItem(OFFLINE_GONE)).toBeNull();
  });

  it('account deleted elsewhere with changes not sent: says so, and Later after the export keeps everything', async () => {
    setUp();
    const records = TestBed.inject(OfflineRecords);
    await turnOn(records);
    await waitFor(async () => expect(await records.read('recipe')).not.toBeNull());
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    await firstValueFrom(TestBed.inject(HttpClient).put(API + '/recipe/change/r1', { recipe: { title: 'Celadon 2' } }));
    const saved: Blob[] = [];
    vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
      saved.push(blob as Blob);
      return 'blob:offline';
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    TestBed.inject(AuthService).sessionEnded(true);
    const ask = TestBed.inject(OfflineAsk);
    await waitFor(() => expect(ask.open()?.question.title).toBe('Your account was deleted'));
    expect(ask.open()!.question.body.join(' ')).toContain('1 change that has not been sent yet will be lost.');
    ask.open()!.answer('export');
    await waitFor(() => expect(saved).toHaveLength(1));
    const file = JSON.parse(await saved[0].text()) as { records: { recipes: Array<{ title: string }> } };
    expect(file.records.recipes[0].title).toBe('Celadon 2');
    await answerAsk('later');
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(localStorage.getItem(OFFLINE_GONE)).toBe('u1');
    expect(await databases()).toContain(RECORDS_DB);
    expect(await TestBed.inject(Outbox).mine('u1')).toHaveLength(1);
  });

  it("removes an account's locked copy when it signs in again after the time it chose, and says so", async () => {
    setUp();
    const records = TestBed.inject(OfflineRecords);
    await turnOn(records);
    await records.setKeepDays(7);
    // Someone else signs in on this browser: the first account's copy is locked away, unused.
    await signInAs('b@b.c', 'u2');
    await waitFor(() => expect(localStorage.getItem(RECORDS_FLAG)).toBe(RECORDS_LOCKED));
    expect(records.keepRemoved()).toBe(false);

    // The first account comes back after more than the week it chose.
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 8 * DAY);
    await signInAs('a@b.c', 'u1');
    await waitFor(() => expect(records.keepRemoved()).toBe(true));
    expect(records.enabled()).toBe(false);
    expect(await records.read('recipe')).toBeNull();
    await waitFor(async () => expect(await databases()).not.toContain(RECORDS_DB));
  });
});
