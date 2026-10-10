import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { API_BASE } from './api-base';
import { AuthService } from './auth.service';

// 401s these answer are handled where they are called: /signin's means a wrong
// password, and /verify's is handled by AuthService.refresh (it also runs on
// pages that need no sign-in, such as the password reset page).
const HANDLED_ELSEWHERE = ['/signin', '/verify'];

/**
 * When the API stops accepting this browser's session (it expired, or the
 * password was changed on another device), signs out and goes to the sign-in
 * page; a trial that has run out goes to the start page, which says so. The
 * session itself is a cookie the browser sends on its own.
 */
export const sessionExpiredInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const apiBase = inject(API_BASE);
  if (!auth.hasSession() || !req.url.startsWith(apiBase + '/')) return next(req);

  const router = inject(Router);
  const version = auth.sessionVersion();
  return next(req).pipe(
    catchError((err: unknown) => {
      const path = req.url.slice(apiBase.length);
      // Only if the session is the one the request went out with: a sign-in
      // that happened meanwhile is left alone.
      if (
        err instanceof HttpErrorResponse &&
        err.status === 401 &&
        !HANDLED_ELSEWHERE.includes(path) &&
        auth.sessionVersion() === version
      ) {
        const wasTrial = auth.trial() !== null;
        auth.sessionEnded();
        // The page left can tell why (core/leave.guard.ts): nothing on it can be saved now.
        void router.navigateByUrl(wasTrial ? '/' : '/signin', { state: { sessionEnded: true } });
      }
      return throwError(() => err);
    })
  );
};
