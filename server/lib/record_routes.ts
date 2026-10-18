// The routes for a kind of record that belongs to a user: recipes, materials,
// notes and the rest (server/routes/records.ts lists them). Every query is
// limited to the signed-in user's records, and only the listed fields can be
// set, so ownedBy can never be rewritten.
//
//   POST   /create       saves a new record                     200 with the record
//   GET    /getAll       the user's records, oldest first
//   GET    /getLatest    the user's newest                       404 when there is none
//   PUT    /change/:id   changes the listed fields of one of them 404 when it is not theirs
//   DELETE /delete/:id   moves one of them to the Trash           404 when it is not theirs;
//                        with an access token, 409 trash-full when the Trash is full, and
//                        at most limits.tokenDeletes an hour for each token
//   GET    /versions/:id its earlier versions, newest first: [{ _id, savedAt, by, title }]
//   POST   /undo/:id     puts back the version before the last change, and answers
//                        with the record                          404 when there is none;
//                        the record as it was before the undo becomes the newest
//                        version, so a second undo undoes the first
//   GET    /getStandard  the shared records from data/, for anyone (when `standard` is set)
//
// Each change keeps the record as it was (server/lib/record_history.ts), so it
// can be undone; a removed record can be put back from the Trash
// (server/routes/trash_routes.ts). The web session can use every route; an
// access token those its scopes allow (server/lib/require_scope.ts), and what
// it does is written to the activity log.
//
// Database errors go to the app's error handler (server/app.ts): values of the
// wrong type are a 400, anything else a 500.
import express, { type Request, type Response } from 'express';
import mongoose from 'mongoose';
import RecordVersion from '../models/record_version.ts';
import { standardSet } from './standard_library.ts';
import { giveBack, quota, type RecordModel } from './guest_limits.ts';
import { userOf } from './jwt_auth.ts';
import * as log from './log.ts';
import { say } from './messages.ts';
import * as limits from './rate_limit.ts';
import { byOf, logActivity, moveToTrash, saveVersion, titleOf, TRASH_FULL } from './record_history.ts';
import requireScope from './require_scope.ts';
import type { Area } from './scopes.ts';

export interface RecordRoutesOptions {
  /** The kind of record, a code the messages name it by (server/lib/messages.ts): 'recipe'. */
  label: string;
  /**
   * The part of the account it is, for access tokens' permissions
   * (server/lib/scopes.ts), and the kind of record as the account's data
   * names it (server/lib/account_data.ts): 'recipes'.
   */
  area: Exclude<Area, 'trash' | 'shelf' | 'preferences'>;
  /** What a user may set. */
  fields: string[];
  /** What a new record must have. */
  required: string[];
  /** Keys the client wraps the record in: { recipe: {...} }. */
  wrapper?: { create?: string; change?: string };
  /** Adds GET /getStandard. */
  standard?: boolean;
  /** Runs once a record has gone to the Trash, with its id and owner: a recipe stops being shared. */
  onTrash?: (id: string, ownedBy: string) => Promise<unknown>;
}

type Body = Record<string, unknown>;

const MISSING = say('missing-information');

/** Absent or empty. 0 is a value: a material's loss on ignition can be 0. */
const missing = (value: unknown): boolean => value === undefined || value === null || value === '';

const isObject = (value: unknown): value is Body =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

/** The body, or the object the client wrapped the record in, if it is an object. */
const recordIn = (req: Request, wrapper?: string): Body | null => {
  const body: unknown = wrapper ? ((req.body ?? {}) as Body)[wrapper] : req.body;
  return isObject(body) ? body : null;
};

const pick = (source: Body, fields: string[]): Body =>
  Object.fromEntries(fields.filter((field) => source[field] !== undefined).map((field) => [field, source[field]]));

/** A version's fields, to replace a record's with: the record keeps its own _id and owner. */
const earlierOf = ({ _id: _id, ownedBy: _owner, ...earlier }: Body): Body => earlier;

const validId = (req: Request, res: Response): boolean => {
  if (mongoose.isValidObjectId(req.params.id)) return true;
  res.status(400).json(say('invalid-id'));
  return false;
};

