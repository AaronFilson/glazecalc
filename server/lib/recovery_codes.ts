// Recovery codes: for when the authenticator app and the passkeys are lost
// (docs/mfa-plan.md, item 6).
//
// RECOVERY_CODE_COUNT (10, lib/mfa.js) codes of 10 Crockford base32 characters
// (50 bits), shown as xxxxx-xxxxx, lower case. Only HMAC-SHA256(MFA_KEY,
// normalized code) is stored (mfa_key.hmac): the codes have high entropy, so no
// bcrypt, and the key stops anyone guessing codes offline from a dump. Codes
// are made when the first factor is added and on request; removing the last
// factor deletes them.
import crypto from 'node:crypto';
import type { Types } from 'mongoose';
import { RECOVERY_CODE_COUNT } from '../../lib/mfa.js';
import * as mfaKey from './mfa_key.ts';
import User, { type RecoveryCode, type UserFields } from '../models/user.ts';

// Crockford's base32: no I, L, O or U, so nothing reads as another character.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const LENGTH = 10;

const newCode = (): string => {
  // 256 is a multiple of 32, so taking 5 bits of each byte is uniform.
  const bytes = crypto.randomBytes(LENGTH);
  return Array.from(bytes, (byte) => ALPHABET[byte & 31]).join('');
};

/** A new set: the codes to show once, and what to store in mfa.recoveryCodes. */
export const make = (): { codes: string[]; stored: RecoveryCode[] } => {
  const normalized = new Set<string>();
  while (normalized.size < RECOVERY_CODE_COUNT) normalized.add(newCode());
  const list = [...normalized];
  return {
    codes: list.map((code) => (code.slice(0, 5) + '-' + code.slice(5)).toLowerCase()),
    stored: list.map((code) => ({ hash: hashOf(code) }))
  };
};

/**
 * A code as typed, made comparable: Crockford's rules (I and L read as 1, O as
 * 0, case ignored), spaces and dashes removed. Null when it cannot be a code.
 */
export const normalize = (typed: string): string | null => {
  if (typeof typed !== 'string' || typed.length > 40) return null;
  const code = typed
    .toUpperCase()
    .replace(/[\s\p{Pd}]/gu, '')
    .replace(/[IL]/g, '1')
    .replace(/O/g, '0');
  if (code.length !== LENGTH) return null;
  for (const char of code) if (!ALPHABET.includes(char)) return null;
  return code;
};

/** The stored hash of a normalized code. */
export const hashOf = (normalized: string): string => mfaKey.hmac(normalized);

/**
 * Uses a code up, atomically: updateOne({ _id, 'mfa.recoveryCodes': { $elemMatch:
 * { hash, usedAt: null } } }, { $set: { 'mfa.recoveryCodes.$.usedAt': now } }).
 * Resolves with the codes left afterwards, or null when the code is not one of
 * the account's unused codes. Sends no mail (factors.ts does).
 */
export const use = async (userId: Types.ObjectId | string, typed: string): Promise<number | null> => {
  const normalized = normalize(typed);
  if (!normalized) return null;
  // The database compares hashes; the code itself is never stored or compared.
  const after = await User.findOneAndUpdate(
    { _id: userId, 'mfa.recoveryCodes': { $elemMatch: { hash: hashOf(normalized), usedAt: null } } },
    { $set: { 'mfa.recoveryCodes.$.usedAt': new Date() } },
    { returnDocument: 'after', projection: { mfa: 1 } }
  ).lean();
  return after ? left(after) : null;
};

/** Unused codes the account has. */
export const left = (user: Pick<UserFields, 'mfa'>): number =>
  (user.mfa?.recoveryCodes ?? []).filter((code) => !code.usedAt).length;
