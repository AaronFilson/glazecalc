// The MCP endpoint's check of an OAuth access token (docs/adr/0024): the
// resource side of the authorization server. A token works only when all of
// these hold, checked afresh on every request:
//
//   - the authorization server knows it, and it has not expired (an hour);
//   - its audience is the MCP endpoint (resourceUrl()): a token is for /mcp
//     and nothing else, so the record routes under /api refuse it;
//   - its connection (a row in access_tokens, kind 'oauth') works: not
//     revoked, not expired, the same account and app; revoking the row on the
//     account page stops every token of the connection at once;
//   - the account is an account, never a trial.
//
// It allows what both the token and its connection allow, never more.
import crypto from 'node:crypto';
import AccessToken from '../models/access_token.ts';
import User from '../models/user.ts';
import { isScope, type Scope } from '../lib/scopes.ts';
import type { Verified } from '../lib/token_auth.ts';
import { resourceUrl } from '../mcp/urls.ts';
import { getProvider } from './provider.ts';

/** The shape of the access tokens the authorization server gives out: 256 bits as 43 base64url characters. */
export const OAUTH_TOKEN_SHAPE = /^[A-Za-z0-9_-]{43}$/;

/** The account and connection of an OAuth access token that works now; null for any other, without saying why. */
export const verifyOAuthAccessToken = async (value: string, now = new Date()): Promise<Verified | null> => {
  if (!OAUTH_TOKEN_SHAPE.test(value)) return null;
  const token = await getProvider().AccessToken.find(value);
  if (!token?.grantId || !token.accountId) return null;
  const audience = ([] as unknown[]).concat(token.aud);
  if (audience.length !== 1 || audience[0] !== resourceUrl()) return null;
  const row = await AccessToken.findOne({ kind: 'oauth', grantId: token.grantId });
  if (!row || row.revokedAt || !(row.expiresAt > now)) return null;
  // The same account and app as the connection: compared in constant time, though neither is secret.
  const same = (a: string, b: string) =>
    a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  if (!same(String(row.userId), token.accountId) || !same(row.clientId ?? '', token.clientId ?? '')) return null;
  const user = await User.findById(row.userId, { password: 0, mfa: 0 });
  if (!user || user.guest) return null;
  const granted = new Set(String(token.scope ?? '').split(' '));
  const scopes: Scope[] = row.scopes.filter((scope): scope is Scope => isScope(scope) && granted.has(scope));
  if (!scopes.length) return null;
  return { user, token: row, scopes, via: 'oauth' };
};
