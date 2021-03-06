const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

var userSchema = new mongoose.Schema({
  email: { type: String, required: true },
  displayname: String,
  password: { type: String, required: true },
  role: String,
  settings: [String]
});

userSchema.methods.hashPassword = function(password) {
  var hash = this.password = bcrypt.hashSync(password, 8);
  return hash;
};

userSchema.methods.comparePassword = function(password) {
  return bcrypt.compareSync(password, this.password);
};

userSchema.methods.generateToken = function() {
  return jwt.sign({ id: this._id }, process.env.APP_SECRET || 'glazedefault');
};

module.exports = exports = mongoose.model('User', userSchema);
