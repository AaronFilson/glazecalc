// Turns off two-step sign-in for someone who has lost every factor and every
// recovery code (docs/mfa-plan.md, item 15). There is no route for this, so a
// stolen admin session cannot remove anyone's factors; the owner runs it in a
// Session Manager shell, and only for a request from the account's confirmed
// address after the requester has done a password reset (docs/data-requests.md).
// Both steps refuse while the address changed less than 30 days ago
// (emailChangedAt): someone who took over the account may have changed it,
// and then the confirmed address no longer shows who the owner is.
//
//   node server/clear_mfa.ts --notify <email>   tells the address it will be turned off in 7 days
//   node server/clear_mfa.ts --clear <email>    turns it off, once those 7 days have passed
//
// --clear removes the factors and recovery codes, raises tokenVersion (every
// device is signed out) and sends one notice that two-step sign-in is off. A
// password reset never does this. The output never shows the address or
// anything secret.
import mongoose from 'mongoose';
import * as accountMail from './lib/account_mail.ts';
import * as email from './lib/email.ts';
import AuthChallenge from './models/auth_challenge.ts';
import PendingSignIn from './models/pending_sign_in.ts';
import User, { mfaOn } from './models/user.ts';

/** Days between the notice and turning two-step sign-in off. */
export const WAIT_DAYS = 7;
const DAY = 24 * 60 * 60 * 1000;
/** Days after the address changed (emailChangedAt) before either step works. */
export const EMAIL_CHANGE_DAYS = 30;

export type Outcome =
  { ok: true; message: string; clearAfter?: Date } | { ok: false; message: string; clearAfter?: Date };

const findAccount = (address: string) =>
  User.findOne({ email: email.normalize(address), guest: { $ne: true } }).collation(email.collation);

/**
 * The refusal while the address changed less than EMAIL_CHANGE_DAYS ago, or
 * null. It says why and what to do instead, never the address.
 */
const recentEmailChange = (user: { emailChangedAt?: Date | null }, now: Date): Outcome | null => {
  const changed = user.emailChangedAt;
  if (!changed) return null;
  const allowedFrom = new Date(changed.getTime() + EMAIL_CHANGE_DAYS * DAY);
  if (now >= allowedFrom) return null;
  return {
    ok: false,
    message:
      `Refused: the account's email changed on ${changed.toISOString()}, less than ${EMAIL_CHANGE_DAYS} days ago, ` +
      'so a request from the new address does not show who the owner is. Verify the requester another way ' +
      '(docs/data-requests.md, "Turning off two-step sign-in") before doing anything for them. ' +
      `This script works again from ${allowedFrom.toISOString()}.`
  };
};

/**
 * --notify: records when the address was told (mfa.clearRequestedAt) and emails
 * it. Running it again starts the 7 days again.
 */
export const notify = async (address: string, now: Date = new Date()): Promise<Outcome> => {
  const user = await findAccount(address);
  if (!user) return { ok: false, message: 'No account has that email.' };
  if (!mfaOn(user)) return { ok: false, message: 'Two-step sign-in is not on for this account.' };
  // The request must come from a confirmed address (docs/data-requests.md).
  if (user.emailUnverified) return { ok: false, message: 'The account’s email is not confirmed: refused.' };
  const tooRecent = recentEmailChange(user, now);
  if (tooRecent) return tooRecent;
  const clearAfter = new Date(now.getTime() + WAIT_DAYS * DAY);
  await User.updateOne({ _id: user._id }, { $set: { 'mfa.clearRequestedAt': now } });
  // English unless the account chose a language the notice is written in (account_mail.ts).
  await accountMail.sendMfaClearNotice(user.email, clearAfter, user.preferences?.language ?? undefined);
  return { ok: true, message: `Notice sent. --clear works from ${clearAfter.toISOString()}.`, clearAfter };
};

/**
 * --clear: refused until WAIT_DAYS after --notify. Removes the factors and
 * recovery codes, raises tokenVersion, ends any pending sign-in or challenge,
 * and sends one notice that two-step sign-in is off.
 */
export const clear = async (address: string, now: Date = new Date()): Promise<Outcome> => {
  const user = await findAccount(address);
  if (!user) return { ok: false, message: 'No account has that email.' };
  if (!mfaOn(user)) return { ok: false, message: 'Two-step sign-in is not on for this account.' };
  const tooRecent = recentEmailChange(user, now);
  if (tooRecent) return tooRecent;
  const requested = user.mfa?.clearRequestedAt;
  if (!requested) return { ok: false, message: 'Run --notify first, then wait 7 days.' };
  const clearAfter = new Date(requested.getTime() + WAIT_DAYS * DAY);
  if (now < clearAfter) {
    return { ok: false, message: `Too soon: --clear works from ${clearAfter.toISOString()}.`, clearAfter };
  }
  // Only if the request is still the one checked above (a newer --notify starts
  // the wait again), and the address has not changed since.
  const result = await User.updateOne(
    { _id: user._id, 'mfa.clearRequestedAt': requested, email: user.email },
    { $unset: { mfa: 1 }, $inc: { tokenVersion: 1 } }
  );
  if (result.modifiedCount !== 1) return { ok: false, message: 'The account changed meanwhile; nothing done.' };
  await Promise.all([PendingSignIn.deleteMany({ userId: user._id }), AuthChallenge.deleteMany({ userId: user._id })]);
  accountMail.noticeMfa(user, { kind: 'mfa-off' });
  return { ok: true, message: 'Two-step sign-in is off, and every device is signed out.' };
};

/** Runs the script: resolves with the exit code. */
export const main = async (args: string[]): Promise<number> => {
  const [flag, address] = args;
  if ((flag !== '--notify' && flag !== '--clear') || !address || args.length !== 2) {
    console.error('Usage: node server/clear_mfa.ts --notify <email> | --clear <email>');
    return 2;
  }
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1/glazecalc_app_dev');
  try {
    const outcome = flag === '--notify' ? await notify(address) : await clear(address);
    (outcome.ok ? console.log : console.error)(outcome.message);
    return outcome.ok ? 0 : 1;
  } finally {
    await mongoose.disconnect();
  }
};

if (import.meta.main) process.exitCode = await main(process.argv.slice(2));
