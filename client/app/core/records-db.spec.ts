import { IDBFactory } from 'fake-indexeddb';
import { waitFor } from '../testing/test-providers';
import { OUTBOX, RECORDS_DB, SCHEMA, STORE, deleteRecordsDb, done, openRecordsDb, request } from './records-db';

async function databases(): Promise<string[]> {
  return (await indexedDB.databases()).map((db) => db.name ?? '');
}

/** Opens the database as a version of the app before this one would. */
function openAt(version: number, upgrade: (db: IDBDatabase) => void): Promise<IDBDatabase> {
  return new Promise((resolve) => {
    const opening = indexedDB.open(RECORDS_DB, version);
    opening.onupgradeneeded = () => upgrade(opening.result);
    opening.onsuccess = () => resolve(opening.result);
  });
}

const WAITING = {
  userId: 'u1',
  key: 'k1',
  area: 'notes',
  op: 'change',
  id: 'n1',
  baseRev: 1,
  body: { content: 'written offline' },
  queuedAt: 1,
  state: 'waiting'
};

describe('the database of the offline copy and the outbox', () => {
  beforeEach(() => vi.stubGlobal('indexedDB', new IDBFactory()));
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('drops the copies of an older layout, to be fetched again, and keeps the changes waiting in it', async () => {
    // Layout 3: one copy per browser, under its name alone, and the outbox.
    const old = await openAt(3, (db) => {
      db.createObjectStore(STORE).put({ body: [{ _id: 'r1' }], savedAt: 1 }, 'recipe');
      db.createObjectStore(OUTBOX, { keyPath: 'seq', autoIncrement: true }).add(WAITING);
    });
    old.close();

    const db = await openRecordsDb(() => undefined);
    expect(db.version).toBe(SCHEMA);
    const read = db.transaction([STORE, OUTBOX]);
    expect(await request<number>(read.objectStore(STORE).count())).toBe(0);
    expect(await request<unknown[]>(read.objectStore(OUTBOX).getAll())).toEqual([{ ...WAITING, seq: 1 }]);
    db.close();
  });

  it('rejects a write the database refuses, and undoes the rest of its transaction', async () => {
    const db = await openRecordsDb(() => undefined);
    const tx = db.transaction(OUTBOX, 'readwrite');
    const finished = done(tx);
    const store = tx.objectStore(OUTBOX);
    await request(store.add({ ...WAITING, seq: 7 }));
    // The same place in the order twice.
    await expect(request(store.add({ ...WAITING, seq: 7 }))).rejects.toMatchObject({ name: 'ConstraintError' });
    expect(
      await finished.then(
        () => 'kept',
        () => 'undone'
      )
    ).toBe('undone');
    expect(await request<number>(db.transaction(OUTBOX).objectStore(OUTBOX).count())).toBe(0);
    db.close();
  });

  it('lets another tab delete it: the connection closes and says so', async () => {
    const closed = vi.fn();
    const db = await openRecordsDb(closed);
    await deleteRecordsDb();
    expect(closed).toHaveBeenCalledTimes(1);
    expect(await databases()).not.toContain(RECORDS_DB);
    db.close();
  });

  it('is deleted once a tab that holds it open lets go, and does not wait for it meanwhile', async () => {
    // Another tab, of a version that does not close on request.
    const other = await openAt(SCHEMA, (db) => db.createObjectStore(STORE));
    other.onversionchange = () => undefined;
    await deleteRecordsDb();
    expect(await databases()).toContain(RECORDS_DB);
    other.close();
    await waitFor(async () => expect(await databases()).not.toContain(RECORDS_DB));
  });

  it('does not wait on a browser that cannot delete it: the next start tries again', async () => {
    vi.spyOn(indexedDB, 'deleteDatabase').mockImplementation(() => {
      const failing = {} as IDBOpenDBRequest;
      setTimeout(() => failing.onerror?.(new Event('error')));
      return failing;
    });
    await expect(deleteRecordsDb()).resolves.toBeUndefined();
  });
});
