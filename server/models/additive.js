const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
var Schema = mongoose.Schema;

var additiveSchema = new mongoose.Schema({
  fields: { type: [Schema.Types.Mixed], required: true },
  notes: { type: [String] },
  ownedBy: { type: String, required: true },
  relatedTo: { type: [String] },
  name: { type: String, required: true }
});

module.exports = mongoose.model('Additive', additiveSchema);
