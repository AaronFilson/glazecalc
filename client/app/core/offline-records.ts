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
import { deviceExport, saveJson } from './offline-export';
import { OUTBOX_SYNC_MESSAGE, Outbox, applyEntry, type OutboxEntry } from './outbox';
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
const DAY_MS = 24 * 60 * 60 * 1000;
/**
 * In this browser's storage: the id of an account the server said no longer exists (deleted elsewhere) while its
 * offline copy or changes are still here, until the person exports and clears them, or clears them.
 */
export const OFFLINE_GONE = 'offlineGone';
/** The choices for how long the offline data is kept without Glazecalc being opened here, in days; null: forever. */
export const KEEP_CHOICES: readonly (number | null)[] = [null, 7, 30, 90, 365];

/**
 * Whether an account's copy has gone unused for longer than the person chose (`keepDays`, null: kept forever),
 * counted from when Glazecalc was last opened here with it (`usedAt`, else when it was last saved).
 */
export function keepExpired(
  meta: { keepDays?: number | null; usedAt?: number; savedAt: number },
  now: number
): boolean {
  if (!meta.keepDays) return false;
  const used = meta.usedAt ?? meta.savedAt;
  return used > 0 && now - used > meta.keepDays * DAY_MS;
}

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
  /** How long the person keeps the copy without opening Glazecalc here, in days; absent or null: forever. */
  keepDays?: number | null;
  /** When Glazecalc was last opened here with this copy (ms). */
  usedAt?: number;
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
 * it (`clear`), or deletes their account; when the time they chose to keep it (`setKeepDays`) passed without
 * Glazecalc being opened here, it goes as the site next opens (never in the background); and when the server says
 * the account was deleted elsewhere, it goes only after the person exports it or chooses to clear it (`askGone`).
 * Each account's copy is kept under its own id: a different user signing
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
   * The copy is being turned on (setEnabled) and is not written yet: the user's own is about to be, so checkOwner
   * leaves it rather than switch to it a second time.
   */
  private turningOn = false;
  /** Torn down (the app, or a test's injector): work still on its way stops before it touches anything. */
  private destroyed = false;
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
  /** How long the signed-in user keeps their copy without opening Glazecalc here (days); null: until they delete it. */
  readonly keepDays = signal<number | null>(null);
  /** The copy was removed as this site opened, because it went unused for longer than the person chose. */
  readonly keepRemoved = signal(false);
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
    else {
      // Changes waiting from before: counted at once, so a start with no network shows them (the user is the copy's).
      if (this.outbox().noted())
        queueMicrotask(() => {
          if (!this.destroyed) void this.outbox().refreshCount();
        });
      // The site opens: the time the person chose to keep the copy is checked now, and only now.
      this.ready = this.opened();
    }
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
    // More moments to send what waits, as the `online` event is not fired everywhere it should be (Safari on waking,
    // a tab brought back from the back-forward cache, a phone's app switched back to): the page shown again, and the
    // service worker's Background Sync where the browser has it (core/outbox.ts requestSync).
    const onShown = () => {
      if (document.visibilityState !== 'hidden') void this.outbox().flush();
    };
    const onWorker = (event: MessageEvent) => {
      if ((event.data as { type?: unknown } | null)?.type === OUTBOX_SYNC_MESSAGE) void this.outbox().flush();
    };
    const worker = typeof navigator !== 'undefined' ? navigator.serviceWorker : undefined;
    window.addEventListener('storage', onStorage);
    window.addEventListener('online', onOnline);
    window.addEventListener('pageshow', onShown);
    document.addEventListener('visibilitychange', onShown);
    worker?.addEventListener('message', onWorker);
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('pageshow', onShown);
      document.removeEventListener('visibilitychange', onShown);
      worker?.removeEventListener('message', onWorker);
    });
  }

  /**
   * The site opens with something kept here. The copy shown (the last one kept) is removed when it went unused for
   * longer than its account chose; otherwise it is noted as used now. Another account's locked copy is checked only
   * when that account signs in here (switchTo). An account the server said was deleted is asked about again, while
   * nobody is signed in and nobody else has signed in here since.
   */
  private async opened(): Promise<void> {
    if (this.rawFlag() === '1') {
      try {
        const db = await openRecordsDb(() => (this.db = null));
        const current = await request<string | undefined>(db.transaction(STORE).objectStore(STORE).get(CURRENT));
        db.close();
        if (current) await this.checkKeep(current);
      } catch {
        // Could not look: nothing is removed.
      }
    }
    const gone = this.goneId();
    if (gone && !this.auth.hasSession()) {
      const current = await this.currentId();
      if (this.destroyed) return;
      if (current === gone || (current === null && (await this.outbox().mine(gone)).length > 0))
        void this.askGone(gone);
      else if (current !== null) this.setGone(null);
    }
  }

  /**
   * Removes `userId`'s copy and changes when they went unused longer than the account chose; else notes them as
   * used now. Only ever for the account that is opening the site here. True when they were removed.
   */
  private async checkKeep(userId: string): Promise<boolean> {
    if (this.destroyed) return false;
    const db = await openRecordsDb(() => undefined);
    try {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const meta = await request<Meta | undefined>(store.get(copyKey(userId, META)));
      if (!meta || meta.schema !== SCHEMA) {
        await done(tx);
        return false;
      }
      const now = Date.now();
      const expired = keepExpired(meta, now);
      if (!expired) store.put({ ...meta, usedAt: now } satisfies Meta, copyKey(userId, META));
      await done(tx);
      if (!expired) {
        this.keepDays.set(meta.keepDays ?? null);
        return false;
      }
    } finally {
      db.close();
    }
    await this.wipe(userId);
    this.keepRemoved.set(true);
    return true;
  }

  /** Sets how long the signed-in user's copy is kept without Glazecalc being opened here (days; null: forever). */
  async setKeepDays(days: number | null): Promise<void> {
    const user = this.user ?? (await this.learnUser().then(() => this.user));
    if (!user || !this.keeping()) return;
    try {
      const db = await this.open();
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const meta = await request<Meta | undefined>(store.get(copyKey(user.id, META)));
      const base = meta?.schema === SCHEMA ? meta : this.metaFor(user, 0);
      store.put({ ...base, keepDays: days, usedAt: Date.now() } satisfies Meta, copyKey(user.id, META));
      await done(tx);
      this.keepDays.set(days);
    } catch {
      // Not saved: the setting stays as it was.
    }
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
    this.turningOn = true;
    let written: boolean;
    try {
      await this.learnUser();
      written = !this.user || (await this.writeMeta());
    } finally {
      this.turningOn = false;
    }
    if (!written) {
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
      // The person's own choices in the meta (how long to keep it) stay.
      const old = await request<Meta | undefined>(tx.objectStore(STORE).get(copyKey(user.id, META)));
      tx.objectStore(STORE).put(this.metaFor(user, now, old), copyKey(user.id, META));
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
    const user = this.user;
    this.forgetState();
    if (reason === 'deleted') return this.clear();
    if (reason === 'gone') {
      // Deleted elsewhere: the person is asked to export what this device holds before it is cleared.
      const id = user?.id ?? (await this.currentId());
      if (!id) return;
      const current = await this.currentId();
      if (this.destroyed) return;
      if (current === id || (await this.outbox().mine(id)).length > 0) {
        if (this.destroyed) return;
        this.setGone(id);
        await this.askGone(id);
      }
      return;
    }
    // A sign-out, a sign-in that ran out or a trial that ended: nothing is deleted here. The person chose in the
    // sign-out question (askSignOut: Keep on this device, or Delete, which the caller did with `clear` before). What
    // is kept stays locked to this user: the same user's next sign-in shows the copy and sends the changes, and
    // another account never sees them (checkOwner).
  }

  /**
   * The server said account `id` no longer exists while this device holds its copy or changes: asks the person to
   * export them (a file in the format of "Download my data"), clear them without exporting, or decide later. Nothing
   * is cleared until they choose to; "Later" asks again the next time the site opens.
   */
  private async askGone(id: string): Promise<void> {
    if (this.destroyed) return;
    const ask = this.injector.get(OfflineAsk);
    const count = (await this.outbox().mine(id)).length;
    const body = [translate(marker('offline.goneBody'))];
    if (count > 0) body.push(translate(marker('offline.unsentLost'), { count }));
    body.push(translate(marker('offline.goneHint')));
    const answer = await ask.ask({
      title: translate(marker('offline.goneTitle')),
      body,
      choices: [
        { id: 'export', label: translate(marker('offline.goneExport')), primary: true },
        { id: 'clear', label: translate(marker('offline.goneClear')), danger: true },
        { id: 'later', label: translate(marker('offline.goneLater')) }
      ],
      cancel: 'later'
    });
    if (answer === 'export') {
      await this.exportCopy(id);
      const then = await ask.ask({
        title: translate(marker('offline.goneTitle')),
        body: [translate(marker('offline.goneExported'))],
        choices: [
          { id: 'clear', label: translate(marker('offline.deleteFromDevice')), danger: true },
          { id: 'later', label: translate(marker('offline.goneLater')), primary: true }
        ],
        cancel: 'later'
      });
      if (then !== 'clear') return;
    } else if (answer !== 'clear') return;
    // Only this account's copy and changes, and only if nobody signed in meanwhile.
    if (this.goneId() !== id || this.auth.hasSession() || this.destroyed) return;
    await this.wipe(id);
    this.setGone(null);
  }

  /** Saves account `id`'s offline copy, with its changes not sent yet, as a file (core/offline-export.ts). */
  async exportCopy(id: string): Promise<void> {
    const copies: Record<string, unknown> = {};
    try {
      const store = (await this.openAny()).transaction(STORE).objectStore(STORE);
      for (const key of RECORD_KEYS) {
        const kept = await request<Kept | undefined>(store.get(copyKey(id, key)));
        if (kept) copies[key] = kept.body;
      }
    } catch {
      // Nothing could be read: the file holds what the outbox has.
    }
    if (this.destroyed) return;
    const day = new Date().toISOString().slice(0, 10);
    saveJson(deviceExport(id, copies, await this.outbox().mine(id)), `glazecalc-offline-data-${day}.json`);
  }

  /** The account the server said was deleted, whose data here waits for the person's choice, or null. */
  goneId(): string | null {
    try {
      return this.browser ? localStorage.getItem(OFFLINE_GONE) : null;
    } catch {
      return null;
    }
  }

  private setGone(id: string | null): void {
    try {
      if (id) localStorage.setItem(OFFLINE_GONE, id);
      else localStorage.removeItem(OFFLINE_GONE);
    } catch {
      // Storage unavailable: asked again only in this tab.
    }
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
    // Named while the copy is being turned on: setEnabled writes the user's own copy itself.
    const turningOn = this.turningOn;
    try {
      if (!turningOn && this.storesAnything() && this.user === user && (await this.needsSwitch(user)))
        await this.switchTo(user);
    } finally {
      if (this.user === user) this.held = false;
    }
    if (this.user === user && !this.destroyed) {
      void this.outbox().refreshCount(user.id);
      void this.outbox().flush();
    }
  }

  /**
   * Whether `user`'s sign-in changes which copy is shown: the copy shown last is another account's, or it is
   * theirs but locked. A sign-in during which the database could not be opened locks the copy without changing
   * whose it is, so the account's next sign-in shows it again rather than leave it locked until turned on anew.
   */
  private async needsSwitch(user: SignedInUser): Promise<boolean> {
    return (await this.currentId()) !== user.id || this.rawFlag() === RECORDS_LOCKED;
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
    if (this.user !== user || this.destroyed) return;
    // The account opens the site here again: its own time to keep the copy is checked now.
    if (mine && (await this.checkKeep(user.id).catch(() => false))) {
      this.user = user;
      return;
    }
    if (this.user !== user || this.destroyed) return;
    this.forgetState();
    this.user = user;
    this.setFlag(mine ? '1' : RECORDS_LOCKED);
    this.enabled.set(mine);
    if (mine) void this.refresh();
  }

  /** Whether this browser may hold a copy (any account's) or waiting changes. */
  private storesAnything(): boolean {
    return !this.destroyed && this.browser && (this.rawFlag() !== null || this.outbox().noted());
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
    // Torn down: IndexedDB may be another app's by now (a test's), and is not touched.
    if (this.destroyed) return Promise.reject(new Error('Torn down'));
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
    return !this.destroyed && this.browser && this.enabled() && this.auth.hasSession() && this.auth.trial() === null;
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
      const kept = old?.schema === SCHEMA ? old : undefined;
      tx.objectStore(STORE).put(this.metaFor(user, kept?.savedAt ?? 0, kept), copyKey(user.id, META));
      tx.objectStore(STORE).put(user.id, CURRENT);
      await done(tx);
      this.keepDays.set(kept?.keepDays ?? null);
      return true;
    } catch {
      return false;
    }
  }

  private metaFor(user: SignedInUser, savedAt: number, old?: Meta): Meta {
    return {
      userId: user.id,
      savedAt,
      schema: SCHEMA,
      sessionEndsAt: user.endsAt,
      sessionOnly: user.sessionOnly,
      keepDays: old?.schema === SCHEMA ? (old.keepDays ?? null) : null,
      usedAt: (old?.schema === SCHEMA && old.usedAt) || Date.now()
    };
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
  private async wipe(account?: string): Promise<void> {
    if (this.destroyed) return;
    const owner = account ?? this.user?.id ?? null;
    const stored = this.storesAnything();
    // At once: no page after a sign-out reads the copy. Set back to "locked" below if other accounts keep copies.
    this.setFlag(null);
    try {
      globalThis.sessionStorage?.removeItem(RECORDS_FLAG);
    } catch {
      // Storage unavailable: there is no flag to remove.
    }
    this.enabled.set(false);
    this.keepDays.set(null);
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
        if (account === undefined || current === account) copies.delete(CURRENT);
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
      if (this.destroyed) return;
      await this.outbox()
        .refreshCount(owner ?? undefined)
        .catch(() => undefined);
      if (this.destroyed) return;
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
