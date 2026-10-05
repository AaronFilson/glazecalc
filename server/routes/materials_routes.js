const express = require('express');
const Material = require(__dirname + '/../models/material');
const jsonParser = express.json();
const handleDBError = require(__dirname + '/../lib/handle_db_error');
const jwtAuth = require(__dirname + '/../lib/jwt_auth');
const owned = require(__dirname + '/../lib/owned_routes');

const materialsRouter = module.exports = exports = express.Router();

materialsRouter.post('/create', jwtAuth, jsonParser, (req, res) => {
  var incMaterial = req.body || {};
  if (!req.user.id || !incMaterial.fields || !incMaterial.name
    // An LOI of 0 is valid (silica, feldspars), so only reject a missing one.
    || !incMaterial.formulaweight || incMaterial.loi == null || !incMaterial.molecularweight
    || !incMaterial.percentmole || !incMaterial.equivalent) {
    return res.status(400).json( { msg: 'Missing required information' } );
  }
  var newestMaterial = new Material();
  try {
    newestMaterial.ownedBy = req.user.id;
    newestMaterial.fields = incMaterial.fields;
    newestMaterial.notes = incMaterial.notes;
    newestMaterial.relatedTo = incMaterial.relatedTo;
    newestMaterial.name = incMaterial.name;
    newestMaterial.formulaweight = incMaterial.formulaweight;
    newestMaterial.loi = incMaterial.loi;
    newestMaterial.molecularweight = incMaterial.molecularweight;
    newestMaterial.percentmole = incMaterial.percentmole;
    newestMaterial.equivalent = incMaterial.equivalent;
    newestMaterial.rawformula = incMaterial.rawformula;
  } catch (e) {
    console.log('error in setting material properties : ', e);
    return res.status(500).json( { msg: 'Error in creating the new material.' } );
  }

  newestMaterial.save().then((data) => {
    if (!data) return handleDBError(req.user.id, res);

    res.status(200).json(data);
  }).catch((err) => handleDBError(err, res));
});

materialsRouter.get('/getLatest', jwtAuth, owned.latest(Material, 'material'));

materialsRouter.get('/getAll', jwtAuth, jsonParser, (req, res) => {
  Material.find({ ownedBy: req.user.id }).then( (data) => {
    if (!data) return handleDBError(req.user.id, res);

    res.status(200).json(data);
  }).catch((err) => handleDBError(err, res));
});

materialsRouter.put('/change/:id', jwtAuth, jsonParser,
  owned.change(Material, 'material', ['name', 'rawformula', 'relatedTo', 'notes', 'fields', 'percentmole', 'loi', 'molecularweight', 'equivalent', 'formulaweight']));

materialsRouter.delete('/delete/:id', jwtAuth, owned.remove(Material, 'material'));

materialsRouter.get('/getStandard', jwtAuth, jsonParser, (req, res) => {
  Material.find({ ownedBy: 'Standard' }).then((data) => {
    if (!data) return handleDBError('Standard', res);

    res.status(200).json(data);
  }).catch((err) => handleDBError(err, res));
});
