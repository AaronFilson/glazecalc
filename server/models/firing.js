const mongoose = require('mongoose');

var firingSchema = new mongoose.Schema({
  date: String,
  fieldsIncluded: { type: [String], required: true },
  fieldPositions: { type: [String], required: true },
  kiln: String,
  notes: { type: [String] },
  ownedBy: { type: String, required: true },
  rows: { type: [String], required: true },
  title: { type: String, required: true }
});

module.exports = mongoose.model('Firing', firingSchema);
