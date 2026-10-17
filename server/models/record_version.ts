import mongoose from 'mongoose';

// Earlier versions of a record (docs/integrations-plan.md, item 2): each
// change to a recipe, material, note or other record saves the record as it
// was just before, so the change can be undone. Kept for VERSION_DAYS, and
// at most VERSIONS_KEPT for one record. Deleted and exported with the
// account (server/lib/account_data.ts).

export const VERSION_DAYS = 90;
export const VERSIONS_KEPT = 20;

const recordVersionSchema = new mongoose.Schema(
  {
    ownedBy: { type: String, required: true },
    /** The kind of record: 'recipes', 'notes' (server/lib/account_data.ts). */
    fromCollection: { type: String, required: true },
    recordId: { type: mongoose.Schema.Types.ObjectId, required: true },
    /** The whole record as it was before the change. */
    record: { type: mongoose.Schema.Types.Mixed, required: true },
    savedAt: { type: Date, required: true, default: () => new Date() },
    /** Who made the change: the web session, a personal token or an OAuth client. */
    by: { type: String, enum: ['session', 'pat', 'oauth'], default: 'session' }
  },
  { versionKey: false, minimize: false }
);

recordVersionSchema.index({ ownedBy: 1, recordId: 1, savedAt: -1 });
// MongoDB removes a version VERSION_DAYS after it was saved.
recordVersionSchema.index({ savedAt: 1 }, { expireAfterSeconds: VERSION_DAYS * 24 * 60 * 60 });

export default mongoose.model('RecordVersion', recordVersionSchema);
