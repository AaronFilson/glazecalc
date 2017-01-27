const mongoose = require('mongoose');

var recipeSchema = new mongoose.Schema({
  computed: Object,
  date: String,
  ownedBy: { type: String, required: true },
  materials: { type: [Object], required: true },
  notes: { type: [String], required: true }
  title: { type: String, required: true }
});

module.exports = mongoose.model('Recipe', recipeSchema);
