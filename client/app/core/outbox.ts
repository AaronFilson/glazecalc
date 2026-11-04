import { isPlatformBrowser } from '@angular/common';
import {
  HttpClient,
  HttpContext,
  HttpContextToken,
  HttpErrorResponse,
  HttpHeaders,
  HttpResponse
} from '@angular/common/http';
import { Injectable, Injector, PLATFORM_ID, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE } from './api-base';
import { OfflineRecords } from './offline-records';
import { OUTBOX, done, openRecordsDb, request } from './records-db';

/** Marks a request the outbox sends itself: the interceptor neither queues it again nor fetches the copy for it. */
export const OUTBOX_SEND = new HttpContextToken<boolean>(() => false);
/** In this browser's storage: "1" while the outbox may hold a change (so a start-up without any need not open it). */
export const OUTBOX_NOTE = 'offlineOutbox';
/** The start of the id a record made offline has until the server gives it one. */
const TMP = 'tmp:';
/** How long to wait before trying again after the server failed or was busy (ms). */
const RETRY_MS = 30_000;

/**
 * What a queued change does. create/change/delete are a record's (POST /<area>/create, PUT /<area>/change/:id,
 * DELETE /<area>/delete/:id); put is a preference's (PUT /preferences) and patch a price's (PATCH /prices).
 */
export type OutboxOp = 'create' | 'change' | 'delete' | 'put' | 'patch';
/**
 * waiting: to be sent. sending: on its way (after a crash it is sent again; its key makes that safe). conflict: the
 * record moved on or is gone (a later phase asks the user). failed: the server refused it; kept until removed.
 */
export type OutboxState = 'waiting' | 'sending' | 'conflict' | 'failed';

/** One change made while offline, waiting to be sent. */
export interface OutboxEntry {
  /** The order they were made in; set when it is stored. */
  seq?: number;
  /** Whose change it is: another user's entries are locked, never shown or sent. */
  userId: string;
  /** The Idempotency-Key it is sent with (server/models/idempotency.ts). */
  key: string;
  /** The collection (recipe, materials, ...), or preferences / prices. */
  area: string;
  op: OutboxOp;
  /** The record's id, `tmp:<uuid>` while it is not on the server; the area's name for a setting. */
  id: string;
  /** The record's rev when the change was made from it (sent as If-Match), or null for none. */
  baseRev: number | null;
  /** The record as it was then, for a later merge. */
  base?: unknown;
  /** What is sent. */
  body: unknown;
  queuedAt: number;
  state: OutboxState;
  error?: string;
}

/** A change as the interceptor made it out of a request. */
export interface OutboxCall {
  area: string;
  op: OutboxOp;
  /** Absent for a create. */
  id?: string;
  body?: unknown;
  baseRev?: number | null;
  base?: unknown;
}

type Body = Record<string, unknown>;
const isBody = (value: unknown): value is Body => !!value && typeof value === 'object' && !Array.isArray(value);

export const isTmp = (id: string): boolean => id.startsWith(TMP);

/** `value` with every string that is a key of `ids` replaced by its value, to any depth. */
export function rewriteIds<T>(value: T, ids: ReadonlyMap<string, string>): T {
  if (!ids.size) return value;
  const walk = (item: unknown): unknown => {
    if (typeof item === 'string') return ids.get(item) ?? item;
    if (Array.isArray(item)) return item.map(walk);
    if (isBody(item)) return Object.fromEntries(Object.entries(item).map(([k, v]) => [k, walk(v)]));
    return item;
  };
  return walk(value) as T;
}

/** The fields a record change sets (a recipe's is wrapped: { recipe: {...} }). */
function fieldsOf(call: Pick<OutboxCall, 'area' | 'op' | 'body'>): Body {
  const body = isBody(call.body) ? call.body : {};
  if (call.area === 'recipe' && call.op === 'change') return isBody(body['recipe']) ? body['recipe'] : {};
  return body;
}

