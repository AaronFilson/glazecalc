import mongoose from 'mongoose';

const adviceSchema = new mongoose.Schema({
  content: { type: String, required: true },
  ownedBy: { type: String, required: true },
  tags: { type: [String], required: true },
  title: { type: String, required: true }
});

// Each account's records in the order they were made: the lists, the
// latest record, the quota count and the account's deletion look up by owner.
adviceSchema.index({ ownedBy: 1, _id: 1 });

export default mongoose.model('Advice', adviceSchema);
