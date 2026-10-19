import mongoose, { type InferSchemaType, type Types } from 'mongoose';
import { SCOPES } from '../lib/scopes.ts';
import { deleteGrantRecords } from '../oauth/adapter.ts';

// Access to an account that Glazecalc gave out, other than the web session
// (docs/integrations-plan.md, item 4): a personal access token (kind 'pat')
// that the person made for their own assistant or script, to read their
// records or to read and change them (server/lib/scopes.ts), or an OAuth
// client's grant (kind 'oauth') that they approved. One table, so one page
// lists both, and one check (server/lib/token_auth.ts) serves both.
//
// A token is never stored: only its SHA-256 hash, and its last four
// characters as a hint the person can recognise it by. Every token expires;
// there is no "never". A password reset and "Sign out everywhere" revoke
// them all (revokeAll); an ordinary password change keeps them.

/** Lifetimes a person can choose for a personal token, in days (decision 4): no "never". */
export const PAT_EXPIRY_DAYS = [7, 30, 90, 365] as const;
export const DEFAULT_PAT_EXPIRY_DAYS = 30;
/**
 * A token that can change records (data:write) lasts at most this many days
 * (owner decision, 2026-10-19): the choices up to it, so one forgotten in a
 * script's settings stops on its own soon.
 */
export const WRITE_PAT_MOST_DAYS = 90;
/** The lifetimes a person can choose for a token with this scope. */
export const patExpiryDays = (scope: string): number[] =>
  scope === 'data:write' ? PAT_EXPIRY_DAYS.filter((days) => days <= WRITE_PAT_MOST_DAYS) : [...PAT_EXPIRY_DAYS];
/** The reminder email goes this many days before a personal token expires. */
export const REMINDER_DAYS_BEFORE = 7;
/** At most this many personal tokens in use on one account. */
export const MAX_PATS = 10;
/**
 * An app connected with OAuth (server/oauth/, docs/adr/0024): its access
 * tokens last an hour. A connection that can only read lasts
 * OAUTH_REFRESH_DAYS from its last refresh, renewed each time its refresh
 * token is used; one that can also change records lasts OAUTH_WRITE_DAYS
 * from the day it was allowed, never renewed (owner decision, 2026-10-19).
 */
export const OAUTH_ACCESS_SECONDS = 60 * 60;
export const OAUTH_REFRESH_DAYS = 60;
export const OAUTH_WRITE_DAYS = 90;
/**
 * How long a row stays after it expires, in days, so the settings page can
 * still say "expired on ...". A revoked one stays until then too: its hash
 * opens nothing.
 */
export const KEEP_AFTER_EXPIRY_DAYS = 30;

/**
 * Why a token stopped working before it expired. For a connected app also:
 * 'app', the app ended it itself (OAuth revocation); 'reused', one of its
 * refresh tokens or codes was used twice, so it may have been copied;
 * 'replaced', the person connected the same app again.
 */
export const REVOKED_WHY = [
  'person',
  'password-reset',
  'signed-out-everywhere',
  'leaked',
  'app',
  'reused',
  'replaced'
] as const;
export type RevokedWhy = (typeof REVOKED_WHY)[number];

const accessTokenSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ['pat', 'oauth'], required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    /** What the person called it, or the OAuth client's name. */
    name: { type: String, required: true, maxlength: 100 },
    /** The OAuth client this grant is for: a CIMD address, or the id a self-registered (DCR) app was given. */
    clientId: String,
    /** A connected app's grant in the authorization server (server/oauth/): its tokens carry this id. */
    grantId: String,
    /** Where the app's details came from: its own address (CIMD), or what it said of itself (DCR). */
    clientSource: { type: String, enum: ['cimd', 'dcr'] },
    /** The host of a CIMD app's address; none for a DCR app, whose name and address are self-described. */
    clientHost: String,
    /** The host the app's sign-in came back to (its redirect URI). */
    redirectHost: String,
    /** The token's SHA-256, in hex. An OAuth grant's tokens carry its id instead, so it may have none. */
    hash: String,
    /** Its last four characters, to tell tokens apart on the settings page. */
    hint: String,
    scopes: {
      type: [{ type: String, enum: SCOPES }],
      required: true,
      validate: { validator: (list: string[]) => list.length > 0, message: 'A token needs a scope.' }
    },
    createdAt: { type: Date, required: true, default: () => new Date() },
    expiresAt: { type: Date, required: true },
    lastUsedAt: Date,
    revokedAt: Date,
    revokedWhy: { type: String, enum: REVOKED_WHY },
    /** When the "expires in 7 days" email went, so it goes once. */
    remindedAt: Date,
    /**
     * A personal token that can change records whose changes never wait for
     * approval, whatever the account's confirmChanges (docs/adr/0025-confirm-before-changes.md):
     * chosen only when the token is made, with the password, never later.
     */
    noConfirm: Boolean
  },
  { versionKey: false }
);