/** Merges a later change into an earlier waiting one of the same record or setting; the body that results. */
function mergeBodies(earlier: OutboxEntry, call: OutboxCall): unknown {
  if (earlier.op === 'patch') {
    const prices = new Map<string, number | null>();
    for (const part of [earlier.body, call.body]) {
      const body = isBody(part) ? part : {};
      for (const price of Array.isArray(body['set']) ? (body['set'] as Array<{ key: string; perKg: number }>) : [])
        prices.set(price.key, price.perKg);
      for (const key of Array.isArray(body['remove']) ? (body['remove'] as string[]) : []) prices.set(key, null);
    }
    const currency = (isBody(call.body) && call.body['currency']) || (isBody(earlier.body) && earlier.body['currency']);
    return {
      set: [...prices].filter(([, perKg]) => perKg !== null).map(([key, perKg]) => ({ key, perKg })),
      remove: [...prices].filter(([, perKg]) => perKg === null).map(([key]) => key),
      ...(typeof currency === 'string' && currency ? { currency } : {})
    };
  }
  if (earlier.op === 'put')
    return { ...(isBody(earlier.body) ? earlier.body : {}), ...(isBody(call.body) ? call.body : {}) };
  const fields = fieldsOf(call);
  if (earlier.area === 'recipe' && earlier.op === 'change') return { recipe: { ...fieldsOf(earlier), ...fields } };
  return { ...(isBody(earlier.body) ? earlier.body : {}), ...fields };
}

/**
 * A copy's body as it is once a waiting change is made to it: what the copy holds locally, so pages read their own
 * offline changes back. `key` is the copy (the collection, or preferences / prices).
 */
export function applyEntry(body: unknown, entry: Pick<OutboxEntry, 'area' | 'op' | 'id' | 'body' | 'userId'>): unknown {
  switch (entry.op) {
    case 'create': {
      const list = Array.isArray(body) ? (body as Body[]) : [];
      if (list.some((record) => record['_id'] === entry.id)) return list;
      const fields = isBody(entry.body) ? entry.body : {};
      return [...list, { ...fields, _id: entry.id, ownedBy: entry.userId, rev: 0 }];
    }
    case 'change': {
      if (!Array.isArray(body)) return body;
      const fields = fieldsOf(entry);
      return (body as Body[]).map((record) => (record['_id'] === entry.id ? { ...record, ...fields } : record));
    }
    case 'delete':
      return Array.isArray(body) ? (body as Body[]).filter((record) => record['_id'] !== entry.id) : body;
    case 'put':
      return { ...(isBody(body) ? body : {}), ...(isBody(entry.body) ? entry.body : {}) };
    case 'patch': {
      const have = isBody(body) ? body : {};
      const given = isBody(entry.body) ? entry.body : {};
      const set = Array.isArray(given['set']) ? (given['set'] as Array<{ key: string; perKg: number }>) : [];
      const remove = Array.isArray(given['remove']) ? (given['remove'] as string[]) : [];
      const gone = new Set([...remove, ...set.map((price) => price.key)]);
      const prices = (Array.isArray(have['prices']) ? (have['prices'] as Array<{ key: string }>) : []).filter(
        (price) => !gone.has(price.key)
      );
      return {
        ...have,
        prices: [...prices, ...set],
        ...(typeof given['currency'] === 'string' && { currency: given['currency'] })
      };
    }
  }
}

/** Which of a request's address means an outbox change, or null. */
export function outboxCallOf(
  method: string,
  path: string,
  collections: readonly string[]
): { area: string; op: OutboxOp; id?: string } | null {
  const [, area, action, id, ...rest] = path.split('/');
  if (rest.length) return null;
  if (collections.includes(area)) {
    if (method === 'POST' && action === 'create' && id === undefined) return { area, op: 'create' };
    if (method === 'PUT' && action === 'change' && id) return { area, op: 'change', id };
    if (method === 'DELETE' && action === 'delete' && id) return { area, op: 'delete', id };
    return null;
  }
  if (area === 'preferences' && action === undefined && method === 'PUT') return { area, op: 'put', id: area };
  if (area === 'prices' && action === undefined && method === 'PATCH') return { area, op: 'patch', id: area };
  return null;
}

/**
 * The changes the user made while offline, kept in the same IndexedDB database as the copy of their records
 * (core/offline-records.ts) and sent when the network is back: first in, first out, one at a time, in one tab
 * at a time (a Web Lock). Each change updates the copy at once, so pages read it back. A change is queued only
 * while records are kept on the device; it is sent with the Idempotency-Key it was queued under and, for a
 * change or delete, If-Match of the record's rev when it was made from (server/lib/record_rev.ts).
 *
 * Nothing here deletes a change but the person: closing the browser, a restart, or the sign-in running out leaves
 * the queue as it is; sending waits (`signInNeeded`) until the same user signs in again. Another user's changes are
 * locked: never shown or sent. Only the user's own choice removes them (OfflineRecords.clear).
 */
@Injectable({ providedIn: 'root' })
export class Outbox {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly injector = inject(Injector);
  private readonly apiBase = inject(API_BASE);
  private db: Promise<IDBDatabase> | null = null;
  private flushing: Promise<void> | null = null;
  private retry: ReturnType<typeof setTimeout> | undefined;
  /** The ids the server gave records made offline, for what still holds the temporary one. */
  private readonly ids = new Map<string, string>();

