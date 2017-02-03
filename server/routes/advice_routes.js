const express = require('express');
const Advice = require(__dirname + '/../models/advice');
const jsonParser = require('body-parser').json();
const handleDBError = require(__dirname + '/../lib/handle_db_error');
const jwtAuth = require(__dirname + '/../lib/jwt_auth');

const adviceRouter = module.exports = exports = express.Router();

adviceRouter.post('/newAdvice', jwtAuth, jsonParser, (req, res) => {
  var incAdvice = req.body.advice;
  if (!req.user.id || !(req.user.role === 'admin') || !incAdvice.title || !incAdvice.content || !incAdvice.tags) {
    res.status(400).json( { msg: 'Missing required information' } );
  }
  var newestAdvice = new Advice();

  newestAdvice.content = incAdvice.content;
  newestAdvice.ownedBy = req.user.id;
  newestAdvice.tags = incAdvice.tags;
  newestAdvice.title = incAdvice.title;

  newestAdvice.save((err, data) => {
    if (err) handleDBError(err, res);

    res.status(200).json(data);
  });
});

adviceRouter.get('/getLatest', jwtAuth, jsonParser, (req, res) => {

  Advice.findOne({ ownedBy: req.user.id }, (err, data) => {
    if (err) {
      console.log('error: ', err);
      return handleDBError(err, res);
    }

    res.status(200).json(data);
  });
});

adviceRouter.get('/getAll', jwtAuth, jsonParser, (req, res) => {
  Advice.find({ ownedBy: req.user.id }, (err, data) => {
    if (err) return handleDBError(err, res);

    res.status(200).json(data);
  });
});

adviceRouter.put('/change/:id', jwtAuth, jsonParser, (req, res) => {
  var adviceData = req.body.advice;
  if (!req.params.id || !req.user.id || !(req.user.role === 'admin')
  || !adviceData.title || !adviceData.content || !adviceData.tags) {
    res.status(400).json( { msg: 'Missing required information' } );
  }
  Advice.update({ _id: req.params.id }, adviceData, (err) => {
    if (err) return handleDBError(err, res);

    res.status(200).json({ msg: 'Successfully updated advice' });
  });
});

adviceRouter.delete('/delete/:id', jwtAuth, jsonParser, (req, res) => {
  if (!req.params.id || !req.user.id || !(req.user.role === 'admin')) {
    res.status(400).json( { msg: 'Missing required information' } );
  }
  Advice.remove({ _id: req.params.id }, (err) => {
    if (err) return handleDBError(err, res);

    res.status(200).json({ msg: 'Successfully deleted advice' });
  });
});
