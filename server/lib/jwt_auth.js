'use strict';

const User = require(__dirname + '/../models/user');
const jwt = require('jsonwebtoken');

module.exports = exports = (req, res, next) => {
  let decoded;
  try {
    decoded =
      jwt.verify(req.headers.token, process.env.APP_SECRET || 'glazedefault');
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
  });
};
