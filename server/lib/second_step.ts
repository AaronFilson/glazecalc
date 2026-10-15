// The pending second step at sign-in (docs/mfa-plan.md, item 9 and decision
// 2).
//
// When the password matches and MFA is on, GET /api/signin sets no session.
// It answers 200 with say('second-step', undefined, { methods, pending,
// expiresAt, passkeyOptions? }) (lib/mfa.d.ts SecondStepResponse). `pending` is
// a JWT signed with APP_SECRET, HS256: { sub: user id, tv: tokenVersion, jti:
// random id, typ: 'second-step' }, audience 'glazecalc:second-step', expiring
// after SECOND_STEP_MINUTES. It has no `id` claim, so jwtAuth never takes it as
// a sign-in (and jwtAuth refuses any token with an audience or a type). The
// page keeps it in memory and sends it with POST /api/signin/second-step;
// there is no cookie, so a reload means the password again.
//
// The PendingSignIn record (server/models/pending_sign_in.ts), found by the
// jti, makes it single use and counts tries: after SECOND_STEP_TRIES the
// password must be entered again. A changed tokenVersion (a reset in between)
// ends it.
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { HydratedDocument, Types } from 'mongoose';
import { SECOND_STEP_MINUTES, SECOND_STEP_TRIES } from '../../lib/mfa.js';
import * as accountMail from './account_mail.ts';
import appSecret from './app_secret.ts';
import * as factors from './factors.ts';
import * as log from './log.ts';
import type { MessageCode } from './messages.ts';
import * as webauthn from './webauthn.ts';
import PendingSignInModel, { type PendingSignInFields } from '../models/pending_sign_in.ts';
import User, { mfaOn, type UserDocument } from '../models/user.ts';

export type PendingSignIn = HydratedDocument<PendingSignInFields>;

/** The pending token's audience and type: nothing else signed with APP_SECRET has them. */
export const AUDIENCE = 'glazecalc:second-step';
export const TYPE = 'second-step';

/**
 * The factor checks the sign-in routes call (server/lib/factors.ts and
 * server/lib/webauthn.ts, stream A), through one object so the route tests can
 * stand in for them. Nothing but the tests changes it.
 */
export const checks = {
  checkFactor: factors.checkFactor,
  authenticationOptions: webauthn.authenticationOptions,
  challengeOf: webauthn.challengeOf,
  accountOf: webauthn.accountOf,
  verifyAuthentication: webauthn.verifyAuthentication
};

/**
 * Starts a pending sign-in for a user whose password matched: writes the
 * record and resolves with the token for the page and when it expires.
 * `passkeyChallenge`: the challenge of the passkeyOptions sent with it.
 */
export const begin = async (
  user: UserDocument,
  options: { keep: boolean; trialId?: Types.ObjectId; passkeyChallenge?: string }
): Promise<{ token: string; expiresAt: Date }> => {
  const tokenId = crypto.randomBytes(16).toString('base64url');
  // Whole seconds, so the token's exp and the record's expiry are the same moment.
  const expiresAt = new Date((Math.floor(Date.now() / 1000) + SECOND_STEP_MINUTES * 60) * 1000);
  const tokenVersion = user.tokenVersion || 0;
  await PendingSignInModel.create({
    tokenId,
    userId: user._id,
    tokenVersion,
    keep: options.keep,
    ...(options.trialId && { trialId: options.trialId }),
    ...(options.passkeyChallenge && { challenge: options.passkeyChallenge }),
    attempts: 0,
    expiresAt
  });
  const token = jwt.sign(
    { sub: String(user._id), tv: tokenVersion, typ: TYPE, exp: expiresAt.getTime() / 1000 },
    appSecret,
    { algorithm: 'HS256', audience: AUDIENCE, jwtid: tokenId }
  );
  return { token, expiresAt };
};

type Loaded = { ok: true; pending: PendingSignIn; user: UserDocument } | { ok: false; code: MessageCode };
const expired: Loaded = { ok: false, code: 'second-step-expired' };

/**
 * The pending sign-in a token names, and its user (loaded with mfa, without the
 * password), or why it cannot go on: 'second-step-expired' (bad or expired
 * token, no record, used, MFA no longer on, or tokenVersion changed) or
 * 'second-step-tries'.
 */
