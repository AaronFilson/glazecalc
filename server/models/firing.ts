import mongoose from 'mongoose';

// A firing log: the columns kept (time, temperature, cone...) and their rows.
const firingSchema = new mongoose.Schema({
  date: String,
  fieldsIncluded: { type: [String], required: true },
  kiln: String,
  notes: { type: [String] },
  ownedBy: { type: String, required: true },
  rows: { type: [mongoose.Schema.Types.Mixed], required: true },
  title: { type: String, required: true }
});

export default mongoose.model('Firing', firingSchema);
