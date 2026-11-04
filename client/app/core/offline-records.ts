import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpContext, HttpContextToken } from '@angular/common/http';
import { DestroyRef, Injectable, Injector, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { translate } from '@jsverse/transloco';
import { marker } from '@jsverse/transloco-keys-manager/marker';
import { firstValueFrom } from 'rxjs';
import { formatDate } from '../shared/format';
import { API_BASE } from './api-base';
import { AuthService, type SessionEndReason } from './auth.service';
import { OfflineAsk } from './offline-ask';
import { Outbox, applyEntry, type OutboxEntry } from './outbox';
import {
  CURRENT,
  META,
  OUTBOX,
  RECORDS_DB,
  SCHEMA,
  STORE,
  accountOf,
  copyKey,
  deleteRecordsDb,
  done,
  openRecordsDb,
  request
} from './records-db';

export { RECORDS_DB };
/**
 * In this browser's storage: "1" while the account signed in last wants its records kept on this device;
 * RECORDS_LOCKED while only other accounts' copies are kept here (locked, never shown).
 */
export const RECORDS_FLAG = 'offlineRecords';
export const RECORDS_LOCKED = 'locked';
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

/** What the sign-out question decided. */
export type SignOutChoice = 'keep' | 'delete' | 'cancel';

/**
 * Whether this is an iPhone or iPad browser that is not the app on the home screen: Safari may remove what a site
 * keeps there after 7 days without use. `standaloneMedia` is whether the display mode is "standalone".
 */
export function iosEvictionRisk(
  nav: { userAgent: string; platform?: string; maxTouchPoints?: number; standalone?: boolean },
  standaloneMedia: boolean
): boolean {
  const ios = /iPad|iPhone|iPod/.test(nav.userAgent) || (nav.platform === 'MacIntel' && (nav.maxTouchPoints ?? 0) > 1);
  return ios && nav.standalone !== true && !standaloneMedia;
}

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
 * it (`clear`), or deletes their account. Each account's copy is kept under its own id: a different user signing
 * in locks the previous user's copy and queue away (never shown, never sent, kept for their next sign-in, deleted
 * only by that user, or by clearing the browser's storage). The app never tells one account whether another has
 * anything here, and never lets one delete another's. Not encrypted by the app: the browser
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
  /** Turning the copy on in an iPhone or iPad browser: Safari may remove it after 7 days without use. */
  readonly iosNotice = signal(false);
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
    if (!this.storesAnything()) this.ready = this.drop();
    // Changes waiting from before: counted at once, so a start with no network shows them (the user is the copy's).
    else if (this.outbox().noted()) queueMicrotask(() => void this.outbox().refreshCount());
    // Another tab turned the copy off, or the storage was cleared by the person.
    const onStorage = (event: StorageEvent) => {
      if (event.key === null) void this.clear();
      else if (event.key === RECORDS_FLAG && event.newValue !== '1') {
        this.enabled.set(false);
        this.forgetState();
      }
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
   * once, and the user's waiting changes with it, after asking when there are any). Resolves with whether it is on.
   */
  async setEnabled(on: boolean): Promise<boolean> {
    this.notKept.set(false);
    if (!on || !this.available()) {
      if (on === false && this.enabled()) {
        const count = await this.unsentCount();
        if (
          count > 0 &&
          !(await this.confirmDelete(marker('offline.turnOffTitle'), marker('offline.turnOffConfirm'), count))
        )
          return this.enabled();
      }
      this.iosNotice.set(false);
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
    this.keepPersistent();
    this.iosNotice.set(this.iosAtRisk());
    await this.refresh(true);
    return this.enabled();
  }

  /** Asks the browser not to remove the copy when it is short of space. Best effort: it may say no. */
  private keepPersistent(): void {
    try {
      void navigator.storage?.persist?.().catch(() => undefined);
    } catch {
      // Not offered here.
    }
  }

  private iosAtRisk(): boolean {
    try {
      const nav = navigator as Navigator & { standalone?: boolean };
      return iosEvictionRisk(nav, !!window.matchMedia?.('(display-mode: standalone)').matches);
    } catch {
      return false;
    }
  }

  /** Whether this browser may hold a copy or changes waiting (so a sign-out has something to ask about). */
  keepsAnything(): boolean {
    return this.browser && (this.enabled() || this.outbox().noted());
  }

  /** How many changes of the signed-in user have not been sent (any state), as the outbox counts them now. */
  async unsentCount(): Promise<number> {
    if (!this.outbox().noted()) return 0;
    await this.outbox()
      .refreshCount()
      .catch(() => undefined);
    return this.outbox().count();
  }

  /** Asks to delete, naming how many unsent changes go with it; true when the person agrees. */
  private async confirmDelete(title: string, confirm: string, count: number): Promise<boolean> {
    const body = [translate(marker('offline.deleteBody'))];
    if (count > 0) body.push(translate(marker('offline.unsentLost'), { count }));
    const answer = await this.injector.get(OfflineAsk).ask({
      title: translate(title),
      body,
      choices: [
        { id: 'cancel', label: translate(marker('offline.cancel')), primary: true },
        { id: 'delete', label: translate(confirm), danger: true }
      ],
      cancel: 'cancel'
    });
    return answer === 'delete';
  }

  /** The "Clear offline data" button: asks, then deletes the copy and this user's waiting changes. */
  async clearWithConfirm(): Promise<boolean> {
    const count = await this.unsentCount();
    if (!(await this.confirmDelete(marker('offline.clearTitle'), marker('offline.clearButton'), count))) return false;
    await this.clear();
    return true;
  }

  /**
   * Before signing out: when this browser holds a copy or changes waiting, tries to send them (online), then asks
   * whether to keep them on this device (the default) or delete them, naming how many changes are unsent. Nothing
   * is deleted here: the caller deletes (`clear`) on 'delete' and does not sign out on 'cancel'.
   */
  async askSignOut(): Promise<SignOutChoice> {
    if (!this.browser || this.auth.trial() !== null) return 'keep';
    if (navigator.onLine !== false)
      await this.outbox()
        .flush()
        .catch(() => undefined);
    const count = await this.unsentCount();
    if (!this.enabled() && count === 0) return 'keep';
    const body = [translate(marker('offline.signOutBody'))];
    if (count > 0) body.push(translate(marker('offline.signOutUnsent'), { count }));
    body.push(translate(marker('offline.signOutHint')));
    const answer = await this.injector.get(OfflineAsk).ask({
      title: translate(marker('offline.signOutTitle')),
      body,
      choices: [
        { id: 'keep', label: translate(marker('offline.keepOnDevice')), primary: true },
        { id: 'delete', label: translate(marker('offline.deleteFromDevice')), danger: true },
        { id: 'cancel', label: translate(marker('offline.cancel')) }
      ],
      cancel: 'cancel'
    });
    return answer === 'keep' || answer === 'delete' ? answer : 'cancel';
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
    return this.currentId();
  }

  /** The account whose copy is the one shown (the last one kept), or null. */
  private async currentId(): Promise<string | null> {
    if (!this.storesAnything()) return null;
    try {
      const db = await this.openAny();
      return (await request<string | undefined>(db.transaction(STORE).objectStore(STORE).get(CURRENT))) ?? null;
    } catch {
      return null;
    }
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
      // Only into the copy of the account that kept it: another account's sign-in is sorted out by checkOwner.
      const current = await request<string | undefined>(db.transaction(STORE).objectStore(STORE).get(CURRENT));
      if (current !== user.id) return;
      const shown = await this.outbox().overlay(key, body, user.id);
      // A clear that came while the database opened wins.
      if (!this.keeping()) return;
      const now = Date.now();
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put({ body: shown, savedAt: now } satisfies Kept, copyKey(user.id, key));
      tx.objectStore(STORE).put(this.metaFor(user, now), copyKey(user.id, META));
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
      // Offline at start the user is not known: the copy is then the last session's.
      const current = await request<string | undefined>(store.get(CURRENT));
      if (!current || (user && current !== user.id)) return null;
      const meta = await request<Meta | undefined>(store.get(copyKey(current, META)));
      if (!meta || meta.schema !== SCHEMA) return null;
      const kept = await request<Kept | undefined>(store.get(copyKey(current, key)));
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
      const key = copyKey(entry.userId, entry.area);
      const kept = await request<Kept | undefined>(tx.objectStore(STORE).get(key));
      if (kept) tx.objectStore(STORE).put({ ...kept, body: applyEntry(kept.body, entry) } satisfies Kept, key);
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
   * Deletes the signed-in user's copy, its flag and their waiting changes: the person's own choice (turning the copy
   * off, clearing offline data), or the account being deleted. Other accounts' locked copies and changes stay.
   */
  clear(): Promise<void> {
    return this.wipe();
  }

  /** The session ended. Only the person's sign-out or deleting the account removes anything. */
  private async sessionEnded(reason: SessionEndReason): Promise<void> {
    this.forgetState();
    if (reason === 'deleted') return this.clear();
    // A sign-out, a sign-in that ran out or a trial that ended: nothing is deleted here. The person chose in the
    // sign-out question (askSignOut: Keep on this device, or Delete, which the caller did with `clear` before). What
    // is kept stays locked to this user: the same user's next sign-in shows the copy and sends the changes, and
    // another account never sees them (checkOwner).
  }

  /** A sign-in starts: until /verify names the user, the copy may be another person's. */
  private sessionStarted(): void {
    this.user = null;
    this.held = this.enabled();
    this.learning = null;
    if (this.storesAnything()) void this.verify();
  }

  /**
   * /verify named the user: another person's copy is locked away (kept, not shown), and the user's own copy, if
   * they kept one here before, is shown again; the same person's queue is sent.
   */
  private async checkOwner(user: SignedInUser): Promise<void> {
    try {
      if (this.storesAnything() && this.user === user && (await this.currentId()) !== user.id)
        await this.switchTo(user);
    } finally {
      if (this.user === user) this.held = false;
    }
    if (this.user === user) {
      void this.outbox().refreshCount(user.id);
      void this.outbox().flush();
    }
  }

  /** Makes `user`'s copy the one shown, or none when they keep none here; every other copy stays, locked. */
  private async switchTo(user: SignedInUser): Promise<void> {
    let mine = false;
    try {
      const db = await this.openAny();
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const meta = await request<Meta | undefined>(store.get(copyKey(user.id, META)));
      mine = meta?.schema === SCHEMA;
      if (mine) store.put(user.id, CURRENT);
      else store.delete(CURRENT);
      await done(tx);
    } catch {
      // Could not look: nothing is shown, nothing is deleted.
      mine = false;
    }
    if (this.user !== user) return;
    this.forgetState();
    this.user = user;
    this.setFlag(mine ? '1' : RECORDS_LOCKED);
    this.enabled.set(mine);
    if (mine) void this.refresh();
  }

  /** Whether this browser may hold a copy (any account's) or waiting changes. */
  private storesAnything(): boolean {
    return this.browser && (this.rawFlag() !== null || this.outbox().noted());
  }

  private rawFlag(): string | null {
    try {
      return localStorage.getItem(RECORDS_FLAG);
    } catch {
      return null;
    }
  }

  private setFlag(value: string | null): void {
    try {
      if (value === null) localStorage.removeItem(RECORDS_FLAG);
      else localStorage.setItem(RECORDS_FLAG, value);
    } catch {
      // Storage unavailable.
    }
  }

  /** Opens the database whether or not the signed-in user keeps a copy: only call it when storesAnything. */
  private openAny(): Promise<IDBDatabase> {
    return this.db ?? openRecordsDb(() => (this.db = null));
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
      const old = await request<Meta | undefined>(tx.objectStore(STORE).get(copyKey(user.id, META)));
      tx.objectStore(STORE).put(this.metaFor(user, old?.schema === SCHEMA ? old.savedAt : 0), copyKey(user.id, META));
      tx.objectStore(STORE).put(user.id, CURRENT);
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
      const store = (await this.open()).transaction(STORE).objectStore(STORE);
      const current = this.user?.id ?? (await request<string | undefined>(store.get(CURRENT)));
      if (!current) return null;
      return (await request<Meta | undefined>(store.get(copyKey(current, META)))) ?? null;
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
   * Deletes the copy of the user it is of, the flag, and that user's waiting changes. Other accounts' locked copies
   * and changes always stay. The database itself goes when nothing is left in it. Starts at once, so it runs before
   * any page after a sign-out shows.
   */
  private async wipe(): Promise<void> {
    const owner = this.user?.id ?? null;
    const stored = this.storesAnything();
    // At once: no page after a sign-out reads the copy. Set back to "locked" below if other accounts keep copies.
    this.setFlag(null);
    try {
      globalThis.sessionStorage?.removeItem(RECORDS_FLAG);
    } catch {
      // Storage unavailable: there is no flag to remove.
    }
    this.enabled.set(false);
    this.forgetState();
    if (!this.browser || typeof indexedDB === 'undefined') return;
    let otherCopies = 0;
    let otherChanges = 0;
    if (stored) {
      try {
        const db = await (this.db ?? openRecordsDb(() => (this.db = null)));
        const tx = db.transaction([STORE, OUTBOX], 'readwrite');
        const copies = tx.objectStore(STORE);
        const current = await request<string | undefined>(copies.get(CURRENT));
        const mine = owner ?? current ?? null;
        copies.delete(CURRENT);
        for (const key of await request<IDBValidKey[]>(copies.getAllKeys())) {
          const account = accountOf(key);
          if (account !== null && account === mine) copies.delete(key);
          else if (account !== null) otherCopies++;
        }
        const entries = await request<OutboxEntry[]>(tx.objectStore(OUTBOX).getAll());
        for (const entry of entries) {
          if (mine !== null && entry.userId === mine) tx.objectStore(OUTBOX).delete(entry.seq!);
          else otherChanges++;
        }
        await done(tx);
        if (!this.db) db.close();
      } catch {
        // Could not look: the database is not deleted, since it could hold a change.
        otherChanges = 1;
      }
      await this.outbox()
        .refreshCount(owner ?? undefined)
        .catch(() => undefined);
    }
    if (otherCopies > 0) this.setFlag(RECORDS_LOCKED);
    if (otherCopies > 0 || otherChanges > 0) return;
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
