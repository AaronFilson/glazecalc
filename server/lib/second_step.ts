// The pending second step at sign-in (docs/mfa-plan.md, item 9 and decision
// 2). STREAM B implements this file; the signatures are the contract.
//
// When the password matches and MFA is on, GET /api/signin sets no session.
// It answers 200 with say('second-step', undefined, { methods, pending,
// expiresAt, passkeyOptions? }) (lib/mfa.d.ts SecondStepResponse). `pending` is
// a JWT signed with APP_SECRET, HS256: { sub: user id, tv: tokenVersion, jti:
// random id, typ: 'second-step' }, audience 'glazecalc:second-step', expiring
// after SECOND_STEP_MINUTES. It has no `id` claim, so jwtAuth never takes it as
// a sign-in. The page keeps it in memory and sends it with POST
// /api/signin/second-step; there is no cookie, so a reload means the password
// again.
//
// The PendingSignIn record (server/models/pending_sign_in.ts), found by the
// jti, makes it single use and counts wrong codes: after SECOND_STEP_TRIES the
// password must be entered again. A changed tokenVersion (a reset in between)
// ends it.
import type { MessageCode } from './messages.ts';
import type { UserDocument } from '../models/user.ts';
import type { PendingSignInFields } from '../models/pending_sign_in.ts';
import type { HydratedDocument, Types } from 'mongoose';

const notYet = (): never => {
  throw new Error('not implemented: server/lib/second_step.ts (stream B, docs/mfa-plan.md item 9)');
};

export type PendingSignIn = HydratedDocument<PendingSignInFields>;

/**
 * Starts a pending sign-in for a user whose password matched: writes the
 * record and resolves with the token for the page and when it expires.
 * `passkeyChallenge`: the challenge of the passkeyOptions sent with it.
 */
export const begin = (
  user: UserDocument,
  options: { keep: boolean; trialId?: Types.ObjectId; passkeyChallenge?: string }
): Promise<{ token: string; expiresAt: Date }> => notYet();

/**
 * The pending sign-in a token names, and its user (loaded with mfa), or why it
 * cannot go on: 'second-step-expired' (bad or expired token, no record, used,
 * or tokenVersion changed) or 'second-step-tries'.
 */
export const load = (
  token: unknown
): Promise<{ ok: true; pending: PendingSignIn; user: UserDocument } | { ok: false; code: MessageCode }> => notYet();

/** Counts a wrong try, atomically; resolves false once SECOND_STEP_TRIES are used. */
export const countTry = (pending: PendingSignIn): Promise<boolean> => notYet();

/** Ends the pending sign-in, atomically; resolves false if it was already used (a race). */
export const finish = (pending: PendingSignIn): Promise<boolean> => notYet();
