const express = require('express');
const Recipe = require(__dirname + '/../models/recipe');
const jsonParser = require('body-parser').json();
const handleDBError = require(__dirname + '/../lib/handle_db_error');
const jwtAuth = require(__dirname + '/../lib/jwt_auth');

const recipeRouter = module.exports = exports = express.Router();

recipeRouter.post('/create', jwtAuth, jsonParser, (req, res) => {
  var incRecipe = req.body || {};
  if (!req.user.id || !incRecipe.title || !incRecipe.materials) {
    return res.status(400).json( { msg: 'Missing required information' } );
  }
  var newestRecipe = new Recipe();
  try {
    newestRecipe.ownedBy = req.user.id;
    newestRecipe.additives = incRecipe.additives;
    newestRecipe.computed = incRecipe.computed;
    newestRecipe.date = incRecipe.date;
    newestRecipe.materials = incRecipe.materials;
    newestRecipe.notes = incRecipe.notes;
    newestRecipe.title = incRecipe.title;
  } catch (e) {
    console.log('error in setting recipe properties : ', e);
    return res.status(500).json( { msg: 'Error in creating the new recipe.' } );
  }

  newestRecipe.save().then((data) => {
    if (!data) return handleDBError(req.user.id, res);

    res.status(200).json(data);
  }).catch((err) => handleDBError(err, res));
});

recipeRouter.get('/getLatest', jwtAuth, jsonParser, (req, res) => {

  Recipe.findOne({ ownedBy: req.user.id }).then((data) => {
    if (!data) return handleDBError(req.user.id, res);

    res.status(200).json(data);
  }).catch((err) => handleDBError(err, res));
});

recipeRouter.get('/getAll', jwtAuth, jsonParser, (req, res) => {
  Recipe.find({ ownedBy: req.user.id }).then( (data) => {
    if (!data) return handleDBError(req.user.id, res);
    res.status(200).json(data);
  }).catch((err) => handleDBError(err, res));
});

recipeRouter.get('/getStandard', jwtAuth, jsonParser, (req, res) => {
  Recipe.find({ ownedBy: 'Standard' }).then((data) => {
    res.status(200).json(data);
  }).catch((err) => handleDBError(err, res));
});

recipeRouter.put('/change/:id', jwtAuth, jsonParser, (req, res) => {
  var recipeData = req.body.recipe;
  Recipe.replaceOne({ _id: req.params.id, ownedBy: req.user.id }, recipeData).then( (updateResult) => {
    if (!updateResult.acknowledged) return handleDBError(req.params.id, res);

    res.status(200).json({ msg: 'Successfully updated recipe' });
  }).catch((err) => handleDBError(err, res));
});

recipeRouter.delete('/delete/:id', jwtAuth, jsonParser, (req, res) => {
  Recipe.deleteOne({ _id: req.params.id, ownedBy: req.user.id }).then( (r) => {
    if (r.deletedCount != 1) return handleDBError(req.user.id, res);

    res.status(200).json({ msg: 'Successfully deleted recipe' });
  }).catch((err) => handleDBError(err, res));
});
