import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpContext, HttpContextToken } from '@angular/common/http';
import { DestroyRef, Injectable, Injector, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { translate } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { formatDate } from '../shared/format';
import { API_BASE } from './api-base';
import { AuthService } from './auth.service';

/** The IndexedDB database that holds the copy of the user's records. */
export const RECORDS_DB = 'gc-records';
/**
 * In this browser's storage: "1" while the user wants their records kept on this device. The same name in
 * sessionStorage notes that this browser session has been seen signed in, for a sign-in that ends with it.
 */
export const RECORDS_FLAG = 'offlineRecords';
/** The collections a user owns, as the API names them (/api/<name>/getAll). */
export const RECORD_COLLECTIONS = ['recipe', 'materials', 'additives', 'firing', 'notes'] as const;
/** The user's settings, kept beside the records (/api/preferences, /api/prices). */
export const RECORD_SETTINGS = ['preferences', 'prices'] as const;
/** Every copy kept, by its name. */
export const RECORD_KEYS: readonly string[] = [...RECORD_COLLECTIONS, ...RECORD_SETTINGS];
/** Marks a request the copy makes for itself: its answer refreshes the copy, but not what a page shows. */
export const COPY_REFRESH = new HttpContextToken<boolean>(() => false);
/** The layout of the copy; one of another layout is dropped and fetched again. 2: a time saved per copy. */
const SCHEMA = 2;
/** The copy is fetched again in full when it is this old (ms). */
const REFRESH_AFTER_MS = 24 * 60 * 60 * 1000;
const STORE = 'copies';
const META = 'meta';
/** auth.service.ts's note that this browser has a session. */
const SESSION_NOTE = 'session';

/** Who is signed in, and how long for, as /verify says. */
export interface SignedInUser {
  id: string;
  /** When the sign-in runs out (ms), or null when the server does not say. */
  endsAt: number | null;
  /** The sign-in ends when the browser closes ("Keep me signed in" was not ticked). */
  sessionOnly: boolean;
}

interface Meta {
  userId: string;
  /** When any copy was last saved: the daily refresh goes by it. */
  savedAt: number;
  schema: number;
  sessionEndsAt: number | null;
  sessionOnly: boolean;
}

interface Kept {
  body: unknown;
  savedAt: number;
}

/**
 * A copy of the signed-in user's records (recipes, materials, additives, firings, notes) and settings (preferences,
 * prices) on this device, so they open without a network: offline stage 3 (docs/adr/0028-service-worker.md).
 * Off unless the user turns it on, per device, and never during a trial. Read-only: the copy is only read when the
 * network fails (status 0), never on a server's error, and nothing can be saved meanwhile. It is written through on
 * every answer the server gives while online (core/offline-records.interceptor.ts), and deleted, with its flag,
 * whenever a session starts or ends (signed in, signed out, run out, refused, deleted) or the user turns it off.
 * The end of the sign-in is kept with it, so a session that ended while the device was offline (run out, or a
 * browser closed after a sign-in without "Keep me signed in") never shows it. Not encrypted by the app: the
 * browser keeps each site's storage apart and the device encrypts its disk.
 */
@Injectable({ providedIn: 'root' })
export class OfflineRecords {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly injector = inject(Injector);
  private readonly apiBase = inject(API_BASE);
  private readonly auth = inject(AuthService);
  private db: Promise<IDBDatabase> | null = null;
  private refreshing: Promise<void> | null = null;
  private learning: Promise<void> | null = null;
  /** The user /verify named in this tab, once known; a copy of anyone else's is never read or written. */
  private user: SignedInUser | null = null;
  /** The copy is not read until /verify answers: a session-only sign-in, in a browser session not yet seen. */
  private held = false;
  /** The start-up check of the copy's session; reads wait for it. */
  private readonly ready: Promise<void> = Promise.resolve();
  /**
   * The copies the page on screen shows in place of the server's answers, and when each was saved. Emptied as each
   * navigation starts (pageStarted): the next page's own requests fill it again if the network is still gone.
   */
  private readonly shownKeys = new Map<string, Date>();

  /** Whether the user asked for their records to be kept on this device. */
  readonly enabled = signal(this.readFlag());
  /** When the oldest copy being shown was saved, while pages show copies in place of the server's answers. */
  readonly showingCopy = signal<Date | null>(null);
  /** The network failed for the user's records and there is no copy to show. */
  readonly notSaved = signal(false);
  /** The network came back while the page shows copies: it can be loaded again to save. */
  readonly backOnline = signal(false);
  /** Turning it on failed: this browser would not keep the copy (private browsing, no space). */
  readonly notKept = signal(false);
  /** Whether saving is off: the page shows the copy. */
  readonly readOnly = computed(() => this.showingCopy() !== null);
  /** Why saving is off, for the title of a disabled button; null while saving is on. */
  readonly note = computed(() => {
    const savedAt = this.showingCopy();
    return savedAt
      ? translate('offline.recordsBanner', { date: formatDate(savedAt, { dateStyle: 'medium', timeStyle: 'short' }) })
      : null;
  });

  constructor() {
    if (!this.browser) return;
    this.auth.onSessionEnd(() => this.clear());
    // A new session never sees a copy from before it, whoever's it was.
    this.auth.onSessionStart(() => this.clear());
    // A copy left behind (a clear that another tab blocked, or a session that ended with the browser closed).
    this.ready = this.hasSessionNote() ? this.checkSession() : this.clear();
    // Another tab signed out, turned the copy off, or cleared the storage.
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || ((event.key === SESSION_NOTE || event.key === RECORDS_FLAG) && event.newValue === null))
        void this.clear();
    };
    // The network is back: refresh the copies that were shown, and offer to load the page again. It stays
    // read-only until it does.
    const onOnline = () => {
      if (!this.shownKeys.size) return;
      if (this.showingCopy()) this.backOnline.set(true);
      void this.refetch([...this.shownKeys.keys()]);
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('online', onOnline);
    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('online', onOnline);
    });
  }

  /** Whether the switch can be offered: in a browser, with IndexedDB, for an account (not a trial). */
  available(): boolean {
    return this.browser && typeof indexedDB !== 'undefined' && this.auth.trial() === null;
  }

  /**
   * Turns keeping the copy on (checks that this browser keeps it, then fetches it at once) or off (deletes it at
   * once). Resolves with whether it is on.
   */
  async setEnabled(on: boolean): Promise<boolean> {
    this.notKept.set(false);
    if (!on || !this.available()) {
      await this.clear();
      return false;
    }
    try {
      localStorage.setItem(RECORDS_FLAG, '1');
    } catch {
      this.notKept.set(true);
      return false;
    }
    this.enabled.set(true);
    await this.ready;
    await this.learnUser();
    if (this.user && !(await this.writeMeta())) {
      await this.clear();
      this.notKept.set(true);
      return false;
    }
    await this.refresh(true);
    return this.enabled();
  }

  /** Who /verify says is signed in, and until when. */
  noteUser(user: SignedInUser): void {
    this.user = user;
    this.held = false;
    if (user.sessionOnly) {
      try {
        sessionStorage.setItem(RECORDS_FLAG, '1');
      } catch {
        // No sessionStorage: the next start holds the copy until /verify answers again.
      }
    }
  }

  /** /verify failed: a copy held for it is removed (the browser was closed, and the network is gone too). */
  verifyFailed(): void {
    // After the start-up check, which may be what holds it.
    void this.ready.then(() => (this.held ? this.clear() : undefined));
  }

  /** Fetches every record and setting into the copy, unless it was done in the last day (or `now`). */
  refresh(now = false): Promise<void> {
    this.refreshing ??= this.fetchAll(now).finally(() => (this.refreshing = null));
    return this.refreshing;
  }

  /** Fetches the named copies again (after a change was saved, or when the network is back). */
  async refetch(keys: readonly string[]): Promise<void> {
    if (!this.keeping()) return;
    const http = this.injector.get(HttpClient);
    const context = new HttpContext().set(COPY_REFRESH, true);
    for (const key of keys) {
      try {
        await firstValueFrom(http.get(this.addressOf(key), { context }));
      } catch {
        // The next answer, or the daily refresh, catches up.
      }
    }
  }

  /** The API address a copy is fetched from. */
  addressOf(key: string): string {
    return this.apiBase + '/' + key + ((RECORD_COLLECTIONS as readonly string[]).includes(key) ? '/getAll' : '');
  }

  /**
   * Keeps the server's answer for one copy. An answer a page asked for (not `refreshOnly`) also ends the read-only
   * view of that copy: the page now shows what the server holds.
   */
  async save(key: string, body: unknown, refreshOnly = false): Promise<void> {
    this.notSaved.set(false);
    if (!refreshOnly && this.shownKeys.delete(key)) this.showOldest();
    if (!this.keeping()) return;
    try {
      await this.ready;
      // Never written for a user this tab does not know.
      if (!this.user) await this.learnUser();
      const user = this.user;
      if (!user || !this.keeping()) return;
      const db = await this.open();
      const meta = await request<Meta | undefined>(db.transaction(STORE).objectStore(STORE).get(META));
      if (meta && (meta.schema !== SCHEMA || meta.userId !== user.id)) {
        await this.drop();
        return this.save(key, body, true);
      }
      // A clear that came while the database opened wins.
      if (!this.keeping()) return;
      const now = Date.now();
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put({ body, savedAt: now } satisfies Kept, key);
      tx.objectStore(STORE).put(this.metaFor(user, now), META);
      await done(tx);
    } catch {
      // No room, or the database is gone: the copy stays as it was.
    }
  }

  /** One copy, and when it was saved, or null. */
  async read(key: string): Promise<{ body: unknown; savedAt: Date } | null> {
    if (!this.keeping()) return null;
    try {
      await this.ready;
      if (this.held || !this.keeping()) return null;
      const store = (await this.open()).transaction(STORE).objectStore(STORE);
      const meta = await request<Meta | undefined>(store.get(META));
      if (!meta || meta.schema !== SCHEMA) return null;
      if (ended(meta)) {
        void this.clear();
        return null;
      }
      // Offline at start the user is not known: the copy is then the last session's, which every session start clears.
      if (this.user && meta.userId !== this.user.id) return null;
      const kept = await request<Kept | undefined>(store.get(key));
      return kept ? { body: kept.body, savedAt: new Date(kept.savedAt) } : null;
    } catch {
      return null;
    }
  }

  /** Notes that the copy answered in place of the server for `key` (saved at `savedAt`), or that there was none. */
  shown(key: string, savedAt: Date | null): void {
    if (savedAt) {
      this.shownKeys.set(key, savedAt);
      this.showOldest();
    } else if (this.auth.hasSession()) this.notSaved.set(true);
  }

  /**
   * A navigation starts (app.ts): what the last page showed no longer counts. Read-only, its date and the notices
   * follow the new page's own requests.
   */
  pageStarted(): void {
    this.shownKeys.clear();
    this.showOldest();
    this.notSaved.set(false);
  }

  /** Deletes the copy and its flag. Starts at once, so it runs before any page after a sign-out shows. */
  clear(): Promise<void> {
    for (const storage of [globalThis.localStorage, globalThis.sessionStorage]) {
      try {
        storage?.removeItem(RECORDS_FLAG);
      } catch {
        // Storage unavailable: there is no flag to remove.
      }
    }
    this.enabled.set(false);
    this.shownKeys.clear();
    this.showingCopy.set(null);
    this.notSaved.set(false);
    this.backOnline.set(false);
    this.user = null;
    this.held = false;
    return this.drop();
  }

  /**
   * Shows the date of the oldest copy on the page. Settings (preferences, prices) alone never make a page read-only:
   * they count only beside the recipes, whose page saves with them.
   */
  private showOldest(): void {
    const withSettings = this.shownKeys.has('recipe');
    const times = [...this.shownKeys]
      .filter(([key]) => withSettings || !(RECORD_SETTINGS as readonly string[]).includes(key))
      .map(([, date]) => date.getTime());
    this.showingCopy.set(times.length ? new Date(Math.min(...times)) : null);
    if (!times.length) this.backOnline.set(false);
  }

  private keeping(): boolean {
    return this.browser && this.enabled() && this.auth.hasSession() && this.auth.trial() === null;
  }

  /** At start: removes a copy whose session has run out; holds one whose browser session may have ended. */
  private async checkSession(): Promise<void> {
    if (!this.keeping()) return;
    const meta = await this.meta();
    if (!meta) return;
    if (ended(meta)) return this.clear();
    if (meta.sessionOnly && !this.tabNote()) this.held = true;
  }

  /** Asks /verify who is signed in (the interceptor notes it), once at a time. */
  private learnUser(): Promise<void> {
    if (this.user || !this.keeping()) return Promise.resolve();
    this.learning ??= firstValueFrom(this.injector.get(HttpClient).get(this.apiBase + '/verify'))
      .then(
        () => undefined,
        () => undefined
      )
      .finally(() => (this.learning = null));
    return this.learning;
  }

  /** Writes the meta record alone: whether this browser keeps anything at all. */
  private async writeMeta(): Promise<boolean> {
    const user = this.user;
    if (!user) return false;
    try {
      const db = await this.open();
      const tx = db.transaction(STORE, 'readwrite');
      const old = await request<Meta | undefined>(tx.objectStore(STORE).get(META));
      tx.objectStore(STORE).put(this.metaFor(user, old?.userId === user.id ? old.savedAt : 0), META);
      await done(tx);
      return true;
    } catch {
      return false;
    }
  }

  private metaFor(user: SignedInUser, savedAt: number): Meta {
    return { userId: user.id, savedAt, schema: SCHEMA, sessionEndsAt: user.endsAt, sessionOnly: user.sessionOnly };
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
        const db = opening.result;
        // An older layout: its copies are dropped.
        if (db.objectStoreNames.contains(STORE)) db.deleteObjectStore(STORE);
        db.createObjectStore(STORE);
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

  private tabNote(): boolean {
    try {
      return sessionStorage.getItem(RECORDS_FLAG) === '1';
    } catch {
      return false;
    }
  }
}

/** Whether the sign-in the copy was kept for has run out. */
function ended(meta: Meta): boolean {
  return typeof meta.sessionEndsAt === 'number' && meta.sessionEndsAt <= Date.now();
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
