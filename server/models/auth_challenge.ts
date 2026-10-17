import mongoose from 'mongoose';

// A short-lived step in setting up or using a second factor (docs/mfa-plan.md,
// item 5), modelled on email_token.ts:
//
//   totp-add         an authenticator app being set up: its secret, encrypted
//                    (server/lib/mfa_key.ts), until a first code confirms it
//                    (10 minutes); `attempts` counts wrong codes. Its id is
//                    the setup's id, and `tokenVersion` binds it to the
//                    account as it was when the setup started
//   change-grant     a change confirmed with the password and a factor, whose
//                    second request is still to come (server/lib/change_grant.ts):
//                    for `purpose`, found by `grantHash`, good while the
//                    account's tokenVersion is still `tokenVersion` (5 minutes);
//                    purpose 'provider-reauth' is a fresh sign-in with a linked
//                    provider, in place of the password of an account that has
//                    none (server/routes/oauth_routes.ts, docs/adr/0015), and
//                    good only for the sign-in session that started it
//                    (`sessionHash`, jwt_auth.ts sessionKeyOf)
//   passkey-add      the WebAuthn challenge for a passkey being registered,
//                    under the change-grant `grantId`
//   passkey-confirm  the challenge for a passkey that confirms a change to how
//                    the account signs in (confirmIdentity, decision 6)
//   passkey-signin   the challenge for passkey-first sign-in: no userId yet
//
// WebAuthn challenges last 5 minutes. A record is used once: whoever takes it
// sets usedAt with one findOneAndUpdate({ usedAt: null, expiresAt: { $gt: now } }),
// and a passkey's record is found by its challenge, which the browser's
// response carries. The pending second step at sign-in has its own collection
// (pending_sign_in.ts).
export const CHALLENGE_KINDS = [
  'totp-add',
  'change-grant',
  'passkey-add',
  'passkey-confirm',
  'passkey-signin'
] as const;
export type ChallengeKind = (typeof CHALLENGE_KINDS)[number];
/** What a change-grant is for. */
export const GRANT_PURPOSES = ['passkey-add', 'provider-reauth'] as const;
export type GrantPurpose = (typeof GRANT_PURPOSES)[number];

export interface AuthChallengeFields {
  /** The account; absent for passkey-signin. */
  userId?: mongoose.Types.ObjectId;
  kind: ChallengeKind;
  /** The WebAuthn challenge, base64url, as sent to the browser. */
  challenge?: string;
  /** totp-add: the new secret, encrypted with the user id as AAD. */
  secret?: string;
  /** Wrong codes so far (totp-add). */
  attempts: number;
  /** totp-add, change-grant: the account's tokenVersion when the identity was confirmed. */
  tokenVersion?: number;
  /** change-grant: what it is for, and the SHA-256 (hex) of the grant the page holds. */
  purpose?: GrantPurpose;
  grantHash?: string;
  /** change-grant 'provider-reauth': the session it is good for (jwt_auth.ts sessionKeyOf). */
  sessionHash?: string;
  /** passkey-add: the change-grant it was made under. */
  grantId?: mongoose.Types.ObjectId;
  expiresAt: Date;
  usedAt?: Date;
}

const authChallengeSchema = new mongoose.Schema<AuthChallengeFields>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, index: true },
    kind: { type: String, enum: CHALLENGE_KINDS, required: true },
    challenge: String,
    secret: String,
    attempts: { type: Number, default: 0 },
    tokenVersion: Number,
    purpose: { type: String, enum: GRANT_PURPOSES },
    grantHash: String,
    sessionHash: String,
    grantId: mongoose.Schema.Types.ObjectId,
    expiresAt: { type: Date, required: true },
    usedAt: Date
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// A challenge is random and found by its value.
authChallengeSchema.index(
  { challenge: 1 },
  { unique: true, partialFilterExpression: { challenge: { $exists: true } } }
);
// MongoDB deletes records once they expire.
authChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const AuthChallenge = mongoose.model<AuthChallengeFields>('AuthChallenge', authChallengeSchema);
export default AuthChallenge;
