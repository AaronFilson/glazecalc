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
