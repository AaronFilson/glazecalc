const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
var Schema = mongoose.Schema;

var firingSchema = new mongoose.Schema({
  date: String,
  fieldsIncluded: { type: [String], required: true },
  kiln: String,
  notes: { type: [String] },
  ownedBy: { type: String, required: true },
  rows: { type: [Schema.Types.Mixed], required: true },
  title: { type: String, required: true }
});

module.exports = mongoose.model('Firing', firingSchema);
