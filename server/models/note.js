const mongoose = require('mongoose');

var noteSchema = new mongoose.Schema({
  content: { type: String, required: true },
  ownedBy: { type: String, required: true },
  relatedCollection: { type: String, required: true },
  relatedId: { type: String, required: true }
});

module.exports = mongoose.model('Note', noteSchema);
