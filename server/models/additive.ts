import mongoose from 'mongoose';

// A colorant or opacifier: its oxide fields and amounts.
const additiveSchema = new mongoose.Schema({
  fields: { type: [mongoose.Schema.Types.Mixed], required: true },
  notes: { type: [String] },
  ownedBy: { type: String, required: true },
  relatedTo: { type: [String] },
  name: { type: String, required: true },
  rawformula: String
});

export default mongoose.model('Additive', additiveSchema);
