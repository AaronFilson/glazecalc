import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Pages that load the user's data need a sign-in; without one they would only
 * show errors, so the visitor goes to the sign-in page instead. (The server
 * checks every request anyway; this is for the visitor's sake.)
 */
export const signedInGuard: CanActivateFn = () =>
  inject(AuthService).token() ? true : inject(Router).parseUrl('/signin');

/** Where the site's root address leads: home when signed in, sign in otherwise. */
export const startPage = () => (inject(AuthService).token() ? '/home' : '/signin');
