import mongoose, { type InferSchemaType, type Types } from 'mongoose';
import { SCOPES } from '../lib/scopes.ts';

// Access to an account that Glazecalc gave out, other than the web session
// (docs/integrations-plan.md, item 4): a personal access token (kind 'pat')
// that the person made for their own assistant or script, or an OAuth
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
/** The reminder email goes this many days before a personal token expires. */
export const REMINDER_DAYS_BEFORE = 7;
/** At most this many personal tokens in use on one account. */
export const MAX_PATS = 10;
/** An OAuth access token lasts an hour; its grant's refresh token 60 days, renewed as it rotates. */
export const OAUTH_ACCESS_SECONDS = 60 * 60;
export const OAUTH_REFRESH_DAYS = 60;
/**
 * How long a row stays after it expires, in days, so the settings page can
 * still say "expired on ...". A revoked one stays until then too: its hash
 * opens nothing.
 */
export const KEEP_AFTER_EXPIRY_DAYS = 30;

/** Why a token stopped working before it expired. */
export const REVOKED_WHY = ['person', 'password-reset', 'signed-out-everywhere', 'leaked'] as const;
export type RevokedWhy = (typeof REVOKED_WHY)[number];

const accessTokenSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ['pat', 'oauth'], required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    /** What the person called it, or the OAuth client's name. */
    name: { type: String, required: true, maxlength: 100 },
    /** The OAuth client this grant is for. */
    clientId: String,
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
    remindedAt: Date
  },
  { versionKey: false }
);

// The check finds a token by its hash, and only by that.
accessTokenSchema.index({ hash: 1 }, { unique: true, partialFilterExpression: { hash: { $type: 'string' } } });
// MongoDB removes a row KEEP_AFTER_EXPIRY_DAYS after it expires.
accessTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: KEEP_AFTER_EXPIRY_DAYS * 24 * 60 * 60 });

export type AccessTokenFields = InferSchemaType<typeof accessTokenSchema>;

const AccessToken = mongoose.model('AccessToken', accessTokenSchema);
export default AccessToken;
export type AccessTokenDocument = ReturnType<(typeof AccessToken)['hydrate']>;

/** Revokes every token and grant of an account still in use; resolves with how many. */
export const revokeAll = async (userId: string | Types.ObjectId, why: RevokedWhy, now = new Date()): Promise<number> =>
  (
    await AccessToken.updateMany(
      { userId, revokedAt: null, expiresAt: { $gt: now } },
      { $set: { revokedAt: now, revokedWhy: why } }
    )
  ).modifiedCount;

/** The filter for an account's personal tokens that still work: neither revoked nor expired. */
export const workingTokens = (userId: string | Types.ObjectId, now = new Date()) => ({
  userId,
  kind: 'pat' as const,
  revokedAt: null,
  expiresAt: { $gt: now }
});
