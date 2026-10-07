import mongoose from 'mongoose';
import { libraryInfo } from './library_info.ts';

// A colorant, opacifier or other additive. Its chemistry is stored as a
// material's is (fired oxides, LOI and weights), so a recipe can include it in
// the unity formula; additives saved before that have only their fields.
const additiveSchema = new mongoose.Schema({
  equivalent: Number,
  fields: { type: [mongoose.Schema.Types.Mixed], required: true },
  formulaweight: Number,
  loi: Number,
  molecularweight: Number,
  percentmole: String,
  notes: { type: [String] },
  ownedBy: { type: String, required: true },
  relatedTo: { type: [String] },
  name: { type: String, required: true },
  rawformula: String,
  ...libraryInfo
});

export default mongoose.model('Additive', additiveSchema);
