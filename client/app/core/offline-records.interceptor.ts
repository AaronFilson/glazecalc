import { HttpErrorResponse, HttpEvent, HttpInterceptorFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, defer, from, of, switchMap, tap, throwError, type Observable } from 'rxjs';
import { API_BASE } from './api-base';
import { COPY_REFRESH, OfflineRecords, RECORD_COLLECTIONS, RECORD_KEYS } from './offline-records';
import { OUTBOX_SEND, Outbox, isTmp, outboxCallOf } from './outbox';

const COLLECTIONS: readonly string[] = RECORD_COLLECTIONS;

/** The copy a GET of this API path is kept as (/recipe/getAll is "recipe", /prices is "prices"), or null. */
export function copyOf(path: string): string | null {
  const [, name, action, ...rest] = path.split('/');
  if (rest.length) return null;
  if (COLLECTIONS.includes(name) && action === 'getAll') return name;
  if (action === undefined && RECORD_KEYS.includes(name) && !COLLECTIONS.includes(name)) return name;
  return null;
}

/** The copies a saved change to this API path makes out of date. */
export function changedBy(path: string): string[] {
  const name = path.split('/')[1];
  if (COLLECTIONS.includes(name)) return [name];
  // A record put back from the Trash can be of any collection.
  if (name === 'trash') return [...COLLECTIONS];
  if (name === 'preferences' || name === 'prices') return [name];
  return [];
}

type Call = NonNullable<ReturnType<typeof outboxCallOf>>;

/**
 * Keeps the copy of the user's records on this device up to date, and answers from it when the network fails
 * (core/offline-records.ts). Each answer to a records or settings GET is written through; each change saved has
 * the copies it touches fetched again. Only a failed network (status 0) is answered from the copy: a server's
 * error, a 401 above all, goes through as it is.
 *
 * While records are kept on the device, a record or setting change (create, change, delete, preferences, prices)
 * that cannot reach the server (status 0, or the browser says it is offline) is queued in the outbox
 * (core/outbox.ts) and answered 202 at once, with the new record's temporary id for a create. Undo, sharing, the
 * Trash, tokens, import and the shelf are not queued: they need the server.
 */
export const offlineRecordsInterceptor: HttpInterceptorFn = (incoming, next) => {
  const apiBase = inject(API_BASE);
  if (!incoming.url.startsWith(apiBase + '/')) return next(incoming);
  // The service worker never keeps an /api answer (docs/adr/0028-service-worker.md), and with no network it would
  // answer one with its own made-up 504 rather than fail. Past it, a network failure is the browser's status 0, and
  // a 504 is always the server's.
  const req = incoming.clone({ setHeaders: { 'ngsw-bypass': '1' } });
  const records = inject(OfflineRecords);
  const path = req.url.slice(apiBase.length).split('?')[0];

  if (req.method === 'GET' && path === '/verify') {
    return next(req).pipe(
      tap((event) => {
        if (!(event instanceof HttpResponse)) return;
        const body = event.body as { id?: unknown; sessionEndsAt?: unknown; sessionOnly?: unknown } | null;
        if (typeof body?.id !== 'string') return;
        const endsAt = typeof body.sessionEndsAt === 'string' ? Date.parse(body.sessionEndsAt) : NaN;
        records.noteUser({
          id: body.id,
          endsAt: Number.isFinite(endsAt) ? endsAt : null,
          sessionOnly: body.sessionOnly === true
        });
      })
    );
  }

  if (req.method !== 'GET') {
    // The outbox sending a queued change: no queueing again, and the copy is fetched once after the batch.
    if (req.context.get(OUTBOX_SEND)) return next(req);
    const touched = changedBy(path);
    if (!touched.length) return next(req);
    const call = outboxCallOf(req.method, path, COLLECTIONS);
    if (!call || !records.isKeeping()) return sendWrite(req, next, records, touched);
    return queueOrSend(req, next, records, inject(Outbox), call, touched);
  }

  const key = copyOf(path);
  if (!key) return next(req);
  const outbox = inject(Outbox);
  return next(req).pipe(
    tap((event) => {
      if (!(event instanceof HttpResponse)) return;
      void records.save(key, event.body, req.context.get(COPY_REFRESH));
      // The network works: changes made while it did not can go.
      if (!req.context.get(COPY_REFRESH) && outbox.count() > 0) void outbox.flush();
    }),
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 0) return throwError(() => error);
      if (req.context.get(COPY_REFRESH)) return throwError(() => error);
      return from(records.read(key)).pipe(
        switchMap((copy) => {
          records.shown(key, copy?.savedAt ?? null);
          return copy ? of(new HttpResponse({ body: copy.body, status: 200, url: req.url })) : throwError(() => error);
        })
      );
    })
  );
};

