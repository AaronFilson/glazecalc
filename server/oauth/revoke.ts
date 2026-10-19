// Ending a connected app's access (docs/adr/0024). A connection is its row
// in access_tokens (kind 'oauth', server/models/access_token.ts) and its grant
// in the authorization server; revoking the row stops the app at once (the
// MCP endpoint and the token endpoint each ask for a working row), and the
// grant's codes, access and refresh tokens are then deleted too.
//
// The account page's paths call these through models/access_token.ts
// (revokeOne, revokeAll), which a password reset and "Sign out everywhere"
// use; these are for code that has the grant rather than the row.
import type { Types } from 'mongoose';
import AccessToken, { type RevokedWhy } from '../models/access_token.ts';
import { deleteGrantRecords } from './adapter.ts';

/** Revokes the connection of this grant, and deletes the grant with every token it gave out. */
export const revokeGrant = async (grantId: string, why: RevokedWhy = 'person', now = new Date()): Promise<void> => {
  if (typeof grantId !== 'string' || !grantId) return;
  await AccessToken.updateOne(
    { kind: 'oauth', grantId, revokedAt: null },
    { $set: { revokedAt: now, revokedWhy: why } }
  );
  await deleteGrantRecords([grantId]);
};

/** Revokes every connected app of an account (not its personal tokens); resolves with how many were working. */
export const revokeAllGrants = async (
  userId: string | Types.ObjectId,
  why: RevokedWhy = 'person',
  now = new Date()
): Promise<number> => {
  const count = (
    await AccessToken.updateMany(
      { userId, kind: 'oauth', revokedAt: null, expiresAt: { $gt: now } },
      { $set: { revokedAt: now, revokedWhy: why } }
    )
  ).modifiedCount;
  const grants = await AccessToken.find({ userId, kind: 'oauth', grantId: { $type: 'string' } }, { grantId: 1 }).lean();
  await deleteGrantRecords(grants.map((row) => row.grantId!));
  return count;
};

/**
 * Revokes an account's other connections to the same app, when the person
 * connects it again (a step up to changing records, say): one connection per
 * app, so an older, forgotten refresh token stops.
 */
export const replaceEarlierGrants = async (
  userId: string | Types.ObjectId,
  clientId: string,
  now = new Date()
): Promise<void> => {
  const earlier = await AccessToken.find({ userId, kind: 'oauth', clientId, revokedAt: null }, { grantId: 1 }).lean();
  if (!earlier.length) return;
  await AccessToken.updateMany(
    { _id: { $in: earlier.map((row) => row._id) }, revokedAt: null },
    { $set: { revokedAt: now, revokedWhy: 'replaced' } }
  );
  await deleteGrantRecords(earlier.map((row) => row.grantId).filter((id): id is string => typeof id === 'string'));
};