  /** How many changes of the signed-in user wait (any state), as far as this tab has counted. */
  readonly count = signal(0);
  /** Sending stopped because the sign-in ran out: it starts again when the same user signs in. */
  readonly signInNeeded = signal(false);
  /** How many changes of the user wait for a decision (conflict) or were refused (failed). */
  readonly stuck = signal(0);

  /** Whether the outbox may hold a change; false skips opening the database. */
  noted(): boolean {
    try {
      return this.browser && localStorage.getItem(OUTBOX_NOTE) === '1';
    } catch {
      return false;
    }
  }

  /** The id the server gave a record made offline, or the id given when it has none (yet). */
  resolveId(id: string): string {
    return this.ids.get(id) ?? id;
  }

  /** `value` with the ids of records the server has since made in place of the temporary ones. */
  rewrite<T>(value: T): T {
    return rewriteIds(value, this.ids);
  }

  /** Closes the connection, so the database can be deleted. */
  async close(): Promise<void> {
    const db = this.db;
    this.db = null;
    try {
      (await db)?.close();
    } catch {
      // It never opened.
    }
  }

  /**
   * Queues a change for `userId` (compacting it into the changes already waiting), and resolves with the id of the
   * record it is about: a new record's temporary id for a create.
   */
  async enqueue(call: OutboxCall, userId: string): Promise<string> {
    const id = call.op === 'create' ? TMP + crypto.randomUUID() : (call.id ?? call.area);
    const db = await this.open();
    const tx = db.transaction(OUTBOX, 'readwrite');
    const store = tx.objectStore(OUTBOX);
    const mine = (await request<OutboxEntry[]>(store.getAll())).filter((entry) => entry.userId === userId);
    const same = mine.filter((entry) => entry.area === call.area && entry.id === id);
    const last = same.at(-1);
    const waiting = last?.state === 'waiting';
    const fresh = (): OutboxEntry => ({
      userId,
      key: crypto.randomUUID(),
      area: call.area,
      op: call.op,
      id,
      baseRev: call.baseRev ?? null,
      ...(call.base !== undefined && { base: call.base }),
      body: call.body,
      queuedAt: Date.now(),
      state: 'waiting'
    });
    if (call.op === 'create') {
      store.add({ ...fresh(), body: call.body ?? {} });
    } else if (call.op === 'change') {
      if (last && waiting && (last.op === 'create' || last.op === 'change'))
        store.put({ ...last, body: mergeBodies(last, call) });
      else store.add(fresh());
    } else if (call.op === 'delete') {
      if (isTmp(id) && last && waiting && last.op === 'create') {
        // Never sent: nothing to say to the server about a record it never had.
        for (const entry of same) if (entry.state === 'waiting') store.delete(entry.seq!);
      } else if (last && waiting && last.op === 'change') {
        store.put({ ...last, op: 'delete', body: undefined });
      } else if (!(last && waiting && last.op === 'delete')) store.add(fresh());
    } else if (last && waiting && last.op === call.op) {
      store.put({ ...last, body: mergeBodies(last, call) });
    } else store.add(fresh());
    await done(tx);
    this.setNote(true);
    await this.refreshCount(userId);
    return id;
  }

  /** Whether a change to this record or setting waits, so a new one must queue behind it. */
  async hasPending(area: string, id: string, userId: string): Promise<boolean> {
    if (!this.noted()) return false;
    const all = await this.entries();
    return all.some((entry) => entry.userId === userId && entry.area === area && entry.id === id);
  }

  /** A copy's body from the server with this user's waiting changes made to it again. */
  async overlay(key: string, body: unknown, userId: string): Promise<unknown> {
    if (!this.noted()) return body;
    let result = body;
    for (const entry of await this.entries()) {
      if (entry.userId === userId && entry.area === key && entry.state !== 'failed') result = applyEntry(result, entry);
    }
    return result;
  }

  /** Every change stored, in the order they were made (all users'). */
  async entries(): Promise<OutboxEntry[]> {
    // Not opened when nothing was ever queued: that would make the database.
    if (!this.browser || typeof indexedDB === 'undefined' || !this.noted()) return [];
    try {
      const db = await this.open();
      return await request<OutboxEntry[]>(db.transaction(OUTBOX).objectStore(OUTBOX).getAll());
    } catch {
      return [];
    }
  }

  /** The signed-in user's changes. */
  async mine(userId: string): Promise<OutboxEntry[]> {
    return (await this.entries()).filter((entry) => entry.userId === userId);
  }

