const express = require('express');
const jsonParser = require('body-parser').json();
const mongoose = require('mongoose');
mongoose.thisIsNotUsed = null;
require(__dirname + '/../lib/basic_http');
const handleDBError = require(__dirname + '/../lib/handle_db_error');
const jwtAuth = require(__dirname + '/../lib/jwt_auth');

const User = require(__dirname + '/../models/user');

const tokenFilter = (req, res, next) => {
  if (!req.headers.token || req.headers.token === 'null') {
    return res.status(200).json({ msg: 'No token yet, so there is no email to find. Goodbye.' });
  }
  next();
};

var userRouter = module.exports = exports = express.Router();

userRouter.get('/verify', tokenFilter, jwtAuth, (req, res) => {
  if (req.user && req.user.id) {
    User.findOne({
      _id: req.user.id
    }).then((data) => {
      if (!data) {
        console.log('Error in verify after sending id to db');
        return res.status(500).json({
          msg: 'Error finding user'
        });
      }

      res.status(200).json({
        msg: 'User verified',
        email: data.email,
        id: data.id
      });
    }).catch((err) => handleDBError(err, res));
  } else {
    return res.status(200).json({
      msg: 'No id sent, verify skipped'
    })
  }
});

// Users may only change or delete their own account; admins may act on any.
const selfOrAdmin = (req, res, next) => {
  if (req.params.id === String(req.user._id) || req.user.role === 'admin') return next();
  return res.status(403).json({ msg: 'Not allowed to change another user' });
};

// Fields a user may set on their own account. Role and password are not
// changeable here.
const SETTABLE_FIELDS = ['displayname', 'email', 'settings'];

userRouter.put('/usersettings/:id', jwtAuth, selfOrAdmin, jsonParser, (req, res) => {
  var changes = {};
  SETTABLE_FIELDS.forEach((field) => {
    if (req.body[field] !== undefined) changes[field] = req.body[field];
  });
  if (changes.email !== undefined && String(changes.email).length < 5) {
    return res.status(400).json({ msg: 'Please enter an email' });
  }

  var emailTaken = changes.email === undefined ? Promise.resolve(null) :
    User.findOne({ email: changes.email, _id: { $ne: req.params.id } });
  emailTaken.then((other) => {
    if (other) return res.status(400).json({ msg: 'That email is already in use' });
    return User.updateOne({ _id: req.params.id }, { $set: changes }).then((updateResult) => {
      if (!updateResult.acknowledged) { return handleDBError(req.params.id, res); }
      res.status(200).json({
        msg: 'User updated'
      });
    });
  }).catch((err) => handleDBError(err, res));
});

userRouter.delete('/deleteuser/:id', jwtAuth, selfOrAdmin, (req, res) => {
  User.deleteOne({_id: req.params.id}).then( (u) => {
    if (u.deletedCount != 1) {
      return handleDBError(req.params.id, res);
    }
    res.status(200).json({
      msg: 'User deleted'
    });
  }).catch((err) => handleDBError(err, res));
});
