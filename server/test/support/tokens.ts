// Access tokens for the server tests, saved as the token page (wave 2) will save them.
import AccessToken from '../../models/access_token.ts';
import type { UserDocument } from '../../models/user.ts';
import type { Scope } from '../../lib/scopes.ts';
import { mintToken, type TokenKind } from '../../lib/token_auth.ts';

const DAY = 24 * 60 * 60 * 1000;

/** A token saved for the user; resolves with the token itself. */
export const makeToken = async (
  user: UserDocument,
  {
    scopes = ['data:read'],
    kind = 'pat',
    expiresAt = new Date(Date.now() + 30 * DAY),
    revokedAt
  }: { scopes?: string[]; kind?: TokenKind; expiresAt?: Date; revokedAt?: Date } = {}
): Promise<string> => {
  const { token, hash, hint } = mintToken(kind);
  await AccessToken.create({
    kind,
    userId: user._id,
    name: 'Test token',
    hash,
    hint,
    scopes: scopes as Scope[],
    expiresAt,
    revokedAt
  });
  return token;
};
