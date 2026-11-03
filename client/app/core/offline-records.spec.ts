import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
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
import { OfflineRecords, RECORDS_DB, RECORDS_FLAG, RECORD_KEYS } from './offline-records';
import { changedBy, copyOf, offlineRecordsInterceptor } from './offline-records.interceptor';
import { sessionExpiredInterceptor } from './session-expired.interceptor';

const network = { status: 0, statusText: 'Unknown Error' };
const RECIPES = [{ _id: 'r1', title: 'Celadon' }];

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

async function databases(): Promise<string[]> {
  return (await indexedDB.databases()).map((db) => db.name ?? '');
}

/** Waits for a request to the address and answers it. */
async function answerNext(address: string, body: unknown): Promise<void> {
  let req!: TestRequest;
  await vi.waitFor(() => {
    req = httpMock().expectOne(address);
  });
  req.flush(body as object);
}

/** Turns the copy on and answers the fetch of every record and setting. */
async function turnOn(records: OfflineRecords): Promise<void> {
  const on = records.setEnabled(true);
  for (const key of RECORD_KEYS) await answerNext(records.addressOf(key), key === 'recipe' ? RECIPES : []);
  await on;
}

function get(address: string): Promise<unknown> {
  return firstValueFrom(TestBed.inject(HttpClient).get(address)).catch((e: unknown) => e);
}

describe('the records kept on this device', () => {
  beforeEach(() => {
    localStorage.clear();
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

  it('keeps nothing while the switch is off, and fails offline as before, saying the records are not saved', async () => {
    setUp();
    const records = TestBed.inject(OfflineRecords);
    expect(records.enabled()).toBe(false);
    const online = get(API + '/recipe/getAll');
    httpMock()
      .expectOne(API + '/recipe/getAll')
      .flush(RECIPES);
    expect(await online).toEqual(RECIPES);
    const offline = get(API + '/recipe/getAll');
    httpMock()
      .expectOne(API + '/recipe/getAll')
      .flush(null, network);
    expect(await offline).toBeInstanceOf(HttpErrorResponse);
    expect(records.notSaved()).toBe(true);
    expect(records.showingCopy()).toBeNull();
    expect(await databases()).not.toContain(RECORDS_DB);
  });

  it('fetches every record and setting when turned on, and answers from the copy only when the network fails', async () => {
    setUp();
    const records = TestBed.inject(OfflineRecords);
    await turnOn(records);
    expect(localStorage.getItem(RECORDS_FLAG)).toBe('1');
    await vi.waitFor(async () => expect((await records.read('recipe'))?.body).toEqual(RECIPES));

    const offline = get(API + '/recipe/getAll');
    httpMock()
      .expectOne(API + '/recipe/getAll')
      .flush(null, network);
    expect(await offline).toEqual(RECIPES);
    expect(records.showingCopy()).toBeInstanceOf(Date);
    expect(records.readOnly()).toBe(true);

    // A server's error is never answered from the copy.
    for (const init of [
      { status: 500, statusText: 'Server Error' },
      { status: 404, statusText: 'Not Found' }
    ]) {
      const reply = get(API + '/recipe/getAll');
      httpMock()
        .expectOne(API + '/recipe/getAll')
        .flush(null, init);
      expect(((await reply) as HttpErrorResponse).status).toBe(init.status);
    }

    // The next answer from the server ends the read-only view.
    const back = get(API + '/recipe/getAll');
    httpMock()
      .expectOne(API + '/recipe/getAll')
      .flush(RECIPES);
    await back;
    expect(records.readOnly()).toBe(false);
  });

  it('does not answer a 401 from the copy, and the session it ends deletes the copy', async () => {
    setUp();
    const records = TestBed.inject(OfflineRecords);
    await turnOn(records);
    const reply = get(API + '/recipe/getAll');
    httpMock()
      .expectOne(API + '/recipe/getAll')
      .flush(null, { status: 401, statusText: 'Unauthorized' });
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
    records.noteUser('alice');
    await turnOn(records);
    await vi.waitFor(async () => expect(await records.read('recipe')).not.toBeNull());
    records.noteUser('bob');
    expect(await records.read('recipe')).toBeNull();
    const offline = get(API + '/recipe/getAll');
    httpMock()
      .expectOne(API + '/recipe/getAll')
      .flush(null, network);
    expect(await offline).toBeInstanceOf(HttpErrorResponse);
  });

  it('notes the user /verify names', async () => {
    setUp();
    const records = TestBed.inject(OfflineRecords);
    const spy = vi.spyOn(records, 'noteUser');
    const verify = get(API + '/verify');
    httpMock()
      .expectOne(API + '/verify')
      .flush({ id: 'u1', email: 'a@b.c' });
    await verify;
    expect(spy).toHaveBeenCalledWith('u1');
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
