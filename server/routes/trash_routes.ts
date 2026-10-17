// The Trash (docs/integrations-plan.md, item 1): records removed from any
// list, kept for 30 days (models/trash.ts).
//
//   GET    /api/trash/getAll       what is in it, newest first: [{ _id, fromCollection, label,
//                                  recordId, title, trashedAt, expiresAt, by }]
//   POST   /api/trash/restore/:id  puts one back where it was, with its own _id, and answers
//                                  with the record; 409 when it is back already
//   DELETE /api/trash/delete/:id   deletes one for good, with its earlier versions
//   DELETE /api/trash/empty        deletes everything in it for good
//
// An access token can look and put back (trash:read, trash:write); deleting
// for good is only done signed in on the website.
import express from 'express';
import mongoose from 'mongoose';
import { OWNED_KINDS } from '../lib/account_data.ts';
import { giveBack, makeRoom, type RecordModel } from '../lib/guest_limits.ts';
import jwtAuth, { userOf } from '../lib/jwt_auth.ts';
import { say } from '../lib/messages.ts';
import { isDuplicateKey } from '../lib/mongo_errors.ts';
import { keepVersions, logActivity } from '../lib/record_history.ts';
import requireScope from '../lib/require_scope.ts';
import RecordVersion from '../models/record_version.ts';
import Trash, { TRASH_DAYS } from '../models/trash.ts';

const trashRouter = express.Router();
export default trashRouter;

/** The kinds of record that can be put back, with the label the messages name each by (server/lib/messages.ts). */
const LABELS: Record<string, string> = {
  additives: 'additive',
  advice: 'advice',
  firing: 'firing',
  materials: 'material',
  notes: 'note',
  recipes: 'recipe'
};
const modelFor = (kind: string): RecordModel | undefined => (LABELS[kind] ? OWNED_KINDS[kind] : undefined);

const DAY = 24 * 60 * 60 * 1000;
const NOT_FOUND = say('record-not-found', { label: 'trash' });
// Entries from before the Trash was used have no recordId (models/trash.ts).
const CURRENT = { recordId: { $exists: true } };

const validId = (id: unknown): id is string => mongoose.isValidObjectId(id);

trashRouter.get('/getAll', requireScope('trash:read'), async (req, res) => {
  const entries = await Trash.find({ ownedBy: userOf(req).id, ...CURRENT })
    .select({ record: 0 })
    .sort({ trashedAt: -1, _id: -1 })
    .lean();
  res.status(200).json(
    entries.map(({ _id, fromCollection, recordId, title, trashedAt, by }) => ({
      _id,
      fromCollection,
      label: LABELS[fromCollection] ?? 'other',
      recordId,
      title,
      trashedAt,
      expiresAt: trashedAt && new Date(trashedAt.getTime() + TRASH_DAYS * DAY),
      by
    }))
  );
});

trashRouter.post('/restore/:id', requireScope('trash:write'), async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json(say('invalid-id'));
  const user = userOf(req);
  const ownedBy = String(user._id);
  const entry = await Trash.findOne({ _id: req.params.id, ownedBy, ...CURRENT })
    .select({ fromCollection: 1 })
    .lean();
  const Model = entry && modelFor(entry.fromCollection);
  if (!entry || !Model) return res.status(404).json(NOT_FOUND);
  const label = LABELS[entry.fromCollection];
  // The record counts against the account's (or trial's) limit again.
  const refusal = await makeRoom(user, Model, label);
  if (refusal) return res.status(403).json(refusal);
  const putBack = async (): Promise<boolean> => {
    // Taken out of the Trash in one step, so two requests at once cannot both put it back.
    const taken = await Trash.findOneAndDelete({ _id: entry._id, ownedBy }).lean();
    if (!taken?.recordId || !taken.record) return false;
    const record = { ...(taken.record as Record<string, unknown>), _id: taken.recordId, ownedBy };
    try {
      await Model.collection.insertOne(record);
    } catch (err) {
      // A record with that _id is there already: it was put back before.
      if (isDuplicateKey(err)) return false;
      // Anything else: it goes back in the Trash as it was, and the error on.
      await Trash.collection.insertOne(taken);
      throw err;
    }
    await keepVersions(ownedBy, taken.recordId);
    await logActivity(req, 'restore', entry.fromCollection, record);
    res.status(200).json({ ...say('trash-restored', { label }), fromCollection: entry.fromCollection, record });
    return true;
  };
  let done = false;
  try {
    done = await putBack();
  } finally {
    if (!done && user.guest) await giveBack(user._id, Model);
  }
  if (!done) res.status(409).json(say('trash-restored-already'));
  return undefined;
});

trashRouter.delete('/delete/:id', jwtAuth, async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json(say('invalid-id'));
  const ownedBy = userOf(req).id as string;
  const entry = await Trash.findOneAndDelete({ _id: req.params.id, ownedBy }).select({ record: 0 }).lean();
  if (!entry) return res.status(404).json(NOT_FOUND);
  if (entry.recordId) await RecordVersion.deleteMany({ ownedBy, recordId: entry.recordId });
  return res.status(200).json(say('record-deleted', { label: LABELS[entry.fromCollection] ?? 'trash' }));
});

trashRouter.delete('/empty', jwtAuth, async (req, res) => {
  const ownedBy = userOf(req).id as string;
  const entries = await Trash.find({ ownedBy }).select({ recordId: 1 }).lean();
  const ids = entries.flatMap((entry) => (entry.recordId ? [entry.recordId] : []));
  await Trash.deleteMany({ ownedBy });
  if (ids.length) await RecordVersion.deleteMany({ ownedBy, recordId: { $in: ids } });
  res.status(200).json(say('trash-emptied'));
});
