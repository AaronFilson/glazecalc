import mongoose from 'mongoose';

// What access tokens, OAuth clients and (later) an assistant did to an account
// (docs/integrations-plan.md, item 3): one line for each record created,
// changed, moved to the Trash, put back or undone. Changes made on the
// website are not logged here. It feeds the "Connected apps" page ("Claude
// changed 'Celadon 6' on 12 Oct"), the export and nothing else.
//
// A line names the record by its title, cut short, and never holds a note's
// text or any other content. Kept for ACTIVITY_DAYS; deleted and exported
// with the account (server/lib/account_data.ts).

export const ACTIVITY_DAYS = 90;
/** A title is cut to this many characters. */
export const TITLE_LENGTH = 80;
export const ACTIONS = ['create', 'change', 'trash', 'restore', 'undo'] as const;
export type ActivityAction = (typeof ACTIONS)[number];

const activitySchema = new mongoose.Schema(
  {
    ownedBy: { type: String, required: true },
    at: { type: Date, required: true, default: () => new Date() },
    /** A personal token or an OAuth client. */
    via: { type: String, enum: ['pat', 'oauth', 'assistant'], required: true },
    tokenId: mongoose.Schema.Types.ObjectId,
    /** The token's name, or the client's, as it was then. */
    client: { type: String, maxlength: 100 },
    action: { type: String, enum: ACTIONS, required: true },
    /** The kind of record: 'recipes', 'notes' (server/lib/account_data.ts). */
    fromCollection: { type: String, required: true },
    recordId: mongoose.Schema.Types.ObjectId,
    title: { type: String, maxlength: TITLE_LENGTH }
  },
  { versionKey: false }
);

activitySchema.index({ ownedBy: 1, at: -1 });
// Connected apps: what one token did, newest first, and its counts.
activitySchema.index({ ownedBy: 1, tokenId: 1, at: -1 });
// MongoDB removes a line ACTIVITY_DAYS after it was written.
activitySchema.index({ at: 1 }, { expireAfterSeconds: ACTIVITY_DAYS * 24 * 60 * 60 });

export default mongoose.model('Activity', activitySchema);
