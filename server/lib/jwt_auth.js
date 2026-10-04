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
    req.user = user;
    next();
  // A failed lookup (such as an id that is not an ObjectId) is an auth failure;
  // errors thrown further down the route go to Express instead of crashing.
  }, () => unauthorized(res)).catch(next);
};
