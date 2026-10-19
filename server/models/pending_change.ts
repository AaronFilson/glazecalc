import mongoose, { type InferSchemaType } from 'mongoose';

// A change an access token or a connected app asked to make while the account
// asks to confirm changes (User.confirmChanges; docs/adr/0025-confirm-before-changes.md).
// Nothing is changed until the person approves it on the website, signed in
// as the same account (server/routes/pending_change_routes.ts), or, for an
// assistant whose client can ask the person itself, answers yes there
// (server/mcp/tools/account_write.ts). server/lib/pending_changes.ts runs it.
//
// Its _id is 128 random bits (base64url), the address of its page
// (/confirm/<id>), and opens nothing by itself: the page and every route need
// the account's own web session, or the token that asked. It waits
// PENDING_MINUTES; MongoDB removes it after that (every query also checks
// expiresAt, as the TTL monitor runs only once a minute). Once it is decided,
// `args` (which can hold a note's text) is removed at once, and the row itself
// once the token that asked has read what came of it.
//
//   pending   waiting for the person
//   running   approved, being made (the one step from pending, so it runs once)
//   done      made: `outcome` is what the tool or route answered
//   failed    approved but refused when it was made (the token was revoked,
//             a limit, the record is gone): `outcome` says why
//   conflict  approved, but the record or shelf changed since it was asked
//             for, so nothing was changed
//   declined  the person said no

/** How long a change waits for the person, in minutes (owner decision, 2026-10-19). */
export const PENDING_MINUTES = 30;
export const PENDING_STATUSES = ['pending', 'running', 'done', 'failed', 'conflict', 'declined'] as const;
export type PendingStatus = (typeof PENDING_STATUSES)[number];
/** What came of it once decided: everything but pending and running. */
export const FINAL_STATUSES: readonly PendingStatus[] = ['done', 'failed', 'conflict', 'declined'];

const pendingChangeSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    /** The personal token or OAuth grant that asked, and its kind. */
    tokenId: { type: mongoose.Schema.Types.ObjectId, required: true },
    via: { type: String, enum: ['pat', 'oauth'], required: true },
    /** The token's or client's name, as it was then, for the page. */
    client: { type: String, required: true, maxlength: 100 },
    /** Where it came from: an MCP tool, or a REST route. */
    source: { type: String, enum: ['mcp', 'rest'], required: true },
    /** The tool (move_to_trash) or route ('recipes.delete'). */
    action: { type: String, required: true, maxlength: 60 },
    /** The permission it needs (recipes:write), checked again when it is made. */
    permission: { type: String, required: true },
    /** Whether it removes something (a removal), for the setting 'removals'. */
    removal: { type: Boolean, required: true },
    /** What the tool or route was given: removed once it is decided. */
    args: mongoose.Schema.Types.Mixed,
    /** SHA-256 of source, action and args, which an assistant's retry must match. */
    argsDigest: { type: String, required: true },
    /** What the page says it is, written by the server: a message code and its values (never a note's text). */
    summary: {
      code: { type: String, required: true },
      params: { type: mongoose.Schema.Types.Mixed, default: {} }
    },
    /** The record or shelf it changes, and a digest of it as it was when asked: it must be the same when made. */
    base: {
      type: new mongoose.Schema(
        { kind: { type: String, enum: ['record', 'shelf'] }, area: String, id: String, version: String },
        { _id: false }
      ),
      default: undefined
    },
    status: { type: String, enum: PENDING_STATUSES, required: true, default: 'pending' },
    /** What came of it: { status, body } for a route, the tool's result for a tool. */
    outcome: mongoose.Schema.Types.Mixed,
    createdAt: { type: Date, required: true, default: () => new Date() },
    decidedAt: Date,
    expiresAt: { type: Date, required: true }
  },
  { versionKey: false, minimize: false }
);

// The account's waiting changes, and one token's (approve all from this app).
pendingChangeSchema.index({ userId: 1, status: 1, tokenId: 1 });
// MongoDB removes a change once it has waited PENDING_MINUTES.
pendingChangeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type PendingChangeFields = InferSchemaType<typeof pendingChangeSchema>;

const PendingChange = mongoose.model('PendingChange', pendingChangeSchema);
export default PendingChange;
