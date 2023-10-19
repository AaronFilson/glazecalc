const express = require('express');
const Trash = require(__dirname + '/../models/trash');
const jsonParser = require('body-parser').json();
const handleDBError = require(__dirname + '/../lib/handle_db_error');
const jwtAuth = require(__dirname + '/../lib/jwt_auth');

const trashRouter = module.exports = exports = express.Router();

trashRouter.post('/create', jwtAuth, jsonParser, (req, res) => {
  var incTrash = req.body.trash || {};
  if (!req.user.id || !incTrash.content || !incTrash.fromCollection || !incTrash.date) {
    return res.status(400).json( { msg: 'Missing required information' } );
  }
  var newestTrash = new Trash();
  newestTrash.ownedBy = req.user.id;
  newestTrash.content = incTrash.content;
  newestTrash.date = incTrash.date;
  newestTrash.fromCollection = incTrash.fromCollection;

  newestTrash.save().then((data) => {
    if (!data) return handleDBError(req.user.id, res);
    res.status(200).json(data);
  });
});

trashRouter.get('/getLatest', jwtAuth, jsonParser, (req, res) => {
  Trash.findOne({ ownedBy: req.user.id }).then((data) => {
    if (!data) { return handleDBError(req.user.id, res); }
    res.status(200).json(data);
  });
});

trashRouter.get('/getAll', jwtAuth, jsonParser, (req, res) => {
  Trash.find({ ownedBy: req.user.id }).then( (data) => {
    if (!data) return handleDBError(req.user.id, res);
    res.status(200).json(data);
  });
});

trashRouter.put('/change/:id', jwtAuth, jsonParser, (req, res) => {
  var trashData = req.body.trash;
  Trash.replaceOne({ _id: req.params.id, ownedBy: req.user.id }, trashData).then( (updateResult) => {
    if (!updateResult.acknowledged) return handleDBError(req.params.id, res);
    res.status(200).json({ msg: 'Successfully updated trash' });
  });
});

trashRouter.delete('/delete/:id', jwtAuth, jsonParser, (req, res) => {
  Trash.deleteOne({ _id: req.params.id, ownedBy: req.user.id }).then( (t) => {
    if (t.deletedCount != 1) return handleDBError(req.params.id, res);
    res.status(200).json({ msg: 'Successfully deleted trash' });
  });
});
