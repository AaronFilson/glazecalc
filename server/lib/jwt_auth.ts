// Lets a request through with req.user set when it carries a valid, current
// sign-in token; otherwise answers 401. An access token (a personal token or
// an OAuth client's, server/lib/token_auth.ts) is never a sign-in: routes
// behind jwtAuth refuse it, and only requireScope (server/lib/require_scope.ts)
// lets one in.
import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User, { type UserDocument } from '../models/user.ts';
import appSecret from './app_secret.ts';
import * as guestLimits from './guest_limits.ts';
import * as session from './session.ts';
import { say } from './messages.ts';
import { accessTokenIn, refuseAccessTokens } from './token_auth.ts';

/**
 * The sign-in token: from an `Authorization: Bearer` header (scripts and tests),
 * or from the session cookie (browsers). The string 'null' counts as none.
 */
export const tokenOf = (req: Request): string | null => {
  const auth = req.headers.authorization;
  const token = auth && /^Bearer /i.test(auth) ? auth.slice(7).trim() : session.tokenIn(req);
  return token && token !== 'null' ? token : null;
};

/**
 * Names the sign-in session the request comes from, without being it: the
 * SHA-256 (hex) of its sign-in token, or null without one. Something tied to
 * one session (a provider reauth and its grant, ADR 15) stores this and asks
 * for it again; a renewed session (a new token) is another session.
 */
export const sessionKeyOf = (req: Request): string | null => {
  const token = tokenOf(req);
  return token ? crypto.createHash('sha256').update(token).digest('hex') : null;
};

/** The user whose valid, current token the request carries, or null. */
export const currentUser = async (req: Request): Promise<UserDocument | null> => {
  const token = tokenOf(req);
  if (!token) return null;
  let claims: string | jwt.JwtPayload;
  try {
    claims = jwt.verify(token, appSecret, { algorithms: ['HS256'] });
  } catch {
    return null;
  }
  // { id, tv }: the user, and their token version when the token was made.
  // Sign-in tokens have no audience or type; the pending second step's token
  // (server/lib/second_step.ts) has both, and no id, so it is never a sign-in.
  if (typeof claims === 'string' || typeof claims.id !== 'string') return null;
  if (claims.aud !== undefined || claims.typ !== undefined) return null;
  const version = typeof claims.tv === 'number' ? claims.tv : 0;
  let user: UserDocument | null;
  try {
    // The password hash and the two-step sign-in factors are not needed past
    // this point; routes that need the factors load them themselves.
    user = await User.findById(claims.id, { password: 0, mfa: 0 });
  } catch (err) {
    // An id that is not an ObjectId is a bad token. Anything else (the database
    // is down or restarting) is a server error, so clients keep their sign-in.
    if (err instanceof Error && err.name === 'CastError') return null;
    throw err;
  }
  if (!user) return null;
  // Tokens from before the last password change no longer count. Tokens made
  // before versions existed have none, which matches an unchanged password.
  if (version !== (user.tokenVersion || 0)) return null;
  // A trial that has run out is over, even before the sweeper removes it.
  if (user.guest && !(user.expiresAt && user.expiresAt > new Date())) return null;
  return user;
};

/**
 * Whether the request's sign-in was kept past the browser session, for a route
 * that renews the cookie. Tokens made without a choice (scripts, older ones) were kept.
 */
export const keepsSignIn = (req: Request): boolean => {
  const token = tokenOf(req);
  const claims = token ? jwt.decode(token) : null;
  return !(claims && typeof claims === 'object' && claims.ss === true);
};

/** The signed-in user, in a route behind jwtAuth. */
export const userOf = (req: Request): UserDocument => {
  if (!req.user) throw new Error('jwtAuth must run before this route');
  return req.user;
};

export default async function jwtAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  // No route here takes an access token (default deny). It is checked all
  // the same, so a client learns whether its token is bad (401) or only not
  // for this (403), as RFC 6750 asks; the cookie is not looked at.
  if (accessTokenIn(req) !== null) return refuseAccessTokens(req, res, next);
  const user = await currentUser(req);
  if (!user) {
    res.status(401).json(say('not-signed-in'));
    return;
  }
  req.user = user;
  req.access = { via: 'session' };
  if (user.guest) return guestLimits.parseBody(req, res, next);
  next();
}
