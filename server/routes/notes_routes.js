const express = require('express');
const Note = require(__dirname + '/../models/note');
const jsonParser = express.json();
const handleDBError = require(__dirname + '/../lib/handle_db_error');
const jwtAuth = require(__dirname + '/../lib/jwt_auth');
const owned = require(__dirname + '/../lib/owned_routes');

const notesRouter = module.exports = exports = express.Router();

notesRouter.post('/create', jwtAuth, jsonParser, (req, res) => {
  var incNote = req.body || {};
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
  }).catch((err) => handleDBError(err, res));
});

notesRouter.get('/getLatest', jwtAuth, owned.latest(Note, 'note'));

notesRouter.get('/getAll', jwtAuth, jsonParser, (req, res) => {
  Note.find({ ownedBy: req.user.id }).then((data) => {
    if (!data) return handleDBError(req.user.id, res);

    res.status(200).json(data);
  }).catch((err) => handleDBError(err, res));
});

notesRouter.put('/change/:id', jwtAuth, jsonParser,
  owned.change(Note, 'note', ['title', 'content', 'relatedCollection', 'relatedId']));

notesRouter.delete('/delete/:id', jwtAuth, owned.remove(Note, 'note'));
