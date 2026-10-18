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
// Production never reads the older name: a cookie under it could have been
// set for the whole domain (Domain=glazecalcapp.com) by a subdomain or a
// network faking an http:// one, and would sign the browser into someone
// else's account. So everyone signed in under the older name signed in once
// more after the release that dropped it (deploy/README.md). Every reply that
// sets or ends the session still clears the older cookie: the one the site set
// itself (host-only, Path=/api), and one set for the site's domain (Domain=
// the SITE_URL host, Path=/api), so a planted one is removed too.
//
// A sign-in lasts as long as the browser session unless the user ticked "Keep
// me signed in on this device" (the X-Keep-Signed-In: 1 header, sent as a header
// so it stays out of the address and the logs): then the cookie lasts 7 days.
// A trial's lasts its 14 days. The token itself is good for the days either way.
import type { CookieOptions, Request, Response } from 'express';
import type { UserDocument } from '../models/user.ts';
import { rpId } from './site.ts';

/** The cookie's name in production. */
export const HOST_NAME = '__Host-glazecalc_session';
/** Its name in development and tests, and before 2026-10 in production too (no longer read there). */
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

/**
 * In production, clears the older cookie that the new one replaces: as the
 * site set it (host-only), and as someone else could have set it for the
 * site's domain. A browser removes a cookie only for a Set-Cookie with its own
 * Domain and Path.
 */
const clearOld = (res: Response): void => {
  if (!production()) return;
  res.clearCookie(OLD_NAME, oldOptions());
  res.clearCookie(OLD_NAME, { ...oldOptions(), domain: rpId() });
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

/** The token in the request's session cookie, or null: only under the name this place sets (name()). */
export const tokenIn = (req: Request): string | null => cookie(req, name());

// The provider sign-in's own cookie (server/routes/oauth_routes.ts,
// docs/adr/0015-provider-sign-in.md): a random value naming the sign-in under
// way, for OAUTH_LOGIN_MINUTES. SameSite=Lax, because the provider's redirect
// back is a top-level navigation from another site, which a Strict cookie
// would not come with. In production it is __Host-glazecalc_oauth, Path=/, so
// no other host can plant one (login CSRF), as with the session; in
// development, glazecalc_oauth on Path=/api/auth. It is set only when the
// person presses a provider button.

/** The provider cookie's name here. */
export const oauthName = (): string => (production() ? '__Host-glazecalc_oauth' : 'glazecalc_oauth');

const oauthOptions = (): CookieOptions =>
  production()
    ? { httpOnly: true, sameSite: 'lax', secure: true, path: '/' }
    : { httpOnly: true, sameSite: 'lax', secure: false, path: '/api/auth' };

/** Sets the provider cookie for `minutes`. */
export const startOAuth = (res: Response, value: string, minutes: number): void => {
  res.cookie(oauthName(), value, { ...oauthOptions(), maxAge: minutes * 60 * 1000 });
};

/** Clears the provider cookie. */
export const endOAuth = (res: Response): void => {
  res.clearCookie(oauthName(), oauthOptions());
};

/** The provider cookie's value in the request, or null. */
export const oauthIn = (req: Request): string | null => cookie(req, oauthName());
