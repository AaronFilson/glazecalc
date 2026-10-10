import mongoose from 'mongoose';

// A password reset request. Only a hash of the emailed token is stored, so the
// database alone cannot be used to reset anyone's password. Its link works for
// 30 minutes from createdAt (server/routes/password_routes.ts), but the request
// is kept for an hour (expiresAt), so the limit on requests an hour counts it.
const passwordResetSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    usedAt: Date
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// MongoDB deletes requests once they expire.
passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const PasswordReset = mongoose.model('PasswordReset', passwordResetSchema);
export default PasswordReset;

/**
 * Stops a user's open reset links from working: when a newer one is sent, and
 * when the password or the email changes. They are marked used rather than
 * deleted, so they still count towards the hourly limit.
 */
export const cancelLinks = (userId: mongoose.Types.ObjectId | string) =>
  PasswordReset.updateMany({ userId, usedAt: null }, { $set: { usedAt: new Date() } });
