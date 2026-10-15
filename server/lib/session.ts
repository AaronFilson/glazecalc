// The sign-in session on a browser: a sign-in token (JWT) in an httpOnly cookie,
// so no script on the page can read it (docs/adr/0005-sign-in-tokens.md).
// SameSite=Strict keeps browsers from sending it with requests that start on
// other sites. Scripts and tests send the token in an Authorization: Bearer
// header instead (server/lib/jwt_auth.ts).
//
// In production the cookie is __Host-glazecalc_session: the prefix makes the
// browser take it only when it is Secure, has Path=/ and names no Domain, so
// no other host (staging.glazecalcapp.com, or a network faking an http://
// subdomain) can set one that the site would read: no planting a session of
// someone else's (login CSRF). Development, on plain http://localhost, keeps
// the older glazecalc_session on Path=/api.
//
// Moving over without signing anyone out: the older name is still read in
// production, and every reply that sets the session sets the new name and
// clears the old one. Browsers keep an older cookie 14 days at most (a trial),
// so after that the old name can be dropped here.
//
// A sign-in lasts as long as the browser session unless the user ticked "Keep
// me signed in on this device" (the X-Keep-Signed-In: 1 header, sent as a header
// so it stays out of the address and the logs): then the cookie lasts 7 days.
// A trial's lasts its 14 days. The token itself is good for the days either way.
import type { CookieOptions, Request, Response } from 'express';
import type { UserDocument } from '../models/user.ts';

/** The cookie's name in production. */
export const HOST_NAME = '__Host-glazecalc_session';
/** Its name in development and tests, and before 2026-10 in production too. */
export const OLD_NAME = 'glazecalc_session';
const DAY = 24 * 60 * 60 * 1000;

/** Production serves HTTPS only; development runs on plain http://localhost. */
const production = (): boolean => process.env.NODE_ENV === 'production';

/** The name the session is set under here. */
export const name = (): string => (production() ? HOST_NAME : OLD_NAME);

const options = (): CookieOptions =>
  production()
    ? { httpOnly: true, sameSite: 'strict', secure: true, path: '/' }
    : { httpOnly: true, sameSite: 'strict', secure: false, path: '/api' };

/** The older cookie as production set it, to clear it. */
const oldOptions = (): CookieOptions => ({ httpOnly: true, sameSite: 'strict', secure: true, path: '/api' });

/** In production, clears the older cookie that the new one replaces. */
const clearOld = (res: Response): void => {
  if (production()) res.clearCookie(OLD_NAME, oldOptions());
};

/**
 * Signs the user in on this browser: for `days` (7 for an account, 14 for a
 * trial) when `keep`, otherwise until the browser session ends (a cookie with
 * no Max-Age).
 */
export const start = (res: Response, user: UserDocument, days = 7, keep = true): void => {
  res.cookie(name(), user.generateToken(`${days}d`, keep), keep ? { ...options(), maxAge: days * DAY } : options());
  clearOld(res);
};

/** Whether the sign-in form's "Keep me signed in on this device" box was ticked. */
export const wantsKept = (req: Request): boolean => req.headers['x-keep-signed-in'] === '1';

/** Signs this browser out. */
export const end = (res: Response): void => {
  res.clearCookie(name(), options());
  clearOld(res);
};

/** A cookie's value in the request, or null. */
const cookie = (req: Request, wanted: string): string | null => {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const eq = part.indexOf('=');
    if (eq > 0 && part.slice(0, eq).trim() === wanted) return part.slice(eq + 1).trim() || null;
  }
  return null;
};

/** The token in the request's session cookie, or null: in production the new name first, then the older one. */
export const tokenIn = (req: Request): string | null =>
  cookie(req, name()) ?? (production() ? cookie(req, OLD_NAME) : null);
