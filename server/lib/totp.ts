// Codes from an authenticator app: TOTP, RFC 6238, on node:crypto with no
// library (docs/mfa-plan.md, item 3).
//
// HMAC-SHA1, dynamic truncation, 6 digits (TOTP_DIGITS, lib/mfa.js), a 30 s
// step, one step either side allowed, compared with timingSafeEqual. The
// secret is 20 random bytes, shown and put in the URI as base32 (RFC 4648, no
// padding). Tested against the RFC 6238 Appendix B SHA-1 vectors.
//
// Replay: a caller accepts a code only for a step newer than mfa.totp.lastStep,
// with one atomic updateOne on { 'mfa.totp.lastStep': { $lt: step } }
// (server/lib/factors.ts does this for every caller).
import crypto from 'node:crypto';
import { TOTP_DIGITS } from '../../lib/mfa.js';
import * as site from './site.ts';

/** Seconds in a step. */
export const STEP_SECONDS = 30;
/** Steps either side of now that are accepted. */
export const WINDOW = 1;

const SECRET_BYTES = 20;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** A new secret: 20 random bytes. */
export const newSecret = (): Buffer => crypto.randomBytes(SECRET_BYTES);

/** RFC 4648 base32, upper case, no padding. */
export const toBase32 = (bytes: Buffer): string => {
  let out = '';
  let buffer = 0;
  let bits = 0;
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(buffer >>> (bits - 5)) & 31];
      bits -= 5;
    }
    buffer &= (1 << bits) - 1;
  }
  if (bits > 0) out += ALPHABET[(buffer << (5 - bits)) & 31];
  return out;
};

/** The bytes of a base32 string; ignores case, spaces and padding. Throws on other characters. */
export const fromBase32 = (text: string): Buffer => {
  const clean = text.replace(/[\s=]/g, '').toUpperCase();
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const char of clean) {
    const value = ALPHABET.indexOf(char);
    if (value < 0) throw new Error('Not base32');
    buffer = ((buffer << 5) | value) & 0xffff;
    bits += 5;
    if (bits >= 8) {
      bytes.push((buffer >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
};

/** The step a time falls in: floor(ms / 1000 / STEP_SECONDS). */
export const stepAt = (ms: number = Date.now()): number => Math.floor(ms / 1000 / STEP_SECONDS);

/** The code for a step, `digits` long with leading zeros (8 for the RFC vectors). */
export const codeAt = (secret: Buffer, step: number, digits: number = TOTP_DIGITS): string => {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const mac = crypto.createHmac('sha1', secret).update(counter).digest();
  // Dynamic truncation (RFC 4226, 5.3).
  const offset = mac[mac.length - 1]! & 0x0f;
  const binary = mac.readUInt32BE(offset) & 0x7fffffff;
  return String(binary % 10 ** digits).padStart(digits, '0');
};

/**
 * The step a code is right for, within WINDOW steps of `ms`, or null. Takes
 * only exactly TOTP_DIGITS digits, after NFKC (full-width digits from an input
 * method become plain ones) and with spaces and dashes removed ("123 456",
 * "123-456", and the minus sign and long-vowel mark ー a Japanese input method
 * may give for "-"). Does not check replay.
 */
export const matchingStep = (secret: Buffer, code: string, ms: number = Date.now()): number | null => {
  if (typeof code !== 'string' || code.length > 40) return null;
  const typed = code.normalize('NFKC').replace(/[\s\p{Pd}−ー]/gu, '');
  if (!new RegExp('^\\d{' + TOTP_DIGITS + '}$').test(typed)) return null;
  const given = Buffer.from(typed);
  const now = stepAt(ms);
  let found: number | null = null;
  // Every step in the window is compared, so the time taken does not say which matched.
  for (let step = now - WINDOW; step <= now + WINDOW; step++) {
    if (crypto.timingSafeEqual(Buffer.from(codeAt(secret, step)), given) && found === null) found = step;
  }
  return found;
};

/**
 * otpauth://totp/<issuer>:<account>?secret=<base32>&issuer=<issuer>, the issuer
 * being site.totpIssuer() ("Glazecalc", or "Glazecalc (staging)"), each part encoded.
 */
export const uri = (secretBase32: string, account: string, issuer: string = site.totpIssuer()): string =>
  'otpauth://totp/' +
  encodeURIComponent(issuer) +
  ':' +
  encodeURIComponent(account) +
  '?secret=' +
  encodeURIComponent(secretBase32) +
  '&issuer=' +
  encodeURIComponent(issuer);

/** The secret as people type it: groups of 4 separated by spaces. */
export const grouped = (secretBase32: string): string => (secretBase32.match(/.{1,4}/g) ?? []).join(' ');
