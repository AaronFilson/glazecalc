const express = require('express');
const Material = require(__dirname + '/../models/material');
const jsonParser = require('body-parser').json();
const handleDBError = require(__dirname + '/../lib/handle_db_error');
const jwtAuth = require(__dirname + '/../lib/jwt_auth');

const materialsRouter = module.exports = exports = express.Router();

materialsRouter.post('/create', jwtAuth, jsonParser, (req, res) => {
  var incMaterial = req.body || {};
  if (!req.user.id || !incMaterial.fields || !incMaterial.name
    || !incMaterial.formulaweight || !incMaterial.loi || !incMaterial.molecularweight
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
    if (!data) handleDBError(req.user.id, res);

    res.status(200).json(data);
  });
});

materialsRouter.get('/getLatest', jwtAuth, jsonParser, (req, res) => {

  Material.findOne({ ownedBy: req.user.id }).then(( data) => {
    if (!data) {
      console.log('error: ', err);
      return handleDBError(req.user.id, res);
    }

    res.status(200).json(data);
  });
});

materialsRouter.get('/getAll', jwtAuth, jsonParser, (req, res) => {
  Material.find({ ownedBy: req.user.id }).then( (data) => {
    if (!data) return handleDBError(req.user.id, res);

    res.status(200).json(data);
  });
});

materialsRouter.put('/change/:id', jwtAuth, jsonParser, (req, res) => {
  var materialData = req.body;
  Material.replaceOne({ _id: req.params.id, ownedBy: req.user.id }, materialData).then((updateResult) => {
    if (!updateResult.acknowledged) return handleDBError(req.params.id, res);

    res.status(200).json({ msg: 'Successfully updated material' });
  });
});

materialsRouter.delete('/delete/:id', jwtAuth, jsonParser, (req, res) => {
  Material.deleteOne({ _id: req.params.id, ownedBy: req.user.id }).then((m) => {
    if (m.deletedCount != 1) return handleDBError(req.params.id, res);

    res.status(200).json({ msg: 'Successfully deleted material' });
  });
});

materialsRouter.get('/getStandard', jwtAuth, jsonParser, (req, res) => {
  Material.find({ ownedBy: 'Standard' }).then((data) => {
    if (!data) return handleDBError(err, res);

    res.status(200).json(data);
  });
});
