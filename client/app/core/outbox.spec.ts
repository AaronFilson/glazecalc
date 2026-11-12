import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
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
import { OfflineRecords, RECORDS_DB, RECORDS_FLAG, RECORD_KEYS } from './offline-records';
import { offlineRecordsInterceptor } from './offline-records.interceptor';
import {
  NOTE_DIVIDER,
  OUTBOX_NOTE,
  Outbox,
  applyEntry,
  mergeNote,
  outboxCallOf,
  rewriteIds,
  textOfEntry
} from './outbox';
import { entryName } from './outbox-conflict.dialog';
import { sessionExpiredInterceptor } from './session-expired.interceptor';

const network = { status: 0, statusText: 'Unknown Error' };
const RECIPES = [
  { _id: 'r1', title: 'Celadon', rev: 3 },
  { _id: 'r2', title: 'Shino', rev: 0 }
];
const NOTES = [{ _id: 'n1', content: 'first', rev: 1 }];
const DAY = 24 * 60 * 60 * 1000;

function setUp(session: 'account' | null = 'account'): void {
  if (session) localStorage.setItem('session', session);
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
function restart(): { records: OfflineRecords; outbox: Outbox } {
  TestBed.resetTestingModule();
  setUp();
  return { records: TestBed.inject(OfflineRecords), outbox: TestBed.inject(Outbox) };
}

async function databases(): Promise<string[]> {
  return (await indexedDB.databases()).map((db) => db.name ?? '');
}

async function nextRequest(address: string): Promise<TestRequest> {
  let req!: TestRequest;
  await waitFor(() => {
    req = httpMock().expectOne(address);
  });
  return req;
}

async function answerNext(
  address: string,
  body: unknown,
  init?: { status: number; statusText: string }
): Promise<void> {
  (await nextRequest(address)).flush(body as object, init);
}

/** Turns the copy on for user u1: answers /verify and the fetch of every record and setting. */
async function turnOn(records: OfflineRecords, id = 'u1'): Promise<void> {
  const on = records.setEnabled(true);
  await answerNext(API + '/verify', {
    id,
    email: 'a@b.c',
    sessionEndsAt: new Date(Date.now() + 7 * DAY).toISOString()
  });
  for (const key of RECORD_KEYS) {
    const body = key === 'recipe' ? RECIPES : key === 'notes' ? NOTES : key === 'prices' ? { prices: [] } : [];
    await answerNext(records.addressOf(key), body);
  }
  await on;
  await waitFor(async () => expect(await records.read('recipe')).not.toBeNull());
}

/** The browser says it is offline (or back). */
function offline(on: boolean): void {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(!on);
}

/** Answers the question on screen (core/offline-ask.ts) once it is there. */
async function answerAsk(id: string): Promise<void> {
  const ask = TestBed.inject(OfflineAsk);
  await waitFor(() => expect(ask.open()).not.toBeNull());
  ask.open()!.answer(id);
}

function http(): HttpClient {
  return TestBed.inject(HttpClient);
}

const create = (area: string, body: object) =>
  firstValueFrom(http().post<Record<string, unknown>>(`${API}/${area}/create`, body));
const change = (area: string, id: string, body: object) =>
  firstValueFrom(http().put<Record<string, unknown>>(`${API}/${area}/change/${id}`, body));
const remove = (area: string, id: string) =>
  firstValueFrom(http().delete<Record<string, unknown>>(`${API}/${area}/delete/${id}`));

describe('the outbox: changes made while offline', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.stubGlobal('indexedDB', new IDBFactory());
  });
  afterEach(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('names the changes the outbox holds by request, and nothing else', () => {
    const collections = ['recipe', 'materials', 'additives', 'firing', 'notes'];
    expect(outboxCallOf('POST', '/recipe/create', collections)).toEqual({ area: 'recipe', op: 'create' });
    expect(outboxCallOf('PUT', '/notes/change/n1', collections)).toEqual({ area: 'notes', op: 'change', id: 'n1' });
    expect(outboxCallOf('DELETE', '/firing/delete/f1', collections)).toEqual({
      area: 'firing',
      op: 'delete',
      id: 'f1'
    });
    expect(outboxCallOf('PUT', '/preferences', collections)).toEqual({
      area: 'preferences',
      op: 'put',
      id: 'preferences'
    });
    expect(outboxCallOf('PATCH', '/prices', collections)).toEqual({ area: 'prices', op: 'patch', id: 'prices' });
    for (const [method, path] of [
      ['POST', '/recipe/undo/r1'],
      ['POST', '/trash/restore/t1'],
      ['POST', '/tokens'],
      ['POST', '/import'],
      ['PUT', '/shelf'],
      ['POST', '/advice/create'],
      ['PUT', '/recipe/change/r1/extra']
    ])
      expect(outboxCallOf(method, path, collections)).toBeNull();
  });

  it('makes a queued change to a copy and rewrites ids', () => {
    expect(
      applyEntry([{ _id: 'a', t: 1 }], {
        area: 'recipe',
        op: 'change',
        id: 'a',
        body: { recipe: { t: 2 } },
        userId: 'u'
      })
    ).toEqual([{ _id: 'a', t: 2 }]);
    expect(applyEntry([{ _id: 'a' }], { area: 'notes', op: 'delete', id: 'a', body: undefined, userId: 'u' })).toEqual(
      []
    );
    expect(
      applyEntry(
        { prices: [{ key: 'k', perKg: 1 }] },
        {
          area: 'prices',
          op: 'patch',
          id: 'prices',
          body: { set: [{ key: 'j', perKg: 2 }], remove: ['k'] },
          userId: 'u'
        }
      )
    ).toEqual({ prices: [{ key: 'j', perKg: 2 }] });
    expect(rewriteIds({ materials: [{ id: 'tmp:1' }], note: 'tmp:1x' }, new Map([['tmp:1', 'm1']]))).toEqual({
      materials: [{ id: 'm1' }],
      note: 'tmp:1x'
    });
  });

  it('queues a create the network fails: answers 202 with a temporary id, and the copy has the record at once', async () => {
    setUp();
    const records = TestBed.inject(OfflineRecords);
    const outbox = TestBed.inject(Outbox);
    await turnOn(records);

    const made = create('recipe', { title: 'Tenmoku' });
    await answerNext(API + '/recipe/create', null, network);
    const reply = await made;
    expect(reply['_id']).toMatch(/^tmp:/);
    expect(reply).toMatchObject({ title: 'Tenmoku', queued: true });
    expect(outbox.count()).toBe(1);
    expect(localStorage.getItem(OUTBOX_NOTE)).toBe('1');
    const copy = (await records.read('recipe'))!.body as Array<{ _id: string; title: string }>;
    expect(copy.map((r) => r.title)).toEqual(['Celadon', 'Shino', 'Tenmoku']);
    expect(copy[2]._id).toBe(reply['_id']);
  });

  it('queues without trying when the browser is offline, from a change, a delete and a setting, and never an undo', async () => {
    setUp();
    const records = TestBed.inject(OfflineRecords);
    const outbox = TestBed.inject(Outbox);
    await turnOn(records);
    offline(true);

    expect(await change('recipe', 'r1', { recipe: { title: 'Celadon 2' } })).toMatchObject({ queued: true, id: 'r1' });
    expect(await remove('notes', 'n1')).toMatchObject({ queued: true });
    await firstValueFrom(http().put(`${API}/preferences`, { currency: 'EUR' }));
    await firstValueFrom(http().patch(`${API}/prices`, { set: [{ key: 'silica', perKg: 2 }] }));
    httpMock().expectNone(() => true);
    const entries = await outbox.entries();
    expect(entries.map((e) => `${e.area}:${e.op}`)).toEqual([
      'recipe:change',
      'notes:delete',
      'preferences:put',
      'prices:patch'
    ]);
    expect((await records.read('notes'))!.body).toEqual([]);
    expect((await records.read('preferences'))!.body).toMatchObject({ currency: 'EUR' });
    expect((await records.read('prices'))!.body).toEqual({ prices: [{ key: 'silica', perKg: 2 }] });

    // An undo needs the server: it fails as before.
    const undo = firstValueFrom(http().post(`${API}/recipe/undo/r1`, {})).catch((e: unknown) => e);
    await answerNext(API + '/recipe/undo/r1', null, network);
    expect(await undo).toBeInstanceOf(HttpErrorResponse);
    expect(await outbox.entries()).toHaveLength(4);
  });

  it('does not queue when records are not kept on this device', async () => {
    setUp();
    TestBed.inject(OfflineRecords);
    const made = create('recipe', { title: 'X' }).catch((e: unknown) => e);
    await answerNext(API + '/recipe/create', null, network);
    expect(await made).toBeInstanceOf(HttpErrorResponse);
    expect(await TestBed.inject(Outbox).entries()).toEqual([]);
  });

  it('compacts: changes to one record become one, a change then a delete one delete, a create then a delete nothing', async () => {
    setUp();
    const records = TestBed.inject(OfflineRecords);
    const outbox = TestBed.inject(Outbox);
    await turnOn(records);
    offline(true);

    await change('recipe', 'r1', { recipe: { title: 'A' } });
    await change('recipe', 'r1', { recipe: { title: 'B', date: 'today' } });
    await change('notes', 'n1', { content: 'x' });
    let entries = await outbox.entries();
    expect(entries).toHaveLength(2);
    // The first change's rev is the one the edit was made from.
    expect(entries[0]).toMatchObject({ id: 'r1', baseRev: 3, body: { recipe: { title: 'B', date: 'today' } } });

    await remove('notes', 'n1');
    entries = await outbox.entries();
    expect(entries.map((e) => `${e.id}:${e.op}`)).toEqual(['r1:change', 'n1:delete']);
    expect(entries[1].baseRev).toBe(1);

    const made = await create('recipe', { title: 'Temp' });
    await change('recipe', made['_id'] as string, { recipe: { title: 'Temp 2' } });
    expect((await outbox.entries()).find((e) => e.op === 'create')?.body).toMatchObject({ title: 'Temp 2' });
    await remove('recipe', made['_id'] as string);
    expect((await outbox.entries()).map((e) => e.op)).toEqual(['change', 'delete']);
    expect(((await records.read('recipe'))!.body as unknown[]).length).toBe(2);

    await firstValueFrom(http().put(`${API}/preferences`, { currency: 'EUR' }));
    await firstValueFrom(http().put(`${API}/preferences`, { units: 'g' }));
    await firstValueFrom(http().patch(`${API}/prices`, { set: [{ key: 'a', perKg: 1 }] }));
    await firstValueFrom(http().patch(`${API}/prices`, { remove: ['a'], set: [{ key: 'b', perKg: 2 }] }));
    const settings = (await outbox.entries()).filter((e) => e.op === 'put' || e.op === 'patch');
    expect(settings.map((e) => e.body)).toEqual([
      { currency: 'EUR', units: 'g' },
      { set: [{ key: 'b', perKg: 2 }], remove: ['a'] }
    ]);
  });

  it('sends in order, one at a time, with the key and If-Match, then fetches the copies once; a record made offline gets its real id in what follows', async () => {
    setUp();
    const records = TestBed.inject(OfflineRecords);
    const outbox = TestBed.inject(Outbox);
    await turnOn(records);
    offline(true);

    const material = await create('materials', { name: 'Feldspar' });
    const tmp = material['_id'] as string;
    await create('recipe', { title: 'New', materials: [{ id: tmp, amount: '10' }] });
    await change('recipe', 'r1', { recipe: { title: 'Celadon 2' } });
    await change('notes', 'n1', { content: 'x' });
    const keys = (await outbox.entries()).map((e) => e.key);
    expect(new Set(keys).size).toBe(4);

    vi.restoreAllMocks();
    const flushed = outbox.flush();
    const first = await nextRequest(API + '/materials/create');
    expect(first.request.headers.get('Idempotency-Key')).toBe(keys[0]);
    expect(first.request.headers.has('If-Match')).toBe(false);
    // One at a time: nothing else is out until it is answered.
    httpMock().expectNone(API + '/recipe/create');
    first.flush({ _id: 'm9', rev: 0 });

    const second = await nextRequest(API + '/recipe/create');
    expect((second.request.body as { materials: Array<{ id: string }> }).materials[0].id).toBe('m9');
    second.flush({ _id: 'r9', rev: 0 });

    const third = await nextRequest(API + '/recipe/change/r1');
    expect(third.request.headers.get('If-Match')).toBe('"3"');
    expect(third.request.headers.get('Idempotency-Key')).toBe(keys[2]);
    third.flush({ code: 'record-updated', rev: 4 });
    const fourth = await nextRequest(API + '/notes/change/n1');
    expect(fourth.request.headers.get('If-Match')).toBe('"1"');
    fourth.flush({ code: 'record-updated', rev: 2 });

    // Each touched copy is fetched once, after the batch.
    for (const key of ['materials', 'recipe', 'notes']) await answerNext(records.addressOf(key), []);
    await flushed;
    expect(await outbox.entries()).toEqual([]);
    expect(outbox.count()).toBe(0);
    expect(localStorage.getItem(OUTBOX_NOTE)).toBeNull();
    // A page that still holds the temporary id is sent to the real one.
    const later = change('materials', tmp, { name: 'Feldspar K' });
    const req = await nextRequest(API + '/materials/change/m9');
    req.flush({ code: 'record-updated' });
    await later;
  });

  it('goes on after a change the server refuses; one refused for a conflict holds the later changes to that record', async () => {
    setUp();
    const records = TestBed.inject(OfflineRecords);
    const outbox = TestBed.inject(Outbox);
    await turnOn(records);
    offline(true);
    await change('recipe', 'r1', { recipe: { title: 'A' } });
    await change('recipe', 'r2', { recipe: { title: 'B' } });
    await change('notes', 'n1', { content: 'x' });
    await create('notes', { content: 'bad' });
    vi.restoreAllMocks();

    const flushed = outbox.flush();
    (await nextRequest(API + '/recipe/change/r1')).flush(
      { code: 'record-conflict', record: {} },
      { status: 409, statusText: 'Conflict' }
    );
    (await nextRequest(API + '/recipe/change/r2')).flush(
      { code: 'record-invalid' },
      { status: 400, statusText: 'Bad Request' }
    );
    (await nextRequest(API + '/notes/change/n1')).flush({ code: 'record-updated', rev: 2 });
    (await nextRequest(API + '/notes/create')).flush({ _id: 'n2', rev: 0 });
    await answerNext(records.addressOf('notes'), []);
    await flushed;

    const left = await outbox.entries();
    expect(left.map((e) => `${e.id}:${e.state}:${e.error}`)).toEqual([
      'r1:conflict:record-conflict',
      'r2:failed:record-invalid'
    ]);
    expect(outbox.stuck()).toBe(2);
    // A later edit to the record in conflict waits behind it.
    offline(true);
    await change('recipe', 'r1', { recipe: { title: 'A2' } });
    offline(false);
    await outbox.flush();
    httpMock().expectNone(API + '/recipe/change/r1');
    expect((await outbox.entries()).filter((e) => e.id === 'r1')).toHaveLength(2);
  });

  it('fails what depends on a create the server refused', async () => {
    setUp();
    const records = TestBed.inject(OfflineRecords);
    const outbox = TestBed.inject(Outbox);
    await turnOn(records);
    offline(true);
    const made = await create('materials', { name: 'M' });
    await create('recipe', { title: 'R', materials: [{ id: made['_id'], amount: '1' }] });
    vi.restoreAllMocks();
    const flushed = outbox.flush();
    (await nextRequest(API + '/materials/create')).flush({ code: 'quota' }, { status: 403, statusText: 'Forbidden' });
    await flushed;
    const left = await outbox.entries();
    expect(left.map((e) => `${e.op}:${e.state}:${e.error}`)).toEqual([
      'create:failed:quota',
      'create:failed:depends-on-failed'
    ]);
    httpMock().expectNone(API + '/recipe/create');
  });

  it('sends a change again with the same key when its answer was lost', async () => {
    setUp();
    const records = TestBed.inject(OfflineRecords);
    const outbox = TestBed.inject(Outbox);
    await turnOn(records);
    offline(true);
    await create('notes', { content: 'x' });
    vi.restoreAllMocks();

    const first = outbox.flush();
    const lost = await nextRequest(API + '/notes/create');
    const key = lost.request.headers.get('Idempotency-Key');
    lost.flush(null, network);
    await first;
    expect((await outbox.entries())[0].state).toBe('waiting');

    const second = outbox.flush();
    const again = await nextRequest(API + '/notes/create');
    expect(again.request.headers.get('Idempotency-Key')).toBe(key);
    again.flush({ _id: 'n5', rev: 0 });
    await answerNext(records.addressOf('notes'), []);
    await second;
    expect(await outbox.entries()).toEqual([]);
  });

  it('stops at a 401 and keeps everything: it sends when the same user signs in again', async () => {
    setUp();
    const records = TestBed.inject(OfflineRecords);
    const outbox = TestBed.inject(Outbox);
    await turnOn(records);
    offline(true);
    await change('notes', 'n1', { content: 'x' });
    await change('recipe', 'r1', { recipe: { title: 'A' } });
    vi.restoreAllMocks();

    const flushed = outbox.flush();
    (await nextRequest(API + '/notes/change/n1')).flush(null, { status: 401, statusText: 'Unauthorized' });
    await flushed;
    expect(outbox.signInNeeded()).toBe(true);
    httpMock().expectNone(API + '/recipe/change/r1');
    expect((await outbox.entries()).map((e) => e.state)).toEqual(['waiting', 'waiting']);
    // The copy and the flag are still there too.
    expect(localStorage.getItem(RECORDS_FLAG)).toBe('1');

    // The same user signs in again: /verify names them and the queue goes.
    const signIn = TestBed.inject(AuthService).signIn('a@b.c', 'password123');
    await answerNext(API + '/signin', { msg: 'Signed in.', email: 'a@b.c', kept: 0 });
    await signIn;
    await answerNext(API + '/verify', { id: 'u1', email: 'a@b.c' });
    (await nextRequest(API + '/notes/change/n1')).flush({ code: 'record-updated', rev: 2 });
    (await nextRequest(API + '/recipe/change/r1')).flush({ code: 'record-updated', rev: 4 });
    await answerNext(records.addressOf('notes'), []);
    await answerNext(records.addressOf('recipe'), []);
    await waitFor(async () => expect(await outbox.entries()).toEqual([]));
  });

  it('keeps the queue and the copy over a restart while offline, and the sign-in running out', async () => {
    setUp();
    const records = TestBed.inject(OfflineRecords);
    await turnOn(records);
    offline(true);
    await change('notes', 'n1', { content: 'x' });
    vi.restoreAllMocks();

    // The sign-in has run out and the browser was closed: the app starts again, still offline.
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 30 * DAY);
    offline(true);
    const again = restart();
    expect((await again.records.read('notes'))!.body).toEqual([{ _id: 'n1', content: 'x', rev: 1 }]);
    expect(await again.outbox.entries()).toHaveLength(1);
    await again.outbox.flush();
    httpMock().expectNone(() => true);
    expect(localStorage.getItem(RECORDS_FLAG)).toBe('1');
    expect(await databases()).toContain(RECORDS_DB);
  });

  it("locks another user's queue away: not sent, not counted, kept for their next sign-in", async () => {
    setUp();
    const records = TestBed.inject(OfflineRecords);
    await turnOn(records);
    offline(true);
    await change('notes', 'n1', { content: 'x' });
    vi.restoreAllMocks();

    // Someone else signs in on this browser.
    const signIn = TestBed.inject(AuthService).signIn('b@b.c', 'password123');
    await answerNext(API + '/signin', { msg: 'Signed in.', email: 'b@b.c', kept: 0 });
    await signIn;
    await answerNext(API + '/verify', { id: 'u2', email: 'b@b.c' });
    await waitFor(() => expect(records.enabled()).toBe(false));
    const outbox = TestBed.inject(Outbox);
    await outbox.flush();
    await new Promise((resolve) => setTimeout(resolve, 50));
    httpMock().expectNone(() => true);
    expect(outbox.count()).toBe(0);
    // The first user's copy and change are kept, locked, for the first user.
    expect(await databases()).toContain(RECORDS_DB);
    const left = await outbox.entries();
    expect(left).toHaveLength(1);
    expect(left[0].userId).toBe('u1');
    expect(await outbox.mine('u2')).toEqual([]);
    expect(localStorage.getItem(RECORDS_FLAG)).toBe('locked');
  });

  it("deletes the user's queue only when they turn the copy off or clear it, and not another user's", async () => {
    setUp();
    const records = TestBed.inject(OfflineRecords);
    const outbox = TestBed.inject(Outbox);
    await turnOn(records);
    offline(true);
    await change('notes', 'n1', { content: 'x' });
    expect(await outbox.entries()).toHaveLength(1);
    // Turning it off with a change not sent yet asks first: No keeps everything.
    const kept = records.setEnabled(false);
    await answerAsk('cancel');
    expect(await kept).toBe(true);
    expect(await outbox.entries()).toHaveLength(1);
    expect(localStorage.getItem(RECORDS_FLAG)).toBe('1');
    const off = records.setEnabled(false);
    await answerAsk('delete');
    await off;
    expect(await outbox.entries()).toEqual([]);
    expect(localStorage.getItem(OUTBOX_NOTE)).toBeNull();
    await waitFor(async () => expect(await databases()).not.toContain(RECORDS_DB));
  });

  it('signing out keeps the copy and the queued changes, locked to the user', async () => {
    setUp();
    const records = TestBed.inject(OfflineRecords);
    const outbox = TestBed.inject(Outbox);
    await turnOn(records);
    offline(true);
    await change('notes', 'n1', { content: 'x' });
    const asking = records.askSignOut();
    await answerAsk('keep');
    expect(await asking).toBe('keep');
    vi.restoreAllMocks();
    const out = TestBed.inject(AuthService).signOut();
    httpMock()
      .expectOne(API + '/signout')
      .flush({});
    await out;
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(localStorage.getItem(RECORDS_FLAG)).toBe('1');
    expect(await outbox.entries()).toHaveLength(1);
    expect(await databases()).toContain(RECORDS_DB);
    expect(localStorage.getItem(OUTBOX_NOTE)).toBe('1');
  });

  it('names the unsent changes in the sign-out question; Delete removes them, Cancel changes nothing', async () => {
    setUp();
    const records = TestBed.inject(OfflineRecords);
    const outbox = TestBed.inject(Outbox);
    const ask = TestBed.inject(OfflineAsk);
    await turnOn(records);
    offline(true);
    await change('notes', 'n1', { content: 'x' });
    await change('notes', 'n1', { content: 'y' });
    await create('notes', { title: 'new' });

    const first = records.askSignOut();
    await waitFor(() => expect(ask.open()).not.toBeNull());
    const question = ask.open()!.question;
    expect(question.body.join(' ')).toContain('2 changes you made offline have not been sent yet.');
    expect(question.choices.map((choice) => choice.id)).toEqual(['keep', 'delete', 'cancel']);
    expect(question.choices[0].label).toBe('Keep on this device');
    expect(question.choices[1].label).toBe('Delete from this device');
    ask.open()!.answer('cancel');
    expect(await first).toBe('cancel');
    expect(await outbox.entries()).toHaveLength(2);

    const second = records.askSignOut();
    await answerAsk('delete');
    expect(await second).toBe('delete');
    // The caller deletes (app.ts): nothing has been deleted by the question itself.
    expect(await outbox.entries()).toHaveLength(2);
    await records.clear();
    expect(await outbox.entries()).toEqual([]);
  });

  it('asks nothing at sign-out when nothing is kept and nothing waits', async () => {
    setUp();
    const records = TestBed.inject(OfflineRecords);
    expect(await records.askSignOut()).toBe('keep');
    expect(TestBed.inject(OfflineAsk).open()).toBeNull();
  });

  it('Clear offline data asks (with the unsent count), and deletes the copy and the queue on Delete', async () => {
    setUp();
    const records = TestBed.inject(OfflineRecords);
    const outbox = TestBed.inject(Outbox);
    const ask = TestBed.inject(OfflineAsk);
    await turnOn(records);
    offline(true);
    await change('notes', 'n1', { content: 'x' });
    const clearing = records.clearWithConfirm();
    await waitFor(() => expect(ask.open()).not.toBeNull());
    expect(ask.open()!.question.body.join(' ')).toContain('1 change that has not been sent yet will be lost.');
    ask.open()!.answer('cancel');
    expect(await clearing).toBe(false);
    expect(await outbox.entries()).toHaveLength(1);
    expect(localStorage.getItem(RECORDS_FLAG)).toBe('1');

    const again = records.clearWithConfirm();
    await answerAsk('delete');
    expect(await again).toBe(true);
    expect(await outbox.entries()).toEqual([]);
    expect(localStorage.getItem(RECORDS_FLAG)).toBeNull();
    await waitFor(async () => expect(await databases()).not.toContain(RECORDS_DB));
  });

  it("never touches another account's changes: the signed-in user clearing their own data leaves them", async () => {
    setUp();
    const records = TestBed.inject(OfflineRecords);
    const outbox = TestBed.inject(Outbox);
    await turnOn(records);
    offline(true);
    await change('notes', 'n1', { content: 'x' });
    vi.restoreAllMocks();
    const signIn = TestBed.inject(AuthService).signIn('b@b.c', 'password123');
    await answerNext(API + '/signin', { msg: 'Signed in.', email: 'b@b.c', kept: 0 });
    await signIn;
    await answerNext(API + '/verify', { id: 'u2', email: 'b@b.c' });
    await waitFor(() => expect(records.enabled()).toBe(false));
    expect(outbox.count()).toBe(0);

    await records.clear();
    const left = await outbox.entries();
    expect(left).toHaveLength(1);
    expect(left[0].userId).toBe('u1');
    expect(await databases()).toContain(RECORDS_DB);
  });
});

