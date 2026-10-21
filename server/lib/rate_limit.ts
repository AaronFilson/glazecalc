import type { NextFunction, Request, Response } from 'express';
import { ipKeyGenerator, MemoryStore, type Options, rateLimit } from 'express-rate-limit';
import { type MessageCode, say } from './messages.ts';
import { accessTokenIn, checkAccessToken, invalidToken } from './token_auth.ts';

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

/**
 * The network an IPv6 address counts with where everyone's requests together
 * have a ceiling (the token endpoint, apps registering themselves, MCP
 * without a token, app documents and keys fetched): its /48. A /48 is often
 * free (a tunnel broker, many server plans) and holds 256 /56s, so a count by
 * /56 there would let one person fill the ceiling for everyone. Elsewhere the
 * limits keep express-rate-limit's /56, one home or office.
 */
export const NETWORK_BITS = 48;
/** The key for a request's address: the address for IPv4, its /48 for IPv6. */
export const networkKey = (address: string | undefined): string =>
  address ? ipKeyGenerator(address, NETWORK_BITS) : 'unknown';

const limiter = (
  minutes: number,
  limit: number | ((req: Request) => number),
  code: MessageCode,
  more: Partial<
    Pick<
      Options,
      | 'keyGenerator'
      | 'skipSuccessfulRequests'
      | 'skipFailedRequests'
      | 'requestWasSuccessful'
      | 'handler'
      | 'store'
      | 'ipv6Subnet'
    >
  > & {
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
 * cannot stop the scripts of others there.
 *
 * Once over, a token that does not work is still answered 401 with its
 * challenge (`refuse`), never 429. An app takes a 401 as "refresh, or sign in
 * again", and a 429 as "wait": Claude's and ChatGPT's servers send every
 * person's expired tokens from a few addresses, so a 429 there would keep
 * everyone behind them from reconnecting. Guessing gains nothing either way
 * (a 2^256 search; the checksum turns away made-up personal tokens before the
 * database is asked).
 */
export const badTokenLimit = (refuse: (req: Request, res: Response) => void) =>
  limiter(15, 30, 'too-many-tokens', {
    skip: async (req) => {
      const token = accessTokenIn(req);
      return !token || (await checkAccessToken(req, token)) !== null;
    },
    requestWasSuccessful: (_req, res) => res.statusCode !== 401,
    skipSuccessfulRequests: true,
    handler: (req, res) => refuse(req, res)
  });
/** The bad-token limit for the record routes (/api): 401 with RFC 6750's challenge, saying to wait. */
export const accessTokens = badTokenLimit((_req, res) => invalidToken(res, 'too-many-tokens'));

/**
 * Records moved to the Trash with an access token (DELETE /api/<kind>/delete/:id,
 * and the MCP tool move_to_trash), per token: plenty for a script tidying up,
 * too few for one gone wrong to clear out an account before anyone notices.
 * The web session is not counted. After requireScope, which says which token
 * it is. The MCP tool counts in the same store (countTokenDelete).
 */
export const TOKEN_DELETES_PER_HOUR = 100;
const deletesStore = new MemoryStore();
const deletesKey = (tokenId: string): string => 'token-deletes:' + tokenId;
export const tokenDeletes = limiter(60, TOKEN_DELETES_PER_HOUR, 'too-many-deletes', {
  skip: (req) => !req.access || req.access.via === 'session',
  keyGenerator: (req) => deletesKey(req.access && 'tokenId' in req.access ? req.access.tokenId : ''),
  store: deletesStore
});

/**
 * Changes made with an access token (TOKEN_WRITE_LIMITS), per account,
 * whichever of its tokens is used and whether through the record routes
 * (server/lib/require_scope.ts, for every permission that writes) or the MCP
 * write tools (countTokenWrite): 60 a minute and 5,000 a day (owner decision,
 * 2026-10-19). Enough for an assistant saving a day's tests, too few for a
 * script gone wrong to bury the account's history before anyone notices: each
 * change keeps a version and writes the activity log. On top of the limits on
 * every token request (TOKEN_LIMITS, MCP_LIMITS), which still count changes
 * too. The web session is not counted.
 */
export const TOKEN_WRITE_LIMITS = { minute: 60, day: 5000 } as const;
const writesMinuteStore = new MemoryStore();
const writesDayStore = new MemoryStore();
const writesKey = (userId: string): string => 'token-writes:' + userId;

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
export const tokenWriteMinute = limiter(1, () => TOKEN_WRITE_LIMITS.minute, 'too-many-changes', {
  skip: (req) => !viaToken(req),
  keyGenerator: (req) => writesKey(String(req.user?._id)),
  store: writesMinuteStore
});
export const tokenWriteDay = limiter(24 * 60, () => TOKEN_WRITE_LIMITS.day, 'too-many-changes', {
  skip: (req) => !viaToken(req),
  keyGenerator: (req) => writesKey(String(req.user?._id)),
  store: writesDayStore
});

/**
 * Counts one change made through the MCP write tools against the account's
 * TOKEN_WRITE_LIMITS, in the same counts as the record routes; resolves false
 * once over, and the change is then not made. As a limiter does, a refused
 * change is counted in the minute, and not in the day.
 */
export const countTokenWrite = async (userId: string): Promise<boolean> => {
  if (process.env.RATE_LIMITS === 'off') return true;
  const key = writesKey(userId);
  if ((await writesMinuteStore.increment(key)).totalHits > TOKEN_WRITE_LIMITS.minute) return false;
  return (await writesDayStore.increment(key)).totalHits <= TOKEN_WRITE_LIMITS.day;
};

/** Counts one record moved to the Trash by the MCP tool against its token's TOKEN_DELETES_PER_HOUR; false once over. */
export const countTokenDelete = async (tokenId: string): Promise<boolean> => {
  if (process.env.RATE_LIMITS === 'off') return true;
  return (await deletesStore.increment(deletesKey(tokenId))).totalHits <= TOKEN_DELETES_PER_HOUR;
};

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

// The authorization server for AI assistants (server/oauth/, docs/adr/0024),
// per address unless they say otherwise. Its refusals are OAuth's shape,
// { error, error_description }, which the apps read.
const tooMany = (res: Response, code: MessageCode): void => {
  res.status(429).json({ error: 'too_many_requests', error_description: say(code).msg });
};
const oauthLimiter = (
  minutes: number,
  limit: Parameters<typeof limiter>[1],
  code: MessageCode,
  more: Parameters<typeof limiter>[3] = {}
) =>
  limiter(minutes, limit, code, {
    handler: (_req, res) => tooMany(res, code),
    ...more
  });

/**
 * Apps registering themselves (POST /oauth/register, DCR): 10 an hour from
 * one address (an IPv6 address counts with its whole /48, NETWORK_BITS, so
 * one /48 cannot use up the day's count), and OAUTH_REGISTRATIONS_A_DAY a
 * day from everyone together, so nobody can fill the database with apps. Only registrations
 * that were made count for the day: refused ones (bad metadata) use up
 * nothing of everyone's. Each one that nobody connects goes after 7 days
 * (server/oauth/adapter.ts). Why a day's count and not a ceiling on the apps
 * kept: docs/adr/0024, "Review fixes".
 */
export const OAUTH_REGISTRATIONS_A_DAY = 500;
export const oauthRegister = oauthLimiter(60, 10, 'too-many-registrations', { ipv6Subnet: NETWORK_BITS });
export const oauthRegisterAll = oauthLimiter(24 * 60, OAUTH_REGISTRATIONS_A_DAY, 'too-many-registrations', {
  keyGenerator: () => 'oauth-register-all',
  skipFailedRequests: true
});
/**
 * Starting a connection (GET /oauth/authorize, and its return from the
 * consent page): each start keeps a short record, and may fetch an app's
 * address (CIMD), so they are bounded; loose, for the many people behind one
 * address.
 */
export const oauthAuthorize = limiter(15, 100, 'too-many-oauth');
/**
 * The token endpoint (POST /oauth/token). Every refresh of everyone's
 * connection to Claude or ChatGPT comes from those apps' few servers, so a
 * count of every request per address would soon stop them all. A code or
 * refresh token that works proves its connection, so only what is refused is
 * counted (a guesser's requests look like that):
 *   - per address, an IPv6 one with its whole /48 (NETWORK_BITS),
 *     OAUTH_TOKEN_LIMITS.failures in 15 minutes (oauthTokenFailures);
 *   - from everyone together, CEILINGS.oauthTokenRefusals in 15 minutes
 *     (oauthTokenAll), so the work refusals make stays bounded whatever the
 *     addresses.
 * A 429 is not counted, so one account over its own count (countTokenGrant,
 * from server/oauth/provider.ts findAccount) uses up nothing of the others'.
 *
 * Once either count is over, a request whose code or refresh token the
 * server holds still goes on (grantOnRecord, set by server/oauth/provider.ts:
 * one read of the database by the token's id); only the others get 429,
 * before their app is looked up or its keys fetched. So filling the counts,
 * from however many addresses, turns away only requests that would have
 * failed, never a working connection's refresh or a code just given.
 */
export const OAUTH_TOKEN_LIMITS = { failures: 300, account: 100 } as const;
/**
 * The limits on everyone together (per minute for MCP without a token, per 15
 * minutes for refusals at the token endpoint). Read at each request, so the
 * tests can lower them; nothing else changes them.
 */
export const CEILINGS = { mcpAnyone: 3000, oauthTokenRefusals: 20000 };

let grantOnRecord = (_req: Request, _res: Response): Promise<boolean> => Promise.resolve(false);
/** Sets how the token endpoint's limits tell a request whose code or refresh token is held (server/oauth/provider.ts). */
export const whenGrantOnRecord = (check: (req: Request, res: Response) => Promise<boolean>): void => {
  grantOnRecord = check;
};

const refusalsOnly = (code: MessageCode) => ({
  skipSuccessfulRequests: true,
  requestWasSuccessful: (_req: Request, res: Response) => res.statusCode < 400 || res.statusCode === 429,
  handler: (req: Request, res: Response, next: NextFunction) => {
    grantOnRecord(req, res).then((held) => {
      if (!held) return tooMany(res, code);
      // Over the count, but a code or refresh token the server holds: on, as if under it.
      res.removeHeader('Retry-After');
      next();
    }, next);
  }
});
export const oauthTokenFailures = oauthLimiter(15, OAUTH_TOKEN_LIMITS.failures, 'too-many-oauth', {
  ...refusalsOnly('too-many-oauth'),
  ipv6Subnet: NETWORK_BITS
});
export const oauthTokenAll = oauthLimiter(15, () => CEILINGS.oauthTokenRefusals, 'too-many-oauth', {
  ...refusalsOnly('too-many-oauth'),
  keyGenerator: () => 'oauth-token-all'
});

// One account's codes and refresh tokens used at the token endpoint, in 15-minute windows.
const tokenGrants = new Map<string, { start: number; count: number }>();
const TOKEN_GRANT_WINDOW_MS = 15 * 60 * 1000;

/**
 * Counts one refresh token of an account used at the token endpoint; false
 * once over OAUTH_TOKEN_LIMITS.account in 15 minutes. Each connection
 * refreshes about once an hour, so this is far above what a person's apps
 * need, and stops one connection's app from refreshing without end. Codes are
 * not counted (server/oauth/provider.ts findAccount).
 */
export const countTokenGrant = (userId: string, now = Date.now()): boolean => {
  if (process.env.RATE_LIMITS === 'off') return true;
  const seen = tokenGrants.get(userId);
  if (!seen || now - seen.start >= TOKEN_GRANT_WINDOW_MS) {
    tokenGrants.set(userId, { start: now, count: 1 });
    // Old windows go as new ones start, so the map stays small.
    if (tokenGrants.size > 10000) {
      for (const [key, value] of tokenGrants) if (now - value.start >= TOKEN_GRANT_WINDOW_MS) tokenGrants.delete(key);
    }
    return true;
  }
  if (seen.count >= OAUTH_TOKEN_LIMITS.account) return false;
  seen.count++;
  return true;
};

/** Forgets the accounts' token-endpoint counts (the tests). */
export const resetTokenGrants = (): void => tokenGrants.clear();
/** The rest of /oauth/ (revocation, its keys). */
export const oauthOther = oauthLimiter(15, 100, 'too-many-oauth');
/** The consent API (GET and POST /api/connect/:uid), per address. */
export const connect = limiter(15, 100, 'too-many-oauth');

/**
 * The MCP endpoint (server/mcp/index.ts; docs/integrations-plan.md, items 23
 * and 31): requests a minute and a day. Without a token, per address (an
 * IPv6 one with its /48, NETWORK_BITS; server/mcp/auth.ts): 60 a
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
/**
 * Every request without a token, from everyone together, a minute: a ceiling
 * on the public tools' work whatever the addresses (many people's requests
 * through Claude or ChatGPT come from a few of their servers' addresses, and
 * a stranger may have many). Calls with a token are counted per account only,
 * so filling it (some 50 addresses or IPv6 /48s at the per-address count)
 * stops only the public tools, never a connected person's.
 */
export const mcpAnyoneAll = limiter(1, () => CEILINGS.mcpAnyone, 'too-many-mcp', {
  skip: (req) => withToken(req),
  keyGenerator: () => 'mcp-anyone-all'
});
