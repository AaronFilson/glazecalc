// What happens to a record besides being saved: moved to the Trash and put
// back (models/trash.ts), its earlier versions kept for Undo
// (models/record_version.ts), and what an access token did to it written to
// the activity log (models/activity.ts). server/lib/record_routes.ts and
// server/routes/trash_routes.ts use these.
import type { Request } from 'express';
import type { Types } from 'mongoose';
import Activity, { TITLE_LENGTH, type ActivityAction } from '../models/activity.ts';
import RecordVersion, { VERSIONS_KEPT } from '../models/record_version.ts';
import Trash, { TRASH_MAX_ACCOUNT, TRASH_MAX_TRIAL } from '../models/trash.ts';
import type { UserDocument } from '../models/user.ts';
import type { RecordModel } from './guest_limits.ts';
import * as log from './log.ts';

type Row = Record<string, unknown> & { _id: Types.ObjectId };
type By = 'session' | 'pat' | 'oauth';

/** Who is making the change: the web session, or the kind of access token. */
export const byOf = (req: Request): By => {
  const via = req.access?.via;
  return via === 'pat' || via === 'oauth' ? via : 'session';
};

/** What a record is called, cut short: its title, or its name. Never a note's text. */
export const titleOf = (record: Record<string, unknown>): string | undefined => {
  const title = typeof record.title === 'string' && record.title ? record.title : record.name;
  return typeof title === 'string' && title ? title.slice(0, TITLE_LENGTH) : undefined;
};

/** What moveToTrash answers when an access token finds the Trash full. */
export const TRASH_FULL = 'trash-full';

/**
 * Moves one of the user's records to the Trash; resolves with the record and
 * its Trash entry's id, or null when they have no such record. It is in the
 * Trash before it leaves its list, so a failure part way never loses it.
 *
 * When the Trash is full, a change made on the website makes room by deleting
 * the oldest entries for good. An access token never does: it is refused
 * (TRASH_FULL) and the record stays where it is, so a token cannot push out
 * of the Trash what was put there before, by the person or by itself.
 */
export const moveToTrash = async (
  Model: RecordModel,
  kind: string,
  user: UserDocument,
  id: string,
  by: By,
  now = new Date()
): Promise<{ record: Row; trashId: string } | typeof TRASH_FULL | null> => {
  const ownedBy = String(user._id);
  const most = user.guest ? TRASH_MAX_TRIAL : TRASH_MAX_ACCOUNT;
  const byToken = by !== 'session';
  if (byToken && (await Trash.countDocuments({ ownedBy })) >= most) return TRASH_FULL;
  const record = (await Model.findOne({ _id: id, ownedBy }).lean()) as Row | null;
  if (!record) return null;
  const entry = await Trash.create({
    ownedBy,
    fromCollection: kind,
    recordId: record._id,
    record,
    title: titleOf(record),
    trashedAt: now,
    by
  });
  // Counted again with this entry in, so tokens trashing at the same moment cannot go past the limit.
  if (byToken && (await Trash.countDocuments({ ownedBy })) > most) {
    await Trash.deleteOne({ _id: entry._id });
    return TRASH_FULL;
  }
  if ((await Model.deleteOne({ _id: id, ownedBy })).deletedCount !== 1) {
    // Removed meanwhile, by another request that trashed it too.
    await Trash.deleteOne({ _id: entry._id });
    return null;
  }
  if (!byToken) await keepTrashWithin(ownedBy, most);
  return { record, trashId: String(entry._id) };
};

/** Deletes for good the oldest of the user's Trash past `most`. */
const keepTrashWithin = async (ownedBy: string, most: number): Promise<void> => {
  const over = await Trash.find({ ownedBy }).sort({ trashedAt: -1, _id: -1 }).skip(most).select({ _id: 1 }).lean();
  if (over.length) await Trash.deleteMany({ _id: { $in: over.map((entry) => entry._id) } });
};

/**
 * Of a record's versions, newest first, the one to keep past VERSIONS_KEPT:
 * the record as it was before the newest run of changes made with access
 * tokens (the version the run's first change saved). So however many changes
 * a token makes, what the person had before it started stays. -1 for none.
 */
const beforeTokens = (versions: Array<{ by?: string | null }>): number => {
  let i = 0;
  while (i < versions.length && versions[i].by === 'session') i++;
  if (i === versions.length) return -1;
  while (i + 1 < versions.length && versions[i + 1].by !== 'session') i++;
  return i;
};

/**
 * Keeps the record as it was before a change: the newest VERSIONS_KEPT of it,
 * and the one from before the newest run of access-token changes
 * (beforeTokens). `replacing` is a version this one takes the place of (Undo
 * puts it back), removed before the count.
 */
export const saveVersion = async (
  kind: string,
  before: Row,
  by: By,
  { now = new Date(), replacing }: { now?: Date; replacing?: Types.ObjectId } = {}
): Promise<void> => {
  const ownedBy = String(before.ownedBy);
  await RecordVersion.create({ ownedBy, fromCollection: kind, recordId: before._id, record: before, savedAt: now, by });
  if (replacing) await RecordVersion.deleteOne({ _id: replacing });
  const versions = await RecordVersion.find({ ownedBy, recordId: before._id })
    .sort({ savedAt: -1, _id: -1 })
    .select({ _id: 1, by: 1 })
    .lean();
  if (versions.length <= VERSIONS_KEPT) return;
  const floor = beforeTokens(versions);
  const older = versions.filter((_version, i) => i >= VERSIONS_KEPT && i !== floor);
  if (older.length) await RecordVersion.deleteMany({ _id: { $in: older.map((version) => version._id) } });
};

/**
 * Writes what an access token did to the activity log; nothing for the web
 * session. The record is named by its title alone. A failure to write is
 * logged, not passed on: the change itself is made.
 */
export const logActivity = async (
  req: Request,
  action: ActivityAction,
  kind: string,
  record: Record<string, unknown> & { _id?: Types.ObjectId | string }
): Promise<void> => {
  const access = req.access;
  if (!access || access.via === 'session' || !req.user) return;
  try {
    await Activity.create({
      ownedBy: String(req.user._id),
      via: access.via,
      tokenId: access.tokenId,
      client: access.name.slice(0, 100),
      action,
      fromCollection: kind,
      recordId: record._id,
      title: titleOf(record)
    });
  } catch (err) {
    log.error('Activity log write failed', { err, action, kind });
  }
};
