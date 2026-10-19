// Connected apps (docs/integrations-plan.md, items 3 and 27): the account's
// personal access tokens and OAuth connections in one list, with what each did
// and the Trash it filled. Behind the web session only: app.ts mounts this
// after refuseAccessTokens, so no token can list, read or revoke tokens.
//
//   GET    /api/connections                   { connections: [Connection], confirmChanges }, newest first
//   PUT    /api/connections/confirm-setting   { confirmChanges: 'off' | 'removals' | 'all' }: when changes
//                                             from apps and tokens wait for approval (docs/adr/0025)
//   GET    /api/connections/:id/activity      what it did, newest first, 50 a page:
//                                             ?before=<next from the last page> -> { activity, next }
//   GET    /api/connections/:id/trash         the Trash entries it moved, newest first
//   POST   /api/connections/:id/restore-all   puts them all back, leaving any that would clash
//   DELETE /api/connections/:id               revokes one: 200 say('token-revoked'), 404 when it is not the account's
//   DELETE /api/connections                   revokes every one still working: say('tokens-revoked', { count })
//
// Every query names the signed-in account. Counts and the list come from the
// activity log, which keeps 90 days (models/activity.ts). Revoking uses the
// token model's own paths (revokeOne, revokeAll), so what hangs off a
// connection (an OAuth grant's tokens) goes with it.
import express from 'express';
import mongoose, { type Types } from 'mongoose';
import { notGuest } from '../lib/guest_limits.ts';
import jwtAuth, { userOf } from '../lib/jwt_auth.ts';
import * as accountMail from '../lib/account_mail.ts';
import * as log from '../lib/log.ts';
import * as mailer from '../lib/mailer.ts';
import { say } from '../lib/messages.ts';
import { CURRENT, LABELS, putBackEntry } from '../lib/trash_restore.ts';
import AccessToken, { revokeAll, revokeOne } from '../models/access_token.ts';
import Activity, { ACTIONS, ACTIVITY_DAYS } from '../models/activity.ts';
import Trash, { TRASH_DAYS } from '../models/trash.ts';
import User, { CONFIRM_CHANGES, type ConfirmChanges } from '../models/user.ts';

const DAY = 24 * 60 * 60 * 1000;
/** Lines of activity on a page. */
export const ACTIVITY_PAGE = 50;
/** The most Trash entries listed (or put back) for one connection. */
const TRASH_LIST_MAX = 200;

/** What a connection did in the last ACTIVITY_DAYS: how many records of each action. */
export type ChangeCounts = Record<(typeof ACTIONS)[number], number>;

/** A personal token or an OAuth connection as Connected apps shows it: never its hash. */
export interface Connection {
  id: string;
  kind: 'pat' | 'oauth';
  name: string;
  /** An OAuth client's own address and where it asked to be sent back, when known. */
  clientHost?: string;
  redirectHost?: string;
  /**
   * An OAuth app that registered itself (DCR): its name is only what it says
   * of itself. One that names itself by its address (CIMD) has its host checked.
   */
  selfDescribed?: boolean;
  /** What it may do: read only, or read and change. */
  access: 'read' | 'write';
  /** A token's last four characters. */
  hint?: string;
  createdAt: Date;
  lastUsedAt?: Date;
  expiresAt: Date;
  revokedAt?: Date;
  /** Whether it works now: neither revoked nor expired. */
  working: boolean;
  /** A personal token made so that its changes never wait for approval. */
  noConfirm?: boolean;
  changes: ChangeCounts;
}

const connectionRouter = express.Router();
export default connectionRouter;

const KINDS: Array<'pat' | 'oauth'> = ['pat', 'oauth'];
const validId = (id: unknown): id is string => typeof id === 'string' && mongoose.isObjectIdOrHexString(id);
const noChanges = (): ChangeCounts => Object.fromEntries(ACTIONS.map((action) => [action, 0])) as ChangeCounts;

