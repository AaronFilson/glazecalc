const express = require('express');
const Recipe = require(__dirname + '/../models/recipe');
const jsonParser = require('body-parser').json();
const handleDBError = require(__dirname + '/../lib/handle_db_error');
const jwtAuth = require(__dirname + '/../lib/jwt_auth');

const recipeRouter = module.exports = exports = express.Router();

recipeRouter.post('/create', jwtAuth, jsonParser, (req, res) => {
  var incRecipe = req.body.recipe;
  if (!req.user.id || !incRecipe.title || !incRecipe.materials) {
    return res.status(400).json( { msg: 'Missing required information' } );
  }
  var newestRecipe = new Recipe();
  try {
    newestRecipe.ownedBy = req.user.id;
    newestRecipe.computed = incRecipe.computed;
    newestRecipe.date = incRecipe.date;
    newestRecipe.materials = incRecipe.materials;
    newestRecipe.notes = incRecipe.notes;
    newestRecipe.title = incRecipe.title;
  } catch (e) {
    console.log('err in setting recipe properties : ', e);
    return res.status(500).json( { msg: 'Error in creating the new recipe.' } );
  }

  newestRecipe.save((err, data) => {
    if (err) handleDBError(err, res);

    res.status(200).json(data);
  });
});

recipeRouter.get('/getLatest', jwtAuth, jsonParser, (req, res) => {

  Recipe.findOne({ ownedBy: req.user.id }, (err, data) => {
    if (err) {
      console.log('error: ', err);
      return handleDBError(err, res);
    }

    res.status(200).json(data);
  });
});

recipeRouter.get('/getAll', jwtAuth, jsonParser, (req, res) => {
  Recipe.find({ ownedBy: req.user.id }, (err, data) => {
    if (err) return handleDBError(err, res);

    res.status(200).json(data);
  });
});

recipeRouter.put('/change/:id', jwtAuth, jsonParser, (req, res) => {
  var recipeData = req.body.recipe;
  Recipe.update({ _id: req.params.id }, recipeData, (err) => {
    if (err) return handleDBError(err, res);

    res.status(200).json({ msg: 'Successfully updated recipe' });
  });
});

recipeRouter.delete('/delete/:id', jwtAuth, jsonParser, (req, res) => {
  Recipe.remove({ _id: req.params.id }, (err) => {
    if (err) return handleDBError(err, res);

    res.status(200).json({ msg: 'Successfully deleted recipe' });
  });
});
