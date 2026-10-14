// The key that protects two-step sign-in's secrets at rest (docs/mfa-plan.md,
// item 2). STREAM A implements this file; the signatures are the contract.
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
// recovery codes (server/lib/recovery_codes.ts).

const notYet = (): never => {
  throw new Error('not implemented: server/lib/mfa_key.ts (stream A, docs/mfa-plan.md item 2)');
};

/** The 32-byte key from MFA_KEY, or the development key outside production. Throws in production without it. */
export const key = (): Buffer => notYet();

/** Encrypts `plain` for this account: v1.<iv>.<tag>.<ciphertext>. */
export const encrypt = (plain: string, userId: string): string => notYet();

/** The plain text of encrypt's output. Throws if it was tampered with, made for another account, or with another key. */
export const decrypt = (stored: string, userId: string): string => notYet();

/** HMAC-SHA256 of `text` under the key, hex. For recovery codes. */
export const hmac = (text: string): string => notYet();
