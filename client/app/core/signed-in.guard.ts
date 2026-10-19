import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Pages that load the user's data need a sign-in; without one they would only
 * show errors, so the visitor goes to the sign-in page instead, or to the start
 * page when their trial has just run out (it says so). The first time, the
 * guard waits for the server to confirm the session: the note the app keeps can
 * outlive the cookie. The server checks every request anyway; this is for the
 * visitor's sake.
 */
export const signedInGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.whenChecked();
  if (auth.hasSession()) return true;
  return router.parseUrl(auth.trialEnded() ? '/' : '/signin');
};

/** The intro page is for visitors; someone signed in goes to their own start page. */
export const visitorsOnlyGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.whenChecked();
  return auth.hasSession() ? router.parseUrl('/home') : true;
};

/**
 * A page someone is sent to from elsewhere, such as an AI app asking to
 * connect (pages/connect): without a sign-in, the sign-in page, which comes
 * back here once signed in (?next=, auth-page.ts takes this site's pages only).
 */
export const signInThenBackGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.whenChecked();
  if (auth.hasSession()) return true;
  return router.createUrlTree(['/signin'], { queryParams: { next: state.url } });
};

/**
 * Where to go once signed in, from ?next=: a path on this site only, such as
 * /connect/abc. Anything else (another site, //host, /\host, a scheme, a
 * control character, the sign-in pages themselves) is null, and the caller
 * goes home.
 */
export function sameSitePath(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 200) return null;
  // One slash, then not another slash or backslash: never a protocol-relative address.
  if (!/^\/(?![/\\])/.test(value) || /[\\\p{Cc}\s]/u.test(value)) return null;
  // As a browser reads it, it stays on this site.
  try {
    if (new URL(value, 'https://same.invalid').host !== 'same.invalid') return null;
  } catch {
    return null;
  }
  const path = value.split(/[?#]/)[0]!;
  if (['/signin', '/signup', '/forgot', '/reset', '/confirm-email'].includes(path)) return null;
  return value;
}
