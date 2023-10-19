const express = require('express');
const jsonParser = require('body-parser').json();
const mongoose = require('mongoose');
mongoose.thisIsNotUsed = null;
require(__dirname + '/../lib/basic_http');
const jwtAuth = require(__dirname + '/../lib/jwt_auth');

const User = require(__dirname + '/../models/user');

const tokenFilter = (req, res, next) => {
  console.log('in token filter');
  if (!req.headers.token || req.headers.token === 'null') {
    return res.status(200).json({ msg: 'No token yet, so there is no email to find. Goodbye.' });
  }
  next();
};

var userRouter = module.exports = exports = express.Router();

userRouter.get('/verify', tokenFilter, jwtAuth, (req, res) => {

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
  });
});

userRouter.put('/usersettings/:id', jwtAuth, jsonParser, (req, res) => {
  var updateUser = req.body;
  delete updateUser._id;
  User.replaceOne({_id: req.params.id}, updateUser).then( (updateResult) => {
    if (!updateResult.acknowledged) { return handleDBError(req.params.id, res); }
    res.status(200).json({
      msg: 'User updated'
    });
  });
});

userRouter.delete('/deleteuser/:id', jwtAuth, (req, res) => {
  User.deleteOne({_id: req.params.id}).then( (u) => {
    if (u.deletedCount != 1) {
      return handleDBError(req.params.id, res);
    }
    res.status(200).json({
      msg: 'User deleted'
    });
  });
});