export const load = async (token: unknown): Promise<Loaded> => {
  if (typeof token !== 'string' || !token || token.length > 2048) return expired;
  let claims: string | jwt.JwtPayload;
  try {
    claims = jwt.verify(token, appSecret, { algorithms: ['HS256'], audience: AUDIENCE });
  } catch {
    return expired;
  }
  if (
    typeof claims === 'string' ||
    claims.typ !== TYPE ||
    typeof claims.sub !== 'string' ||
    typeof claims.jti !== 'string' ||
    typeof claims.tv !== 'number'
  ) {
    return expired;
  }
  const pending = await PendingSignInModel.findOne({ tokenId: claims.jti });
  if (!pending || pending.usedAt || !(pending.expiresAt > new Date())) return expired;
  // The token and the record must agree: a token is only ever good for its own record.
  if (String(pending.userId) !== claims.sub || pending.tokenVersion !== claims.tv) return expired;
  if (pending.attempts >= SECOND_STEP_TRIES) return { ok: false, code: 'second-step-tries' };
  const user = await User.findById(pending.userId, { password: 0 });
  // A reset or a sign-out everywhere since the password step ends it, as does
  // MFA being turned off (which raises tokenVersion too).
  if (!user || user.guest || (user.tokenVersion || 0) !== pending.tokenVersion || !mfaOn(user)) return expired;
  return { ok: true, pending, user };
};

/**
 * Counts a try, atomically, before its factor is checked, so tries sent at the
 * same moment are all counted. Resolves false when SECOND_STEP_TRIES were
 * already used (or the record has ended), and then the factor is not checked.
 * Updates pending.attempts.
 */
export const countTry = async (pending: PendingSignIn): Promise<boolean> => {
  const counted = await PendingSignInModel.findOneAndUpdate(
    { _id: pending._id, usedAt: null, expiresAt: { $gt: new Date() }, attempts: { $lt: SECOND_STEP_TRIES } },
    { $inc: { attempts: 1 } },
    { returnDocument: 'after' }
  );
  if (!counted) return false;
  pending.attempts = counted.attempts;
  return true;
};

/** Whether a pending sign-in has no tries left. */
export const triesUsed = (pending: PendingSignIn): boolean => pending.attempts >= SECOND_STEP_TRIES;

/** Ends the pending sign-in, atomically; resolves false if it was already used (a race) or has expired. */
export const finish = async (pending: PendingSignIn): Promise<boolean> => {
  const now = new Date();
  const result = await PendingSignInModel.updateOne(
    { _id: pending._id, usedAt: null, expiresAt: { $gt: now } },
    { $set: { usedAt: now } }
  );
  return result.modifiedCount === 1;
};

/**
 * A sign-in that passed a factor (the second step, or a passkey on its own), or
 * a change on the account page confirmed with one (server/routes/mfa_routes.ts),
 * shows the owner still has a working factor, so it cancels a pending request
 * to turn two-step sign-in off (server/clear_mfa.ts, docs/mfa-plan.md item 15):
 * a later --clear is refused until --notify is run again. This also defeats a
 * clear request someone else made. One atomic $unset; the log line names no one.
 */
export const cancelClearRequest = async (userId: Types.ObjectId): Promise<void> => {
  const result = await User.updateOne(
    { _id: userId, 'mfa.clearRequestedAt': { $exists: true } },
    { $unset: { 'mfa.clearRequestedAt': 1 } }
  );
  if (result.modifiedCount === 1) {
    log.info('A sign-in or confirmation with a factor cancelled a request to turn two-step sign-in off', {
      code: 'MFA_CLEAR_CANCELLED'
    });
  }
};

/** At most one "second step not finished" email per account in this long. */
export const UNFINISHED_NOTICE_HOURS = 24;

/**
 * Someone entered the account's password but did not get through the second
 * step: a pending sign-in ran out of tries, or the account went over
 * limits.secondStepAccount. Emails the owner to change the password, at most
 * once in UNFINISHED_NOTICE_HOURS: the time is kept on the account
 * (mfa.unfinishedNoticeAt) and claimed with one atomic update, so tries at the
 * same moment send one email. Only to a confirmed address (noticeMfa). Never
 * rejects; the email names no address or place the tries came from.
 */
export const noticeUnfinished = async (userId: Types.ObjectId | string): Promise<void> => {
  try {
    const now = new Date();
    const since = new Date(now.getTime() - UNFINISHED_NOTICE_HOURS * 60 * 60 * 1000);
    const user = await User.findOneAndUpdate(
      {
        _id: userId,
        guest: { $ne: true },
        emailUnverified: { $ne: true },
        mfa: { $exists: true },
        $or: [{ 'mfa.unfinishedNoticeAt': { $exists: false } }, { 'mfa.unfinishedNoticeAt': { $lte: since } }]
      },
      { $set: { 'mfa.unfinishedNoticeAt': now } },
      { projection: { email: 1, emailUnverified: 1, guest: 1, preferences: 1 } }
    );
    if (user) accountMail.noticeMfa(user, { kind: 'second-step-unfinished' });
  } catch (err) {
    log.error('Could not note an unfinished second step', { code: log.codeOf(err) });
  }
};
