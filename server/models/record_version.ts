import mongoose from 'mongoose';

// Earlier versions of a record (docs/integrations-plan.md, item 2): each
// change to a recipe, material, note or other record saves the record as it
// was just before, so the change can be undone. Kept for VERSION_DAYS, and
// at most VERSIONS_KEPT for one record (and the one from before an access
// token's changes, server/lib/record_history.ts), and VERSIONS_MOST_ACCOUNT
// for the whole account, the oldest going first. A record in the Trash keeps
// its versions only as long as its Trash entry: expiresAt is set to the same
// moment when it is trashed, cleared when it is put back, and they are deleted
// with the entry when it is deleted for good or pushed out. Deleted and
// exported with the account (server/lib/account_data.ts).

export const VERSION_DAYS = 90;
export const VERSIONS_KEPT = 20;
/**
 * At most this many versions on one account, of all its records together
 * (owner decision, 2026-10-19): past it the oldest go first, but never a
 * record's version from before an access token's changes. So a token making
 * many changes to many records cannot fill the disk with versions.
 */
export const VERSIONS_MOST_ACCOUNT = 20_000;

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
    by: { type: String, enum: ['session', 'pat', 'oauth'], default: 'session' },
    /** While the record is in the Trash: when its Trash entry goes, and these with it. */
    expiresAt: Date
  },
  { versionKey: false, minimize: false }
);

recordVersionSchema.index({ ownedBy: 1, recordId: 1, savedAt: -1 });
// The account's oldest first, for VERSIONS_MOST_ACCOUNT.
recordVersionSchema.index({ ownedBy: 1, savedAt: 1 });
// MongoDB removes a version VERSION_DAYS after it was saved.
recordVersionSchema.index({ savedAt: 1 }, { expireAfterSeconds: VERSION_DAYS * 24 * 60 * 60 });
// And at expiresAt, for a record in the Trash.
recordVersionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('RecordVersion', recordVersionSchema);
