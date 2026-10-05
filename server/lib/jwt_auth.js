'use strict';

const User = require(__dirname + '/../models/user');
const jwt = require('jsonwebtoken');
const appSecret = require(__dirname + '/app_secret');

const unauthorized = (res) => res.status(401).json({ msg: 'could not authenticate user' });

module.exports = exports = (req, res, next) => {
  let decoded;
  try {
    decoded = jwt.verify(req.headers.token, appSecret, { algorithms: ['HS256'] });
  } catch (e) {
    return unauthorized(res);
  }
  if (!decoded) return unauthorized(res);

  User.findById(decoded.id).select('-password').then((user) => {
    if (!user) return unauthorized(res);
    // Tokens from before the last password change no longer count. Tokens made
    // before versions existed have none, which matches an unchanged password.
    if ((decoded.tv || 0) !== (user.tokenVersion || 0)) return unauthorized(res);
    req.user = user;
    next();
  }, (err) => {
    // An id that is not an ObjectId is a bad token. Anything else (the database
    // is down or restarting) is a server error, so clients keep their sign-in.
    if (err && err.name === 'CastError') return unauthorized(res);
    next(err);
  }).catch(next);
};
