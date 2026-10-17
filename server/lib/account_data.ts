// Removes an account with everything saved in it: for "Delete my account",
// "Discard trial", and the sweeper that removes expired trials. Each removal is
// written to the deletion log first (models/deletion.ts), so that a restored
// backup can be put right: reapplyDeletions removes those accounts again.
import type { Types } from 'mongoose';
import AccessToken from '../models/access_token.ts';
import Activity from '../models/activity.ts';
import Additive from '../models/additive.ts';
import Advice from '../models/advice.ts';
import AuthChallenge from '../models/auth_challenge.ts';
import Deletion from '../models/deletion.ts';
import Firing from '../models/firing.ts';
import Material from '../models/material.ts';
import Note from '../models/note.ts';
import EmailToken from '../models/email_token.ts';
import PasswordReset from '../models/password_reset.ts';
import PendingSignIn from '../models/pending_sign_in.ts';
import Recipe from '../models/recipe.ts';
import RecordVersion from '../models/record_version.ts';
import Trash from '../models/trash.ts';
import User, { type UserFields } from '../models/user.ts';
import regions from '../../lib/regions/index.js';
import type { RecordModel } from './guest_limits.ts';

type Id = string | Types.ObjectId;

/** What is left to know of an account once it is deleted: where to confirm it, and in which language. */
export interface DeletedAccount {
  email: string;
  guest?: boolean;
  emailUnverified?: boolean;
  preferences?: { language?: string };
}

// Collections whose records belong to a user (ownedBy) and go when the account does.
export const OWNED_KINDS: Record<string, RecordModel> = {
  additives: Additive,
  advice: Advice,
  firing: Firing,
  materials: Material,
  notes: Note,
  recipes: Recipe,
  trash: Trash
};
/**
 * Also the user's (ownedBy), but not records they keep: the earlier versions
 * of their records and the activity log. They go, and move from a trial,
 * with the account. Access tokens are the account's by userId; a trial has none.
 */
const OWNED_HISTORY: RecordModel[] = [RecordVersion, Activity];
const OWNED_MODELS: RecordModel[] = [...Object.values(OWNED_KINDS), ...OWNED_HISTORY];
// Accounts removed at a time when the log is re-applied.
const BATCH = 500;

/**
 * The currency an account's prices are in, as far as the server can tell: the
 * one chosen, or the region's; '' when neither is set, and the browser's
 * format decides (lib/regions currencyFor).
 */
const currencyOf = (user: Pick<UserFields, 'preferences'> | null): string =>
  user?.preferences?.currency || regions.regionFor(user?.preferences?.region)?.currency || '';

/**
 * A trial's prices join the account's, for materials the account has no price
 * for, when both are in the same currency: prices are never converted, and
 * mixed currencies would make every cost wrong. An account with no prices and
 * no chosen currency or region takes the trial's currency with them, so the numbers keep
 * their meaning. Otherwise the trial's prices go with it; resolves with how
 * many were not copied for being in another currency.
 */
const mergePrices = async (trialId: Id, accountId: Id): Promise<number> => {
  const fields = { prices: 1, 'preferences.currency': 1, 'preferences.region': 1 };
  const [trial, account] = await Promise.all([
    User.findById(trialId, fields).lean(),
    User.findById(accountId, fields).lean()
  ]);
  if (!trial?.prices?.length || !account) return 0;
  const trialCurrency = currencyOf(trial);
  const adopts = !account.prices?.length && currencyOf(account) === '' && trialCurrency !== '';
  if (!adopts && trialCurrency !== currencyOf(account)) return trial.prices.length;
  const priced = new Set((account.prices ?? []).map((price) => price.key));
  const added = trial.prices.filter((price) => !priced.has(price.key));
  if (!added.length && !adopts) return 0;
  await User.updateOne(
    { _id: accountId },
    {
      ...(added.length && { $push: { prices: { $each: added.map(({ key, perKg }) => ({ key, perKg })) } } }),
      ...(adopts && { $set: { 'preferences.currency': trialCurrency } })
    }
  );
  return 0;
};

