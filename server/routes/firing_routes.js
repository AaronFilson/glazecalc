const express = require('express');
const Firing = require(__dirname + '/../models/firing');
const jsonParser = require('body-parser').json();
const handleDBError = require(__dirname + '/../lib/handle_db_error');
const jwtAuth = require(__dirname + '/../lib/jwt_auth');

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
    if (!data) handleDBError(req.user.id, res);

    res.status(200).json(data);
  });
});

firingRouter.get('/getLatest', jwtAuth, jsonParser, (req, res) => {

  Firing.findOne({ ownedBy: req.user.id }).then( (data) => {
    if (!data) { return handleDBError(req.user.id, res); }
    res.status(200).json(data);
  });
});

firingRouter.get('/getAll', jwtAuth, jsonParser, (req, res) => {
  Firing.find({ ownedBy: req.user.id }).then((data) => {
    if (!data) return handleDBError(req.user.id, res);
    res.status(200).json(data);
  });
});

firingRouter.put('/change/:id', jwtAuth, jsonParser, (req, res) => {
  var firingData = req.body;
  if (!req.params.id || !req.user.id || !firingData.title || !firingData.ownedBy
     || !firingData.rows || !firingData.fieldsIncluded) {
    return res.status(400).json( { msg: 'Missing required information' } );
  }

  Firing.replaceOne({ _id: req.params.id, ownedBy: req.user.id }, firingData).then((updateResult) => {
    if (!updateResult.acknowledged) return handleDBError(req.params.id, res);
    res.status(200).json({ msg: 'Successfully updated firing' });
  });
});

firingRouter.delete('/delete/:id', jwtAuth, jsonParser, (req, res) => {
  Firing.deleteOne({ _id: req.params.id, ownedBy: req.user.id }).then( (f) => {
    if (f.deletedCount != 1) return handleDBError(req.params.id, res);
    res.status(200).json({ msg: 'Successfully deleted firing' });
  });
});