  /** Counts the user's changes again (after one was queued or sent, or the user became known). */
  async refreshCount(userId?: string): Promise<void> {
    if (!this.noted()) {
      this.count.set(0);
      this.stuck.set(0);
      return;
    }
    const id = userId ?? (await this.records().ownerId());
    const all = await this.entries();
    this.setNote(all.length > 0);
    const mine = id ? all.filter((entry) => entry.userId === id) : [];
    this.count.set(mine.length);
    this.stuck.set(mine.filter((entry) => entry.state === 'conflict' || entry.state === 'failed').length);
  }

  /** Removes the changes of these users (not a copy's other users'); true if no change is left at all. */
  async remove(userIds: ReadonlySet<string>): Promise<boolean> {
    const db = await this.open();
    const tx = db.transaction(OUTBOX, 'readwrite');
    const store = tx.objectStore(OUTBOX);
    const all = await request<OutboxEntry[]>(store.getAll());
    let left = 0;
    for (const entry of all) {
      if (userIds.has(entry.userId)) store.delete(entry.seq!);
      else left++;
    }
    await done(tx);
    this.setNote(left > 0);
    this.count.set(0);
    this.stuck.set(0);
    return left === 0;
  }

  /** Sends the waiting changes, if the network and a sign-in are there. At most one run at a time, in all tabs. */
  flush(): Promise<void> {
    if (!this.browser || !this.noted()) return Promise.resolve();
    this.flushing ??= this.locked().finally(() => (this.flushing = null));
    return this.flushing;
  }

  private async locked(): Promise<void> {
    const locks = (navigator as Navigator & { locks?: LockManager }).locks;
    if (locks?.request) await locks.request('gc-outbox', () => this.run());
    else await this.run();
  }

  private async run(): Promise<void> {
    if (navigator.onLine === false) return;
    const userId = await this.records().whoIs();
    if (!userId) {
      // Waiting for a sign-in (the sign-in ran out): the same user's next sign-in sends.
      this.signInNeeded.set(this.noted());
      return;
    }
    this.signInNeeded.set(false);
    const touched = new Set<string>();
    try {
      for (;;) {
        const entry = this.nextToSend(await this.mine(userId));
        if (!entry) break;
        if (!(await this.send(entry, touched))) break;
      }
    } finally {
      await this.refreshCount(userId);
      if (touched.size) await this.records().refetch([...touched]);
    }
  }

  /** The first change that can go: waiting, and not behind a change on the same record that needs a decision. */
  private nextToSend(mine: OutboxEntry[]): OutboxEntry | undefined {
    const held = new Set<string>();
    for (const entry of mine) {
      if (entry.state === 'conflict' || entry.state === 'failed') held.add(entry.area + '/' + entry.id);
      else if (!held.has(entry.area + '/' + entry.id)) return entry;
    }
    return undefined;
  }

  /** Sends one change; true to go on with the next, false to stop (offline, signed out, server trouble). */
  private async send(entry: OutboxEntry, touched: Set<string>): Promise<boolean> {
    // A change about a record that was never made (its create failed, or was dropped): nothing to send it to.
    const unresolved = JSON.stringify(entry.op === 'create' ? [entry.body] : [entry.id, entry.body]).includes(
      `"${TMP}`
    );
    if (unresolved) {
      await this.update(entry.seq!, { state: 'failed', error: 'depends-on-failed' });
      return true;
    }
    await this.update(entry.seq!, { state: 'sending' });
    const call = this.requestFor(entry);
    let headers = new HttpHeaders({ 'Idempotency-Key': entry.key });
    if (entry.baseRev !== null && (entry.op === 'change' || entry.op === 'delete'))
      headers = headers.set('If-Match', `"${entry.baseRev}"`);
    const context = new HttpContext().set(OUTBOX_SEND, true);
    try {
      const res = await firstValueFrom(
        this.injector.get(HttpClient).request(call.method, call.url, {
          body: entry.body,
          headers,
          context,
          observe: 'response'
        })
      );
      await this.sent(entry, res, touched);
      return true;
    } catch (err) {
      if (!(err instanceof HttpErrorResponse)) {
        await this.update(entry.seq!, { state: 'waiting' });
        return false;
      }
      return this.refused(entry, err);
    }
  }