/**
 * Moves a trial's records into an account and removes the trial; resolves with
 * how many records moved and how many of the trial's prices were not copied
 * (another currency). Their earlier versions and activity lines move too,
 * but are not counted: they are not records the person made. Its prices join
 * the account's (mergePrices); the prices go with the account, in the User
 * document, when it is deleted.
 */
export const mergeTrial = async (trialId: Id, accountId: Id): Promise<{ records: number; pricesSkipped: number }> => {
  const move = (Model: RecordModel) =>
    Model.updateMany({ ownedBy: String(trialId) }, { $set: { ownedBy: String(accountId) } });
  const [records, , pricesSkipped] = await Promise.all([
    Promise.all(Object.values(OWNED_KINDS).map(move)),
    Promise.all(OWNED_HISTORY.map(move)),
    mergePrices(trialId, accountId)
  ]);
  await deleteAccount(trialId);
  return { records: records.reduce((count, result) => count + result.modifiedCount, 0), pricesSkipped };
};

/** Removes the records of these users; resolves with how many. */
const deleteRecords = async (ids: string[]): Promise<number> => {
  const results = await Promise.all([
    ...OWNED_MODELS.map((Model) => Model.deleteMany({ ownedBy: { $in: ids } })),
    PasswordReset.deleteMany({ userId: { $in: ids } }),
    EmailToken.deleteMany({ userId: { $in: ids } }),
    // Two-step sign-in in progress; the factors themselves are in the User document.
    AuthChallenge.deleteMany({ userId: { $in: ids } }),
    PendingSignIn.deleteMany({ userId: { $in: ids } }),
    // Personal access tokens and OAuth grants.
    AccessToken.deleteMany({ userId: { $in: ids } })
  ]);
  return results.reduce((count, result) => count + result.deletedCount, 0);
};

/**
 * Removes these accounts with their records: the one way an account is deleted,
 * when it is asked for and when the log is re-applied. The records go first, so
 * if one delete fails the account is still there and a retry finishes the job;
 * nothing is left without an owner.
 */
const removeAccounts = async (ids: string[]): Promise<{ accounts: number; records: number }> => {
  const records = await deleteRecords(ids);
  const accounts = (await User.deleteMany({ _id: { $in: ids } })).deletedCount;
  return { accounts, records };
};

/** Resolves with the account it deleted, or null if there was none. */
export const deleteAccount = async (userId: Id): Promise<DeletedAccount | null> => {
  const id = String(userId);
  const user = await User.findById(id)
    .select({ email: 1, guest: 1, emailUnverified: 1, 'preferences.language': 1 })
    .lean();
  if (!user) return null;
  // Logged before anything goes: an account logged but not yet deleted is
  // deleted when the log is re-applied, but one deleted and not logged would
  // come back with a backup.
  await Deletion.create({ userId: user._id });
  await removeAccounts([id]);
  return user;
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
  await Deletion.create({ userId });
  await deleteRecords([String(userId)]);
  return true;
};

/**
 * Deletes again every account in the deletion log, with its records, the same
 * way they were deleted the first time: after a backup is restored, before the
 * app serves anyone. Safe to repeat. Resolves with how many accounts and
 * records were back.
 */
export const reapplyDeletions = async (): Promise<{ accounts: number; records: number }> => {
  const removed = { accounts: 0, records: 0 };
  const remove = async (ids: string[]) => {
    const { accounts, records } = await removeAccounts(ids);
    removed.accounts += accounts;
    removed.records += records;
  };
  let ids: string[] = [];
  for await (const { userId } of Deletion.find().select({ userId: 1 }).lean().cursor()) {
    ids.push(String(userId));
    if (ids.length === BATCH) {
      await remove(ids);
      ids = [];
    }
  }
  if (ids.length) await remove(ids);
  return removed;
};
