import mongoose, { type InferSchemaType } from 'mongoose';

// A read-only link to one recipe, which anyone holding it can open without an
// account (docs/adr/0020-share-links.md). The link is never stored: only the
// SHA-256 of its random part, so neither a backup nor the owner can read it
// back. One link a recipe: making a new one replaces the old, and stopping
// sharing removes the row. Moving the recipe to the Trash removes it too, and
// it goes with the account. Trials cannot make one.

const shareLinkSchema = new mongoose.Schema(
  {
    ownedBy: { type: String, required: true, index: true },
    recipeId: { type: mongoose.Schema.Types.ObjectId, required: true },
    /** The SHA-256 of the link's random part, in hex. */
    hash: { type: String, required: true },
    /** Whether the shared page shows the recipe's own notes; off unless the owner turns it on. */
    includeNotes: { type: Boolean, default: false },
    createdAt: { type: Date, required: true, default: () => new Date() }
  },
  { versionKey: false }
);

// The shared page finds a link by its hash, and only by that.
shareLinkSchema.index({ hash: 1 }, { unique: true });
shareLinkSchema.index({ recipeId: 1 }, { unique: true });

export type ShareLinkFields = InferSchemaType<typeof shareLinkSchema>;

const ShareLink = mongoose.model('ShareLink', shareLinkSchema);
export default ShareLink;
