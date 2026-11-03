import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, Injector, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE } from './api-base';
import { AuthService } from './auth.service';

/** The IndexedDB database that holds the copy of the user's records. */
export const RECORDS_DB = 'gc-records';
/** In this browser's storage: "1" while the user wants their records kept on this device. */
export const RECORDS_FLAG = 'offlineRecords';
/** The collections a user owns, as the API names them (/api/<name>/getAll). */
export const RECORD_COLLECTIONS = ['recipe', 'materials', 'additives', 'firing', 'notes'] as const;
/** The user's settings, kept beside the records (/api/preferences, /api/prices). */
export const RECORD_SETTINGS = ['preferences', 'prices'] as const;
/** Every copy kept, by its name. */
export const RECORD_KEYS: readonly string[] = [...RECORD_COLLECTIONS, ...RECORD_SETTINGS];
/** The layout of the copy; one of another layout is dropped and fetched again. */
const SCHEMA = 1;
/** The copy is fetched again in full when it is this old (ms). */
const REFRESH_AFTER_MS = 24 * 60 * 60 * 1000;
const STORE = 'copies';
const META = 'meta';
/** auth.service.ts's note that this browser has a session. */
const SESSION_NOTE = 'session';

interface Meta {
  userId: string | null;
  savedAt: number;
  schema: number;
}

/**
 * A copy of the signed-in user's records (recipes, materials, additives, firings, notes) and settings (preferences,
 * prices) on this device, so they open without a network: offline stage 3 (docs/adr/0028-service-worker.md).
 * Off unless the user turns it on, per device, and never during a trial. Read-only: the copy is only read when the
 * network fails (status 0), never on a server's error, and nothing can be saved meanwhile. It is written through on
 * every answer the server gives while online (core/offline-records.interceptor.ts), and deleted, with its flag,
 * whenever the session ends (signed out, run out, refused, deleted) or the user turns it off. Not encrypted by the
 * app: the browser keeps each site's storage apart and the device encrypts its disk.
 */
@Injectable({ providedIn: 'root' })
export class OfflineRecords {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly injector = inject(Injector);
  private readonly apiBase = inject(API_BASE);
  private readonly auth = inject(AuthService);
  private db: Promise<IDBDatabase> | null = null;
  private refreshing: Promise<void> | null = null;
  /** The id /verify gave for the signed-in user, once known; a copy of anyone else's is dropped. */
  private userId: string | null = null;

  /** Whether the user asked for their records to be kept on this device. */
  readonly enabled = signal(this.readFlag());
  /** When the copy being shown was saved, while pages show it in place of the server's answers. */
  readonly showingCopy = signal<Date | null>(null);
  /** The network failed for the user's records and there is no copy to show. */
  readonly notSaved = signal(false);
  /** Whether saving is off: the page shows the copy. */
  readonly readOnly = computed(() => this.showingCopy() !== null);

  constructor() {
    if (!this.browser) return;
    this.auth.onSessionEnd(() => this.clear());
    // A copy left behind (a clear that another tab blocked, or a session that ended with the browser closed).
    if (!this.hasSessionNote()) this.clear();
    // Another tab signed out, or turned the copy off.
    window.addEventListener('storage', (event) => {
      if ((event.key === SESSION_NOTE || event.key === RECORDS_FLAG) && event.newValue === null) this.clear();
    });
  }

  /** Whether the switch can be offered: in a browser, with IndexedDB, for an account (not a trial). */
  available(): boolean {
    return this.browser && typeof indexedDB !== 'undefined' && this.auth.trial() === null;
  }

  /** Turns keeping the copy on (and fetches it at once) or off (and deletes it at once). */
  async setEnabled(on: boolean): Promise<void> {
    if (!on || !this.available()) return this.clear();
    try {
      localStorage.setItem(RECORDS_FLAG, '1');
    } catch {
      return;
    }
    this.enabled.set(true);
    await this.refresh(true);
  }

  /** The id of the signed-in user, from /verify. */
  noteUser(id: string): void {
    this.userId = id;
  }

  /** Fetches every record and setting into the copy, unless it was done in the last day (or `now`). */
  refresh(now = false): Promise<void> {
    this.refreshing ??= this.fetchAll(now).finally(() => (this.refreshing = null));
    return this.refreshing;
  }

  /** Fetches the named copies again, after a change was saved. */
  async refetch(keys: readonly string[]): Promise<void> {
    if (!this.keeping()) return;
    const http = this.injector.get(HttpClient);
    for (const key of keys) {
      try {
        await firstValueFrom(http.get(this.addressOf(key)));
      } catch {
        // The next answer, or the daily refresh, catches up.
      }
    }
  }

