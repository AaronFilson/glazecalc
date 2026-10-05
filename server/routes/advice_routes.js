const express = require('express');
const Advice = require(__dirname + '/../models/advice');
const jsonParser = express.json();
const handleDBError = require(__dirname + '/../lib/handle_db_error');
const jwtAuth = require(__dirname + '/../lib/jwt_auth');
const owned = require(__dirname + '/../lib/owned_routes');

const adviceRouter = module.exports = exports = express.Router();

adviceRouter.post('/create', jwtAuth, jsonParser, (req, res) => {
  var incAdvice = req.body || {};
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
    }).catch((err) => handleDBError(err, res));
  } catch (e) {
    return handleDBError(req.user.id, res);
  }
  
});

adviceRouter.get('/getLatest', jwtAuth, owned.latest(Advice, 'advice'));

adviceRouter.get('/getAll', jwtAuth, jsonParser, (req, res) => {
  Advice.find({ ownedBy: req.user.id }).then( (data) => {
    if (!data) return handleDBError(req.user.id, res);
    res.status(200).json(data);
  }).catch((err) => handleDBError(err, res));
});

adviceRouter.put('/change/:id', jwtAuth, jsonParser,
  owned.change(Advice, 'advice', ['title', 'content', 'tags']));

adviceRouter.delete('/delete/:id', jwtAuth, owned.remove(Advice, 'advice'));


adviceRouter.get('/getStandard', jwtAuth, jsonParser, (req, res) => {
  Advice.find({ ownedBy: 'Standard' }).then((data) => {
    if (!data) return handleDBError('Standard', res);

    res.status(200).json(data);
  }).catch((err) => handleDBError(err, res));
});
