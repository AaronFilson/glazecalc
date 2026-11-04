import mongoose from 'mongoose';
import { idemKeyField, indexIdemKey } from './idempotency.ts';

const noteSchema = new mongoose.Schema({
  content: { type: String, required: true },
  ownedBy: { type: String, required: true },
  relatedCollection: { type: String, required: true },
  relatedId: { type: String, required: true },
  // Counts the changes made (server/lib/record_rev.ts); a client's If-Match names the one it saw.
  rev: { type: Number, default: 0 },
  ...idemKeyField,
  title: String,
  updatedAt: Date
});

// Each account's records in the order they were made: the lists, the
// latest record, the quota count and the account's deletion look up by owner.
noteSchema.index({ ownedBy: 1, _id: 1 });
indexIdemKey(noteSchema);

export default mongoose.model('Note', noteSchema);
