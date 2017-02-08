const express = require('express');
const Trash = require(__dirname + '/../models/trash');
const jsonParser = require('body-parser').json();
const handleDBError = require(__dirname + '/../lib/handle_db_error');
const jwtAuth = require(__dirname + '/../lib/jwt_auth');

const trashRouter = module.exports = exports = express.Router();

trashRouter.post('/newTrash', jwtAuth, jsonParser, (req, res) => {
  var incTrash = req.body.trash || {};
  if (!req.user.id || !incTrash.content || !incTrash.fromCollection || !incTrash.date) {
    return res.status(400).json( { msg: 'Missing required information' } );
  }
  var newestTrash = new Trash();
  try {
    newestTrash.ownedBy = req.user.id;
    newestTrash.content = incTrash.content;
    newestTrash.date = incTrash.date;
    newestTrash.fromCollection = incTrash.fromCollection;
  } catch (e) {
    console.log('err in setting trash properties : ', e);
    return res.status(500).json( { msg: 'Error in creating the new trash.' } );
  }

  newestTrash.save((err, data) => {
    if (err) handleDBError(err, res);

    res.status(200).json(data);
  });
});

trashRouter.get('/getLatest', jwtAuth, jsonParser, (req, res) => {

  Trash.findOne({ ownedBy: req.user.id }, (err, data) => {
    if (err) {
      console.log('error: ', err);
      return handleDBError(err, res);
    }

    res.status(200).json(data);
  });
});

trashRouter.get('/getAll', jwtAuth, jsonParser, (req, res) => {
  Trash.find({ ownedBy: req.user.id }, (err, data) => {
    if (err) return handleDBError(err, res);

    res.status(200).json(data);
  });
});

trashRouter.put('/change/:id', jwtAuth, jsonParser, (req, res) => {
  var trashData = req.body.trash;
  Trash.update({ _id: req.params.id }, trashData, (err) => {
    if (err) return handleDBError(err, res);

    res.status(200).json({ msg: 'Successfully updated trash' });
  });
});

trashRouter.delete('/delete/:id', jwtAuth, jsonParser, (req, res) => {
  Trash.remove({ _id: req.params.id }, (err) => {
    if (err) return handleDBError(err, res);

    res.status(200).json({ msg: 'Successfully deleted trash' });
  });
});
