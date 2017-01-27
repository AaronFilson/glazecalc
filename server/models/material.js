const mongoose = require('mongoose');

var materialSchema = new mongoose.Schema({
  fields: { type: [Object], required: true },
  notes: { type: [String] },
  ownedBy: { type: String, required: true },
  relatedTo: { type: [String], required: true },
  title: { type: String, required: true }
});

module.exports = mongoose.model('Material', materialSchema);
