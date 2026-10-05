const mongoose = require('mongoose');

// A password reset request. Only a hash of the emailed token is stored, so the
// database alone cannot be used to reset anyone's password.
var passwordResetSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  usedAt: Date
}, { timestamps: { createdAt: true, updatedAt: false } });

// MongoDB deletes requests once they expire.
passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = exports = mongoose.model('PasswordReset', passwordResetSchema);
