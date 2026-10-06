// Lets a request through with req.user set when it carries a valid, current
// sign-in token; otherwise answers 401.
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User, { type UserDocument } from '../models/user.ts';
import appSecret from './app_secret.ts';
import * as guestLimits from './guest_limits.ts';
import * as session from './session.ts';

/**
 * The sign-in token: from an `Authorization: Bearer` header (scripts and tests),
 * or from the session cookie (browsers). The string 'null' counts as none.
 */
export const tokenOf = (req: Request): string | null => {
  const auth = req.headers.authorization;
  const token = auth && /^Bearer /i.test(auth) ? auth.slice(7).trim() : session.tokenIn(req);
  return token && token !== 'null' ? token : null;
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
  if (typeof claims === 'string' || typeof claims.id !== 'string') return null;
  const version = typeof claims.tv === 'number' ? claims.tv : 0;
  let user: UserDocument | null;
  try {
    // The password hash is not needed past this point.
    user = await User.findById(claims.id, { password: 0 });
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

/** The signed-in user, in a route behind jwtAuth. */
export const userOf = (req: Request): UserDocument => {
  if (!req.user) throw new Error('jwtAuth must run before this route');
  return req.user;
};

export default async function jwtAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const user = await currentUser(req);
  if (!user) {
    res.status(401).json({ msg: 'could not authenticate user' });
    return;
  }
  req.user = user;
  if (user.guest) return guestLimits.parseBody(req, res, next);
  next();
}
