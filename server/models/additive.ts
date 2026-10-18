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

// Each account's records in the order they were made: the lists, the
// latest record, the quota count and the account's deletion look up by owner.
additiveSchema.index({ ownedBy: 1, _id: 1 });

export default mongoose.model('Additive', additiveSchema);
