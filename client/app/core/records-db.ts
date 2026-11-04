// The IndexedDB database that holds the copy of the user's records (core/offline-records.ts) and the changes
// made while offline that are waiting to be sent (core/outbox.ts). One database, two stores.

/** The IndexedDB database's name. */
export const RECORDS_DB = 'gc-records';
/**
 * The layout of the database; one of another layout is dropped and fetched again.
 * 2: a time saved per copy. 3: the outbox store. 4: a copy per account (keys `<userId>/<name>`). A later upgrade
 * must keep the outbox store: it holds changes the user made that exist nowhere else.
 */
export const SCHEMA = 4;
/** The store of copies, by `<userId>/<name>`: each account's copy is its own, and stays when another signs in. */
export const STORE = 'copies';
/** The name, under an account's prefix, of the record that holds when its copy was saved. */
export const META = 'meta';
/** The key in STORE that names the account whose copy is shown when the app starts before /verify answers. */
export const CURRENT = 'current';

/** The key in STORE of one account's copy (or META). */
export function copyKey(userId: string, name: string): string {
  return userId + '/' + name;
}

/** The account a STORE key belongs to, or null for CURRENT. */
export function accountOf(key: IDBValidKey): string | null {
  const text = String(key);
  const slash = text.indexOf('/');
  return slash > 0 ? text.slice(0, slash) : null;
}
/** The store of waiting changes, keyed by a counter (the order they were made in). */
export const OUTBOX = 'outbox';

/** Opens (and, the first time, makes) the database. `onClosed` is called if another tab deletes it. */
export function openRecordsDb(onClosed: () => void): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const opening = indexedDB.open(RECORDS_DB, SCHEMA);
    opening.onupgradeneeded = (event) => {
      const db = opening.result;
      // An older layout: its copies are dropped and fetched again; the outbox is kept.
      if (event.oldVersion < 4 && db.objectStoreNames.contains(STORE)) db.deleteObjectStore(STORE);
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      if (!db.objectStoreNames.contains(OUTBOX)) db.createObjectStore(OUTBOX, { keyPath: 'seq', autoIncrement: true });
    };
    opening.onsuccess = () => {
      const db = opening.result;
      // Another tab deletes the database: let it.
      db.onversionchange = () => {
        db.close();
        onClosed();
      };
      resolve(db);
    };
    opening.onerror = () => reject(opening.error);
  });
}

export function request<T>(req: IDBRequest): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
  });
}

export function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

/** Deletes the whole database; resolves when it is gone, or when another tab holds it (it closes on its own). */
export function deleteRecordsDb(): Promise<void> {
  return new Promise<void>((resolve) => {
    const deleting = indexedDB.deleteDatabase(RECORDS_DB);
    deleting.onsuccess = () => resolve();
    deleting.onerror = () => resolve();
    deleting.onblocked = () => resolve();
  });
}
