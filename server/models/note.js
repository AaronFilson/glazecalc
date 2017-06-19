const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
var noteSchema = new mongoose.Schema({
  content: { type: String, required: true },
  ownedBy: { type: String, required: true },
  relatedCollection: { type: String, required: true },
  relatedId: { type: String, required: true },
  title: String
});

module.exports = mongoose.model('Note', noteSchema);
