// Two-step sign-in (docs/mfa-plan.md): what the server sends and takes, shared
// by the server (server/routes/auth_routes.ts, server/routes/mfa_routes.ts) and
// the app (client/app/core/auth.service.ts, the account page). Dates are ISO
// strings, as JSON carries them. The WebAuthn shapes are @simplewebauthn's,
// the same in its server and browser packages.
import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON
} from '@simplewebauthn/browser';

export type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON
};

export const PASSKEY_LIMIT: number;
export const PASSKEY_NAME_MAX: number;
export const RECOVERY_CODE_COUNT: number;
export const RECOVERY_CODES_LOW: number;
export const TOTP_DIGITS: number;
export const SECOND_STEP_MINUTES: number;
export const SECOND_STEP_TRIES: number;

/** A kind of second factor. */
export type FactorKind = 'totp' | 'passkey' | 'recovery';

/** The second steps an account can take at sign-in. Recovery codes are offered whenever MFA is on. */
export interface SecondStepMethods {
  totp: boolean;
  passkey: boolean;
  recovery: boolean;
}

/**
 * GET /api/signin when the account has two-step sign-in: 200, no session
 * cookie. `pending` is a signed token the page keeps in memory (never in
 * storage) and sends back with the second step; a reload means the password again.
 */
export interface SecondStepResponse {
  code: 'second-step';
  msg: string;
  methods: SecondStepMethods;
  pending: string;
  /** When `pending` stops working (SECOND_STEP_MINUTES after the password). */
  expiresAt: string;
  /** Present when the account has passkeys: for startAuthentication. */
  passkeyOptions?: PublicKeyCredentialRequestOptionsJSON;
}

/**
 * Proof of a current second factor: exactly one of a code from the
 * authenticator app, a recovery code (any case, with or without its dash), or
 * a passkey assertion.
 */
export type FactorProof =
  | { code: string; recoveryCode?: never; passkey?: never }
  | { recoveryCode: string; code?: never; passkey?: never }
  | { passkey: AuthenticationResponseJSON; code?: never; recoveryCode?: never };

/** POST /api/signin/second-step. */
export type SecondStepRequest = { pending: string } & FactorProof;

/**
 * A finished sign-in: GET /api/signin without MFA, POST /api/signin/second-step,
 * POST /api/signin/passkey. `kept`: records a trial on this browser brought in.
 */
export interface SignedInResponse {
  code: 'signed-in';
  msg: string;
  email: string;
  kept: number;
}

/** POST /api/signin/passkey/options (passkey-first), POST /api/mfa/confirm/options, POST /api/mfa/passkeys/options. */
export interface PasskeyRequestOptionsResponse {
  options: PublicKeyCredentialRequestOptionsJSON;
}
export interface PasskeyCreationOptionsResponse {
  options: PublicKeyCredentialCreationOptionsJSON;
}

/** POST /api/signin/passkey (passkey-first; X-Keep-Signed-In as for the password). */
export interface PasskeySignInRequest {
  response: AuthenticationResponseJSON;
}

/**
 * Every change to how the account signs in (decision 6): the current password,
 * and, once two-step sign-in is on, one current factor as well. With MFA off
 * (adding the first factor) the password alone.
 */
export type IdentityProof = { password: string } & (
  FactorProof | { code?: never; recoveryCode?: never; passkey?: never }
);

/** A passkey as the account page lists it. `id` is the entry's id, never the credential id. */
export interface PasskeySummary {
  id: string;
  name: string;
  addedAt: string;
  lastUsedAt?: string;
}

/** GET /api/mfa. */
export interface MfaSummary {
  /** An authenticator app or at least one passkey. */
  on: boolean;
  /** Two-step sign-in can be turned on only with a confirmed email. */
  emailConfirmed: boolean;
  totp: { addedAt: string; lastUsedAt?: string } | null;
  passkeys: PasskeySummary[];
  /** Unused recovery codes; 0 when MFA is off. */
  codesLeft: number;
  recoveryMadeAt?: string;
}

/** POST /api/mfa/totp/start. `qr` is a data:image/svg+xml URL; `secret` is base32. */
export interface TotpStartResponse {
  secret: string;
  uri: string;
  qr: string;
}

/** POST /api/mfa/totp {code}, POST /api/mfa/passkeys {response, name}. */
export interface PasskeyAddRequest {
  response: RegistrationResponseJSON;
  name: string;
}

/**
 * Replies to adding a factor (`recoveryCodes` only when it was the first, so
 * the codes were made) and to POST /api/mfa/recovery-codes (always). Shown once.
 */
export interface RecoveryCodesResponse {
  code: string;
  msg: string;
  recoveryCodes?: string[];
}
