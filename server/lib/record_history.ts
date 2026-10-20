// What happens to a record besides being saved: moved to the Trash and put
// back (models/trash.ts), its earlier versions kept for Undo
// (models/record_version.ts), and what an access token did to it written to
// the activity log (models/activity.ts). server/lib/record_routes.ts and
// server/routes/trash_routes.ts use these.
import type { Request } from 'express';
import type { Types } from 'mongoose';
import Activity, { TITLE_LENGTH, type ActivityAction } from '../models/activity.ts';
import RecordVersion, { VERSIONS_KEPT, VERSIONS_MOST_ACCOUNT } from '../models/record_version.ts';
import Trash, { TRASH_DAYS, TRASH_MAX_ACCOUNT, TRASH_MAX_TRIAL } from '../models/trash.ts';
import type { UserDocument } from '../models/user.ts';
import type { RecordModel } from './guest_limits.ts';
import * as log from './log.ts';

type Row = Record<string, unknown> & { _id: Types.ObjectId };
type By = 'session' | 'pat' | 'oauth';

const DAY = 24 * 60 * 60 * 1000;

/** Who is making the change: the web session, or the kind of access token. */
export const byOf = (req: Pick<Request, 'access'>): By => {
  const via = req.access?.via;
  return via === 'pat' || via === 'oauth' ? via : 'session';
};

/** The id of the access token (or OAuth grant) making the change, or undefined for the web session. */
export const tokenIdOf = (req: Pick<Request, 'access'>): string | undefined => {
  const access = req.access;
  return access && access.via !== 'session' ? access.tokenId : undefined;
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
  tokenId?: string,
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
    by,
    ...(tokenId && { tokenId })
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
  // Its earlier versions go when its Trash entry does (models/record_version.ts).
  await RecordVersion.updateMany(
    { ownedBy, recordId: record._id },
    { $set: { expiresAt: new Date(now.getTime() + TRASH_DAYS * DAY) } }
  );
  if (!byToken) await keepTrashWithin(ownedBy, most);
  return { record, trashId: String(entry._id) };
};

/** Deletes for good the oldest of the user's Trash past `most`, with their earlier versions. */
const keepTrashWithin = async (ownedBy: string, most: number): Promise<void> => {
  const over = await Trash.find({ ownedBy })
    .sort({ trashedAt: -1, _id: -1 })
    .skip(most)
    .select({ _id: 1, recordId: 1 })
    .lean();
  if (!over.length) return;
  await Trash.deleteMany({ _id: { $in: over.map((entry) => entry._id) } });
  const ids = over.flatMap((entry) => (entry.recordId ? [entry.recordId] : []));
  if (ids.length) await RecordVersion.deleteMany({ ownedBy, recordId: { $in: ids } });
};

