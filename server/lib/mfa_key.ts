// The key that protects two-step sign-in's secrets at rest (docs/mfa-plan.md,
// item 2).
//
// MFA_KEY is 32 bytes, base64, kept per environment in SSM
// (/glazecalc/mfa-key, /glazecalc/staging/mfa-key). Production throws without
// it, as app_secret.ts does. Development and the tests use a fixed, plainly
// labelled development key and log a warning: a random key per run would break
// every enrolment on restart.
//
// TOTP secrets are encrypted with AES-256-GCM (node:crypto), the user id as
// additional authenticated data, so a ciphertext cannot be moved to another
// account. Stored form: v1.<iv>.<tag>.<ciphertext>, each part base64url; the
// v1 leaves room to rotate the key. The same key, through HMAC-SHA256, hashes
// recovery codes (server/lib/recovery_codes.ts). Each use has its own key,
// derived from MFA_KEY with HKDF, so the two never share one.
import crypto from 'node:crypto';
import * as log from './log.ts';

const VERSION = 'v1';
const KEY_BYTES = 32;
// 96-bit IVs, as GCM is designed for; a random one each time.
const IV_BYTES = 12;
const TAG_BYTES = 16;

// Anyone can read this: it protects nothing but development and test data.
const DEVELOPMENT_KEY = crypto
  .createHash('sha256')
  .update('glazecalc DEVELOPMENT mfa key - never for production')
  .digest();

// Production says which key it uses; making one up would lock everyone out of
// their authenticator app on the next restart.
if (process.env.NODE_ENV === 'production' && !process.env.MFA_KEY) {
  throw new Error('MFA_KEY must be set when NODE_ENV is production');
}

let cached: { from: string | undefined; key: Buffer } | null = null;

const parse = (text: string): Buffer => {
  const bytes = Buffer.from(text.trim(), 'base64');
  if (bytes.length !== KEY_BYTES) {
    // Never the value itself in the message.
    throw new Error('MFA_KEY must be ' + KEY_BYTES + ' bytes, base64 (openssl rand -base64 32)');
  }
  return bytes;
};

/** The 32-byte key from MFA_KEY, or the development key outside production. Throws in production without it. */
export const key = (): Buffer => {
  const from = process.env.MFA_KEY || undefined;
  if (!from && process.env.NODE_ENV === 'production') {
    throw new Error('MFA_KEY must be set when NODE_ENV is production');
  }
  if (cached && cached.from === from) return cached.key;
  let chosen: Buffer;
  if (from) {
    chosen = parse(from);
  } else {
    log.warn('MFA_KEY is not set; using the fixed DEVELOPMENT key. Never use it in production.');
    chosen = DEVELOPMENT_KEY;
  }
  cached = { from, key: chosen };
  return chosen;
};

// One key in the environment, a separate key for each use, derived with HKDF.
const subkey = (use: string): Buffer =>
  Buffer.from(crypto.hkdfSync('sha256', key(), Buffer.alloc(0), 'glazecalc:mfa:' + use, KEY_BYTES));

const aad = (userId: string): Buffer => Buffer.from('glazecalc:mfa:' + String(userId), 'utf8');

/** Encrypts `plain` for this account: v1.<iv>.<tag>.<ciphertext>. */
export const encrypt = (plain: string, userId: string): string => {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv('aes-256-gcm', subkey('totp-secret'), iv, { authTagLength: TAG_BYTES });
  cipher.setAAD(aad(userId));
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString('base64url'), tag.toString('base64url'), ciphertext.toString('base64url')].join('.');
};

/** The plain text of encrypt's output. Throws if it was tampered with, made for another account, or with another key. */
export const decrypt = (stored: string, userId: string): string => {
  const parts = typeof stored === 'string' ? stored.split('.') : [];
  if (parts.length !== 4 || parts[0] !== VERSION) throw new Error('Not an encrypted MFA secret');
  const [, ivText, tagText, cipherText] = parts as [string, string, string, string];
  const iv = Buffer.from(ivText, 'base64url');
  const tag = Buffer.from(tagText, 'base64url');
  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) throw new Error('Not an encrypted MFA secret');
  const decipher = crypto.createDecipheriv('aes-256-gcm', subkey('totp-secret'), iv, { authTagLength: TAG_BYTES });
  decipher.setAAD(aad(userId));
  decipher.setAuthTag(tag);
  // final() throws when the tag does not match: tampered, another account or another key.
  return Buffer.concat([decipher.update(Buffer.from(cipherText, 'base64url')), decipher.final()]).toString('utf8');
};

/** HMAC-SHA256 of `text` under the key, hex. For recovery codes. */
export const hmac = (text: string): string =>
  crypto.createHmac('sha256', subkey('recovery-code')).update(text, 'utf8').digest('hex');
