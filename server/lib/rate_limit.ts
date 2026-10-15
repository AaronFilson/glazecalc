import type { Request, Response } from 'express';
import { type Options, rateLimit } from 'express-rate-limit';
import { type MessageCode, say } from './messages.ts';
import * as secondStepNotice from './second_step.ts';

// Limits per client address, unless they say otherwise. In production nginx
// passes the address in X-Forwarded-For, which server/app.ts trusts for exactly
// one proxy hop. RATE_LIMITS=off turns them off; the test suites sign up many
// accounts from one address.
//
// One address is often many people: a VPN or Tor exit, iCloud Private Relay,
// a phone network's or a school's NAT. So the limits that guard sign-in count
// what a guesser does (wrong answers), not what everyone does, and one person
// sending junk cannot use up the others' tries.
//
// The counts are kept in the app's memory: a restart or a deploy starts them
// again (deploy/README.md).
const limiter = (
  minutes: number,
  limit: number,
  code: MessageCode,
  more: Partial<Pick<Options, 'keyGenerator' | 'skipSuccessfulRequests' | 'requestWasSuccessful' | 'handler'>> & {
    skip?: (req: Request, res: Response) => boolean;
  } = {}
) => {
  const { skip, ...rest } = more;
  return rateLimit({
    windowMs: minutes * 60 * 1000,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: say(code),
    ...rest,
    skip: (req, res) => process.env.RATE_LIMITS === 'off' || Boolean(skip?.(req, res))
  });
};

/**
 * Password sign-in (GET /api/signin): counts only the refused tries, so people
 * signing in from one shared address do not use up each other's; a right
 * password (signed in, or on to the second step) is not counted. signInAny
 * still bounds all of them.
 */
export const signIn = limiter(15, 20, 'too-many-sign-ins', { skipSuccessfulRequests: true });
/**
 * Every password sign-in, right or wrong, so that one address cannot make the
 * server check passwords without end (each check is slow on purpose,
 * server/lib/password.ts). Loose, for the many people behind one address.
 */
export const signInAny = limiter(15, 300, 'too-many-sign-ins');
/**
 * Passkey-first sign-in (POST /api/signin/passkey): its own count, so password
 * guessing from a shared address does not stop passkey sign-in there, and only
 * the refused tries count. Each try needs a challenge from passkeyOptions,
 * which bounds the rest.
 */
export const passkeySignIn = limiter(15, 20, 'too-many-sign-ins', { skipSuccessfulRequests: true });
/**
 * Passkey-first sign-in options (POST /api/signin/passkey/options): the page
 * asks for them on every sign-in page load where passkey autofill works, and
 * they start no session (the challenge expires unused), so they have a
 * lighter limit of their own rather than counting against signIn.
 */
export const passkeyOptions = limiter(15, 100, 'too-many-sign-ins');
export const signUp = limiter(60, 10, 'too-many-sign-ups');
export const guest = limiter(60, 10, 'too-many-trials');
export const forgotPassword = limiter(15, 5, 'too-many-resets');
export const resetPassword = limiter(15, 10, 'too-many-attempts');
export const emailLinks = limiter(15, 5, 'too-many-email-links');
export const confirmEmail = limiter(15, 10, 'too-many-attempts');
export const changePassword = limiter(15, 10, 'too-many-attempts');

/**
 * For routes that check the signed-in user's current password (changing the
 * email or the password, deleting the account), after jwtAuth. Counted per
 * account, not per address, so someone holding a stolen session cannot guess
 * the password from many addresses. One count for all three routes.
 */
export const passwordCheck = limiter(15, 10, 'too-many-attempts', {
  keyGenerator: (req) => 'user:' + String(req.user?._id)
});

// Two-step sign-in (docs/mfa-plan.md, item 9). There is no hard lockout, which
// a stranger could use to lock someone out. The real guard on guessing is
// secondStepAccount: 10 wrong answers per 15 minutes per account, from any
// address, is 960 a day; with 3 codes valid at a time, a guess at a 6-digit
// code is right 3 times in a million, so a day of guessing succeeds about
// 0.3% of the time (960 × 3 / 1,000,000). Right answers are not counted: one
// ends the sign-in, so they add no guesses, and someone who has the password
// cannot keep the owner out by spending the account's tries. Every try also
// needs a pending sign-in, and so the password.

/**
 * Second steps per address, counted only for requests that carry a pending
 * sign-in that loads (POST /api/signin/second-step) or a signed-in session
 * (the /api/mfa routes that check a code or a passkey), so junk from someone
 * else at a shared address never counts against the people there. A finished
 * sign-in is not counted either (req.mfaUserId is set only at sign-in).
 */
export const secondStep = limiter(15, 20, 'too-many-codes', {
  skipSuccessfulRequests: true,
  requestWasSuccessful: (req, res) => res.statusCode < 400 && req.mfaUserId !== undefined
});

/**
 * POST /api/signin/second-step with a pending token that does not load (made
 * up, expired, used, or out of tries): a count of its own, looser, so junk
 * cannot be sent without end, nor fill secondStep for the people behind the
 * same address. Skipped when the pending sign-in loaded
 * (res.locals.secondStep.ok).
 */
export const secondStepUnloaded = limiter(15, 100, 'too-many-codes', {
  skip: (_req, res) => Boolean((res.locals.secondStep as { ok?: boolean } | undefined)?.ok)
});

/**
 * Wrong second steps per account, from any address: after the pending sign-in
 * is loaded (req.mfaUserId), or behind jwtAuth (req.user). Only refusals
 * count. At sign-in, going over it tells the owner by email that someone has
 * the password (second_step.noticeUnfinished, at most once a day).
 */
export const secondStepAccount = limiter(15, 10, 'too-many-codes', {
  keyGenerator: (req) => 'mfa:' + String(req.mfaUserId ?? req.user?._id),
  skipSuccessfulRequests: true,
  handler: (req, res, _next, options) => {
    if (req.mfaUserId !== undefined) void secondStepNotice.noticeUnfinished(req.mfaUserId);
    res.status(options.statusCode).send(options.message);
  }
});
