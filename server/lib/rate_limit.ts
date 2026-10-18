import type { Request, Response } from 'express';
import { type Options, rateLimit } from 'express-rate-limit';
import { type MessageCode, say } from './messages.ts';
import { accessTokenIn, checkAccessToken } from './token_auth.ts';

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
  limit: number | ((req: Request) => number),
  code: MessageCode,
  more: Partial<Pick<Options, 'keyGenerator' | 'skipSuccessfulRequests' | 'requestWasSuccessful' | 'handler'>> & {
    skip?: (req: Request, res: Response) => boolean | Promise<boolean>;
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
    skip: (req, res) => process.env.RATE_LIMITS === 'off' || (skip ? skip(req, res) : false)
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
/**
 * Provider sign-in (server/routes/oauth_routes.ts): starting one, the
 * provider's callback, and the page finishing it. Each start writes a short
 * record and each callback calls the provider, so they are bounded; loose,
 * for the many people behind one address.
 */
export const oauth = limiter(15, 100, 'too-many-sign-ins');
export const guest = limiter(60, 10, 'too-many-trials');
export const forgotPassword = limiter(15, 5, 'too-many-resets');
export const resetPassword = limiter(15, 10, 'too-many-attempts');
export const emailLinks = limiter(15, 5, 'too-many-email-links');
export const confirmEmail = limiter(15, 10, 'too-many-attempts');
/**
 * Password changes and the account page's other changes, per address: refusals
 * only, so one signed-in account making its own changes at a shared address
 * (a VPN exit, a school) does not use the count up for everyone there.
 */
export const changePassword = limiter(15, 10, 'too-many-attempts', { skipSuccessfulRequests: true });

/**
 * For routes that check the signed-in user's current password (changing the
 * email or the password, deleting the account), after jwtAuth. Counted per
 * account, not per address, so someone holding a stolen session cannot guess
 * the password from many addresses. One count for all three routes.
 */
export const passwordCheck = limiter(15, 10, 'too-many-attempts', {
  keyGenerator: (req) => 'user:' + String(req.user?._id)
});

/**
 * Access tokens (server/lib/token_auth.ts) that do not work, per address:
 * only requests that carry one are counted, and only those refused with 401.
 * A token that works is checked first and never counted or held up, so
 * someone sending bad tokens from a shared address (a VPN exit, a school)
 * cannot stop the scripts of others there. Guessing tokens (a 2^256 search;
 * the checksum turns away made-up ones before the database is asked) stops
 * quickly: once over, every token that does not work gets 429.
 */
export const accessTokens = limiter(15, 30, 'too-many-tokens', {
  skip: async (req) => {
    const token = accessTokenIn(req);
    return !token || (await checkAccessToken(req, token)) !== null;
  },
  requestWasSuccessful: (_req, res) => res.statusCode !== 401,
  skipSuccessfulRequests: true
});

/**
 * Records moved to the Trash with an access token (DELETE /api/<kind>/delete/:id),
 * per token: plenty for a script tidying up, too few for one gone wrong to
 * clear out an account before anyone notices. The web session is not counted.
 * After requireScope, which says which token it is.
 */
export const tokenDeletes = limiter(60, 100, 'too-many-deletes', {
  skip: (req) => !req.access || req.access.via === 'session',
  keyGenerator: (req) => 'token-deletes:' + (req.access && 'tokenId' in req.access ? req.access.tokenId : '')
});

/**
 * Every request made with an access token (server/lib/require_scope.ts: the
 * record, Trash and firing-link routes), per account, whichever of its tokens
 * is used: 120 a minute and 5,000 a day (TOKEN_LIMITS), fewer than the MCP
 * endpoint allows a token, since these routes write records. Each change keeps
 * a version and writes the activity log, so a script gone wrong is stopped
 * before it does much. The web session is not counted. tokenDeletes still
 * bounds deletes on top.
 */
export const TOKEN_LIMITS = { minute: 120, day: 5000 } as const;
const tokenKey = (req: Request): string => 'token:' + String(req.user?._id);
const viaToken = (req: Request): boolean => Boolean(req.access) && req.access?.via !== 'session';
export const tokenMinute = limiter(1, () => TOKEN_LIMITS.minute, 'too-many-attempts', {
  skip: (req) => !viaToken(req),
  keyGenerator: tokenKey
});
export const tokenDay = limiter(24 * 60, () => TOKEN_LIMITS.day, 'too-many-attempts', {
  skip: (req) => !viaToken(req),
  keyGenerator: (req) => tokenKey(req) + ':day'
});

/**
 * Recipes opened by share link (GET /api/shared/recipe), per address: loose,
 * for a class opening one teacher's links behind a school's one address, but
 * not without end, since anyone may ask.
 */
export const sharedViews = limiter(15, 300, 'too-many-shared-views');

/**
 * Share links that open nothing, per address: a secret is 256 bits, so this
 * only stops someone wasting the server's time; a class with a mistyped link
 * has room to spare.
 */
export const sharedMisses = limiter(15, 50, 'too-many-shared-views', {
  requestWasSuccessful: (_req, res) => res.statusCode !== 404,
  skipSuccessfulRequests: true
});

// Two-step sign-in (docs/mfa-plan.md, item 9). The guard on guessing codes
// is per account and kept on the account, not here: server/lib/code_lock.ts.

/**
 * Second steps per address, at sign-in only (POST /api/signin/second-step),
 * counted only for requests that carry a pending sign-in that loads, so junk
 * from someone else at a shared address never counts against the people
 * there. A finished sign-in is not counted either. The account page's checks
 * have limits of their own (mfaSetupAccount, mfaChallenges), per account, so
 * a signed-in account cannot use up the second steps of everyone at its
 * address.
 */
export const secondStep = limiter(15, 20, 'too-many-codes', {
  skipSuccessfulRequests: true,
  // 409 second-step-busy: turned away while another try is checked, never checked itself.
  requestWasSuccessful: (req, res) => (res.statusCode < 400 && req.mfaUserId !== undefined) || res.statusCode === 409
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
 * Wrong first codes from a new authenticator app (POST /api/mfa/totp) per
 * account: not counted with sign-in's codes (server/lib/code_lock.ts), so a
 * stolen session alone cannot use them up, or set off the "someone entered
 * your password" email. Only requests for a setup that exists are counted
 * (the route checks the setupId first), and each setup also ends after 5
 * wrong codes.
 */
export const mfaSetupAccount = limiter(15, 10, 'too-many-codes', {
  keyGenerator: (req) => 'mfa-setup:' + String(req.user?._id),
  skipSuccessfulRequests: true
});

/**
 * The account page's passkey challenges and their answers (POST
 * /api/mfa/confirm/options, /api/mfa/passkeys/options, /api/mfa/passkeys),
 * per account, every request: far more than a person adding or confirming
 * with a passkey needs, and nothing to do with sign-in or with other people
 * at the same address.
 */
export const mfaChallenges = limiter(15, 30, 'too-many-attempts', {
  keyGenerator: (req) => 'mfa-challenge:' + String(req.user?._id)
});

/**
 * The MCP endpoint (server/mcp/index.ts; docs/integrations-plan.md, items 23
 * and 31): requests a minute and a day. Without a token, per address: 60 a
 * minute and 2,000 a day, which an assistant working through a recipe stays
 * well under. With a working token, per account (whichever of its tokens is
 * used): 300 a minute and 20,000 a day, for an assistant that works through
 * many recipes at once with subagents; a token can be revoked, an address
 * cannot. The tools that fit amounts have a limit of their own on top
 * (server/mcp/common.ts countFit). After the token check, which says who is
 * calling (req.mcpCaller).
 */
const mcpKey = (req: Request): string => 'mcp:' + (req.mcpCaller?.key ?? 'unknown');
const withToken = (req: Request): boolean => Boolean(req.mcpCaller?.userId);
export const MCP_LIMITS = { minute: { anyone: 60, account: 300 }, day: { anyone: 2000, account: 20000 } } as const;
export const mcpMinute = limiter(
  1,
  (req) => (withToken(req) ? MCP_LIMITS.minute.account : MCP_LIMITS.minute.anyone),
  'too-many-mcp',
  { keyGenerator: mcpKey }
);
export const mcpDay = limiter(
  24 * 60,
  (req) => (withToken(req) ? MCP_LIMITS.day.account : MCP_LIMITS.day.anyone),
  'too-many-mcp',
  { keyGenerator: (req) => mcpKey(req) + ':day' }
);
