const mongoose = require('mongoose');
var Schema = mongoose.Schema;

var trashSchema = new mongoose.Schema({
  content: { type: [Schema.Types.Mixed], required: true },
  date: { type: String, required: true },
  fromCollection: { type: String, required: true },
  ownedBy: { type: String, required: true }
});

module.exports = mongoose.model('Trash', trashSchema);