connectionRouter.get('/', jwtAuth, notGuest, async (req, res) => {
  const now = new Date();
  const ownedBy = String(userOf(req)._id);
  const rows = await AccessToken.find({ userId: userOf(req)._id, kind: { $in: KINDS } })
    .sort({ createdAt: -1, _id: -1 })
    .lean();
  // One pass over the activity log for every connection's counts.
  const counted = rows.length
    ? await Activity.aggregate<{ _id: { tokenId: Types.ObjectId; action: string }; n: number }>([
        {
          $match: {
            ownedBy,
            tokenId: { $in: rows.map((row) => row._id) },
            at: { $gte: new Date(now.getTime() - ACTIVITY_DAYS * DAY) }
          }
        },
        { $group: { _id: { tokenId: '$tokenId', action: '$action' }, n: { $sum: 1 } } }
      ])
    : [];
  const counts = new Map<string, ChangeCounts>();
  for (const { _id, n } of counted) {
    const key = String(_id.tokenId);
    const list = counts.get(key) ?? noChanges();
    if (_id.action in list) list[_id.action as keyof ChangeCounts] = n;
    counts.set(key, list);
  }
  const connections: Connection[] = rows.map((row) => {
    return {
      id: String(row._id),
      kind: row.kind,
      name: row.name,
      ...(row.clientHost && { clientHost: row.clientHost }),
      ...(row.redirectHost && { redirectHost: row.redirectHost }),
      ...(row.kind === 'oauth' && { selfDescribed: row.clientSource !== 'cimd' }),
      access: row.scopes.includes('data:write') ? 'write' : 'read',
      ...(row.kind === 'pat' && row.hint && { hint: row.hint }),
      createdAt: row.createdAt,
      ...(row.lastUsedAt && { lastUsedAt: row.lastUsedAt }),
      expiresAt: row.expiresAt,
      ...(row.revokedAt && { revokedAt: row.revokedAt }),
      working: !row.revokedAt && row.expiresAt > now,
      ...(row.kind === 'pat' && row.noConfirm && { noConfirm: true }),
      changes: counts.get(String(row._id)) ?? noChanges()
    };
  });
  res.status(200).json({ connections, confirmChanges: userOf(req).confirmChanges ?? 'off' });
});

/** How much each choice asks: a change to a lower one is a loosening, which the owner is told about by email. */
const STRICTNESS: Record<ConfirmChanges, number> = { off: 0, removals: 1, all: 2 };

// Confirm before changes (docs/adr/0025-confirm-before-changes.md): when changes from apps and tokens
// wait for the person's approval. The web session only, as everything here; asking less sends a notice,
// so an asking-less that the person did not make does not go unseen.
connectionRouter.put('/confirm-setting', jwtAuth, notGuest, express.json(), async (req, res) => {
  const wanted = ((req.body ?? {}) as { confirmChanges?: unknown }).confirmChanges;
  if (!CONFIRM_CHANGES.includes(wanted as ConfirmChanges)) {
    return res.status(400).json(say('confirm-setting-invalid', undefined, { field: 'confirmChanges' }));
  }
  const choice = wanted as ConfirmChanges;
  const user = userOf(req);
  const before = (await User.findOneAndUpdate(
    { _id: user._id },
    { $set: { confirmChanges: choice } },
    { returnDocument: 'before', projection: { confirmChanges: 1 } }
  ).lean()) ?? { confirmChanges: undefined };
  const was = before.confirmChanges ?? 'off';
  if (STRICTNESS[choice] < STRICTNESS[was] && !user.emailUnverified && mailer.available()) {
    accountMail
      .sendConfirmLoosened(user.email, choice, user.preferences?.language ?? undefined)
      .catch((err: unknown) => log.error('Could not send the confirm-changes email', { code: log.codeOf(err) }));
  }
  return res.status(200).json({ ...say('confirm-setting-saved'), confirmChanges: choice });
});

/** The id of one of the account's connections, or null (after sending the error) when it is not. */
const ownConnection = async (req: express.Request, res: express.Response): Promise<Types.ObjectId | null> => {
  if (!validId(req.params.id)) {
    res.status(400).json(say('invalid-id'));
    return null;
  }
  const row = await AccessToken.findOne({ _id: req.params.id, userId: userOf(req)._id, kind: { $in: KINDS } })
    .select({ _id: 1 })
    .lean();
  if (!row) {
    res.status(404).json(say('token-not-found'));
    return null;
  }
  return row._id;
};

/** A cursor for the next page: the last line's time and id, as "<ms>-<id>". */
const CURSOR = /^(\d{1,15})-([0-9a-f]{24})$/;

