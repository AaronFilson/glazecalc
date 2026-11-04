// Idempotency for writes an app sends again (the offline outbox, client/app/core/outbox.ts): each carries an
// Idempotency-Key header, and a repeat of the same key from the same account gets the first answer, not a
// second change.
//
// - A create keeps its key on the new record (`idemKey`, a partial unique index per owner): a repeat finds that
//   record and answers it again.
// - A change or delete keeps its answer here for 7 days (the time the app keeps a queued change to send); after
//   that the record's own revision (If-Match) is what stops a double change.
import mongoose from 'mongoose';

/** How long a change's or delete's answer is kept (seconds). */
export const IDEMPOTENCY_SECONDS = 7 * 24 * 60 * 60;

/** The field a record made with an Idempotency-Key keeps it in. */
export const idemKeyField = { idemKey: { type: String } } as const;

/** One key per owner, among the records that have one. */
export function indexIdemKey(schema: mongoose.Schema): void {
  schema.index({ ownedBy: 1, idemKey: 1 }, { unique: true, partialFilterExpression: { idemKey: { $type: 'string' } } });
}

const idempotencySchema = new mongoose.Schema({
  ownedBy: { type: String, required: true },
  key: { type: String, required: true },
  status: { type: Number, required: true },
  body: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now, expires: IDEMPOTENCY_SECONDS }
});
idempotencySchema.index({ ownedBy: 1, key: 1 }, { unique: true });

export default mongoose.model('Idempotency', idempotencySchema);
