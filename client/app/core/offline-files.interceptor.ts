import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, of, switchMap, throwError } from 'rxjs';
import { OfflineLanguages } from './offline-languages';

/**
 * When the network fails (status 0) for a translation or a guide (a file under /i18n/), answers from the copy the
 * phone keeps of the reader's language, if it has one (core/offline-languages.ts). With a network, or for any
 * other failure, nothing changes.
 */
export const offlineFilesInterceptor: HttpInterceptorFn = (req, next) => {
  const kept = inject(OfflineLanguages);
  return next(req).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 0) return throwError(() => error);
      if (req.method !== 'GET' || !req.url.startsWith('/i18n/')) return throwError(() => error);
      return from(kept.read(req.url)).pipe(
        switchMap((text) =>
          text === null
            ? throwError(() => error)
            : of(
                new HttpResponse({
                  body: req.responseType === 'json' ? JSON.parse(text) : text,
                  status: 200,
                  url: req.url
                })
              )
        )
      );
    })
  );
};
