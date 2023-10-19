const express = require('express');
const Advice = require(__dirname + '/../models/advice');
const jsonParser = require('body-parser').json();
const handleDBError = require(__dirname + '/../lib/handle_db_error');
const jwtAuth = require(__dirname + '/../lib/jwt_auth');

const adviceRouter = module.exports = exports = express.Router();

adviceRouter.post('/create', jwtAuth, jsonParser, (req, res) => {
  var incAdvice = req.body;
  if (!req.user.id || !incAdvice.title || !incAdvice.content || !incAdvice.tags) {
    return res.status(400).json( { msg: 'Missing required information' } );
  }
  var newestAdvice = new Advice();
  newestAdvice.content = incAdvice.content;
  newestAdvice.ownedBy = req.user.id;
  newestAdvice.tags = incAdvice.tags;
  newestAdvice.title = incAdvice.title;

  try {
    newestAdvice.save().then((data) => {
      res.status(200).json(data);
    });
  } catch (e) {
    return handleDBError(req.user.id, res);
  }
  
});

adviceRouter.get('/getLatest', jwtAuth, jsonParser, (req, res) => {

  Advice.findOne({ ownedBy: req.user.id }).then((data) => {
    if (!data) { return handleDBError(req.user.id, res); }
    res.status(200).json(data);
  });
});

adviceRouter.get('/getAll', jwtAuth, jsonParser, (req, res) => {
  Advice.find({ ownedBy: req.user.id }).then( (data) => {
    if (!data) return handleDBError(req.user.id, res);
    res.status(200).json(data);
  });
});

adviceRouter.put('/change/:id', jwtAuth, jsonParser, (req, res) => {
  var adviceData = req.body;
  if (!req.params.id || !req.user.id || !adviceData.title || !adviceData.content || !adviceData.tags) {
    return res.status(400).json( { msg: 'Missing required information' } );
  }
  Advice.replaceOne({ _id: req.params.id, ownedBy: req.user.id }, adviceData).then( (updateResult) => {
    if (!updateResult.acknowledged) return handleDBError(req.params.id, res);

    res.status(200).json({ msg: 'Successfully updated advice' });
  });
});

adviceRouter.delete('/delete/:id', jwtAuth, jsonParser, (req, res) => {
  if (!req.params.id || !req.user.id) {
    return res.status(400).json( { msg: 'Missing required information' } );
  }
  Advice.deleteOne({ _id: req.params.id, ownedBy: req.user.id }).then( (a) => {
    if (a.deletedCount != 1) return handleDBError(req.params.id, res);

    res.status(200).json({ msg: 'Successfully deleted advice' });
  });
});


adviceRouter.get('/getStandard', jwtAuth, jsonParser, (req, res) => {
  Advice.find({ ownedBy: 'Standard' }).then((data) => {
    if (!data) return handleDBError('Standard', res);

    res.status(200).json(data);
  });
});
