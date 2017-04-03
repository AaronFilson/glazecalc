const express = require('express');
const Material = require(__dirname + '/../models/material');
const jsonParser = require('body-parser').json();
const handleDBError = require(__dirname + '/../lib/handle_db_error');
const jwtAuth = require(__dirname + '/../lib/jwt_auth');

const materialsRouter = module.exports = exports = express.Router();

materialsRouter.post('/create', jwtAuth, jsonParser, (req, res) => {
  var incMaterial = req.body || {};
  debugger;
  if (!req.user.id || !incMaterial.fields || !incMaterial.relatedTo || !incMaterial.name) {
    return res.status(400).json( { msg: 'Missing required information' } );
  }
  var newestMaterial = new Material();
  try {
    newestMaterial.ownedBy = req.user.id;
    newestMaterial.fields = incMaterial.fields;
    newestMaterial.notes = incMaterial.notes;
    newestMaterial.relatedTo = incMaterial.relatedTo;
    newestMaterial.name = incMaterial.name;
  } catch (e) {
    console.log('error in setting material properties : ', e);
    return res.status(500).json( { msg: 'Error in creating the new material.' } );
  }

  newestMaterial.save((err, data) => {
    if (err) handleDBError(err, res);

    res.status(200).json(data);
  });
});

materialsRouter.get('/getLatest', jwtAuth, jsonParser, (req, res) => {

  Material.findOne({ ownedBy: req.user.id }, (err, data) => {
    if (err) {
      console.log('error: ', err);
      return handleDBError(err, res);
    }

    res.status(200).json(data);
  });
});

materialsRouter.get('/getAll', jwtAuth, jsonParser, (req, res) => {
  Material.find({ ownedBy: req.user.id }, (err, data) => {
    if (err) return handleDBError(err, res);

    res.status(200).json(data);
  });
});

materialsRouter.put('/change/:id', jwtAuth, jsonParser, (req, res) => {
  var materialData = req.body.material;
  Material.update({ _id: req.params.id }, materialData, (err) => {
    if (err) return handleDBError(err, res);

    res.status(200).json({ msg: 'Successfully updated material' });
  });
});

materialsRouter.delete('/delete/:id', jwtAuth, jsonParser, (req, res) => {
  Material.remove({ _id: req.params.id }, (err) => {
    if (err) return handleDBError(err, res);

    res.status(200).json({ msg: 'Successfully deleted material' });
  });
});
