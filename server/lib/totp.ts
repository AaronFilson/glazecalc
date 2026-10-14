// Codes from an authenticator app: TOTP, RFC 6238, on node:crypto with no
// library (docs/mfa-plan.md, item 3). STREAM A implements this file; the
// signatures are the contract.
//
// HMAC-SHA1, dynamic truncation, 6 digits (TOTP_DIGITS, lib/mfa.js), a 30 s
// step, one step either side allowed, compared with timingSafeEqual. The
// secret is 20 random bytes, shown and put in the URI as base32 (RFC 4648, no
// padding). Tested against the RFC 6238 Appendix B SHA-1 vectors.
//
// Replay: a caller accepts a code only for a step newer than mfa.totp.lastStep,
// with one atomic updateOne on { 'mfa.totp.lastStep': { $lt: step } }
// (server/lib/factors.ts does this for every caller).
import * as site from './site.ts';

const notYet = (): never => {
  throw new Error('not implemented: server/lib/totp.ts (stream A, docs/mfa-plan.md item 3)');
};

/** Seconds in a step. */
export const STEP_SECONDS = 30;
/** Steps either side of now that are accepted. */
export const WINDOW = 1;

/** A new secret: 20 random bytes. */
export const newSecret = (): Buffer => notYet();

/** RFC 4648 base32, upper case, no padding. */
export const toBase32 = (bytes: Buffer): string => notYet();

/** The bytes of a base32 string; ignores case, spaces and padding. Throws on other characters. */
export const fromBase32 = (text: string): Buffer => notYet();

/** The step a time falls in: floor(ms / 1000 / STEP_SECONDS). */
export const stepAt = (ms: number = Date.now()): number => Math.floor(ms / 1000 / STEP_SECONDS);

/** The code for a step, `digits` long with leading zeros (8 for the RFC vectors). */
export const codeAt = (secret: Buffer, step: number, digits?: number): string => notYet();

/**
 * The step a code is right for, within WINDOW steps of `ms`, or null. Takes
 * only exactly TOTP_DIGITS digits (spaces removed first). Does not check replay.
 */
export const matchingStep = (secret: Buffer, code: string, ms?: number): number | null => notYet();

/**
 * otpauth://totp/<issuer>:<account>?secret=<base32>&issuer=<issuer>, the issuer
 * being site.totpIssuer() ("Glazecalc", or "Glazecalc (staging)"), each part encoded.
 */
export const uri = (secretBase32: string, account: string, issuer: string = site.totpIssuer()): string => notYet();

/** The secret as people type it: groups of 4 separated by spaces. */
export const grouped = (secretBase32: string): string => notYet();
