const express = require('express');
const Note = require(__dirname + '/../models/note');
const jsonParser = require('body-parser').json();
const handleDBError = require(__dirname + '/../lib/handle_db_error');
const jwtAuth = require(__dirname + '/../lib/jwt_auth');

const notesRouter = module.exports = exports = express.Router();

notesRouter.post('/create', jwtAuth, jsonParser, (req, res) => {
  var incNote = req.body;
  if (!req.user.id || !incNote.content || !incNote.relatedCollection || !incNote.relatedId) {
    return res.status(400).json( { msg: 'Missing required information' } );
  }
  var newestNote = new Note();
  try {
    newestNote.ownedBy = req.user.id;
    newestNote.title = incNote.title;
    newestNote.content = incNote.content;
    newestNote.relatedCollection = incNote.relatedCollection;
    newestNote.relatedId = incNote.relatedId;
  } catch (e) {
    console.log('error in setting note properties : ', e);
    return res.status(500).json( { msg: 'Error in creating the new note.' } );
  }

  newestNote.save().then((data) => {
    if (!data) return handleDBError(req.user.id, res);

    res.status(200).json(data);
  });
});

notesRouter.get('/getLatest', jwtAuth, jsonParser, (req, res) => {

  Note.findOne({ ownedBy: req.user.id }).then((data) => {
    if (!data) {
      return handleDBError(req.user.id, res);
    }

    res.status(200).json(data);
  });
});

notesRouter.get('/getAll', jwtAuth, jsonParser, (req, res) => {
  Note.find({ ownedBy: req.user.id }).then((data) => {
    if (!data) return handleDBError(req.user.id, res);

    res.status(200).json(data);
  });
});

notesRouter.put('/change/:id', jwtAuth, jsonParser, (req, res) => {
  var noteData = req.body;
  Note.replaceOne({ _id: req.params.id, ownedBy: req.user.id }, noteData).then((updateResult) => {
    if (!updateResult.acknowledged) return handleDBError(req.params.id, res);

    res.status(200).json({ msg: 'Successfully updated note' });
  });
});

notesRouter.delete('/delete/:id', jwtAuth, jsonParser, (req, res) => {
  Note.deleteOne({ _id: req.params.id, ownedBy: req.user.id }).then((n) => {
    if (n.deletedCount != 1) return handleDBError(req.params.id, res);

    res.status(200).json({ msg: 'Successfully deleted note' });
  });
});
