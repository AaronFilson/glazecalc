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
// When the account asks to confirm changes made with tokens (removals, or
// every change; docs/adr/0025-confirm-before-changes.md), a token's create,
// change, delete or undo waits for the person's approval and is answered 202
// (server/lib/rest_changes.ts confirmFirst). Each is an Op, registered as
// '<area>.create', '<area>.change', '<area>.delete' and '<area>.undo', so an
// approved change runs the same code.
//
// Database errors go to the app's error handler (server/app.ts): values of the
// wrong type are a 400, anything else a 500.
import express, { type Request } from 'express';
import mongoose from 'mongoose';
import RecordVersion from '../models/record_version.ts';
import { standardSet } from './standard_library.ts';
import { giveBack, makeRoom, quota, type RecordModel } from './guest_limits.ts';
import { userOf } from './jwt_auth.ts';
import * as log from './log.ts';
import { say } from './messages.ts';
import * as limits from './rate_limit.ts';
import { byOf, logActivity, moveToTrash, saveVersion, titleOf, tokenIdOf, TRASH_FULL } from './record_history.ts';
import requireScope from './require_scope.ts';
import { confirmFirst, inputOf, named, registerOp, send, type Describe, type Op } from './rest_changes.ts';
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
const INVALID_ID = { status: 400, body: say('invalid-id') };

/** Absent or empty. 0 is a value: a material's loss on ignition can be 0. */
const missing = (value: unknown): boolean => value === undefined || value === null || value === '';

const isObject = (value: unknown): value is Body =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

/** The body, or the object the client wrapped the record in, if it is an object. */
const recordIn = (given: unknown, wrapper?: string): Body | null => {
  const body: unknown = wrapper ? ((given ?? {}) as Body)[wrapper] : given;
  return isObject(body) ? body : null;
};

const pick = (source: Body, fields: string[]): Body =>
  Object.fromEntries(fields.filter((field) => source[field] !== undefined).map((field) => [field, source[field]]));

/** A version's fields, to replace a record's with: the record keeps its own _id and owner. */
const earlierOf = ({ _id: _id, ownedBy: _owner, ...earlier }: Body): Body => earlier;

