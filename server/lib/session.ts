// The sign-in session on a browser: a sign-in token (JWT) in an httpOnly cookie,
// so no script on the page can read it (docs/adr/0005-sign-in-tokens.md).
// SameSite=Strict keeps browsers from sending it with requests that start on
// other sites, and it goes only to /api. Scripts and tests send the token in an
// Authorization: Bearer header instead (server/lib/jwt_auth.ts).
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

/** Signs the user in on this browser for `days` (7 for an account, 14 for a trial). */
export const start = (res: Response, user: UserDocument, days = 7): void => {
  res.cookie(NAME, user.generateToken(`${days}d`), { ...options(), maxAge: days * DAY });
};

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
