// Wrong codes from an authenticator app, per account, from any address
// (docs/mfa-plan.md, item 9; the owner's decision of 2026-10-14: people
// should not be guessing often). After a round of CODE_ROUND wrong codes,
// codes are refused for an hour; after the next round, for a day; after every
// round from then on, for a week.
//
// Only codes count, and only codes are refused: a 6-digit code can be
// guessed, a recovery code (50 random bits) or a passkey cannot. So while
// codes are refused the owner can still sign in, and make changes on the
// account page, with a passkey or a recovery code; the refusal and the email
// say so. The other guard on those is the pending sign-in's own tries and the
// limits per address.
//
// What counts is kept on the account (mfa.codeGuesses), so a deploy or a
// restart does not forget it, and each try is counted before its code is
// checked: tries sent at the same moment cannot get past a round. A right
// code clears the round's count (it was the owner), and when it was the
// round's last try, the refusal it set too. Two things start everything
// again: a new password or anything else that raises the account's
// tokenVersion (the other person no longer has the password to try codes
// with), and FORGET_DAYS without a wrong code.
//
// Guessing, then, is CODE_ROUND tries an hour, a day, and then a week: about
// 30 in the first nine days and 10 a week after, some 540 in a year. With 3
// codes right at any moment, each try is right 3 times in a million, so a
// year of it succeeds about 0.16% of the time.
import type { Types } from 'mongoose';
import User, { type CodeGuesses } from '../models/user.ts';

/** Wrong codes in a round. */
export const CODE_ROUND = 10;

/** How long codes are refused after the first round, the second, and every one after. */
export const CODE_LOCKS = [
  { wait: 'hour', ms: 60 * 60 * 1000 },
  { wait: 'day', ms: 24 * 60 * 60 * 1000 },
  { wait: 'week', ms: 7 * 24 * 60 * 60 * 1000 }
] as const;

export type Wait = (typeof CODE_LOCKS)[number]['wait'];

/** Days without a wrong code after which the rounds start again from the first. */
export const FORGET_DAYS = 30;

const lockAfter = (rounds: number) => CODE_LOCKS[Math.min(Math.max(rounds, 1), CODE_LOCKS.length) - 1]!;

/** The count as it stands for this tokenVersion: nothing, when it is another's or forgotten. */
export const current = (stored: CodeGuesses | undefined, version: number, now: Date): CodeGuesses => {
  const forgotten = new Date(now.getTime() - FORGET_DAYS * 24 * 60 * 60 * 1000);
  if (!stored || stored.version !== version || !(stored.at && stored.at > forgotten))
    return { version, wrong: 0, rounds: 0 };
  return { version, wrong: stored.wrong, rounds: stored.rounds, at: stored.at, lockedUntil: stored.lockedUntil };
};

/** The count after one more wrong code; the last of a round refuses codes for a while. */
export const afterWrong = (state: CodeGuesses, now: Date): CodeGuesses => {
  const wrong = state.wrong + 1;
  if (wrong < CODE_ROUND) return { ...state, wrong, at: now };
  const rounds = state.rounds + 1;
  return {
    version: state.version,
    wrong: 0,
    rounds,
    at: now,
    lockedUntil: new Date(now.getTime() + lockAfter(rounds).ms)
  };
};

/** A counted try: what to settle once the code is checked. */
export interface CodeTry {
  userId: Types.ObjectId;
  /** mfa.codeGuesses.n after this try, so settling it changes only what this try wrote. */
  n: number;
  /** The count before this try. */
  before: CodeGuesses;
  /** Set when this try was the last of a round: codes are refused from now. */
  locked?: { wait: Wait };
}

export type Taken =
  | { ok: true; codeTry: CodeTry }
  | { ok: false; code: 'second-step-account-limit'; params: { wait: Wait } }
  | { ok: false; code: 'second-step-busy' };

/**
 * Counts a code try against the account, before the code is checked: refused
 * ('second-step-account-limit', with how long codes are refused at most) while
 * a round's refusal lasts. A compare-and-set on mfa.codeGuesses.n, so tries at
 * the same moment are each counted once; 'second-step-busy' only if it keeps
 * losing that race.
 */
export const take = async (userId: Types.ObjectId): Promise<Taken> => {
  for (let i = 0; i < 5; i++) {
    const now = new Date();
    const user = await User.findById(userId, { tokenVersion: 1, 'mfa.codeGuesses': 1 }).lean();
    const stored = user?.mfa?.codeGuesses;
    const state = current(stored, user?.tokenVersion || 0, now);
    if (state.lockedUntil && state.lockedUntil > now) {
      return { ok: false, code: 'second-step-account-limit', params: { wait: lockAfter(state.rounds).wait } };
    }
    const n = (stored?.n ?? 0) + 1;
    const next = { ...afterWrong(state, now), n };
    const written = await User.updateOne(
      { _id: userId, mfa: { $exists: true }, 'mfa.codeGuesses.n': stored?.n ?? { $exists: false } },
      { $set: { 'mfa.codeGuesses': next } }
    );
    if (written.modifiedCount === 1) {
      return {
        ok: true,
        codeTry: {
          userId,
          n,
          before: state,
          ...(next.wrong === 0 && { locked: { wait: lockAfter(next.rounds).wait } })
        }
      };
    }
    // Two-step sign-in was turned off in between: there is nothing to count.
    if (!(await User.exists({ _id: userId, mfa: { $exists: true } }))) {
      return { ok: true, codeTry: { userId, n, before: state } };
    }
  }
  return { ok: false, code: 'second-step-busy' };
};

/**
 * The code was right: it was the owner, so the round's count goes, and so does
 * a refusal this try set. Only while no other try has been counted since.
 */
export const right = async (codeTry: CodeTry): Promise<void> => {
  await User.updateOne(
    { _id: codeTry.userId, 'mfa.codeGuesses.n': codeTry.n },
    { $set: { 'mfa.codeGuesses': { ...codeTry.before, wrong: 0, n: codeTry.n + 1 } } }
  );
};

/**
 * Whether a body's factor is a code to count: a code and no other factor (other
 * fields, such as the password, do not matter), not empty (an empty one is
 * 'code-needed', no guess).
 */
export const isCodeTry = (body: unknown): boolean => {
  if (!body || typeof body !== 'object') return false;
  const { code, recoveryCode, passkey } = body as Record<string, unknown>;
  return typeof code === 'string' && code.trim() !== '' && recoveryCode === undefined && passkey === undefined;
};
