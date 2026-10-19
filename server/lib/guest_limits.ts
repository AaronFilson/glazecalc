// What a trial ("guest") account may do. Guests can use every page, but keep a
// limited number of records, and cannot use anything that needs a password or an
// email: they create an account (POST /api/guest/claim) for that. An account
// keeps many more records, but not without end, so that no one account (or a
// script or assistant working for it with an access token) can fill the
// server's disk.
import express, { type NextFunction, type Request, type Response } from 'express';
import type { Model, Types } from 'mongoose';
import Additive from '../models/additive.ts';
import Advice from '../models/advice.ts';
import Firing from '../models/firing.ts';
import Material from '../models/material.ts';
import Note from '../models/note.ts';
import Recipe from '../models/recipe.ts';
import User from '../models/user.ts';
import { say } from './messages.ts';

/** A model of records that belong to a user (they have ownedBy); the seven differ in their other fields. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RecordModel = Model<any>;

/**
 * The most records an account keeps, of every kind together (owner decision,
 * 2026-10-19): far more than any potter's notebook, few enough that no one
 * account fills the disk. ACCOUNT_MAX_RECORDS in the environment sets another.
 */
export const ACCOUNT_RECORDS_MOST = 100_000;
/** The kinds of record counted together for it; the Trash has a limit of its own (models/trash.ts). */
const COUNTED: RecordModel[] = [Additive, Advice, Firing, Material, Note, Recipe];

const maxRecords = (): number => Number(process.env.GUEST_MAX_RECORDS) || 25;
const maxAccountRecords = (): number => Number(process.env.ACCOUNT_MAX_RECORDS) || ACCOUNT_RECORDS_MOST;

/**
 * How many records the account keeps, of every kind together, counted up to
 * `most` and no further. Each kind is counted on its { ownedBy, _id } index
 * (a count of index keys, never the records themselves), and a kind is asked
 * only for as many as are still needed to reach `most`, so a full account
 * costs at most `most` index keys, about 100,000 (milliseconds), and a usual
 * one a few hundred. Counted, not kept as a running total, so it can never
 * drift from what is there: records also arrive from a trial and the Trash.
 */
export const accountRecords = async (ownedBy: string, most = maxAccountRecords()): Promise<number> => {
  let total = 0;
  for (const Model of COUNTED) {
    if (total >= most) break;
    total += await Model.countDocuments({ ownedBy }, { limit: most - total });
  }
  return total;
};

// Anyone can start a trial, so a trial may send less at once than an account's
// 100 KB (the largest real recipe is about 3 KB). jwt_auth.ts runs this for
// trials on every route; the route's own JSON parser then finds the body read.
const trialJson = express.json({ limit: '32kb' });
export const parseBody = (req: Request, res: Response, next: NextFunction): void => trialJson(req, res, next);

/** For routes that need a real account. */
export const notGuest = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user?.guest) {
    res.status(403).json(say('account-needed'));
    return;
  }
  next();
};

// A trial's count of each kind of record, on its user: trialCounts.Note and so on.
const countField = (Model: RecordModel): string => 'trialCounts.' + Model.modelName;

/**
 * Before a create: a guest keeps at most GUEST_MAX_RECORDS (25) records of each
 * kind. Taking a place and checking the limit happen in one database update, so
 * requests sent at the same moment cannot all slip under it. A create that does
 * not succeed gives its place back.
 *
 * An account keeps at most ACCOUNT_RECORDS_MOST (100,000) records of every
 * kind together (accountRecords). Its records are counted, not places taken,
 * so creates sent at the same moment can go a few over: fine for a limit that
 * keeps the disk from filling.
 */
export const quota =
  (Model: RecordModel, label: string) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user;
    if (!user) return next();
    const refusal = await makeRoom(user, Model, label);
    if (refusal) {
      res.status(403).json(refusal);
      return;
    }
    if (user.guest) {
      res.once('finish', () => {
        if (res.statusCode !== 200) void giveBack(user._id, Model);
      });
    }
    next();
  };

/**
 * Room for one more record of a kind, as quota checks it, for a record put
 * back from the Trash too. Resolves with the refusal to send, or null when
 * there is room; a trial's place is then taken, and given back with giveBack
 * if the record is not saved after all.
 */
export const makeRoom = async (
  user: { _id: Types.ObjectId; id?: string; guest?: boolean | null },
  Model: RecordModel,
  label: string
): Promise<ReturnType<typeof say> | null> => {
  if (!user.guest) {
    const most = maxAccountRecords();
    return (await accountRecords(String(user._id), most)) >= most ? say('account-limit', { limit: most }) : null;
  }
  const field = countField(Model);
  const taken = await User.updateOne(
    { _id: user._id, guest: true, $or: [{ [field]: { $exists: false } }, { [field]: { $lt: maxRecords() } }] },
    { $inc: { [field]: 1 } }
  );
  return taken.modifiedCount ? null : say('trial-limit', { limit: maxRecords(), label });
};

/** After a guest's record is deleted (or its create failed): frees its place. */
export const giveBack = (userId: Types.ObjectId, Model: RecordModel): Promise<unknown> =>
  User.updateOne(
    { _id: userId, guest: true, [countField(Model)]: { $gt: 0 } },
    { $inc: { [countField(Model)]: -1 } }
  ).catch(() => undefined);