export default function recordRoutes(
  Model: RecordModel,
  { label, area, fields, required, wrapper = {}, standard = false, onTrash }: RecordRoutesOptions
): express.Router {
  const router = express.Router();
  // The web session, or an access token that allows it.
  const reading = requireScope(`${area}:read`);
  const writing = requireScope(`${area}:write`);
  const jsonParser = express.json();
  const notFound = say('record-not-found', { label });

  router.post('/create', writing, quota(Model, label), jsonParser, async (req, res) => {
    const source = recordIn(req, wrapper.create) ?? {};
    if (required.some((field) => missing(source[field]))) {
      res.status(400).json(MISSING);
      return;
    }
    const saved = await Model.create({ ...pick(source, fields), ownedBy: userOf(req).id });
    await logActivity(req, 'create', area, saved.toObject());
    res.status(200).json(saved);
  });

  router.get('/getAll', reading, async (req, res) => {
    res.status(200).json(await Model.find({ ownedBy: userOf(req).id }).sort({ _id: 1 }));
  });

  router.get('/getLatest', reading, async (req, res) => {
    const newest = await Model.findOne({ ownedBy: userOf(req).id }).sort({ _id: -1 });
    if (!newest) {
      res.status(404).json(say('none-saved', { label }));
      return;
    }
    res.status(200).json(newest);
  });

  router.put('/change/:id', writing, jsonParser, async (req, res) => {
    if (!validId(req, res)) return;
    const source = recordIn(req, wrapper.change);
    if (!source) {
      res.status(400).json(MISSING);
      return;
    }
    const changes = pick(source, fields);
    if (!Object.keys(changes).length) {
      res.status(400).json(say('nothing-to-update'));
      return;
    }
    try {
      // The record as it was, found and changed in one step, so the version kept is the one changed.
      const before = await Model.findOneAndUpdate(
        { _id: req.params.id, ownedBy: userOf(req).id },
        { $set: changes },
        { runValidators: true, returnDocument: 'before', lean: true }
      );
      if (!before) {
        res.status(404).json(notFound);
        return;
      }
      await saveVersion(area, before, byOf(req));
      await logActivity(req, 'change', area, { ...before, ...changes });
      res.status(200).json(say('record-updated', { label }));
    } catch (err) {
      if (err instanceof Error && (err.name === 'ValidationError' || err.name === 'CastError')) {
        res.status(400).json(say('record-invalid', { label }));
        return;
      }
      throw err;
    }
  });

  router.delete('/delete/:id', writing, limits.tokenDeletes, async (req, res) => {
    if (!validId(req, res)) return;
    const user = userOf(req);
    const trashed = await moveToTrash(Model, area, user, req.params.id as string, byOf(req));
    if (!trashed) {
      res.status(404).json(notFound);
      return;
    }
    if (trashed === TRASH_FULL) {
      res.status(409).json(say('trash-full'));
      return;
    }
    // A failure here is logged and the delete still answers: the record is in the Trash already,
    // and putting it back stops anything it had (its share link) on its own.
    await onTrash?.(req.params.id as string, String(user._id)).catch((err: unknown) =>
      log.error('Could not finish moving a record to the Trash', { area, code: log.codeOf(err) })
    );
    await logActivity(req, 'trash', area, trashed.record);
    // A trial gets the place back for another record; the Trash does not count.
    if (user.guest) await giveBack(user._id, Model);
    res.status(200).json({ ...say('record-trashed', { label }), trashId: trashed.trashId });
  });

  router.get('/versions/:id', reading, async (req, res) => {
    if (!validId(req, res)) return;
    const versions = await RecordVersion.find({
      ownedBy: userOf(req).id,
      fromCollection: area,
      recordId: req.params.id
    })
      .sort({ savedAt: -1, _id: -1 })
      // The list shows only each version's title.
      .select({ savedAt: 1, by: 1, 'record.title': 1, 'record.name': 1 })
      .lean();
    res
      .status(200)
      .json(versions.map(({ _id, savedAt, by, record }) => ({ _id, savedAt, by, title: titleOf(record as Body) })));
  });

  router.post('/undo/:id', writing, async (req, res) => {
    if (!validId(req, res)) return;
    const ownedBy = userOf(req).id as string;
    const version = await RecordVersion.findOne({ ownedBy, fromCollection: area, recordId: req.params.id }).sort({
      savedAt: -1,
      _id: -1
    });
    if (!version) {
      res.status(404).json(say('nothing-to-undo'));
      return;
    }
    const filter = { _id: req.params.id, ownedBy };
    const replacement = { ...earlierOf(version.record as Body), ownedBy };
    // The record as it was, found and replaced in one step, so the version kept is the one replaced.
    const before = await Model.findOneAndReplace(filter, replacement, { returnDocument: 'before', lean: true });
    if (!before) {
      // In the Trash, or gone: the version stays, for when it is put back.
      res.status(404).json(notFound);
      return;
    }
    // What the undo replaced is kept in place of the version it put back, so the undo can be undone.
    await saveVersion(area, before, byOf(req), { replacing: version._id });
    const restored = (await Model.findOne(filter).lean()) ?? { ...replacement, _id: before._id };
    await logActivity(req, 'undo', area, restored);
    res.status(200).json({ ...say('record-undone', { label }), record: restored });
  });

  if (standard) {
    router.get('/getStandard', async (req, res) => {
      // The standard records are public (they ship in data/); browsers may reuse them briefly.
      res.set('Cache-Control', 'public, max-age=300');
      // Read once and kept a while, serialised (server/lib/standard_library.ts).
      res
        .status(200)
        .type('json')
        .send((await standardSet(Model)).body);
    });
  }

  return router;
}
