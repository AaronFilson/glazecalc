import mongoose from 'mongoose';

// A firing log: the columns kept (time, temperature, cone...) and their rows.
const firingSchema = new mongoose.Schema({
  date: String,
  fieldsIncluded: { type: [String], required: true },
  kiln: String,
  notes: { type: [String] },
  ownedBy: { type: String, required: true },
  rows: { type: [mongoose.Schema.Types.Mixed], required: true },
  // Counts the changes made (server/lib/record_rev.ts); a client's If-Match names the one it saw.
  rev: { type: Number, default: 0 },
  title: { type: String, required: true },
  updatedAt: Date
});

// Each account's records in the order they were made: the lists, the
// latest record, the quota count and the account's deletion look up by owner.
firingSchema.index({ ownedBy: 1, _id: 1 });

export default mongoose.model('Firing', firingSchema);
