const express = require('express');
const Note = require(__dirname + '/../models/note');
const jsonParser = require('body-parser').json();
const handleDBError = require(__dirname + '/../lib/handle_db_error');
const jwtAuth = require(__dirname + '/../lib/jwt_auth');

const notesRouter = module.exports = exports = express.Router();

notesRouter.post('/newNote', jwtAuth, jsonParser, (req, res) => {
  var incNote = req.body.note;
  if (!req.user.id || !incNote.content || !incNote.relatedCollection || !incNote.relatedId) {
    return res.status(400).json( { msg: 'Missing required information' } );
  }
  var newestNote = new Note();
  try {
    newestNote.ownedBy = req.user.id;
    newestNote.content = incNote.content;
    newestNote.relatedCollection = incNote.relatedCollection;
    newestNote.relatedId = incNote.relatedId;
  } catch (e) {
    console.log('err in setting note properties : ', e);
    return res.status(500).json( { msg: 'Error in creating the new note.' } );
  }

  newestNote.save((err, data) => {
    if (err) handleDBError(err, res);

    res.status(200).json(data);
  });
});

notesRouter.get('/getLatest', jwtAuth, jsonParser, (req, res) => {

  Note.findOne({ ownedBy: req.user.id }, (err, data) => {
    if (err) {
      console.log('error: ', err);
      return handleDBError(err, res);
    }

    res.status(200).json(data);
  });
});

notesRouter.get('/getAll', jwtAuth, jsonParser, (req, res) => {
  Note.find({ ownedBy: req.user.id }, (err, data) => {
    if (err) return handleDBError(err, res);

    res.status(200).json(data);
  });
});

notesRouter.put('/change/:id', jwtAuth, jsonParser, (req, res) => {
  var noteData = req.body.note;
  Note.update({ _id: req.params.id }, noteData, (err) => {
    if (err) return handleDBError(err, res);

    res.status(200).json({ msg: 'Successfully updated note' });
  });
});

notesRouter.delete('/delete/:id', jwtAuth, jsonParser, (req, res) => {
  Note.remove({ _id: req.params.id }, (err) => {
    if (err) return handleDBError(err, res);

    res.status(200).json({ msg: 'Successfully deleted note' });
  });
});