/** A record put back from the Trash keeps its earlier versions for their own time again. */
export const keepVersions = async (ownedBy: string, recordId: Types.ObjectId): Promise<void> => {
  await RecordVersion.updateMany({ ownedBy, recordId }, { $unset: { expiresAt: 1 } });
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

/** The id of a record's version from before the newest run of access-token changes (beforeTokens), or null. */
const floorOf = async (ownedBy: string, recordId: Types.ObjectId): Promise<string | null> => {
  const versions = await RecordVersion.find({ ownedBy, recordId })
    .sort({ savedAt: -1, _id: -1 })
    .select({ _id: 1, by: 1 })
    .lean();
  const floor = beforeTokens(versions);
  return floor === -1 ? null : String(versions[floor]!._id);
};

/**
 * How many of the account's oldest versions are looked at, past the number to
 * remove, for one save: room for that many records' versions from before a
 * token's changes, which stay.
 */
const FLOOR_ROOM = 200;

/**
 * Keeps the account's versions to VERSIONS_MOST_ACCOUNT: the oldest go first,
 * but never a record's version from before the newest run of access-token
 * changes (beforeTokens), so what the person had before a token started stays
 * however much it does. Each save looks at most FLOOR_ROOM versions past the
 * ones it removes, so an account whose oldest are all such versions can stay
 * a little over until they expire (VERSION_DAYS).
 */
export const keepAccountVersionsWithin = async (ownedBy: string, most = VERSIONS_MOST_ACCOUNT): Promise<number> => {
  const over = (await RecordVersion.countDocuments({ ownedBy })) - most;
  if (over <= 0) return 0;
  const oldest = await RecordVersion.find({ ownedBy })
    .sort({ savedAt: 1, _id: 1 })
    .limit(over + FLOOR_ROOM)
    .select({ _id: 1, recordId: 1, by: 1 })
    .lean();
  const floors = new Map<string, string | null>();
  const drop: Types.ObjectId[] = [];
  for (const version of oldest) {
    if (drop.length >= over) break;
    // Only a token's change saves a version that can be a record's floor.
    if (version.by !== 'session') {
      const record = String(version.recordId);
      if (!floors.has(record)) floors.set(record, await floorOf(ownedBy, version.recordId));
      if (floors.get(record) === String(version._id)) continue;
    }
    drop.push(version._id);
  }
  if (drop.length) await RecordVersion.deleteMany({ _id: { $in: drop } });
  return drop.length;
};

/**
 * Keeps the record as it was before a change: the newest VERSIONS_KEPT of it,
 * and the one from before the newest run of access-token changes
 * (beforeTokens); then the account's to VERSIONS_MOST_ACCOUNT
 * (keepAccountVersionsWithin). `replacing` is a version this one takes the
 * place of (Undo puts it back), removed before the count.
 */
export const saveVersion = async (
  kind: string,
  before: Row,
  by: By,
  {
    now = new Date(),
    replacing,
    tokenId
  }: { now?: Date; replacing?: Types.ObjectId; tokenId?: string | Types.ObjectId } = {}
): Promise<void> => {
  const ownedBy = String(before.ownedBy);
  await RecordVersion.create({
    ownedBy,
    fromCollection: kind,
    recordId: before._id,
    record: before,
    savedAt: now,
    by,
    ...(tokenId && by !== 'session' && { tokenId })
  });
  if (replacing) await RecordVersion.deleteOne({ _id: replacing });
  const versions = await RecordVersion.find({ ownedBy, recordId: before._id })
    .sort({ savedAt: -1, _id: -1 })
    .select({ _id: 1, by: 1 })
    .lean();
  if (versions.length > VERSIONS_KEPT) {
    const floor = beforeTokens(versions);
    const older = versions.filter((_version, i) => i >= VERSIONS_KEPT && i !== floor);
    if (older.length) await RecordVersion.deleteMany({ _id: { $in: older.map((version) => version._id) } });
  }
  await keepAccountVersionsWithin(ownedBy);
};

/**
 * Gives Trash entries from before the Trash was used (no trashedAt, so the
 * TTL never removed them) the date they were written, or `now` when it does
 * not read as a date in the past, so they go TRASH_DAYS after it. Safe to
 * repeat: only entries without trashedAt are changed. Resolves with how many.
 */
export const dateOldTrash = async (now = new Date()): Promise<number> => {
  const undated = await Trash.find({ trashedAt: { $exists: false } })
    .select({ _id: 1, date: 1 })
    .lean();
  if (!undated.length) return 0;
  const result = await Trash.bulkWrite(
    undated.map(({ _id, date }) => {
      const then = date ? new Date(date) : null;
      const trashedAt = then && !Number.isNaN(then.getTime()) && then < now ? then : now;
      return { updateOne: { filter: { _id, trashedAt: { $exists: false } }, update: { $set: { trashedAt } } } };
    })
  );
  return result.modifiedCount;
};

/** An access token, as the activity log names who made a change. */
export interface TokenActor {
  via: 'pat' | 'oauth';
  tokenId: string;
  /** The token's name, or the client's. */
  name: string;
}

/**
 * Writes what an access token did to the account `ownedBy` to the activity
 * log: the record named by its title alone. A failure to write is logged,
 * not passed on: the change itself is made. The MCP write tools call this;
 * the record routes, logActivity.
 */
export const logActivityBy = async (
  actor: TokenActor,
  ownedBy: string,
  action: ActivityAction,
  kind: string,
  record: Record<string, unknown> & { _id?: Types.ObjectId | string }
): Promise<void> => {
  try {
    await Activity.create({
      ownedBy,
      via: actor.via,
      tokenId: actor.tokenId,
      client: actor.name.slice(0, 100),
      action,
      fromCollection: kind,
      recordId: record._id,
      title: titleOf(record)
    });
  } catch (err) {
    log.error('Activity log write failed', { err, action, kind });
  }
};

/** Writes what an access token did to the activity log (logActivityBy); nothing for the web session. */
export const logActivity = async (
  req: Pick<Request, 'access' | 'user'>,
  action: ActivityAction,
  kind: string,
  record: Record<string, unknown> & { _id?: Types.ObjectId | string }
): Promise<void> => {
  const access = req.access;
  if (!access || access.via === 'session' || !req.user) return;
  await logActivityBy(
    { via: access.via, tokenId: access.tokenId, name: access.name },
    String(req.user._id),
    action,
    kind,
    record
  );
};
