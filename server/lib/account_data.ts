// Removes an account with everything saved in it: for "Delete my account",
// "Discard trial", and the sweeper that removes expired trials.
import type { Types } from 'mongoose';
import Additive from '../models/additive.ts';
import Advice from '../models/advice.ts';
import Firing from '../models/firing.ts';
import Material from '../models/material.ts';
import Note from '../models/note.ts';
import PasswordReset from '../models/password_reset.ts';
import Recipe from '../models/recipe.ts';
import Trash from '../models/trash.ts';
import User from '../models/user.ts';
import type { RecordModel } from './guest_limits.ts';

type Id = string | Types.ObjectId;

// Collections whose records belong to a user (ownedBy) and go when the account does.
const OWNED_MODELS: RecordModel[] = [Additive, Advice, Firing, Material, Note, Recipe, Trash];

/**
 * Moves a trial's records into an account and removes the trial; resolves with
 * how many records moved.
 */
export const mergeTrial = async (trialId: Id, accountId: Id): Promise<number> => {
  const results = await Promise.all(
    OWNED_MODELS.map((Model) =>
      Model.updateMany({ ownedBy: String(trialId) }, { $set: { ownedBy: String(accountId) } })
    )
  );
  await deleteAccount(trialId);
  return results.reduce((count, result) => count + result.modifiedCount, 0);
};

const deleteRecords = (id: string): Promise<unknown> =>
  Promise.all([
    ...OWNED_MODELS.map((Model) => Model.deleteMany({ ownedBy: id })),
    PasswordReset.deleteMany({ userId: id })
  ]);

/** Resolves with whether there was an account to delete. */
export const deleteAccount = async (userId: Id): Promise<boolean> => {
  const id = String(userId);
  // The records go first, so if one delete fails the account is still there and
  // a retry finishes the job; nothing is left without an owner.
  await deleteRecords(id);
  const result = await User.deleteOne({ _id: id });
  return result.deletedCount === 1;
};

/**
 * Deletes a trial that ran out by `now`, with its records; resolves with
 * whether it did. Here the trial goes first, in the same step that checks it
 * is still a trial, so one claimed a moment ago (an account now, with its
 * records) is never deleted. If removing the records then fails, they are left
 * with no owner, where no one sees them: better than losing an account.
 */
export const deleteExpiredTrial = async (userId: Id, now: Date): Promise<boolean> => {
  const result = await User.deleteOne({ _id: userId, guest: true, expiresAt: { $lte: now } });
  if (result.deletedCount !== 1) return false;
  await deleteRecords(String(userId));
  return true;
};
