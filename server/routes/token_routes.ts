// The account's personal access tokens (docs/integrations-plan.md, items 26
// and 27), for the account page. Behind the web session only: app.ts mounts
// this after refuseAccessTokens, so no token can make, list or revoke tokens.
//
//   GET    /api/tokens      the account's personal tokens, newest first, and the choices for a new one:
//                           { tokens: [TokenRow], expiryDays, writeExpiryDays, defaultDays, most, scopes }
//   POST   /api/tokens      { name, days, scope?, password, and with two-step sign-in on a current
//                           factor (lib/mfa.d.ts IdentityProof) } makes one: 201 with
//                           { ...say('token-made'), token: the token itself, shown this once, row: TokenRow };
//                           403 token-needs-confirmed-email before the email is confirmed
//   DELETE /api/tokens/:id  revokes one: 200 say('token-revoked'), 404 when it is not the account's
//   DELETE /api/tokens      revokes every token and connected app still working: say('tokens-revoked', { count })
//
// Making one confirms the owner as any other change to how the account is
// reached does (decision 6): the password, and a factor once two-step sign-in
// is on. Revoking needs only the session: it takes access away, never gives it.
// A token reads the account's records (data:read) or reads and changes them
// (data:write); one that changes them lasts at most WRITE_PAT_MOST_DAYS. The
// notice email says which. A trial makes none (decision 9), nor an account
// whose email is not yet confirmed: 403 token-needs-confirmed-email. The token is never logged and never kept:
// only its hash and last four characters are (server/models/access_token.ts).
import express from 'express';
import mongoose from 'mongoose';
import * as accountMail from '../lib/account_mail.ts';
import { notGuest } from '../lib/guest_limits.ts';
import jwtAuth, { userOf } from '../lib/jwt_auth.ts';
import * as log from '../lib/log.ts';
import * as mailer from '../lib/mailer.ts';
import { say } from '../lib/messages.ts';
import * as limits from '../lib/rate_limit.ts';
import { isScope, type Scope } from '../lib/scopes.ts';
import { confirmChange } from '../lib/second_step.ts';
import { mintToken } from '../lib/token_auth.ts';
import AccessToken, {
  DEFAULT_PAT_EXPIRY_DAYS,
  keepWithinPatLimit,
  MAX_PATS,
  PAT_EXPIRY_DAYS,
  patExpiryDays,
  revokeAll,
  revokeOne,
  WRITE_PAT_MOST_DAYS,
  workingTokens,
  type AccessTokenDocument
} from '../models/access_token.ts';

/**
 * The scopes a person may give a new token: reading their records, the
 * default, or reading and changing them (owner decision, 2026-10-19). What
 * each allows is in server/lib/scopes.ts; changes are limited
 * (server/lib/rate_limit.ts TOKEN_WRITE_LIMITS) and kept as versions and in
 * the activity log (server/lib/record_history.ts).
 */
export const OFFERED_SCOPES: readonly Scope[] = ['data:read', 'data:write'];
/** The longest name a token may have. */
export const TOKEN_NAME_MAX = 100;
const DAY = 24 * 60 * 60 * 1000;

/** A token as the account page shows it: never its hash, and never the token. */
export interface TokenRow {
  id: string;
  name: string;
  scopes: string[];
  hint: string;
  createdAt: Date;
  expiresAt: Date;
  lastUsedAt?: Date;
  revokedAt?: Date;
  revokedWhy?: string;
  /** Whether it works now: neither revoked nor expired. */
  working: boolean;
}

export const rowOf = (token: AccessTokenDocument, now = new Date()): TokenRow => ({
  id: String(token._id),
  name: token.name,
  scopes: [...token.scopes],
  hint: token.hint ?? '',
  createdAt: token.createdAt,
  expiresAt: token.expiresAt,
  ...(token.lastUsedAt && { lastUsedAt: token.lastUsedAt }),
  ...(token.revokedAt && { revokedAt: token.revokedAt }),
  ...(token.revokedWhy && { revokedWhy: token.revokedWhy }),
  working: !token.revokedAt && token.expiresAt > now
});

/** A name as given, on one line, or null when it is empty or too long. */
const nameOf = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const name = value.replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]+/gu, ' ').trim();
  return name && name.length <= TOKEN_NAME_MAX ? name : null;
};

const tokenRouter = express.Router();
export default tokenRouter;

