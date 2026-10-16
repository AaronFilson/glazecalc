// Checking a second factor, for every route that takes one (docs/mfa-plan.md,
// items 8 and 9, decision 6). Stream B's second step calls checkFactor; the
// account routes (server/routes/mfa_routes.ts) call confirmIdentity.
import type { Request } from 'express';
import type { AuthenticationResponseJSON } from '@simplewebauthn/server';
import type { FactorKind } from '../../lib/mfa.js';
import * as accountMail from './account_mail.ts';
import * as codeLock from './code_lock.ts';
import { userOf } from './jwt_auth.ts';
import * as log from './log.ts';
import * as mfaKey from './mfa_key.ts';
import * as password from './password.ts';
import * as recoveryCodes from './recovery_codes.ts';
import * as totp from './totp.ts';
import * as webauthn from './webauthn.ts';
import type { MessageCode } from './messages.ts';
import AuthChallenge from '../models/auth_challenge.ts';
import User, { mfaOn, type UserDocument } from '../models/user.ts';

/** What checking a factor came to. `code` is the message to answer with (400 or 401). */
export type FactorCheck =
  | { ok: true; kind: FactorKind; /** recovery: unused codes left */ codesLeft?: number }
  | { ok: false; code: MessageCode };

type Proof = { code?: unknown; recoveryCode?: unknown; passkey?: unknown };

const FACTOR_FIELDS = ['code', 'recoveryCode', 'passkey'] as const;

/** The factor fields a body carries (present and not undefined). */
const given = (body: unknown): Array<(typeof FACTOR_FIELDS)[number]> =>
  body && typeof body === 'object'
    ? FACTOR_FIELDS.filter((field) => (body as Proof)[field] !== undefined && (body as Proof)[field] !== null)
    : [];

const checkCode = async (user: UserDocument, typed: unknown): Promise<FactorCheck> => {
  if (typeof typed !== 'string' || !typed.trim()) return { ok: false, code: 'code-needed' };
  const stored = user.mfa?.totp;
  if (!stored?.secret) return { ok: false, code: 'code-wrong' };
  let secret: Buffer;
  try {
    secret = totp.fromBase32(mfaKey.decrypt(stored.secret, String(user._id)));
  } catch {
    // Another key, or a secret moved from another account: nothing to compare with.
    log.error('An authenticator secret could not be decrypted', { code: 'MFA_DECRYPT' });
    return { ok: false, code: 'code-wrong' };
  }
  const step = totp.matchingStep(secret, typed);
  secret.fill(0);
  if (step === null) return { ok: false, code: 'code-wrong' };
  // A code is taken once: only for a step newer than the last one taken, and
  // only while this is still the secret the code was checked against.
  const taken = await User.updateOne(
    { _id: user._id, 'mfa.totp.secret': stored.secret, 'mfa.totp.lastStep': { $lt: step } },
    { $set: { 'mfa.totp.lastStep': step, 'mfa.totp.lastUsedAt': new Date() } }
  );
  return taken.matchedCount === 1 ? { ok: true, kind: 'totp' } : { ok: false, code: 'code-wrong' };
};

const checkRecoveryCode = async (user: UserDocument, typed: unknown): Promise<FactorCheck> => {
  if (typeof typed !== 'string' || !mfaOn(user)) return { ok: false, code: 'recovery-code-wrong' };
  const left = await recoveryCodes.use(user._id, typed);
  if (left === null) return { ok: false, code: 'recovery-code-wrong' };
  accountMail.noticeMfa(user, { kind: 'recovery-used', left });
  return { ok: true, kind: 'recovery', codesLeft: left };
};

const checkPasskey = async (user: UserDocument, response: unknown, challenge?: string): Promise<FactorCheck> => {
  if (!challenge || !response || typeof response !== 'object') return { ok: false, code: 'passkey-failed' };
  const verified = await webauthn.verifyAuthentication(user, response as AuthenticationResponseJSON, challenge, false);
  return verified ? { ok: true, kind: 'passkey' } : { ok: false, code: 'passkey-failed' };
};

/**
 * Checks one factor (a body with exactly one of code, recoveryCode or passkey;
 * anything else is { ok: false, code: 'factor-needed' }) against the user, who
 * must be loaded with `mfa`:
 *
 *   code          a TOTP code for a step newer than mfa.totp.lastStep, taken with
 *                 one atomic updateOne on { 'mfa.totp.lastStep': { $lt: step } }
 *                 (also sets lastUsedAt). 'code-needed' or 'code-wrong'.
 *   recoveryCode  used up with recovery_codes.use; sends the RECOVERY_USED notice
 *                 (accountMail.noticeMfa) after. 'recovery-code-wrong'.
 *   passkey       webauthn.verifyAuthentication against `passkeyChallenge`, with
 *                 userVerification 'preferred'. 'passkey-failed', also when no
 *                 challenge was given.
 *
 * Counts nothing itself: the caller counts wrong tries (the pending sign-in,
 * the rate limits).
 */
