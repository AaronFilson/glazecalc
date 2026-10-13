import mongoose from 'mongoose';

// Records moved to the trash: the API (/api/trash) is there, but nothing in the
// app writes to it yet; the Trash page says "coming soon", and
// docs/integrations-plan.md (item 1) builds on it. Kept, so that its records,
// if any, are deleted and exported with the account like any other.

const trashSchema = new mongoose.Schema({
  content: { type: [mongoose.Schema.Types.Mixed], required: true },
  date: { type: String, required: true },
  fromCollection: { type: String, required: true },
  ownedBy: { type: String, required: true }
});

export default mongoose.model('Trash', trashSchema);
