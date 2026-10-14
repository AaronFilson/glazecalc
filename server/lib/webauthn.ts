// Passkeys (WebAuthn) on the server, with @simplewebauthn/server
// (docs/mfa-plan.md, items 7 and 17). STREAM A implements this file; the
// signatures are the contract. Stream B calls the sign-in half.
//
// The relying party comes from the environment (server/lib/site.ts): rpID is
// SITE_URL's host name, the expected origin SITE_URL's origin, so passkeys
// made on staging belong to the staging host.
//
// Registration: attestationType 'none', residentKey 'preferred' (discoverable,
// for passkey-first sign-in), userVerification 'preferred', algorithms -7 and
// -257, excludeCredentials the account's passkeys; user.id is mfa.handle, never
// the ObjectId. Assertion as a second factor: userVerification 'preferred' (the
// password was the first). Passkey-first sign-in: 'required', no
// allowCredentials, and the account found by credential id and user handle.
//
// These functions do not store challenges: the caller keeps options.challenge
// (AuthChallenge, or the pending sign-in) and passes it back to verify. A
// successful assertion updates the passkey's counter and lastUsedAt.
import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON
} from '@simplewebauthn/server';
import type { Passkey, UserDocument } from '../models/user.ts';

const notYet = (): never => {
  throw new Error('not implemented: server/lib/webauthn.ts (stream A, docs/mfa-plan.md item 7)');
};

/** A passkey as verifyRegistration makes it, ready to push to mfa.passkeys (with its name). */
export type NewPasskey = Omit<Passkey, '_id' | 'name' | 'addedAt' | 'lastUsedAt'>;

/** A new WebAuthn user handle: 16 random bytes, base64url. Stored in mfa.handle with the first passkey. */
export const newHandle = (): string => notYet();

/** Options for adding a passkey to this account (its handle made first if it has none). */
export const registrationOptions = (
  user: UserDocument,
  handle: string
): Promise<PublicKeyCredentialCreationOptionsJSON> => notYet();

/** Checks a new passkey against the challenge sent. Throws (or resolves null) when it does not verify. */
export const verifyRegistration = (
  response: RegistrationResponseJSON,
  expectedChallenge: string
): Promise<NewPasskey | null> => notYet();

/**
 * Options for using a passkey. With `passkeys`, they are the allowed
 * credentials (a second factor, or confirming a change); with null, any
 * discoverable passkey for this site (passkey-first sign-in).
 */
export const authenticationOptions = (
  passkeys: Passkey[] | null,
  userVerification: 'preferred' | 'required'
): Promise<PublicKeyCredentialRequestOptionsJSON> => notYet();

/** The challenge a browser response answers (from its clientDataJSON), or null if it cannot be read. */
export const challengeOf = (response: AuthenticationResponseJSON | RegistrationResponseJSON): string | null => notYet();

/**
 * Checks an assertion from one of this account's passkeys against the
 * challenge sent: origin, rpID, signature, user verification when required,
 * and a counter that has not gone back. On success updates the passkey's
 * counter and lastUsedAt and resolves true; otherwise false.
 */
export const verifyAuthentication = (
  user: UserDocument,
  response: AuthenticationResponseJSON,
  expectedChallenge: string,
  requireUserVerification: boolean
): Promise<boolean> => notYet();

/**
 * Passkey-first sign-in: the account a passkey belongs to, by its credential
 * id, when the response's userHandle matches mfa.handle; otherwise null.
 */
export const accountOf = (response: AuthenticationResponseJSON): Promise<UserDocument | null> => notYet();
