import mongoose from 'mongoose';

// Records moved to the Trash (docs/integrations-plan.md, item 1). Removing a
// record from any list, in the app or with an access token, moves it here
// whole, and it can be put back for TRASH_DAYS; then MongoDB removes it.
// Deleting it for good, or emptying the Trash, is only done signed in on the
// website (server/routes/trash_routes.ts). Deleted and exported with the
// account like any other record (server/lib/account_data.ts).
//
// Entries from before this (content, date and fromCollection, written by an
// API nothing in the app used) have no recordId; the Trash leaves them out.
// They had no trashedAt either: server/main.ts gives them one at start
// (dateOldTrash, server/lib/record_history.ts), so they expire like the rest.

/** How long a record can be put back, in days. */
export const TRASH_DAYS = 30;
/**
 * At most this many records in an account's Trash, or a trial's; past it the
 * oldest go for good, so the Trash cannot hold more than the records allowed.
 */
export const TRASH_MAX_ACCOUNT = 1000;
export const TRASH_MAX_TRIAL = 25;

const trashSchema = new mongoose.Schema(
  {
    ownedBy: { type: String, required: true },
    /** The kind of record, as the account's data names it: 'recipes', 'notes' (server/lib/account_data.ts). */
    fromCollection: { type: String, required: true },
    /** The record's own _id, which it gets back. */
    recordId: mongoose.Schema.Types.ObjectId,
    /** The whole record as it was. */
    record: mongoose.Schema.Types.Mixed,
    /** What it was called (its title or name), for the Trash page. */
    title: String,
    trashedAt: Date,
    /** Who moved it: the web session, a personal token or an OAuth client. */
    by: { type: String, enum: ['session', 'pat', 'oauth'] },
    /**
     * Which access token or OAuth grant moved it (the AccessToken row), so Connected apps can list what
     * one app moved. Older entries have none: the activity log's trash lines name it (by recordId).
     */
    tokenId: mongoose.Schema.Types.ObjectId,
    // Entries from before: see above.
    content: { type: [mongoose.Schema.Types.Mixed], default: undefined },
    date: String
  },
  { versionKey: false, minimize: false }
);

trashSchema.index({ ownedBy: 1, trashedAt: -1 });
trashSchema.index({ ownedBy: 1, tokenId: 1 }, { sparse: true });
// MongoDB removes an entry TRASH_DAYS after it was trashed.
trashSchema.index({ trashedAt: 1 }, { expireAfterSeconds: TRASH_DAYS * 24 * 60 * 60 });

export default mongoose.model('Trash', trashSchema);