/** Who is asking: the account, and how it got in. */
const whoIs = (req: Request) => ({ user: userOf(req), access: req.access });

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

  const create: Op = async (who, { body }) => {
    const source = recordIn(body, wrapper.create) ?? {};
    if (required.some((field) => missing(source[field]))) return { status: 400, body: MISSING };
    const saved = await Model.create({ ...pick(source, fields), ownedBy: String(who.user._id) });
    await logActivity(who, 'create', area, saved.toObject());
    return { status: 200, body: saved };
  };

  const change: Op = async (who, { params, body }) => {
    if (!mongoose.isValidObjectId(params.id)) return INVALID_ID;
    const source = recordIn(body, wrapper.change);
    if (!source) return { status: 400, body: MISSING };
    const changes = pick(source, fields);
    if (!Object.keys(changes).length) return { status: 400, body: say('nothing-to-update') };
    try {
      // The record as it was, found and changed in one step, so the version kept is the one changed.
      const before = await Model.findOneAndUpdate(
        { _id: params.id, ownedBy: String(who.user._id) },
        { $set: changes },
        { runValidators: true, returnDocument: 'before', lean: true }
      );
      if (!before) return { status: 404, body: notFound };
      await saveVersion(area, before, byOf(who));
      await logActivity(who, 'change', area, { ...before, ...changes });
      return { status: 200, body: say('record-updated', { label }) };
    } catch (err) {
      if (err instanceof Error && (err.name === 'ValidationError' || err.name === 'CastError')) {
        return { status: 400, body: say('record-invalid', { label }) };
      }
      throw err;
    }
  };

  const remove: Op = async (who, { params }) => {
    if (!mongoose.isValidObjectId(params.id)) return INVALID_ID;
    const id = params.id!;
    const user = who.user;
    const trashed = await moveToTrash(Model, area, user, id, byOf(who), tokenIdOf(who));
    if (!trashed) return { status: 404, body: notFound };
    if (trashed === TRASH_FULL) return { status: 409, body: say('trash-full') };
    // A failure here is logged and the delete still answers: the record is in the Trash already,
    // and putting it back stops anything it had (its share link) on its own.
    await onTrash?.(id, String(user._id)).catch((err: unknown) =>
      log.error('Could not finish moving a record to the Trash', { area, code: log.codeOf(err) })
    );
    await logActivity(who, 'trash', area, trashed.record);
    // A trial gets the place back for another record; the Trash does not count.
    if (user.guest) await giveBack(user._id, Model);
    return { status: 200, body: { ...say('record-trashed', { label }), trashId: trashed.trashId } };
  };

  const undo: Op = async (who, { params }) => {
    if (!mongoose.isValidObjectId(params.id)) return INVALID_ID;
    const ownedBy = String(who.user._id);
    const version = await RecordVersion.findOne({ ownedBy, fromCollection: area, recordId: params.id }).sort({
      savedAt: -1,
      _id: -1
    });
    if (!version) return { status: 404, body: say('nothing-to-undo') };
    const filter = { _id: params.id, ownedBy };
    const replacement = { ...earlierOf(version.record as Body), ownedBy };
    // The record as it was, found and replaced in one step, so the version kept is the one replaced.
    const before = await Model.findOneAndReplace(filter, replacement, { returnDocument: 'before', lean: true });
    // In the Trash, or gone: the version stays, for when it is put back.
    if (!before) return { status: 404, body: notFound };
    // What the undo replaced is kept in place of the version it put back, so the undo can be undone.
    await saveVersion(area, before, byOf(who), { replacing: version._id });
    const restored = (await Model.findOne(filter).lean()) ?? { ...replacement, _id: before._id };
    await logActivity(who, 'undo', area, restored);
    return { status: 200, body: { ...say('record-undone', { label }), record: restored } };
  };

  // A confirmed create needs room under the account's limit then, as quota checks it now.
  registerOp(area + '.create', async (who, input) => {
    const refusal = await makeRoom(who.user, Model, label);
    return refusal ? { status: 403, body: refusal } : create(who, input);
  });
  registerOp(area + '.change', change);
  registerOp(area + '.delete', remove, { trashes: true });
  registerOp(area + '.undo', undo);

  /** The title of one of the account's records of this kind ('' for none), or null when there is no such record. */
  const titleIn = async (id: unknown, userId: unknown): Promise<string | null> => {
    if (!mongoose.isValidObjectId(id)) return null;
    const record = (await Model.findOne({ _id: id, ownedBy: String(userId) }).lean()) as Body | null;
    return record ? (titleOf(record) ?? '') : null;
  };
  /** A change to one record: what it is, and the record, which must not change while it waits. */
  const about =
    (code: string, extra: (req: Request) => Record<string, string> = () => ({})): Describe =>
    async (req, who) => {
      const title = await titleIn(req.params.id, who.user._id);
      if (title === null) return null;
      return {
        summary: { code, params: { ...named(label, title), ...extra(req) } },
        base: { kind: 'record', area, id: String(req.params.id) }
      };
    };
  const asking = {
    create: confirmFirst(area + '.create', {
      removal: false,
      describe: async (req) => ({
        summary: { code: 'pending-create', params: named(label, titleOf(recordIn(req.body, wrapper.create) ?? {})) }
      })
    }),
    change: confirmFirst(area + '.change', {
      removal: false,
      describe: about('pending-change', (req) => ({
        fields: Object.keys(pick(recordIn(req.body, wrapper.change) ?? {}, fields)).join(', ')
      }))
    }),
    remove: confirmFirst(area + '.delete', { removal: true, describe: about('pending-trash') }),
    undo: confirmFirst(area + '.undo', { removal: false, describe: about('pending-undo') })
  };

  router.post('/create', writing, quota(Model, label), jsonParser, asking.create, async (req, res) => {
    send(res, await create(whoIs(req), inputOf(req)));
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

  router.put('/change/:id', writing, jsonParser, asking.change, async (req, res) => {
    send(res, await change(whoIs(req), inputOf(req)));
  });

  router.delete('/delete/:id', writing, limits.tokenDeletes, asking.remove, async (req, res) => {
    send(res, await remove(whoIs(req), inputOf(req)));
  });

  router.get('/versions/:id', reading, async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      res.status(400).json(say('invalid-id'));
      return;
    }
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

  router.post('/undo/:id', writing, asking.undo, async (req, res) => {
    send(res, await undo(whoIs(req), inputOf(req)));
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
