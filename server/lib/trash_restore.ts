// Putting one record back from the Trash (server/routes/trash_routes.ts and
// the Connected apps "put all back", server/routes/connection_routes.ts).
import { OWNED_KINDS } from './account_data.ts';
import { giveBack, makeRoom, type RecordModel } from './guest_limits.ts';
import { isDuplicateKey } from './mongo_errors.ts';
import { keepVersions } from './record_history.ts';
import { stopSharing } from './share_links.ts';
import type { say } from './messages.ts';
import Trash from '../models/trash.ts';
import type { UserDocument } from '../models/user.ts';

/** The kinds of record that can be put back, with the label the messages name each by (server/lib/messages.ts). */
export const LABELS: Record<string, string> = {
  additives: 'additive',
  advice: 'advice',
  firing: 'firing',
  materials: 'material',
  notes: 'note',
  recipes: 'recipe'
};
const modelFor = (kind: string): RecordModel | undefined => (LABELS[kind] ? OWNED_KINDS[kind] : undefined);

// Entries from before the Trash was used have no recordId (models/trash.ts).
export const CURRENT = { recordId: { $exists: true } };

export type PutBack =
  | { status: 'ok'; fromCollection: string; record: Record<string, unknown> }
  /** No such entry, or a kind that cannot be put back. */
  | { status: 'missing' }
  /** A record with that _id is in its list already; the entry stays in the Trash. */
  | { status: 'conflict' }
  /** A trial's limit: the message to send. */
  | { status: 'refused'; refusal: ReturnType<typeof say> };

/** Puts one Trash entry of the user's back where it was, with its own _id. */
export const putBackEntry = async (user: UserDocument, entryId: string): Promise<PutBack> => {
  const ownedBy = String(user._id);
  const entry = await Trash.findOne({ _id: entryId, ownedBy, ...CURRENT })
    .select({ fromCollection: 1 })
    .lean();
  const Model = entry && modelFor(entry.fromCollection);
  if (!entry || !Model) return { status: 'missing' };
  const label = LABELS[entry.fromCollection]!;
  // The record counts against the account's (or trial's) limit again.
  const refusal = await makeRoom(user, Model, label);
  if (refusal) return { status: 'refused', refusal };
  let result: PutBack = { status: 'conflict' };
  try {
    // Taken out of the Trash in one step, so two requests at once cannot both put it back.
    const taken = await Trash.findOneAndDelete({ _id: entry._id, ownedBy }).lean();
    if (taken?.recordId && taken.record) {
      const record = { ...(taken.record as Record<string, unknown>), _id: taken.recordId, ownedBy };
      try {
        // A recipe never comes back shared, whether or not its link was stopped when it went (or one was made
        // since); taken away before it is back, so there is no moment it is both.
        if (entry.fromCollection === 'recipes') await stopSharing(taken.recordId, ownedBy);
        await Model.collection.insertOne(record);
      } catch (err) {
        // It goes back in the Trash as it was, whatever went wrong, so it is never lost.
        await Trash.collection.insertOne(taken);
        if (!isDuplicateKey(err)) throw err;
        return result;
      }
      await keepVersions(ownedBy, taken.recordId);
      result = { status: 'ok', fromCollection: entry.fromCollection, record };
    }
  } finally {
    if (result.status !== 'ok' && user.guest) await giveBack(user._id, Model);
  }
  return result;
};
