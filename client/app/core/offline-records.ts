import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpContext, HttpContextToken } from '@angular/common/http';
import { DestroyRef, Injectable, Injector, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { translate } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { formatDate } from '../shared/format';
import { API_BASE } from './api-base';
import { AuthService, type SessionEndReason } from './auth.service';
import { Outbox, applyEntry, type OutboxEntry } from './outbox';
import { META, OUTBOX, RECORDS_DB, SCHEMA, STORE, deleteRecordsDb, done, openRecordsDb, request } from './records-db';

export { RECORDS_DB };
/**
 * In this browser's storage: "1" while the user wants their records kept on this device.
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
/** The copy is fetched again in full when it is this old (ms). */
const REFRESH_AFTER_MS = 24 * 60 * 60 * 1000;

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
 * Off unless the user turns it on, per device, and never during a trial. The copy is only read when the network
 * fails (status 0), never on a server's error. It is written through on every answer the server gives while online
 * (core/offline-records.interceptor.ts). Changes made while the network is gone are queued (core/outbox.ts) and
 * made to the copy at once.
 *
 * The person's work is not deleted behind their back. Closing the browser, restarting the device, the sign-in
 * running out (offline or not), a session-only sign-in after the browser closed, and a failed /verify while
 * offline all leave the copy and the queue as they are. They go only when the person turns the copy off or clears
 * it (`clear`), or deletes their account. A different user signing in locks the previous user's queue away (never
 * shown, never sent, kept for their next sign-in) and replaces the copy. Not encrypted by the app: the browser
 * keeps each site's storage apart and the device encrypts its disk.
 */
