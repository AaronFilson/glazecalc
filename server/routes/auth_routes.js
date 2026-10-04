const express = require('express');
const User = require(__dirname + '/../models/user');
const jsonParser = require('body-parser').json();
const handleDBError = require(__dirname + '/../lib/handle_db_error');
const basicHTTP = require(__dirname + '/../lib/basic_http');
const email = require(__dirname + '/../lib/email');

const authRouter = module.exports = exports = express.Router();

authRouter.post('/signup', jsonParser, (req, res) => {
  var address = email.normalize(req.body.email);
  if (!address || address.length < 5) {
    return res.status(400).json({ msg: 'Please enter an email' });
  }

  if (typeof req.body.password !== 'string' || req.body.password.length < 8) {
    return res.status(400)
      .json({ msg: 'Please enter a password 8 characters or longer.' });
  }

  User.findOne({ email: address }).collation(email.collation).then((existing) => {
    if (existing) return res.status(400).json({ msg: 'An account with that email already exists.' });

    var newUser = new User();
    newUser.email = address;
    newUser.hashPassword(req.body.password);
    return newUser.save().then((data) => {
      res.status(200).json({ token: data.generateToken(), email: newUser.email });
    });
  }).catch((err) => {
    // The unique index catches two signups for one email racing each other.
    if (err.code === 11000) return res.status(400).json({ msg: 'An account with that email already exists.' });
    handleDBError(err, res);
  });
});

authRouter.get('/signin', basicHTTP, (req, res) => {
  User.findOne({ email: email.normalize(req.basicHTTP.email) }).collation(email.collation).then( (user) => {
    if (!user) return res.status(401).json({ msg: 'no user exists' });

    if (!user.comparePassword(req.basicHTTP.password)) {
      return res.status(401).json({ msg: 'incorrect password' });
    }

    res.json({ msg: 'Success in signin', token: user.generateToken(), email: user.email });
  }).catch((err) => handleDBError(err, res));
});
