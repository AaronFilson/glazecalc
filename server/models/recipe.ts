import mongoose from 'mongoose';
import slurry from '../../lib/recipe/slurry.js';

// A glaze recipe: materials and additives with amounts, and the unity formula
// the browser worked out for it (computed).
const recipeSchema = new mongoose.Schema({
  additives: [mongoose.Schema.Types.Mixed],
  computed: [mongoose.Schema.Types.Mixed],
  date: String,
  // The firing the glaze is for, as a band: cone 06-02, cone 4-6 or cone 9-11 (lib/recipe/limits.js);
  // the recipe page checks it against a limit set for that band. Not saved until chosen.
  firing: { type: String, enum: ['low', 'mid', 'high'] },
  // The specific gravity the glaze is mixed to, set from the recipe page's SG calculator and
  // read by the mix ticket. A number from 1 (water) to 2.5; null clears it.
  sgTarget: { type: Number, min: slurry.SG_TARGET_RANGE.min, max: slurry.SG_TARGET_RANGE.max },
  // Whether the unity formula counts the additives (colorants) too.
  includeAdditives: Boolean,
  materials: { type: [mongoose.Schema.Types.Mixed], required: true },
  notes: [String],
  ownedBy: { type: String, required: true },
  title: { type: String, required: true }
});

export default mongoose.model('Recipe', recipeSchema);
