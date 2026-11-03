import mongoose from 'mongoose';

// One import of an account export (server/lib/import_data.ts), kept for
// IMPORT_UNDO_HOURS so that "Undo this import" can take it back: the ids of
// the records it added, the records it replaced (each with the version that
// holds it as it was, server/models/record_version.ts), and the preferences,
// prices and shelf as they were if it changed them. Written before the first
// record, so a failure part way removes exactly what it added. Never
// exported (it holds only ids and copies of what the account already had);
// deleted with the account (server/lib/account_data.ts) and by MongoDB at
// expiresAt.

export const IMPORT_UNDO_HOURS = 24;

const importRunSchema = new mongoose.Schema(
  {
    ownedBy: { type: String, required: true },
    createdAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    /** The ids of the records it added, by kind ('recipes', 'materials': server/lib/record_fields.ts). */
    added: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    /** Records it replaced in place: their kind, id, and the version that holds them as they were. */
    replaced: {
      type: [
        new mongoose.Schema(
          { kind: String, recordId: mongoose.Schema.Types.ObjectId, versionId: mongoose.Schema.Types.ObjectId },
          { _id: false }
        )
      ],
      default: []
    },
    /** What it changed on the account, as it was before; a key is absent when the import left it alone. */
    before: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    /** How many of each kind it added and replaced, for the reply. */
    counts: { type: mongoose.Schema.Types.Mixed, default: () => ({}) }
  },
  { versionKey: false, minimize: false }
);

importRunSchema.index({ ownedBy: 1, createdAt: -1 });
importRunSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('ImportRun', importRunSchema);