type Next = Parameters<HttpInterceptorFn>[1];

function sendWrite(
  req: HttpRequest<unknown>,
  next: Next,
  records: OfflineRecords,
  touched: string[]
): Observable<HttpEvent<unknown>> {
  return next(req).pipe(
    tap((event) => {
      if (event instanceof HttpResponse) void records.refetch(touched);
    })
  );
}

/**
 * Sends a change that the outbox can hold, or queues it: at once when the browser is offline or an earlier change
 * to the same record waits (this one must go after it), and when the network fails.
 */
function queueOrSend(
  incoming: HttpRequest<unknown>,
  next: Next,
  records: OfflineRecords,
  outbox: Outbox,
  call: Call,
  touched: string[]
): Observable<HttpEvent<unknown>> {
  // A record made offline has its server id by now (a page may still hold the temporary one).
  const id = call.id === undefined ? undefined : outbox.resolveId(call.id);
  let req = incoming;
  if (call.id !== undefined && id !== call.id) req = req.clone({ url: req.url.split(call.id).join(id!) });
  req = req.clone({ body: outbox.rewrite(req.body) });

  const queue = (failure?: unknown): Observable<HttpEvent<unknown>> =>
    defer(() => from(queueWrite(req, { ...call, ...(id !== undefined && { id }) }, records, outbox))).pipe(
      switchMap((reply) =>
        reply ? of(reply) : failure ? throwError(() => failure) : sendWrite(req, next, records, touched)
      )
    );
  const attempt = defer(() => from(mustWait(call, id, records, outbox))).pipe(
    switchMap((wait) =>
      wait
        ? queue()
        : sendWrite(req, next, records, touched).pipe(
            catchError((error: unknown) =>
              error instanceof HttpErrorResponse && error.status === 0 ? queue(error) : throwError(() => error)
            )
          )
    )
  );
  return attempt;
}

/** Whether the change must be queued without trying: the browser is offline, or the record has changes waiting. */
async function mustWait(call: Call, id: string | undefined, records: OfflineRecords, outbox: Outbox): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  if (id === undefined) return false;
  const owner = await records.ownerId();
  return owner !== null && (await outbox.hasPending(call.area, id, owner));
}

/** Queues the change, makes it to the copy, and answers 202; null when it cannot be queued (nobody to queue it for). */
async function queueWrite(
  req: HttpRequest<unknown>,
  call: Call,
  records: OfflineRecords,
  outbox: Outbox
): Promise<HttpResponse<unknown> | null> {
  const owner = await records.ownerId();
  if (!owner) return null;
  const { area, op } = call;
  let baseRev: number | null = null;
  let base: unknown;
  if ((op === 'change' || op === 'delete') && call.id !== undefined && !isTmp(call.id)) {
    const copy = await records.read(area);
    const record = Array.isArray(copy?.body)
      ? (copy.body as Array<Record<string, unknown>>).find((one) => one['_id'] === call.id)
      : undefined;
    if (record) {
      baseRev = typeof record['rev'] === 'number' ? record['rev'] : 0;
      if (op === 'change') base = record;
    }
  }
  const id = await outbox.enqueue({ area, op, id: call.id, body: req.body, baseRev, base }, owner);
  await records.applyLocal({ area, op, id, body: req.body, userId: owner });
  if (typeof navigator === 'undefined' || navigator.onLine !== false) void outbox.flush();
  const body =
    op === 'create' ? { ...(req.body as object | null), _id: id, rev: 0, queued: true } : { queued: true, id };
  return new HttpResponse({ body, status: 202, url: req.url });
}