// The check finds a token by its hash, and only by that.
accessTokenSchema.index({ hash: 1 }, { unique: true, partialFilterExpression: { hash: { $type: 'string' } } });
// A connected app's tokens find their connection by its grant.
accessTokenSchema.index({ grantId: 1 }, { unique: true, partialFilterExpression: { grantId: { $type: 'string' } } });
// An app's working connections, found by the app (server/oauth/client_documents.ts).
accessTokenSchema.index({ clientId: 1, expiresAt: -1 }, { partialFilterExpression: { clientId: { $type: 'string' } } });
// MongoDB removes a row KEEP_AFTER_EXPIRY_DAYS after it expires.
accessTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: KEEP_AFTER_EXPIRY_DAYS * 24 * 60 * 60 });

export type AccessTokenFields = InferSchemaType<typeof accessTokenSchema>;

const AccessToken = mongoose.model('AccessToken', accessTokenSchema);
export default AccessToken;
export type AccessTokenDocument = ReturnType<(typeof AccessToken)['hydrate']>;

/**
 * Revokes every token and connected app of an account still in use (a
 * password reset, "Sign out everywhere", "Revoke all"); resolves with how
 * many. The rows first, which stops them at once; then each connected app's
 * grant in the authorization server, with all its codes, access and refresh
 * tokens.
 */
export const revokeAll = async (
  userId: string | Types.ObjectId,
  why: RevokedWhy,
  now = new Date()
): Promise<number> => {
  const count = (
    await AccessToken.updateMany(
      { userId, revokedAt: null, expiresAt: { $gt: now } },
      { $set: { revokedAt: now, revokedWhy: why } }
    )
  ).modifiedCount;
  const grants = await AccessToken.find({ userId, kind: 'oauth', grantId: { $type: 'string' } }, { grantId: 1 }).lean();
  await deleteGrantRecords(grants.map((row) => row.grantId!));
  return count;
};

/**
 * Revokes one token or grant of an account, if it is still in use; resolves
 * with whether the row exists (so a second revoke is no error). The one path
 * the account page and Connected apps use to revoke a single token or grant.
 */
export const revokeOne = async (
  userId: string | Types.ObjectId,
  tokenId: string | Types.ObjectId,
  kinds: Array<'pat' | 'oauth'>,
  why: RevokedWhy,
  now = new Date()
): Promise<boolean> => {
  const row = await AccessToken.findOne({ _id: tokenId, userId, kind: { $in: kinds } })
    .select({ revokedAt: 1, kind: 1, grantId: 1 })
    .lean();
  if (!row) return false;
  if (!row.revokedAt) {
    await AccessToken.updateOne({ _id: row._id, revokedAt: null }, { $set: { revokedAt: now, revokedWhy: why } });
  }
  // A connected app's grant goes with it (server/oauth/), so every access and refresh token it holds stops at once.
  if (row.kind === 'oauth' && row.grantId) await deleteGrantRecords([row.grantId]);
  return true;
};

/** The filter for an account's personal tokens that still work: neither revoked nor expired. */
export const workingTokens = (userId: string | Types.ObjectId, now = new Date()) => ({
  userId,
  kind: 'pat' as const,
  revokedAt: null,
  expiresAt: { $gt: now }
});

/**
 * Keeps a personal token just made only while the account has at most
 * MAX_PATS working: counted again after it is saved, and taken back (deleted,
 * never having been shown) when there are more. Two made at the same moment
 * may then both be taken back, but there are never more than MAX_PATS.
 */
export const keepWithinPatLimit = async (
  userId: string | Types.ObjectId,
  tokenId: Types.ObjectId,
  now = new Date()
): Promise<boolean> => {
  if ((await AccessToken.countDocuments(workingTokens(userId, now))) <= MAX_PATS) return true;
  await AccessToken.deleteOne({ _id: tokenId });
  return false;
};
