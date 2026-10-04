'use strict';

const mongoose = require('mongoose');
const handleDBError = require(__dirname + '/handle_db_error');

// Shared handlers for collections whose records belong to one user. Every
// query is limited to the signed-in user's records, and only the listed
// fields can be changed, so ownedBy can never be rewritten.

const validId = (req, res) => {
  if (mongoose.isValidObjectId(req.params.id)) return true;
  res.status(400).json({ msg: 'Invalid id' });
  return false;
};

const badInput = (err) => err.name === 'ValidationError' || err.name === 'CastError';

/**
 * PUT /change/:id. `fields` are the ones a user may change; `bodyKey` names the
 * wrapper object when the body is { recipe: {...} } rather than the record.
 */
exports.change = (Model, label, fields, bodyKey) => (req, res) => {
  if (!validId(req, res)) return;
  const source = bodyKey ? (req.body || {})[bodyKey] : req.body;
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    return res.status(400).json({ msg: 'Missing required information' });
  }
  const changes = {};
  fields.forEach((field) => {
    if (source[field] !== undefined) changes[field] = source[field];
  });
  if (!Object.keys(changes).length) return res.status(400).json({ msg: 'Nothing to update' });

  Model.updateOne({ _id: req.params.id, ownedBy: req.user.id }, { $set: changes }, { runValidators: true })
    .then((result) => {
      if (!result.matchedCount) return res.status(404).json({ msg: 'No ' + label + ' with that id' });
      res.status(200).json({ msg: 'Successfully updated ' + label });
    })
    .catch((err) => badInput(err) ? res.status(400).json({ msg: 'Invalid ' + label }) : handleDBError(err, res));
};

/** DELETE /delete/:id */
exports.remove = (Model, label) => (req, res) => {
  if (!validId(req, res)) return;
  Model.deleteOne({ _id: req.params.id, ownedBy: req.user.id })
    .then((result) => {
      if (result.deletedCount !== 1) return res.status(404).json({ msg: 'No ' + label + ' with that id' });
      res.status(200).json({ msg: 'Successfully deleted ' + label });
    })
    .catch((err) => handleDBError(err, res));
};

/** GET /getLatest: the user's newest record. */
exports.latest = (Model, label) => (req, res) => {
  Model.findOne({ ownedBy: req.user.id }).sort({ _id: -1 })
    .then((data) => {
      if (!data) return res.status(404).json({ msg: 'No ' + label + ' saved yet' });
      res.status(200).json(data);
    })
    .catch((err) => handleDBError(err, res));
};
