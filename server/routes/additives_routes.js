const express = require('express');
const Additive = require(__dirname + '/../models/additive');
const jsonParser = require('body-parser').json();
const handleDBError = require(__dirname + '/../lib/handle_db_error');
const jwtAuth = require(__dirname + '/../lib/jwt_auth');

const additivesRouter = module.exports = exports = express.Router();

additivesRouter.post('/create', jwtAuth, jsonParser, (req, res) => {
  var incAdditive = req.body || {};
  if (!req.user.id || !incAdditive.fields || !incAdditive.name) {
    return res.status(400).json( { msg: 'Missing required information' } );
  }
  var newestAdditive = new Additive();
  try {
    newestAdditive.ownedBy = req.user.id;
    newestAdditive.fields = incAdditive.fields;
    newestAdditive.notes = incAdditive.notes;
    newestAdditive.relatedTo = incAdditive.relatedTo;
    newestAdditive.name = incAdditive.name;
  } catch (e) {
    console.log('error in setting additive properties : ', e);
    return res.status(500).json( { msg: 'Error in creating the new additive.' } );
  }

  newestAdditive.save((err, data) => {
    if (err) handleDBError(err, res);

    res.status(200).json(data);
  });
});

additivesRouter.get('/getLatest', jwtAuth, jsonParser, (req, res) => {

  Additive.findOne({ ownedBy: req.user.id }, (err, data) => {
    if (err) {
      console.log('error: ', err);
      return handleDBError(err, res);
    }

    res.status(200).json(data);
  });
});

additivesRouter.get('/getAll', jwtAuth, jsonParser, (req, res) => {
  Additive.find({ ownedBy: req.user.id }, (err, data) => {
    if (err) return handleDBError(err, res);

    res.status(200).json(data);
  });
});

additivesRouter.put('/change/:id', jwtAuth, jsonParser, (req, res) => {
  var additiveData = req.body.additive;
  Additive.update({ _id: req.params.id }, additiveData, (err) => {
    if (err) return handleDBError(err, res);

    res.status(200).json({ msg: 'Successfully updated additive' });
  });
});

additivesRouter.delete('/delete/:id', jwtAuth, jsonParser, (req, res) => {
  Additive.remove({ _id: req.params.id }, (err) => {
    if (err) return handleDBError(err, res);

    res.status(200).json({ msg: 'Successfully deleted additive' });
  });
});

additivesRouter.get('/getStandard', jwtAuth, jsonParser, (req, res) => {
  Additive.find({ ownedBy: 'Standard' }, (err, data) => {
    if (err) return handleDBError(err, res);

    res.status(200).json(data);
  });
});
