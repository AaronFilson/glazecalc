// Access tokens (docs/integrations-plan.md, item 4): how they are written,
// made and checked. A token is
//
//   glazecalc_pat_ + 43 base62 characters (32 random bytes) + 6 of CRC32
//
// (glazecalc_oat_ for an OAuth client's), so a leaked one is easy to spot and
// a made-up one fails its checksum before the database is asked. Only its
// SHA-256 is stored (models/access_token.ts). The token itself is never
// logged, never put in a URL and never sent back after it is made.
//
// It arrives only in an Authorization: Bearer header. A request that carries
// one is judged by that header alone, never by a session cookie riding along,
// and its replies never set a cookie. Routes take a token only through
// requireScope (server/lib/require_scope.ts); jwtAuth refuses one.
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import type { NextFunction, Request, Response } from 'express';
import AccessToken, { type AccessTokenDocument } from '../models/access_token.ts';
import User, { type UserDocument } from '../models/user.ts';
import { say } from './messages.ts';
import type { Permission, Scope } from './scopes.ts';

export const PREFIXES = { pat: 'glazecalc_pat_', oauth: 'glazecalc_oat_' } as const;
export type TokenKind = keyof typeof PREFIXES;

const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
/** 32 random bytes take 43 base62 characters, and a CRC32 6. */
const BODY_LENGTH = 43;
const CHECK_LENGTH = 6;
const SHAPE = new RegExp(`^glazecalc_(pat|oat)_([0-9A-Za-z]{${BODY_LENGTH}})([0-9A-Za-z]{${CHECK_LENGTH}})$`);
/** A token's last use is written at most this often, not on every request. */
const LAST_USED_EVERY_MS = 60 * 1000;

/** A number as base62, left-padded with zeros to `length`. */
const base62 = (value: bigint, length: number): string => {
  let out = '';
  let rest = value;
  while (rest > 0n) {
    out = BASE62[Number(rest % 62n)] + out;
    rest /= 62n;
  }
  return out.padStart(length, '0');
};

const checksum = (text: string): string => base62(BigInt(zlib.crc32(text)), CHECK_LENGTH);

/** The token's SHA-256, in hex: what is stored and looked up. */
export const hashToken = (token: string): string => crypto.createHash('sha256').update(token, 'utf8').digest('hex');

/**
 * A new token of a kind, with what is stored for it. The token is shown to
 * the person once and then forgotten; only the hash and hint are kept.
 */
export const mintToken = (kind: TokenKind): { token: string; hash: string; hint: string } => {
  const body = base62(BigInt('0x' + crypto.randomBytes(32).toString('hex')), BODY_LENGTH);
  const start = PREFIXES[kind] + body;
  const token = start + checksum(start);
  return { token, hash: hashToken(token), hint: token.slice(-4) };
};

/** The kind of token this is written as, with a checksum that fits; null for anything else. */
export const kindOf = (token: string): TokenKind | null => {
  const match = SHAPE.exec(token);
  if (!match) return null;
  const start = token.slice(0, token.length - CHECK_LENGTH);
  const given = Buffer.from(match[3]);
  const expected = Buffer.from(checksum(start));
  if (!crypto.timingSafeEqual(given, expected)) return null;
  return match[1] === 'pat' ? 'pat' : 'oauth';
};

/**
 * The access token in the request's Authorization header, if it holds one
 * (anything starting glazecalc_, well written or not); null otherwise, and
 * for a session token sent by a script.
 */
export const accessTokenIn = (req: Request): string | null => {
  const auth = req.headers.authorization;
  if (!auth || !/^Bearer /i.test(auth)) return null;
  const token = auth.slice(7).trim();
  return token.startsWith('glazecalc_') ? token : null;
};

/** Who a token is for, and the token's row. */
export interface Verified {
  user: UserDocument;
  token: AccessTokenDocument;
}

/**
 * The account and row of a token that works now: well written, known,
 * neither revoked nor expired, and an account's, never a trial's. null for
 * any other, without saying which test it failed. `touch` records the use
 * (at most once a minute); a route that refuses every token does not.
 */
export const verifyAccessToken = async (
  token: string,
  { now = new Date(), touch = true }: { now?: Date; touch?: boolean } = {}
): Promise<Verified | null> => {
  const kind = kindOf(token);
  if (!kind) return null;
  const hash = hashToken(token);
  const row = await AccessToken.findOne({ hash, kind });
  // Found by its hash, which already says the two are the same; compared
  // again in constant time all the same, in case an index ever matched loosely.
  if (!row?.hash || !crypto.timingSafeEqual(Buffer.from(row.hash, 'hex'), Buffer.from(hash, 'hex'))) return null;
  if (row.revokedAt || !(row.expiresAt > now)) return null;
  const user = await User.findById(row.userId, { password: 0, mfa: 0 });
  // Trials cannot make tokens (decision 9); a trial with one is refused all the same.
  if (!user || user.guest) return null;
  if (touch && (!row.lastUsedAt || now.getTime() - row.lastUsedAt.getTime() > LAST_USED_EVERY_MS)) {
    row.lastUsedAt = now;
    await AccessToken.updateOne({ _id: row._id }, { $set: { lastUsedAt: now } });
  }
  return { user, token: row };
};

// RFC 6750 answers. realm names the site; error_description is plain ASCII,
// as section 3 asks.
const REALM = 'realm="glazecalc"';

/** 401 for a token that does not work: unknown, expired, revoked, badly written or a trial's. */
export const invalidToken = (res: Response): void => {
  res
    .status(401)
    .set(
      'WWW-Authenticate',
      `Bearer ${REALM}, error="invalid_token", error_description="The access token is not valid, has expired or was revoked"`
    )
    .json(say('token-invalid'));
};

/**
 * 403 for a token that works but does not allow this: `scope` is the scope
 * that would, or none for a route no token can use.
 */
export const insufficientScope = (res: Response, scope?: Scope): void => {
  res
    .status(403)
    .set(
      'WWW-Authenticate',
      `Bearer ${REALM}, error="insufficient_scope"` +
        (scope ? `, scope="${scope}"` : '') +
        ', error_description="The access token does not allow this"'
    )
    .json(say(scope ? 'token-scope' : 'token-not-here'));
};

/**
 * Turns away any request that carries an access token: 401 if the token does
 * not work, 403 if it does but nothing here takes one. server/app.ts puts it
 * in front of every /api route but the records, so a route added later takes
 * no token unless it is put before it and asks requireScope.
 */
export const refuseAccessTokens = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const token = accessTokenIn(req);
  if (token === null) return next();
  if (await verifyAccessToken(token, { touch: false })) insufficientScope(res);
  else invalidToken(res);
};

/** How a request was let in, set beside req.user. */
export type Access =
  { via: 'session' } | { via: TokenKind; tokenId: string; name: string; scopes: Scope[]; permission: Permission };