const conflict = { status: 409, statusText: 'Conflict' };
const gone = { status: 404, statusText: 'Not Found' };

describe('the outbox: conflicts', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.stubGlobal('indexedDB', new IDBFactory());
  });
  afterEach(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  /** Signs in, turns the copy on, queues the changes offline and starts the flush. */
  async function queued(changes: () => Promise<unknown>) {
    setUp();
    const records = TestBed.inject(OfflineRecords);
    const outbox = TestBed.inject(Outbox);
    await turnOn(records);
    offline(true);
    await changes();
    vi.restoreAllMocks();
    return { records, outbox };
  }

  it('merges a note: the fields only one side changed take that side, and both texts are kept when both changed the content', () => {
    const base = { title: 'T', content: 'first' };
    expect(mergeNote(base, { title: 'T', content: 'theirs' }, { title: 'Mine' })).toEqual({
      fields: { title: 'Mine' },
      both: false
    });
    expect(mergeNote(base, { title: 'Theirs', content: 'first' }, { content: 'mine' })).toEqual({
      fields: { content: 'mine' },
      both: false
    });
    // The same change on both sides: nothing to merge.
    expect(mergeNote(base, { content: 'same' }, { content: 'same' }).fields).toEqual({ content: 'same' });
    // A field the change left as it was is not sent.
    expect(mergeNote(base, { content: 'theirs' }, { content: 'first' }).fields).toEqual({});
    expect(mergeNote(base, { content: 'theirs' }, { content: 'mine' })).toEqual({
      fields: { content: 'theirs' + NOTE_DIVIDER + 'mine' },
      both: true
    });
    // A title both changed: the user's own.
    expect(mergeNote(base, { title: 'A' }, { title: 'B' }).fields).toEqual({ title: 'B' });
  });

  it('merges a note edited elsewhere in another field, sending it again from the server rev, without asking', async () => {
    const { records, outbox } = await queued(() => change('notes', 'n1', { title: 'Glaze notes' }));
    const flushed = outbox.flush();
    (await nextRequest(API + '/notes/change/n1')).flush(
      { code: 'record-conflict', record: { _id: 'n1', content: 'edited elsewhere', rev: 2 } },
      conflict
    );
    const again = await nextRequest(API + '/notes/change/n1');
    expect(again.request.headers.get('If-Match')).toBe('"2"');
    expect(again.request.body).toEqual({ title: 'Glaze notes' });
    again.flush({ code: 'record-updated', rev: 3 });
    await answerNext(records.addressOf('notes'), []);
    await flushed;
    expect(await outbox.entries()).toEqual([]);
    expect(outbox.conflicts()).toEqual([]);
    // Said once: everything is saved. No word about a merge, as nothing clashed.
    expect(outbox.notices().map((n) => n.text)).toEqual(['Your offline changes are saved.']);
  });

  it('keeps both texts of a note both sides rewrote: theirs, a divider, mine, and says so', async () => {
    const { records, outbox } = await queued(() => change('notes', 'n1', { content: 'mine' }));
    const flushed = outbox.flush();
    (await nextRequest(API + '/notes/change/n1')).flush(
      { code: 'record-conflict', record: { _id: 'n1', title: 'Glazes', content: 'theirs', rev: 5 } },
      conflict
    );
    const again = await nextRequest(API + '/notes/change/n1');
    expect(again.request.headers.get('If-Match')).toBe('"5"');
    expect(again.request.body).toEqual({ content: 'theirs' + NOTE_DIVIDER + 'mine' });
    again.flush({ code: 'record-updated', rev: 6 });
    await answerNext(records.addressOf('notes'), []);
    await flushed;
    expect(outbox.notices().map((n) => n.text)).toContain(
      'The note Glazes was changed in two places. Both texts are kept, one below the other.'
    );
  });

  it('drops a queued delete of a record changed elsewhere, with a notice; a delete of one already gone is done', async () => {
    const { records, outbox } = await queued(async () => {
      await remove('recipe', 'r1');
      await remove('recipe', 'r2');
    });
    const flushed = outbox.flush();
    (await nextRequest(API + '/recipe/delete/r1')).flush(
      { code: 'record-conflict', record: { _id: 'r1', title: 'Celadon (edited)', rev: 4 } },
      conflict
    );
    (await nextRequest(API + '/recipe/delete/r2')).flush({ code: 'record-gone' }, gone);
    await answerNext(records.addressOf('recipe'), RECIPES);
    await flushed;
    expect(await outbox.entries()).toEqual([]);
    expect(outbox.stuck()).toBe(0);
    expect(outbox.notices().map((n) => n.text)).toEqual([
      'Celadon (edited) was not removed: it was changed somewhere else after you removed it here.'
    ]);
  });

  /** A recipe change that met a newer record on the server: the entry waits for a decision. */
  async function conflictOnRecipe() {
    const { records, outbox } = await queued(() =>
      change('recipe', 'r1', { recipe: { title: 'Celadon 2', notes: 'mine' } })
    );
    const flushed = outbox.flush();
    (await nextRequest(API + '/recipe/change/r1')).flush(
      { code: 'record-conflict', record: { _id: 'r1', title: 'Celadon theirs', rev: 4 } },
      conflict
    );
    await flushed;
    expect(outbox.conflicts()).toHaveLength(1);
    expect(outbox.conflicts()[0].error).toBe('record-conflict');
    expect(outbox.pendingFor('recipe', 'r1')).toBe(false);
    return { records, outbox, seq: outbox.conflicts()[0].seq! };
  }

  it('Save mine as a copy makes a new recipe named "(offline copy)" from the edited one and leaves the server\'s alone', async () => {
    const { records, outbox, seq } = await conflictOnRecipe();
    const resolved = outbox.resolve(seq, 'copy');
    await answerNext(records.addressOf('recipe'), RECIPES);
    await resolved;
    const create = await nextRequest(API + '/recipe/create');
    expect(create.request.body).toEqual({ title: 'Celadon 2 (offline copy)', notes: 'mine' });
    expect(create.request.headers.has('If-Match')).toBe(false);
    create.flush({ _id: 'r7', rev: 0 });
    await answerNext(records.addressOf('recipe'), RECIPES);
    await waitFor(async () => expect(await outbox.entries()).toEqual([]));
  });

  it("Keep mine sends the change again from the server's rev", async () => {
    const { records, outbox, seq } = await conflictOnRecipe();
    const resolved = outbox.resolve(seq, 'mine');
    await answerNext(records.addressOf('recipe'), RECIPES);
    await resolved;
    const again = await nextRequest(API + '/recipe/change/r1');
    expect(again.request.headers.get('If-Match')).toBe('"4"');
    again.flush({ code: 'record-updated', rev: 5 });
    await answerNext(records.addressOf('recipe'), RECIPES);
    await waitFor(async () => expect(await outbox.entries()).toEqual([]));
  });

  it("Keep theirs drops the change and brings the server's record back into the copy", async () => {
    const { records, outbox, seq } = await conflictOnRecipe();
    const resolved = outbox.resolve(seq, 'theirs');
    await answerNext(records.addressOf('recipe'), [{ _id: 'r1', title: 'Celadon theirs', rev: 4 }]);
    await resolved;
    expect(await outbox.entries()).toEqual([]);
    await waitFor(async () =>
      expect(((await records.read('recipe'))?.body as Array<{ title: string }>)[0].title).toBe('Celadon theirs')
    );
  });

  it('a record that is gone: Save as new makes it again with the same name; Discard drops the change', async () => {
    for (const choice of ['saveNew', 'discard'] as const) {
      localStorage.clear();
      vi.stubGlobal('indexedDB', new IDBFactory());
      TestBed.resetTestingModule();
      const { records, outbox } = await queued(() => change('recipe', 'r2', { recipe: { title: 'Shino 2' } }));
      const flushed = outbox.flush();
      (await nextRequest(API + '/recipe/change/r2')).flush({ code: 'record-gone' }, gone);
      await flushed;
      const [entry] = outbox.conflicts();
      expect(entry.error).toBe('record-gone');
      const resolved = outbox.resolve(entry.seq!, choice);
      await answerNext(records.addressOf('recipe'), RECIPES);
      await resolved;
      if (choice === 'saveNew') {
        const create = await nextRequest(API + '/recipe/create');
        expect((create.request.body as { title: string }).title).toBe('Shino 2');
        create.flush({ _id: 'r8', rev: 0 });
        await answerNext(records.addressOf('recipe'), RECIPES);
      }
      await waitFor(async () => expect(await outbox.entries()).toEqual([]));
    }
  });

  it('a copy the quota refuses fails and keeps its text until the person copies it out or removes it', async () => {
    const { records, outbox, seq } = await conflictOnRecipe();
    const resolved = outbox.resolve(seq, 'copy');
    await answerNext(records.addressOf('recipe'), RECIPES);
    await resolved;
    (await nextRequest(API + '/recipe/create')).flush({ code: 'quota' }, { status: 403, statusText: 'Forbidden' });
    await waitFor(() => expect(outbox.failures()).toHaveLength(1));
    const [failed] = outbox.failures();
    expect(failed.state).toBe('failed');
    expect(textOfEntry(failed)).toBe('Celadon 2 (offline copy)\n\nmine');
    expect(entryName(failed)).toBe('Celadon 2 (offline copy)');
    const removed = outbox.discardFailed(failed.seq!);
    await answerNext(records.addressOf('recipe'), RECIPES);
    await removed;
    expect(await outbox.entries()).toEqual([]);
    expect(outbox.failures()).toEqual([]);
  });

  it('marks what waits: pendingFor and the count, and says "saved" once everything has gone', async () => {
    const { records, outbox } = await queued(async () => {
      await change('recipe', 'r1', { recipe: { title: 'A' } });
      await create('materials', { name: 'M' });
    });
    expect(outbox.sendable()).toBe(2);
    expect(outbox.pendingFor('recipe', 'r1')).toBe(true);
    expect(outbox.pendingFor('recipe', 'r2')).toBe(false);
    const [made] = (await outbox.entries()).filter((e) => e.op === 'create');
    expect(outbox.pendingFor('materials', made.id)).toBe(true);
    const flushed = outbox.flush();
    (await nextRequest(API + '/recipe/change/r1')).flush({ code: 'record-updated', rev: 4 });
    (await nextRequest(API + '/materials/create')).flush({ _id: 'm1', rev: 0 });
    for (const key of ['recipe', 'materials']) await answerNext(records.addressOf(key), []);
    await flushed;
    expect(outbox.sendable()).toBe(0);
    expect(outbox.pendingFor('recipe', 'r1')).toBe(false);
    expect(outbox.notices().map((n) => n.text)).toEqual(['Your offline changes are saved.']);
    outbox.dismissNotice(outbox.notices()[0].id);
    expect(outbox.notices()).toEqual([]);
  });
});
