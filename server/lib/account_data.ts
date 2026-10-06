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

/** Resolves with whether there was an account to delete. */
export const deleteAccount = async (userId: Id): Promise<boolean> => {
  const id = String(userId);
  // The records go first, so if one delete fails the account is still there and
  // a retry finishes the job; nothing is left without an owner.
  await Promise.all([
    ...OWNED_MODELS.map((Model) => Model.deleteMany({ ownedBy: id })),
    PasswordReset.deleteMany({ userId: id })
  ]);
  const result = await User.deleteOne({ _id: id });
  return result.deletedCount === 1;
};
