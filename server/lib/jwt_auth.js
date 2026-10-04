'use strict';

const User = require(__dirname + '/../models/user');
const jwt = require('jsonwebtoken');
const appSecret = require(__dirname + '/app_secret');

module.exports = exports = (req, res, next) => {
  let decoded;
  try {
    decoded =
      jwt.verify(req.headers.token, appSecret, { algorithms: ['HS256'] });
  } catch (e) {
    return res.status(444).json({ msg: 'could not authenticate user' });
  }
  
  if (!decoded) return res.status(499).json({ msg: 'could not authenticate user' });

  if (!User.connection) {}
  const u = User.findById(decoded.id).then( (user) => {

    if (!user) return res.status(411).json({ msg: 'Error finding user' });
    delete user.password;
    req.user = user;
    next();
  // A failed lookup (such as an id that is not an ObjectId) is an auth failure;
  // errors thrown further down the route go to Express instead of crashing.
  }, () => res.status(401).json({ msg: 'could not authenticate user' })).catch(next);
};
