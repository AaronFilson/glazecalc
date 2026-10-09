// The routes for a kind of record that belongs to a user: recipes, materials,
// notes and the rest (server/routes/records.ts lists them). Every query is
// limited to the signed-in user's records, and only the listed fields can be
// set, so ownedBy can never be rewritten.
//
//   POST   /create       saves a new record                     200 with the record
//   GET    /getAll       the user's records, oldest first
//   GET    /getLatest    the user's newest                       404 when there is none
//   PUT    /change/:id   changes the listed fields of one of them 404 when it is not theirs
//   DELETE /delete/:id   removes one of them                     404 when it is not theirs
//   GET    /getStandard  the shared records from data/, for anyone (when `standard` is set)
//
// Database errors go to the app's error handler (server/app.ts): values of the
// wrong type are a 400, anything else a 500.
import express, { type Request, type Response } from 'express';
import mongoose from 'mongoose';
import { giveBack, quota, type RecordModel } from './guest_limits.ts';
import jwtAuth, { userOf } from './jwt_auth.ts';
import { say } from './messages.ts';

export interface RecordRoutesOptions {
  /** The kind of record, a code the messages name it by (server/lib/messages.ts): 'recipe'. */
  label: string;
  /** What a user may set. */
  fields: string[];
  /** What a new record must have. */
  required: string[];
  /** Keys the client wraps the record in: { recipe: {...} }. */
  wrapper?: { create?: string; change?: string };
  /** Adds GET /getStandard. */
  standard?: boolean;
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

const validId = (req: Request, res: Response): boolean => {
  if (mongoose.isValidObjectId(req.params.id)) return true;
  res.status(400).json(say('invalid-id'));
  return false;
};

export default function recordRoutes(
  Model: RecordModel,
  { label, fields, required, wrapper = {}, standard = false }: RecordRoutesOptions
): express.Router {
  const router = express.Router();
  const jsonParser = express.json();
  const notFound = say('record-not-found', { label });

  router.post('/create', jwtAuth, quota(Model, label), jsonParser, async (req, res) => {
    const source = recordIn(req, wrapper.create) ?? {};
    if (required.some((field) => missing(source[field]))) {
      res.status(400).json(MISSING);
      return;
    }
    res.status(200).json(await Model.create({ ...pick(source, fields), ownedBy: userOf(req).id }));
  });

  router.get('/getAll', jwtAuth, async (req, res) => {
    res.status(200).json(await Model.find({ ownedBy: userOf(req).id }).sort({ _id: 1 }));
  });

  router.get('/getLatest', jwtAuth, async (req, res) => {
    const newest = await Model.findOne({ ownedBy: userOf(req).id }).sort({ _id: -1 });
    if (!newest) {
      res.status(404).json(say('none-saved', { label }));
      return;
    }
    res.status(200).json(newest);
  });

  router.put('/change/:id', jwtAuth, jsonParser, async (req, res) => {
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
      const result = await Model.updateOne(
        { _id: req.params.id, ownedBy: userOf(req).id },
        { $set: changes },
        { runValidators: true }
      );
      if (!result.matchedCount) {
        res.status(404).json(notFound);
        return;
      }
      res.status(200).json(say('record-updated', { label }));
    } catch (err) {
      if (err instanceof Error && (err.name === 'ValidationError' || err.name === 'CastError')) {
        res.status(400).json(say('record-invalid', { label }));
        return;
      }
      throw err;
    }
  });

  router.delete('/delete/:id', jwtAuth, async (req, res) => {
    if (!validId(req, res)) return;
    const user = userOf(req);
    const result = await Model.deleteOne({ _id: req.params.id, ownedBy: user.id });
    if (result.deletedCount !== 1) {
      res.status(404).json(notFound);
      return;
    }
    // A trial gets the place back for another record.
    if (user.guest) await giveBack(user._id, Model);
    res.status(200).json(say('record-deleted', { label }));
  });

  if (standard) {
    router.get('/getStandard', async (req, res) => {
      // The standard records are public (they ship in data/); browsers may reuse them briefly.
      res.set('Cache-Control', 'public, max-age=300');
      res.status(200).json(await Model.find({ ownedBy: 'Standard' }));
    });
  }

  return router;
}