tokenRouter.get('/', jwtAuth, notGuest, async (req, res) => {
  const now = new Date();
  const tokens = await AccessToken.find({ userId: userOf(req)._id, kind: 'pat' }).sort({ createdAt: -1, _id: -1 });
  res.status(200).json({
    tokens: tokens.map((token) => rowOf(token, now)),
    expiryDays: PAT_EXPIRY_DAYS,
    writeExpiryDays: patExpiryDays('data:write'),
    defaultDays: DEFAULT_PAT_EXPIRY_DAYS,
    most: MAX_PATS,
    scopes: OFFERED_SCOPES
  });
});

tokenRouter.post('/', jwtAuth, notGuest, limits.passwordCheck, express.json(), async (req, res) => {
  const body = (req.body ?? {}) as { name?: unknown; days?: unknown; scope?: unknown };
  // The token's own fields first, so a mistake there never uses up a recovery code.
  const name = nameOf(body.name);
  if (!name) return res.status(400).json(say('token-name', { most: TOKEN_NAME_MAX }, { field: 'name' }));
  const scope = body.scope === undefined ? OFFERED_SCOPES[0] : body.scope;
  if (!isScope(scope) || !OFFERED_SCOPES.includes(scope)) {
    return res.status(400).json(say('token-scope-choices', undefined, { field: 'scope' }));
  }
  const days = body.days === undefined ? DEFAULT_PAT_EXPIRY_DAYS : body.days;
  if (!PAT_EXPIRY_DAYS.includes(days as (typeof PAT_EXPIRY_DAYS)[number])) {
    return res
      .status(400)
      .json(say('token-expiry-choices', { choices: PAT_EXPIRY_DAYS.join(', ') }, { field: 'days' }));
  }
  if (!patExpiryDays(scope).includes(days as number)) {
    return res.status(400).json(say('token-write-expiry', { most: WRITE_PAT_MOST_DAYS }, { field: 'days' }));
  }
  // Only to an address the owner has confirmed (owner decision): the notices about tokens go there.
  if (userOf(req).emailUnverified) return res.status(403).json(say('token-needs-confirmed-email'));
  const userId = userOf(req)._id;
  if ((await AccessToken.countDocuments(workingTokens(userId))) >= MAX_PATS) {
    return res.status(409).json(say('token-limit', { most: MAX_PATS }));
  }

  const check = await confirmChange(req, req.body);
  if (!check.ok) {
    return res.status(check.status).json(say(check.code, check.params, check.field ? { field: check.field } : {}));
  }
  const user = check.user;
  // Counted again after the confirmation, which takes a moment.
  if ((await AccessToken.countDocuments(workingTokens(userId))) >= MAX_PATS) {
    return res.status(409).json(say('token-limit', { most: MAX_PATS }));
  }
  const { token, hash, hint } = mintToken('pat');
  const createdAt = new Date();
  const row = await AccessToken.create({
    kind: 'pat',
    userId: user._id,
    name,
    hash,
    hint,
    scopes: [scope],
    createdAt,
    expiresAt: new Date(createdAt.getTime() + (days as number) * DAY)
  });
  // Counted once more now it is saved, so even requests at the same moment never make more than MAX_PATS.
  if (!(await keepWithinPatLimit(user._id, row._id))) {
    return res.status(409).json(say('token-limit', { most: MAX_PATS }));
  }
  log.info('Access token made', { tokenId: String(row._id), days, scope });
  // A notice to the owner, after the reply; not to an address nobody has confirmed.
  if (!user.emailUnverified && mailer.available()) {
    accountMail
      .sendTokenMade(user.email, row, user.preferences?.language ?? undefined)
      .catch((err: unknown) => log.error('Could not send the access token made email', { code: log.codeOf(err) }));
  }
  return res.status(201).json({ ...say('token-made'), token, row: rowOf(row) });
});

tokenRouter.delete('/:id', jwtAuth, notGuest, async (req, res) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) return res.status(400).json(say('invalid-id'));
  if (!(await revokeOne(userOf(req)._id, String(req.params.id), ['pat'], 'person'))) {
    return res.status(404).json(say('token-not-found'));
  }
  return res.status(200).json(say('token-revoked'));
});

tokenRouter.delete('/', jwtAuth, notGuest, async (req, res) => {
  const count = await revokeAll(userOf(req)._id, 'person');
  return res.status(200).json(say('tokens-revoked', { count }));
});