connectionRouter.get('/:id/activity', jwtAuth, notGuest, async (req, res) => {
  const tokenId = await ownConnection(req, res);
  if (!tokenId) return;
  const filter: Record<string, unknown> = { ownedBy: String(userOf(req)._id), tokenId };
  const before = req.query.before;
  if (before !== undefined) {
    const cursor = typeof before === 'string' ? CURSOR.exec(before) : null;
    if (!cursor) {
      res.status(400).json(say('invalid-input'));
      return;
    }
    const at = new Date(Number(cursor[1]));
    filter.$or = [{ at: { $lt: at } }, { at, _id: { $lt: cursor[2] } }];
  }
  const lines = await Activity.find(filter)
    .sort({ at: -1, _id: -1 })
    .limit(ACTIVITY_PAGE + 1)
    .lean();
  const page = lines.slice(0, ACTIVITY_PAGE);
  const last = page[page.length - 1];
  res.status(200).json({
    activity: page.map((line) => ({
      id: String(line._id),
      at: line.at,
      action: line.action,
      fromCollection: line.fromCollection,
      recordId: line.recordId,
      title: line.title
    })),
    next: lines.length > ACTIVITY_PAGE && last ? `${last.at.getTime()}-${last._id}` : null
  });
});

/**
 * The ids of the Trash entries a connection moved: those marked with its id,
 * and older ones (from before entries were marked) whose record the activity
 * log says it trashed. An entry the person moved themselves, on the website,
 * is never in it.
 */
const movedByIds = async (ownedBy: string, tokenId: Types.ObjectId): Promise<Types.ObjectId[]> => {
  const trashedBefore = await Activity.distinct('recordId', { ownedBy, tokenId, action: 'trash' });
  const entries = await Trash.find({
    ownedBy,
    ...CURRENT,
    by: { $ne: 'session' },
    $or: [{ tokenId }, { tokenId: null, recordId: { $in: trashedBefore } }]
  })
    .sort({ trashedAt: -1, _id: -1 })
    .limit(TRASH_LIST_MAX)
    .select({ _id: 1 })
    .lean();
  return entries.map((entry) => entry._id);
};

connectionRouter.get('/:id/trash', jwtAuth, notGuest, async (req, res) => {
  const tokenId = await ownConnection(req, res);
  if (!tokenId) return;
  const ownedBy = String(userOf(req)._id);
  const ids = await movedByIds(ownedBy, tokenId);
  const entries = await Trash.find({ _id: { $in: ids }, ownedBy })
    .select({ record: 0 })
    .sort({ trashedAt: -1, _id: -1 })
    .lean();
  res.status(200).json({
    entries: entries.map(({ _id, fromCollection, recordId, title, trashedAt }) => ({
      _id,
      fromCollection,
      label: LABELS[fromCollection] ?? 'other',
      recordId,
      title,
      trashedAt,
      expiresAt: trashedAt && new Date(trashedAt.getTime() + TRASH_DAYS * DAY)
    }))
  });
});

connectionRouter.post('/:id/restore-all', jwtAuth, notGuest, async (req, res) => {
  const tokenId = await ownConnection(req, res);
  if (!tokenId) return;
  const user = userOf(req);
  let count = 0;
  let skipped = 0;
  for (const id of await movedByIds(String(user._id), tokenId)) {
    const result = await putBackEntry(user, String(id));
    if (result.status === 'ok') count++;
    // A clash (the record is in its list already) or a limit: it stays in the Trash.
    else if (result.status !== 'missing') skipped++;
  }
  res
    .status(200)
    .json(
      skipped
        ? say('connection-restored-skipped', { count, skipped }, { count, skipped })
        : say('connection-restored', { count }, { count, skipped })
    );
});

connectionRouter.delete('/:id', jwtAuth, notGuest, async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json(say('invalid-id'));
  if (!(await revokeOne(userOf(req)._id, String(req.params.id), KINDS, 'person'))) {
    return res.status(404).json(say('token-not-found'));
  }
  return res.status(200).json(say('token-revoked'));
});

connectionRouter.delete('/', jwtAuth, notGuest, async (req, res) => {
  const count = await revokeAll(userOf(req)._id, 'person');
  return res.status(200).json(say('tokens-revoked', { count }));
});