  private requestFor(entry: OutboxEntry): { method: string; url: string } {
    const id = encodeURIComponent(entry.id);
    switch (entry.op) {
      case 'create':
        return { method: 'POST', url: `${this.apiBase}/${entry.area}/create` };
      case 'change':
        return { method: 'PUT', url: `${this.apiBase}/${entry.area}/change/${id}` };
      case 'delete':
        return { method: 'DELETE', url: `${this.apiBase}/${entry.area}/delete/${id}` };
      case 'put':
        return { method: 'PUT', url: `${this.apiBase}/preferences` };
      case 'patch':
        return { method: 'PATCH', url: `${this.apiBase}/prices` };
    }
  }

  /** The server took the change: it leaves the queue, and what came of it is written into the changes behind it. */
  private async sent(entry: OutboxEntry, res: HttpResponse<unknown>, touched: Set<string>): Promise<void> {
    const reply = isBody(res.body) ? res.body : {};
    touched.add(entry.area);
    const db = await this.open();
    const tx = db.transaction(OUTBOX, 'readwrite');
    const store = tx.objectStore(OUTBOX);
    store.delete(entry.seq!);
    const later = (await request<OutboxEntry[]>(store.getAll())).filter(
      (other) => other.userId === entry.userId && other.seq! > entry.seq!
    );
    if (entry.op === 'create' && typeof reply['_id'] === 'string') {
      this.ids.set(entry.id, reply['_id']);
      const ids = new Map([[entry.id, reply['_id']]]);
      for (const other of later) {
        const baseRev = other.id === entry.id ? (typeof reply['rev'] === 'number' ? reply['rev'] : 0) : other.baseRev;
        store.put({ ...other, id: rewriteIds(other.id, ids), body: rewriteIds(other.body, ids), baseRev });
      }
    } else if (typeof reply['rev'] === 'number') {
      // The record is at the rev the change made; the next change to it goes from there.
      for (const other of later) {
        if (other.area === entry.area && other.id === entry.id) store.put({ ...other, baseRev: reply['rev'] });
      }
    }
    await done(tx);
  }

  /** The server answered with an error (or the network failed): what becomes of the change. */
  private async refused(entry: OutboxEntry, err: HttpErrorResponse): Promise<boolean> {
    const code = isBody(err.error) && typeof err.error['code'] === 'string' ? err.error['code'] : `http-${err.status}`;
    // The network is gone again, the sign-in has run out, or the server is busy: it stays, and goes again later.
    if (err.status === 0 || err.status === 401 || err.status === 429 || err.status >= 500) {
      await this.update(entry.seq!, { state: 'waiting' });
      if (err.status === 401) this.signInNeeded.set(true);
      else if (err.status !== 0) this.retryLater();
      return false;
    }
    // The record moved on or is gone: a later phase asks the user; it waits, with everything behind it for the record.
    if (err.status === 409 || err.status === 404) {
      await this.update(entry.seq!, { state: 'conflict', error: code });
      return true;
    }
    await this.update(entry.seq!, { state: 'failed', error: code });
    if (entry.op === 'create') await this.failDependents(entry.id);
    return true;
  }

  /** What was to be made with the temporary id of a record that failed to be made cannot be sent either. */
  private async failDependents(tmpId: string): Promise<void> {
    const db = await this.open();
    const tx = db.transaction(OUTBOX, 'readwrite');
    const store = tx.objectStore(OUTBOX);
    const all = await request<OutboxEntry[]>(store.getAll());
    for (const other of all) {
      if (other.state === 'waiting' && JSON.stringify([other.id, other.body]).includes(tmpId)) {
        store.put({ ...other, state: 'failed', error: 'depends-on-failed' });
      }
    }
    await done(tx);
  }

  private async update(seq: number, changes: Partial<OutboxEntry>): Promise<void> {
    const db = await this.open();
    const tx = db.transaction(OUTBOX, 'readwrite');
    const store = tx.objectStore(OUTBOX);
    const entry = await request<OutboxEntry | undefined>(store.get(seq));
    if (entry) store.put({ ...entry, ...changes });
    await done(tx);
  }

  private retryLater(): void {
    clearTimeout(this.retry);
    this.retry = setTimeout(() => void this.flush(), RETRY_MS);
  }

  private setNote(on: boolean): void {
    try {
      if (on) localStorage.setItem(OUTBOX_NOTE, '1');
      else localStorage.removeItem(OUTBOX_NOTE);
    } catch {
      // No storage: the next start opens the database anyway when records are kept.
    }
  }

  private records(): OfflineRecords {
    return this.injector.get(OfflineRecords);
  }

  private open(): Promise<IDBDatabase> {
    this.db ??= openRecordsDb(() => (this.db = null)).catch((err: unknown) => {
      this.db = null;
      throw err;
    });
    return this.db;
  }
}
