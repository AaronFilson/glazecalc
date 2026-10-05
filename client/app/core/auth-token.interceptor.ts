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
 * Sends the login token, in the 'token' header the API expects, to the API only.
 * When the API rejects it (expired, or the password was changed on another
 * device), signs out and goes to the sign-in page.
 */
export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const apiBase = inject(API_BASE);
  const token = auth.token();
  if (!token || !req.url.startsWith(apiBase + '/')) return next(req);

  const router = inject(Router);
  return next(req.clone({ setHeaders: { token } })).pipe(catchError((err: unknown) => {
    const path = req.url.slice(apiBase.length);
    // Only if the rejected token is still the current one: a sign-in that
    // happened while this request was out is left alone.
    if (err instanceof HttpErrorResponse && err.status === 401 && !HANDLED_ELSEWHERE.includes(path) &&
        auth.token() === token) {
      auth.signOut();
      void router.navigateByUrl('/signin');
    }
    return throwError(() => err);
  }));
};
