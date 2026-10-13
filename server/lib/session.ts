// The sign-in session on a browser: a sign-in token (JWT) in an httpOnly cookie,
// so no script on the page can read it (docs/adr/0005-sign-in-tokens.md).
// SameSite=Strict keeps browsers from sending it with requests that start on
// other sites, and it goes only to /api. Scripts and tests send the token in an
// Authorization: Bearer header instead (server/lib/jwt_auth.ts).
//
// A sign-in lasts as long as the browser session unless the user ticked "Keep
// me signed in on this device" (the X-Keep-Signed-In: 1 header, sent as a header
// so it stays out of the address and the logs): then the cookie lasts 7 days.
// A trial's lasts its 14 days. The token itself is good for the days either way.
import type { CookieOptions, Request, Response } from 'express';
import type { UserDocument } from '../models/user.ts';

export const NAME = 'glazecalc_session';
const DAY = 24 * 60 * 60 * 1000;

const options = (): CookieOptions => ({
  httpOnly: true,
  sameSite: 'strict',
  // HTTPS only in production; development runs on plain http://localhost.
  secure: process.env.NODE_ENV === 'production',
  path: '/api'
});

/**
 * Signs the user in on this browser: for `days` (7 for an account, 14 for a
 * trial) when `keep`, otherwise until the browser session ends (a cookie with
 * no Max-Age).
 */
export const start = (res: Response, user: UserDocument, days = 7, keep = true): void => {
  res.cookie(NAME, user.generateToken(`${days}d`, keep), keep ? { ...options(), maxAge: days * DAY } : options());
};

/** Whether the sign-in form's "Keep me signed in on this device" box was ticked. */
export const wantsKept = (req: Request): boolean => req.headers['x-keep-signed-in'] === '1';

/** Signs this browser out. */
export const end = (res: Response): void => {
  res.clearCookie(NAME, options());
};

/** The token in the request's session cookie, or null. */
export const tokenIn = (req: Request): string | null => {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const eq = part.indexOf('=');
    if (eq > 0 && part.slice(0, eq).trim() === NAME) return part.slice(eq + 1).trim() || null;
  }
  return null;
};
