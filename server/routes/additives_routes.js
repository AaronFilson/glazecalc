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

  try {
    newestAdditive.save().then((data) => {
      res.status(200).json(data);
    });
  } catch (e) {
    console.log('error in creating new additive :', e );
    return res.status(500).json( {msg: 'Error in creating the new additive.' } );
  }
  
});

additivesRouter.get('/getLatest', jwtAuth, jsonParser, (req, res) => {

  Additive.findOne({ ownedBy: req.user.id }).then((data) => {
    if (!data) {
      console.log('error: no data for additive for user with id ' + req.user.id);
      return handleDBError(req.user.id, res);
    }

    res.status(200).json(data);
  });
});

additivesRouter.get('/getAll', jwtAuth, jsonParser, (req, res) => {
  Additive.find({ ownedBy: req.user.id }).then( (data) => {
    if (!data) return handleDBError(req.user.id, res);

    res.status(200).json(data);
  });
});

additivesRouter.put('/change/:id', jwtAuth, jsonParser, (req, res) => {
  var additiveData = req.body;
  Additive.replaceOne({ _id: req.params.id, ownedBy: req.user.id }, additiveData).then((updateResult) => {
    if (!updateResult.acknowledged) return handleDBError(req.params.id, res);

    res.status(200).json({ msg: 'Successfully updated additive' });
  });
});

additivesRouter.delete('/delete/:id', jwtAuth, jsonParser, (req, res) => {
  Additive.deleteOne({ _id: req.params.id, ownedBy: req.user.id }).then((a) => {
    if (a.deletedCount != 1) return handleDBError(req.params.id, res);

    res.status(200).json({ msg: 'Successfully deleted additive' });
  });
});

additivesRouter.get('/getStandard', jwtAuth, jsonParser, (req, res) => {
  Additive.find({ ownedBy: 'Standard' }).then( (data) => {
    if (!data) return handleDBError('Standard', res);

    res.status(200).json(data);
  });
});
