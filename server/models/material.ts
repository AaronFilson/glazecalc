import mongoose from 'mongoose';
import { libraryInfo } from './library_info.ts';

// A raw material with its oxide analysis (fields) and molecular weights.
const materialSchema = new mongoose.Schema({
  equivalent: { type: Number, required: true },
  fields: { type: [mongoose.Schema.Types.Mixed], required: true },
  formulaweight: { type: Number, required: true },
  loi: { type: Number, required: true },
  molecularweight: { type: Number, required: true },
  notes: { type: [String] },
  ownedBy: { type: String, required: true },
  relatedTo: { type: [String] },
  name: { type: String, required: true },
  percentmole: { type: String, required: true },
  rawformula: String,
  ...libraryInfo
});

// Each account's records in the order they were made: the lists, the
// latest record, the quota count and the account's deletion look up by owner.
materialSchema.index({ ownedBy: 1, _id: 1 });

export default mongoose.model('Material', materialSchema);
