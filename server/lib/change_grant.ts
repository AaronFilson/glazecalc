// A change to how the account signs in that takes two requests, adding a
// passkey (the browser's options, then the new passkey), is confirmed in the
// first (factors.confirmIdentity: the password and a current factor), and the
// browser's own step comes between them. So that a factor spent on the
// confirmation (a recovery code above all) is not wasted when that step is
// cancelled or fails, the confirmation gives a grant: a random value the page
// keeps in memory only, as it keeps a pending sign-in, and an AuthChallenge of
// kind 'change-grant' holding its SHA-256, for one account and one purpose,
// for GRANT_MINUTES. The second request may be tried again with it until the
// change is made: it is taken (used) only then. A change to the account's
// tokenVersion (another change to how it signs in, a password reset, a
// sign-out everywhere) ends it. One grant per account and purpose: a newer one
// replaces the last. A grant may also be bound to one sign-in session
// (`session`, jwt_auth.ts sessionKeyOf; a provider reauth always is, ADR 15):
// then only a request from that session finds it.
import crypto from 'node:crypto';
import type { HydratedDocument, Types } from 'mongoose';
import AuthChallenge, { type AuthChallengeFields, type GrantPurpose } from '../models/auth_challenge.ts';
import User from '../models/user.ts';

/** How long a grant lasts. */
export const GRANT_MINUTES = 5;

export type Grant = HydratedDocument<AuthChallengeFields>;

const hashOf = (grant: string): string => crypto.createHash('sha256').update(grant).digest('hex');

/** The filter for "the account's tokenVersion is still `version`" (0 also matches an account without one). */
export const versionIs = (version: number): Record<string, unknown> =>
  version ? { tokenVersion: version } : { tokenVersion: { $in: [0, null] } };

/**
 * Gives a grant for `purpose` to an account whose identity was just confirmed:
 * for GRANT_MINUTES from `confirmedAt` (now when not given), and only to the
 * sign-in session `session` names when given.
 */
export const issue = async (
  user: { _id: Types.ObjectId; tokenVersion?: number },
  purpose: GrantPurpose,
  confirmedAt = new Date(),
  session?: string
): Promise<{ grant: string; expiresAt: Date }> => {
  await AuthChallenge.deleteMany({ userId: user._id, kind: 'change-grant', purpose });
  const grant = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(confirmedAt.getTime() + GRANT_MINUTES * 60 * 1000);
  await AuthChallenge.create({
    userId: user._id,
    kind: 'change-grant',
    purpose,
    grantHash: hashOf(grant),
    tokenVersion: user.tokenVersion || 0,
    ...(session && { sessionHash: session }),
    expiresAt
  });
  return { grant, expiresAt };
};

/**
 * The live grant `grant` names, for this account and purpose, or null: unknown,
 * expired, used, another account's or purpose's, replaced by a newer one, the
 * account's tokenVersion has changed since, or it is bound to a sign-in
 * session other than `session` (a grant bound to one is never found without it).
 */
export const find = async (
  userId: Types.ObjectId,
  grant: unknown,
  purpose: GrantPurpose,
  session?: string | null
): Promise<Grant | null> => {
  if (typeof grant !== 'string' || !grant || grant.length > 128) return null;
  const found = await AuthChallenge.findOne({
    userId,
    kind: 'change-grant',
    purpose,
    grantHash: hashOf(grant),
    // null also matches a grant bound to no session.
    sessionHash: session || null,
    usedAt: null,
    expiresAt: { $gt: new Date() }
  });
  if (!found) return null;
  return (await User.exists({ _id: userId, ...versionIs(found.tokenVersion ?? 0) })) ? found : null;
};

/** Takes a grant for the change it allows, once: false when another request took it first or it expired. */
export const take = async (grant: Grant): Promise<boolean> => {
  const now = new Date();
  const taken = await AuthChallenge.updateOne(
    { _id: grant._id, usedAt: null, expiresAt: { $gt: now } },
    { $set: { usedAt: now } }
  );
  return taken.modifiedCount === 1;
};

/** Gives back a grant taken for a change that could not be made, so the person can try again in its time. */
export const giveBack = async (grant: Grant): Promise<void> => {
  await AuthChallenge.updateOne({ _id: grant._id }, { $unset: { usedAt: 1 } });
};
