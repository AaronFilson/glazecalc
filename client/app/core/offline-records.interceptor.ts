import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, of, switchMap, tap, throwError } from 'rxjs';
import { API_BASE } from './api-base';
import { COPY_REFRESH, OfflineRecords, RECORD_COLLECTIONS, RECORD_KEYS } from './offline-records';

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

/**
 * Keeps the copy of the user's records on this device up to date, and answers from it when the network fails
 * (core/offline-records.ts). Each answer to a records or settings GET is written through; each change saved has
 * the copies it touches fetched again. Only a failed network (status 0) is answered from the copy: a server's
 * error, a 401 above all, goes through as it is.
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
      }),
      catchError((error: unknown) => {
        records.verifyFailed();
        return throwError(() => error);
      })
    );
  }

  if (req.method !== 'GET') {
    const touched = changedBy(path);
    if (!touched.length) return next(req);
    return next(req).pipe(
      tap((event) => {
        if (event instanceof HttpResponse) void records.refetch(touched);
      })
    );
  }

  const key = copyOf(path);
  if (!key) return next(req);
  return next(req).pipe(
    tap((event) => {
      if (event instanceof HttpResponse) void records.save(key, event.body, req.context.get(COPY_REFRESH));
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
