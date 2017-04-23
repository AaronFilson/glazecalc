const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
var Schema = mongoose.Schema;

var materialSchema = new mongoose.Schema({
  fields: { type: [Schema.Types.Mixed], required: true },
  notes: { type: [String] },
  ownedBy: { type: String, required: true },
  relatedTo: String,
  name: { type: String, required: true }
});

module.exports = mongoose.model('Material', materialSchema);
