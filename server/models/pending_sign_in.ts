import mongoose from 'mongoose';

// A sign-in waiting for its second step (docs/mfa-plan.md, item 9 and decision
// 2). The password step gives the page a short-lived signed token
// (server/lib/second_step.ts) naming this record by `tokenId`, the token's
// random id; the page keeps the token in memory, so there is no cookie. The
// record is what makes the token single use and counts wrong codes: after
// SECOND_STEP_TRIES (lib/mfa.js) the password must be entered again. It lives
// SECOND_STEP_MINUTES, then MongoDB deletes it.
export interface PendingSignInFields {
  /** The token's random id (jti): 16 random bytes, base64url. */
  tokenId: string;
  userId: mongoose.Types.ObjectId;
  /** The user's tokenVersion at the password step: a reset in between ends the sign-in. */
  tokenVersion: number;
  /** "Keep me signed in on this device" at the password step. */
  keep: boolean;
  /** A trial on this browser at the password step, merged when the sign-in finishes. */
  trialId?: mongoose.Types.ObjectId;
  /** The WebAuthn challenge offered with the second step, when the account has passkeys. */
  challenge?: string;
  /** Wrong codes so far. */
  attempts: number;
  expiresAt: Date;
  usedAt?: Date;
}

const pendingSignInSchema = new mongoose.Schema<PendingSignInFields>(
  {
    tokenId: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    tokenVersion: { type: Number, required: true },
    keep: { type: Boolean, default: false },
    trialId: mongoose.Schema.Types.ObjectId,
    challenge: String,
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
    usedAt: Date
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// MongoDB deletes pending sign-ins once they expire.
pendingSignInSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const PendingSignIn = mongoose.model<PendingSignInFields>('PendingSignIn', pendingSignInSchema);
export default PendingSignIn;
