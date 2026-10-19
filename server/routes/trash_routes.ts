// The Trash (docs/integrations-plan.md, item 1): records removed from any
// list, kept for 30 days (models/trash.ts).
//
//   GET    /api/trash/getAll       what is in it, newest first: [{ _id, fromCollection, label,
//                                  recordId, title, trashedAt, expiresAt, by }]
//   POST   /api/trash/restore/:id  puts one back where it was, with its own _id, and answers
//                                  with the record; 409 when a record with that _id is in its
//                                  list already (the entry stays in the Trash)
//   DELETE /api/trash/delete/:id   deletes one for good, with its earlier versions
//   DELETE /api/trash/empty        deletes everything in it for good
//
// An access token can look and put back (trash:read, trash:write); deleting
// for good is only done signed in on the website.
import express from 'express';
import mongoose from 'mongoose';
import { pullFiringLinks } from '../lib/firing_links.ts';
import jwtAuth, { userOf } from '../lib/jwt_auth.ts';
import { say } from '../lib/messages.ts';
import { logActivity } from '../lib/record_history.ts';
import requireScope from '../lib/require_scope.ts';
import { CURRENT, LABELS, putBackEntry } from '../lib/trash_restore.ts';
import RecordVersion from '../models/record_version.ts';
import Trash, { TRASH_DAYS } from '../models/trash.ts';

const trashRouter = express.Router();
export default trashRouter;

const DAY = 24 * 60 * 60 * 1000;
const NOT_FOUND = say('record-not-found', { label: 'trash' });

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
  const result = await putBackEntry(userOf(req), req.params.id);
  if (result.status === 'missing') return res.status(404).json(NOT_FOUND);
  if (result.status === 'refused') return res.status(403).json(result.refusal);
  if (result.status === 'conflict') return res.status(409).json(say('trash-restored-already'));
  await logActivity(req, 'restore', result.fromCollection, result.record);
  return res.status(200).json({
    ...say('trash-restored', { label: LABELS[result.fromCollection] }),
    fromCollection: result.fromCollection,
    record: result.record
  });
});

trashRouter.delete('/delete/:id', jwtAuth, async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json(say('invalid-id'));
  const ownedBy = userOf(req).id as string;
  const entry = await Trash.findOneAndDelete({ _id: req.params.id, ownedBy }).select({ record: 0 }).lean();
  if (!entry) return res.status(404).json(NOT_FOUND);
  if (entry.recordId) await RecordVersion.deleteMany({ ownedBy, recordId: entry.recordId });
  // A firing log deleted for good is taken off the recipes linked to it (in the Trash, the links were hidden).
  if (entry.recordId && entry.fromCollection === 'firing') await pullFiringLinks(ownedBy, [String(entry.recordId)]);
  return res.status(200).json(say('record-deleted', { label: LABELS[entry.fromCollection] ?? 'trash' }));
});

trashRouter.delete('/empty', jwtAuth, async (req, res) => {
  const ownedBy = userOf(req).id as string;
  const entries = await Trash.find({ ownedBy }).select({ recordId: 1, fromCollection: 1 }).lean();
  const ids = entries.flatMap((entry) => (entry.recordId ? [entry.recordId] : []));
  await Trash.deleteMany({ ownedBy });
  if (ids.length) await RecordVersion.deleteMany({ ownedBy, recordId: { $in: ids } });
  await pullFiringLinks(
    ownedBy,
    entries.flatMap((entry) => (entry.recordId && entry.fromCollection === 'firing' ? [String(entry.recordId)] : []))
  );
  res.status(200).json(say('trash-emptied'));
});
