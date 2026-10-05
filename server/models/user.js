const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const appSecret = require(__dirname + '/../lib/app_secret');

var userSchema = new mongoose.Schema({
  email: { type: String, required: true, trim: true, lowercase: true },
  displayname: String,
  password: { type: String, required: true },
  role: String,
  settings: [String],
  // Goes up when the password changes; login tokens carry it, so older tokens
  // (on other devices, or a stolen one) stop working.
  tokenVersion: { type: Number, default: 0 }
});

// One account per email, ignoring case.
userSchema.index({ email: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

// Synchronous versions for tests and scripts; the routes use server/lib/password.
userSchema.methods.hashPassword = function(password) {
  var hash = this.password = bcrypt.hashSync(password, 10);
  return hash;
};

userSchema.methods.comparePassword = function(password) {
  return bcrypt.compareSync(password, this.password);
};

userSchema.methods.generateToken = function() {
  return jwt.sign({ id: this._id, tv: this.tokenVersion || 0 }, appSecret, { algorithm: 'HS256', expiresIn: '7d' });
};

module.exports = exports = mongoose.model('User', userSchema);
