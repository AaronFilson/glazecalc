const mongoose = require('mongoose');

var trashSchema = new mongoose.Schema({
  content: { type: [mongoose.Mixed], required: true },
  date: { type: String, required: true },
  fromCollection: { type: String, required: true },
  ownedBy: { type: String, required: true }
});

module.exports = mongoose.model('Trash', trashSchema);
