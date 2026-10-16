import mongoose from 'mongoose';

// A link emailed to confirm an address: kind 'verify' for the address an
// account signed up with, 'change' for a new address the account asked to move
// to. `email` is the address the link was sent to. Only a hash of the emailed
// token is stored, so the database alone cannot be used to confirm anything.
// The link works until expiresAt (server/routes/email_routes.ts) and once; the
// request stays until then, so the limit on links an hour counts it.
const emailTokenSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    kind: { type: String, enum: ['verify', 'change'], required: true },
    email: { type: String, required: true },
    tokenHash: { type: String, required: true, unique: true },
    // 'change': the account's tokenVersion when the link was asked for. The
    // link stops working once it changes (a password change, signing out
    // everywhere, a change to two-step sign-in).
    tokenVersion: Number,
    expiresAt: { type: Date, required: true },
    usedAt: Date
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// MongoDB deletes requests once they expire.
emailTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const EmailToken = mongoose.model('EmailToken', emailTokenSchema);
export default EmailToken;

/** Stops a user's open links of a kind from working: when a newer one is sent, and when the address changes. */
export const cancelEmailLinks = (userId: mongoose.Types.ObjectId | string, kind?: 'verify' | 'change') =>
  EmailToken.updateMany({ userId, usedAt: null, ...(kind && { kind }) }, { $set: { usedAt: new Date() } });
