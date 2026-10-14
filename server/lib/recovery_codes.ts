// Recovery codes: for when the authenticator app and the passkeys are lost
// (docs/mfa-plan.md, item 6). STREAM A implements this file; the signatures are
// the contract.
//
// RECOVERY_CODE_COUNT (10, lib/mfa.js) codes of 10 Crockford base32 characters
// (50 bits), shown as xxxxx-xxxxx, lower case. Only HMAC-SHA256(MFA_KEY,
// normalized code) is stored (mfa_key.hmac): the codes have high entropy, so no
// bcrypt, and the key stops anyone guessing codes offline from a dump. Codes
// are made when the first factor is added and on request; removing the last
// factor deletes them.
import type { Types } from 'mongoose';
import type { RecoveryCode, UserFields } from '../models/user.ts';

const notYet = (): never => {
  throw new Error('not implemented: server/lib/recovery_codes.ts (stream A, docs/mfa-plan.md item 6)');
};

/** A new set: the codes to show once, and what to store in mfa.recoveryCodes. */
export const make = (): { codes: string[]; stored: RecoveryCode[] } => notYet();

/**
 * A code as typed, made comparable: Crockford's rules (I and L read as 1, O as
 * 0, case ignored), spaces and dashes removed. Null when it cannot be a code.
 */
export const normalize = (typed: string): string | null => notYet();

/** The stored hash of a normalized code. */
export const hashOf = (normalized: string): string => notYet();

/**
 * Uses a code up, atomically: updateOne({ _id, 'mfa.recoveryCodes': { $elemMatch:
 * { hash, usedAt: null } } }, { $set: { 'mfa.recoveryCodes.$.usedAt': now } }).
 * Resolves with the codes left afterwards, or null when the code is not one of
 * the account's unused codes. Sends no mail (factors.ts does).
 */
export const use = (userId: Types.ObjectId | string, typed: string): Promise<number | null> => notYet();

/** Unused codes the account has. */
export const left = (user: Pick<UserFields, 'mfa'>): number => notYet();
