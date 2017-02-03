const mongoose = require('mongoose');
var Schema = mongoose.Schema;

var recipeSchema = new mongoose.Schema({
  computed: [Schema.Types.Mixed],
  date: String,
  materials: { type: [Schema.Types.Mixed], required: true },
  notes: [String],
  ownedBy: { type: String, required: true },
  title: { type: String, required: true }
});

module.exports = mongoose.model('Recipe', recipeSchema);
