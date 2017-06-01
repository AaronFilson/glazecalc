const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
var Schema = mongoose.Schema;

var materialSchema = new mongoose.Schema({
  equivalent: { type: Number, required: true },
  fields: { type: [Schema.Types.Mixed], required: true },
  formulaweight: { type: Number, required: true },
  loi: { type: Number, required: true },
  molecularweight: { type: Number, required: true },
  notes: { type: [String] },
  ownedBy: { type: String, required: true },
  relatedTo: String,
  name: { type: String, required: true },
  percentmole: { type: String, required: true },
  rawformula: String
});

module.exports = mongoose.model('Material', materialSchema);