export const checkFactor = async (
  user: UserDocument,
  proof: unknown,
  options: { passkeyChallenge?: string } = {}
): Promise<FactorCheck> => {
  const fields = given(proof);
  if (fields.length !== 1) return { ok: false, code: 'factor-needed' };
  const body = proof as Proof;
  switch (fields[0]) {
    case 'code':
      return checkCode(user, body.code);
    case 'recoveryCode':
      return checkRecoveryCode(user, body.recoveryCode);
    default:
      return checkPasskey(user, body.passkey, options.passkeyChallenge);
  }
};

/** What confirmIdentity came to: the user (loaded with password and mfa) or a reply. */
export type IdentityCheck =
  | { ok: true; user: UserDocument; used?: FactorKind }
  | {
      ok: false;
      status: 400 | 401 | 409 | 429;
      code: MessageCode;
      field?: 'password' | 'code';
      params?: Record<string, string | number>;
    };

/**
 * Takes the passkey-confirm challenge a passkey response answers, once: the
 * challenge, or undefined when it is not this account's, has expired or was used.
 */
const takeConfirmChallenge = async (user: UserDocument, response: unknown): Promise<string | undefined> => {
  const challenge = response && typeof response === 'object' ? webauthn.challengeOf(response as never) : null;
  if (!challenge) return undefined;
  const now = new Date();
  const taken = await AuthChallenge.findOneAndUpdate(
    { userId: user._id, kind: 'passkey-confirm', challenge, usedAt: null, expiresAt: { $gt: now } },
    { $set: { usedAt: now } }
  );
  return taken?.challenge ?? undefined;
};

/**
 * Confirms it is the account's owner (body: lib/mfa.d.ts IdentityProof) before any change to how the account
 * signs in (decision 6), behind jwtAuth, notGuest, limits.passwordCheck.
 * Loads the user afresh with password and mfa (jwtAuth's has neither). Needs
 * body.password ('current-password-needed', 'current-password-wrong'), and,
 * once MFA is on, one current factor as well, checked by checkFactor
 * ('factor-needed' without one). A passkey answers the challenge from POST
 * /api/mfa/confirm/options, an AuthChallenge of kind 'passkey-confirm', taken
 * once. When OAuth arrives (integrations-plan item 11), a fresh reauthUntil
 * that passed a second step will also do.
 */
export const confirmIdentity = async (req: Request, body: unknown): Promise<IdentityCheck> => {
  const user = await User.findById(userOf(req)._id);
  if (!user) return { ok: false, status: 401, code: 'not-signed-in' };
  const typed = body && typeof body === 'object' ? (body as { password?: unknown }).password : undefined;
  // 400 rather than 401: the user is signed in, and a 401 would sign them out.
  if (typeof typed !== 'string' || !typed) {
    return { ok: false, status: 400, code: 'current-password-needed', field: 'password' };
  }
  // The password first, so a wrong one never uses up a recovery code or a challenge.
  if (!(await password.matches(typed, user.password))) {
    return { ok: false, status: 400, code: 'current-password-wrong', field: 'password' };
  }
  if (!mfaOn(user)) return { ok: true, user };

  const fields = given(body);
  if (fields.length !== 1) return { ok: false, status: 400, code: 'factor-needed' };
  const passkeyChallenge =
    fields[0] === 'passkey' ? await takeConfirmChallenge(user, (body as Proof).passkey) : undefined;
  // A code counts against the account as at sign-in, and is refused while a
  // round's refusal lasts (server/lib/code_lock.ts).
  let codeTry: codeLock.CodeTry | undefined;
  if (codeLock.isCodeTry(body)) {
    const taken = await codeLock.take(user._id);
    if (!taken.ok) {
      if (taken.code === 'second-step-busy') return { ok: false, status: 409, code: taken.code };
      return { ok: false, status: 429, code: taken.code, params: taken.params, field: 'code' };
    }
    codeTry = taken.codeTry;
  }
  const check = await checkFactor(user, body, { passkeyChallenge });
  if (!check.ok) {
    if (codeTry?.locked) {
      return { ok: false, status: 429, code: 'second-step-account-limit', params: codeTry.locked, field: 'code' };
    }
    return { ok: false, status: 400, code: check.code, ...(fields[0] !== 'passkey' ? { field: 'code' as const } : {}) };
  }
  if (codeTry) await codeLock.right(codeTry);
  return { ok: true, user, used: check.kind };
};