@Injectable({ providedIn: 'root' })
export class OfflineRecords {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly injector = inject(Injector);
  private readonly apiBase = inject(API_BASE);
  private readonly auth = inject(AuthService);
  private db: Promise<IDBDatabase> | null = null;
  /** The start-up delete of a database nothing needs; the database is not opened until it is done. */
  private ready: Promise<void> = Promise.resolve();
  private refreshing: Promise<void> | null = null;
  private learning: Promise<void> | null = null;
  /** The user /verify named in this tab, once known; a copy of anyone else's is never read or written. */
  private user: SignedInUser | null = null;
  /** A sign-in just started and /verify has not named the user: the copy may be another person's, so it is not read. */
  private held = false;
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
    this.auth.onSessionEnd((reason) => void this.sessionEnded(reason));
    // A new sign-in: the copy may be another person's until /verify names who signed in.
    this.auth.onSessionStart(() => this.sessionStarted());
    // A copy left behind that nothing needs (no flag, no waiting change): a clear another tab blocked.
    if (!this.enabled() && !this.outbox().noted()) this.ready = this.drop();
    // Another tab turned the copy off, or the storage was cleared by the person.
    const onStorage = (event: StorageEvent) => {
      if (event.key === null) void this.clear();
      else if (event.key === RECORDS_FLAG && event.newValue === null) this.forgetState();
    };
    // The network is back: refresh the copies that were shown, offer to load the page again, and send the changes
    // made meanwhile. The page stays read-only until it is loaded again.
    const onOnline = () => {
      void this.outbox().flush();
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

  /** Whether records are kept on this device right now, so changes can be queued. */
  isKeeping(): boolean {
    return this.keeping();
  }

  /**
   * Turns keeping the copy on (checks that this browser keeps it, then fetches it at once) or off (deletes it at
   * once, and the user's waiting changes with it). Resolves with whether it is on.
   * TODO(phase 4): turning it off with unsent changes asks first, listing their count.
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
    void this.checkOwner(user);
  }

  /**
   * Who the changes made now belong to: the user /verify named, else the one the copy was kept for (the app started
   * with no network), else null.
   */
  async ownerId(): Promise<string | null> {
    if (this.user) return this.user.id;
    return (await this.meta())?.userId ?? null;
  }

  /** Who is signed in, asking /verify if this tab does not know yet; null when nobody is, or it cannot be asked. */
  async whoIs(): Promise<string | null> {
    if (!this.user && this.auth.hasSession() && this.auth.trial() === null) await this.verify();
    return this.user?.id ?? null;
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
   * Keeps the server's answer for one copy, with the changes still waiting to be sent made to it. An answer a page
   * asked for (not `refreshOnly`) also ends the read-only view of that copy: the page now shows what the server holds.
   */
  async save(key: string, body: unknown, refreshOnly = false): Promise<void> {
    this.notSaved.set(false);
    if (!refreshOnly && this.shownKeys.delete(key)) this.showOldest();
    if (!this.keeping()) return;
    try {
      // Never written for a user this tab does not know.
      if (!this.user) await this.learnUser();
      const user = this.user;
      if (!user || !this.keeping()) return;
      const db = await this.open();
      const meta = await request<Meta | undefined>(db.transaction(STORE).objectStore(STORE).get(META));
      if (meta && (meta.schema !== SCHEMA || meta.userId !== user.id)) {
        // Another person's copy (or an older layout): replaced. Their waiting changes stay, locked.
        await this.wipe(false);
        this.user = user;
        return;
      }
      const shown = await this.outbox().overlay(key, body, user.id);
      // A clear that came while the database opened wins.
      if (!this.keeping()) return;
      const now = Date.now();
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put({ body: shown, savedAt: now } satisfies Kept, key);
      tx.objectStore(STORE).put(this.metaFor(user, now), META);
      await done(tx);
    } catch {
      // No room, or the database is gone: the copy stays as it was.
    }
  }

  /** One copy, and when it was saved, or null. */
  async read(key: string): Promise<{ body: unknown; savedAt: Date } | null> {
    if (!this.keeping() || this.held) return null;
    const user = this.user;
    try {
      const store = (await this.open()).transaction(STORE).objectStore(STORE);
      const meta = await request<Meta | undefined>(store.get(META));
      if (!meta || meta.schema !== SCHEMA) return null;
      // Offline at start the user is not known: the copy is then the last session's.
      if (user && meta.userId !== user.id) return null;
      const kept = await request<Kept | undefined>(store.get(key));
      return kept ? { body: kept.body, savedAt: new Date(kept.savedAt) } : null;
    } catch {
      return null;
    }
  }

  /**
   * Makes a change that is queued (core/outbox.ts) to the copy now, so pages read it back while offline. The copy's
   * own time stays: it is still as old as the server's last answer.
   */
  async applyLocal(entry: Pick<OutboxEntry, 'area' | 'op' | 'id' | 'body' | 'userId'>): Promise<void> {
    if (!this.keeping()) return;
    try {
      const db = await this.open();
      const tx = db.transaction(STORE, 'readwrite');
      const kept = await request<Kept | undefined>(tx.objectStore(STORE).get(entry.area));
      if (kept) tx.objectStore(STORE).put({ ...kept, body: applyEntry(kept.body, entry) } satisfies Kept, entry.area);
      await done(tx);
    } catch {
      // The copy stays as it was; the change is still queued.
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

  /**
   * Deletes the copy, its flag and the signed-in user's waiting changes: the person's own choice (turning the copy
   * off, clearing offline data), or the account being deleted. Another user's locked changes stay.
   */
  clear(): Promise<void> {
    return this.wipe(true);
  }

  /**
   * Deletes the copy and its flag but keeps every waiting change, locked to its user: the sign-in ended by the
   * person's own sign-out, or another person's sign-in.
   */
  private lockAway(): Promise<void> {
    return this.wipe(false);
  }

  /** The session ended. Only the person's sign-out or deleting the account removes anything. */
  private async sessionEnded(reason: SessionEndReason): Promise<void> {
    this.forgetState();
    if (reason === 'deleted') return this.clear();
    // TODO(phase 4): a sign-out dialog (default "Keep on this device") decides here. Until then a sign-out deletes
    // the copy as it always did, but never queued changes: they stay, locked to this user, until they sign in again.
    if (reason === 'signed-out') return this.lockAway();
    // The sign-in ran out, or a trial ended: nothing is deleted. The same user's next sign-in carries on.
  }

  /** A sign-in starts: until /verify names the user, the copy may be another person's. */
  private sessionStarted(): void {
    this.user = null;
    this.held = this.enabled();
    this.learning = null;
    if (this.enabled() || this.outbox().noted()) void this.verify();
  }

  /** /verify named the user: another person's copy is locked away; the same person's queue is sent. */
  private async checkOwner(user: SignedInUser): Promise<void> {
    try {
      const meta = await this.meta();
      if (meta && meta.userId !== user.id && this.user === user) {
        await this.lockAway();
        // The person who signed in is still signed in.
        this.user = user;
      }
    } finally {
      if (this.user === user) this.held = false;
    }
    if (this.user === user) {
      void this.outbox().refreshCount(user.id);
      void this.outbox().flush();
    }
  }

  /** Resets what this tab knows and shows; storage is left as it is. */
  private forgetState(): void {
    this.shownKeys.clear();
    this.showingCopy.set(null);
    this.notSaved.set(false);
    this.backOnline.set(false);
    this.user = null;
    this.held = false;
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

  private outbox(): Outbox {
    return this.injector.get(Outbox);
  }

  /** Asks /verify who is signed in (the interceptor notes it), once at a time. */
  private verify(): Promise<void> {
    this.learning ??= firstValueFrom(this.injector.get(HttpClient).get(this.apiBase + '/verify'))
      .then(
        () => undefined,
        () => undefined
      )
      .finally(() => (this.learning = null));
    return this.learning;
  }

  /** The same, for the copy: only while it is kept. */
  private learnUser(): Promise<void> {
    if (this.user || !this.keeping()) return Promise.resolve();
    return this.verify();
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
    this.db ??= this.ready
      .then(() => openRecordsDb(() => (this.db = null)))
      .catch((err: unknown) => {
        this.db = null;
        throw err;
      });
    return this.db;
  }

  /**
   * Deletes the copy and its flag, and with `ownChanges` the waiting changes of the user the copy is of. Other
   * users' waiting changes always stay (locked). The database itself goes when nothing is left in it. Starts at
   * once, so it runs before any page after a sign-out shows.
   */
  private async wipe(ownChanges: boolean): Promise<void> {
    const owner = this.user?.id ?? null;
    for (const storage of [globalThis.localStorage, globalThis.sessionStorage]) {
      try {
        storage?.removeItem(RECORDS_FLAG);
      } catch {
        // Storage unavailable: there is no flag to remove.
      }
    }
    this.enabled.set(false);
    this.forgetState();
    if (!this.browser || typeof indexedDB === 'undefined') return;
    let left = 0;
    if (this.outbox().noted()) {
      try {
        const db = await (this.db ?? openRecordsDb(() => (this.db = null)));
        const tx = db.transaction([STORE, OUTBOX], 'readwrite');
        const meta = await request<Meta | undefined>(tx.objectStore(STORE).get(META));
        tx.objectStore(STORE).clear();
        const mine = owner ?? meta?.userId ?? null;
        const entries = await request<OutboxEntry[]>(tx.objectStore(OUTBOX).getAll());
        for (const entry of entries) {
          if (ownChanges && mine !== null && entry.userId === mine) tx.objectStore(OUTBOX).delete(entry.seq!);
          else left++;
        }
        await done(tx);
        if (!this.db) db.close();
      } catch {
        // Could not look: nothing is deleted that could hold a change.
        left = 1;
      }
      await this.outbox()
        .refreshCount(owner ?? undefined)
        .catch(() => undefined);
    }
    if (left > 0) return;
    await this.drop();
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
    await this.outbox().close();
    // Another tab holds it open; it closes on versionchange, and the next start deletes it if not.
    await deleteRecordsDb();
  }

  private readFlag(): boolean {
    try {
      return this.browser && localStorage.getItem(RECORDS_FLAG) === '1';
    } catch {
      return false;
    }
  }
}
