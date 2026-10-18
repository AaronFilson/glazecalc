import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema({
  content: { type: String, required: true },
  ownedBy: { type: String, required: true },
  relatedCollection: { type: String, required: true },
  relatedId: { type: String, required: true },
  title: String
});

// Each account's records in the order they were made: the lists, the
// latest record, the quota count and the account's deletion look up by owner.
noteSchema.index({ ownedBy: 1, _id: 1 });

export default mongoose.model('Note', noteSchema);
