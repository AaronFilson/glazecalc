const express = require('express');
const User = require(__dirname + '/../models/user');
const jsonParser = express.json();
const handleDBError = require(__dirname + '/../lib/handle_db_error');
const basicHTTP = require(__dirname + '/../lib/basic_http');
const email = require(__dirname + '/../lib/email');
const password = require(__dirname + '/../lib/password');
const limits = require(__dirname + '/../lib/rate_limit');

const authRouter = module.exports = exports = express.Router();

// The same answer for an unknown email and a wrong password, so sign-in does
// not tell anyone which emails have accounts.
const SIGN_IN_FAILED = 'Email or password is incorrect.';

authRouter.post('/signup', limits.signUp, jsonParser, (req, res) => {
  var body = req.body || {};
  var address = email.normalize(body.email);
  if (!email.isValid(address)) {
    return res.status(400).json({ msg: 'Please enter an email' });
  }
  var problem = password.problem(body.password);
  if (problem) return res.status(400).json({ msg: problem });

  User.findOne({ email: address }).collation(email.collation).then((existing) => {
    if (existing) return res.status(400).json({ msg: 'An account with that email already exists.' });

    return password.hash(body.password).then((hash) => {
      var newUser = new User();
      newUser.email = address;
      newUser.password = hash;
      return newUser.save();
    }).then((data) => {
      res.status(200).json({ token: data.generateToken(), email: data.email });
    });
  }).catch((err) => {
    // The unique index catches two signups for one email racing each other.
    if (err.code === 11000) return res.status(400).json({ msg: 'An account with that email already exists.' });
    handleDBError(err, res);
  });
});

authRouter.get('/signin', limits.signIn, basicHTTP, (req, res) => {
  var supplied = req.basicHTTP.password;
  User.findOne({ email: email.normalize(req.basicHTTP.email) }).collation(email.collation).then((user) => {
    var check = user ? password.matches(supplied, user.password) : password.matchesNothing(supplied);
    return check.then((ok) => {
      if (!ok) return res.status(401).json({ msg: SIGN_IN_FAILED });
      res.json({ msg: 'Success in signin', token: user.generateToken(), email: user.email });
    });
  }).catch((err) => handleDBError(err, res));
});
