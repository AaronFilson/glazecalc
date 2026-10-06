import mongoose from 'mongoose';

// A glaze recipe: materials and additives with amounts, and the unity formula
// the browser worked out for it (computed).
const recipeSchema = new mongoose.Schema({
  additives: [mongoose.Schema.Types.Mixed],
  computed: [mongoose.Schema.Types.Mixed],
  date: String,
  materials: { type: [mongoose.Schema.Types.Mixed], required: true },
  notes: [String],
  ownedBy: { type: String, required: true },
  title: { type: String, required: true }
});

export default mongoose.model('Recipe', recipeSchema);
