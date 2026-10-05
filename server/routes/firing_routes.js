const express = require('express');
const Firing = require(__dirname + '/../models/firing');
const jsonParser = express.json();
const handleDBError = require(__dirname + '/../lib/handle_db_error');
const jwtAuth = require(__dirname + '/../lib/jwt_auth');
const owned = require(__dirname + '/../lib/owned_routes');

const firingRouter = module.exports = exports = express.Router();

firingRouter.post('/create', jwtAuth, jsonParser, (req, res) => {
  var incFiring = req.body || {};

  if (!req.user.id || !incFiring.fieldsIncluded || !incFiring.rows || !incFiring.title) {
    return res.status(400).json( { msg: 'Missing required information' } );
  }
  var newestFiring = new Firing();
  try {
    newestFiring.ownedBy = req.user.id;
    newestFiring.date = incFiring.date;
    newestFiring.fieldsIncluded = incFiring.fieldsIncluded;
    newestFiring.kiln = incFiring.kiln;
    newestFiring.notes = incFiring.notes;
    newestFiring.rows = incFiring.rows;
    newestFiring.title = incFiring.title;
  } catch (e) {
    console.log('error in setting firing properties : ', e);
    return res.status(500).json( { msg: 'Error in creating the new firing chart.' } );
  }

  newestFiring.save().then((data) => {
    if (!data) return handleDBError(req.user.id, res);

    res.status(200).json(data);
  }).catch((err) => handleDBError(err, res));
});

firingRouter.get('/getLatest', jwtAuth, owned.latest(Firing, 'firing'));

firingRouter.get('/getAll', jwtAuth, jsonParser, (req, res) => {
  Firing.find({ ownedBy: req.user.id }).then((data) => {
    if (!data) return handleDBError(req.user.id, res);
    res.status(200).json(data);
  }).catch((err) => handleDBError(err, res));
});

firingRouter.put('/change/:id', jwtAuth, jsonParser,
  owned.change(Firing, 'firing', ['title', 'kiln', 'date', 'notes', 'fieldsIncluded', 'rows']));

firingRouter.delete('/delete/:id', jwtAuth, owned.remove(Firing, 'firing'));