  /** The API address a copy is fetched from. */
  addressOf(key: string): string {
    return this.apiBase + '/' + key + ((RECORD_COLLECTIONS as readonly string[]).includes(key) ? '/getAll' : '');
  }

  /** Keeps the server's answer for one copy. */
  async save(key: string, body: unknown): Promise<void> {
    this.notSaved.set(false);
    this.showingCopy.set(null);
    if (!this.keeping()) return;
    try {
      const db = await this.open();
      const meta = await request<Meta | undefined>(db.transaction(STORE).objectStore(STORE).get(META));
      if (meta && (meta.schema !== SCHEMA || (this.userId && meta.userId && meta.userId !== this.userId))) {
        await this.drop();
        return this.save(key, body);
      }
      // A clear that came while the database opened wins.
      if (!this.keeping()) return;
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(body, key);
      tx.objectStore(STORE).put(
        { userId: this.userId ?? meta?.userId ?? null, savedAt: Date.now(), schema: SCHEMA },
        META
      );
      await done(tx);
    } catch {
      // No room, or the database is gone: the copy stays as it was.
    }
  }

  /** One copy, and when it was saved, or null. */
  async read(key: string): Promise<{ body: unknown; savedAt: Date } | null> {
    if (!this.keeping()) return null;
    try {
      const store = (await this.open()).transaction(STORE).objectStore(STORE);
      const meta = await request<Meta | undefined>(store.get(META));
      if (!meta || meta.schema !== SCHEMA || (this.userId && meta.userId && meta.userId !== this.userId)) return null;
      const body = await request<unknown>(store.get(key));
      return body === undefined ? null : { body, savedAt: new Date(meta.savedAt) };
    } catch {
      return null;
    }
  }

  /** Notes that the copy answered in place of the server, or that there was none. */
  shown(savedAt: Date | null): void {
    if (savedAt) this.showingCopy.set(savedAt);
    else if (this.auth.hasSession()) this.notSaved.set(true);
  }

  /** Deletes the copy and its flag. Starts at once, so it runs before any page after a sign-out shows. */
  clear(): Promise<void> {
    try {
      localStorage.removeItem(RECORDS_FLAG);
    } catch {
      // Storage unavailable: there is no flag to remove.
    }
    this.enabled.set(false);
    this.showingCopy.set(null);
    this.notSaved.set(false);
    this.userId = null;
    return this.drop();
  }

  private keeping(): boolean {
    return this.browser && this.enabled() && this.auth.hasSession() && this.auth.trial() === null;
  }

  private async fetchAll(now: boolean): Promise<void> {
    if (!this.keeping() || navigator.onLine === false) return;
    if (!now) {
      const meta = await this.meta();
      if (meta && Date.now() - meta.savedAt < REFRESH_AFTER_MS) return;
    }
    await this.refetch(RECORD_KEYS);
  }

  private async meta(): Promise<Meta | null> {
    try {
      return (
        (await request<Meta | undefined>((await this.open()).transaction(STORE).objectStore(STORE).get(META))) ?? null
      );
    } catch {
      return null;
    }
  }

  private open(): Promise<IDBDatabase> {
    // A write still on its way when the copy was cleared must not make the database again.
    if (!this.db && !this.keeping()) return Promise.reject(new Error('Records are not kept on this device'));
    this.db ??= new Promise<IDBDatabase>((resolve, reject) => {
      const opening = indexedDB.open(RECORDS_DB, SCHEMA);
      opening.onupgradeneeded = () => {
        if (!opening.result.objectStoreNames.contains(STORE)) opening.result.createObjectStore(STORE);
      };
      opening.onsuccess = () => {
        const db = opening.result;
        // Another tab deletes the database: let it.
        db.onversionchange = () => {
          db.close();
          this.db = null;
        };
        resolve(db);
      };
      opening.onerror = () => {
        this.db = null;
        reject(opening.error);
      };
    });
    return this.db;
  }

  private async drop(): Promise<void> {
    if (!this.browser || typeof indexedDB === 'undefined') return;
    const db = this.db;
    this.db = null;
    if (db) {
      try {
        (await db).close();
      } catch {
        // It never opened.
      }
    }
    await new Promise<void>((resolve) => {
      const deleting = indexedDB.deleteDatabase(RECORDS_DB);
      deleting.onsuccess = () => resolve();
      deleting.onerror = () => resolve();
      // Another tab holds it open; it closes on versionchange, and the next start deletes it if not.
      deleting.onblocked = () => resolve();
    });
  }

  private readFlag(): boolean {
    try {
      return this.browser && localStorage.getItem(RECORDS_FLAG) === '1';
    } catch {
      return false;
    }
  }

  private hasSessionNote(): boolean {
    try {
      return localStorage.getItem(SESSION_NOTE) !== null;
    } catch {
      return false;
    }
  }
}

function request<T>(req: IDBRequest): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
