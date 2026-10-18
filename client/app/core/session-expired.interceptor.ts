import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, finalize, from, switchMap, throwError } from 'rxjs';
import { API_BASE } from './api-base';
import { AuthService } from './auth.service';

// 401s these answer are handled where they are called: /signin's means a wrong
// password, and those of the routes under it (/signin/second-step, /signin/passkey)
// a wrong code or passkey, which must not end a trial on this browser; /verify's
// is handled by AuthService.refresh (it also runs on pages that need no sign-in,
// such as the password reset page).
const handledElsewhere = (path: string): boolean =>
  path === '/signin' || path.startsWith('/signin/') || path === '/verify';

/**
 * The API requests on their way that may change the session: anything but a
 * GET. Linking or unlinking a provider, a second step turned on or off, a new
 * password and the like renew this browser's session cookie while they end
 * the account's others; a request that went out meanwhile carries the old
 * cookie, and its 401 means only that it lost the race.
 */
@Injectable({ providedIn: 'root' })
export class SessionChanges {
  private readonly pending = new Set<Promise<void>>();
  private begun = 0;

  /** Notes a change on its way; the function returned notes its end (more than once is fine). */
  begin(): () => void {
    this.begun++;
    let end!: () => void;
    const done = new Promise<void>((resolve) => (end = resolve));
    this.pending.add(done);
    return () => {
      this.pending.delete(done);
      end();
    };
  }

  /** How many changes have begun, to tell whether one began since. */
  count(): number {
    return this.begun;
  }

  /** Whether a change is on its way. */
  active(): boolean {
    return this.pending.size > 0;
  }

  /** Resolves once the changes on their way now have their answers (and the browser its new cookie). */
  async settled(): Promise<void> {
    while (this.pending.size) await Promise.all([...this.pending]);
  }
}

/**
 * When the API stops accepting this browser's session (it expired, or the
 * password was changed on another device), signs out and goes to the sign-in
 * page; a trial that has run out goes to the start page, which says so. The
 * session itself is a cookie the browser sends on its own. A 401 for a request
 * that crossed a change to the session (SessionChanges) is asked once more,
 * after the change, with the cookie it left.
 */
export const sessionExpiredInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const apiBase = inject(API_BASE);
  if (!auth.hasSession() || !req.url.startsWith(apiBase + '/')) return next(req);

  const router = inject(Router);
  const changes = inject(SessionChanges);
  const version = auth.sessionVersion();
  const crossed = changes.active();
  const done = req.method === 'GET' || req.method === 'HEAD' ? null : changes.begin();
  const begun = changes.count();

  const ended = (err: unknown): boolean => {
    const path = req.url.slice(apiBase.length);
    // Only if the session is the one the request went out with: a sign-in
    // that happened meanwhile is left alone.
    return (
      err instanceof HttpErrorResponse &&
      err.status === 401 &&
      !handledElsewhere(path) &&
      auth.sessionVersion() === version
    );
  };
  const signOut = (err: unknown) => {
    if (ended(err)) {
      const wasTrial = auth.trial() !== null;
      auth.sessionEnded();
      // The page left can tell why (core/leave.guard.ts): nothing on it can be saved now.
      void router.navigateByUrl(wasTrial ? '/' : '/signin', { state: { sessionEnded: true } });
    }
    return throwError(() => err);
  };

  return next(req).pipe(
    catchError((err: unknown) => {
      done?.();
      // A 401 is refused before anything is done, so asking again is safe.
      if (ended(err) && (crossed || changes.count() !== begun || changes.active())) {
        return from(changes.settled()).pipe(
          switchMap(() => next(req)),
          catchError(signOut)
        );
      }
      return signOut(err);
    }),
    finalize(() => done?.())
  );
};
