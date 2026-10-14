// Checking a second factor, for every route that takes one (docs/mfa-plan.md,
// items 8 and 9, decision 6). STREAM A implements this file; the signatures are
// the contract. Stream B's second step calls checkFactor; stream A's account
// routes call confirmIdentity.
import type { Request } from 'express';
import type { FactorKind } from '../../lib/mfa.js';
import type { MessageCode } from './messages.ts';
import type { UserDocument } from '../models/user.ts';

const notYet = (): never => {
  throw new Error('not implemented: server/lib/factors.ts (stream A, docs/mfa-plan.md items 8 and 9)');
};

/** What checking a factor came to. `code` is the message to answer with (400 or 401). */
export type FactorCheck =
  | { ok: true; kind: FactorKind; /** recovery: unused codes left */ codesLeft?: number }
  | { ok: false; code: MessageCode };

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
export const checkFactor = (
  user: UserDocument,
  proof: unknown,
  options?: { passkeyChallenge?: string }
): Promise<FactorCheck> => notYet();

/** What confirmIdentity came to: the user (loaded with password and mfa) or a reply. */
export type IdentityCheck =
  | { ok: true; user: UserDocument; used?: FactorKind }
  | { ok: false; status: 400 | 401; code: MessageCode; field?: 'password' | 'code' };

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
export const confirmIdentity = (req: Request, body: unknown): Promise<IdentityCheck> => notYet();
