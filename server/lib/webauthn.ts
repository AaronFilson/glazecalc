// Passkeys (WebAuthn) on the server, with @simplewebauthn/server
// (docs/mfa-plan.md, items 7 and 17). Stream B calls the sign-in half.
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
import crypto from 'node:crypto';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  type RegistrationResponseJSON
} from '@simplewebauthn/server';
import * as log from './log.ts';
import * as site from './site.ts';
import User, { type Passkey, type UserDocument } from '../models/user.ts';

/** A passkey as verifyRegistration makes it, ready to push to mfa.passkeys (with its name). */
export type NewPasskey = Omit<Passkey, '_id' | 'name' | 'addedAt' | 'lastUsedAt'>;

/** How long the browser may take, in ms: the challenges are kept 5 minutes. */
const TIMEOUT = 5 * 60 * 1000;
/** ES256 and RS256: what every platform and security key offers. */
const ALGORITHMS = [-7, -257];

// Only what the browser needs to pick a credential: never names or dates.
const descriptors = (passkeys: Passkey[]) =>
  passkeys.map((passkey) => ({ id: passkey.credentialId, transports: [...(passkey.transports ?? [])] }));

const isBase64url = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= 2048 && /^[A-Za-z0-9_-]+$/.test(value);

const sameText = (a: string, b: string): boolean => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};

/** A new WebAuthn user handle: 16 random bytes, base64url. Stored in mfa.handle with the first passkey. */
export const newHandle = (): string => crypto.randomBytes(16).toString('base64url');

/** Options for adding a passkey to this account (its handle made first if it has none). */
export const registrationOptions = (
  user: UserDocument,
  handle: string
): Promise<PublicKeyCredentialCreationOptionsJSON> =>
  generateRegistrationOptions({
    rpName: site.rpName(),
    rpID: site.rpId(),
    userName: user.email,
    userDisplayName: user.email,
    userID: new Uint8Array(Buffer.from(handle, 'base64url')),
    timeout: TIMEOUT,
    attestationType: 'none',
    excludeCredentials: descriptors(user.mfa?.passkeys ?? []),
    authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
    supportedAlgorithmIDs: ALGORITHMS
  });

/** Checks a new passkey against the challenge sent. Throws (or resolves null) when it does not verify. */
export const verifyRegistration = async (
  response: RegistrationResponseJSON,
  expectedChallenge: string
): Promise<NewPasskey | null> => {
  try {
    const result = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: site.origin(),
      expectedRPID: site.rpId(),
      requireUserVerification: false,
      supportedAlgorithmIDs: ALGORITHMS
    });
    if (!result.verified) return null;
    const { credential, credentialDeviceType, credentialBackedUp } = result.registrationInfo;
    if (!isBase64url(credential.id)) return null;
    const transports = (response.response?.transports ?? credential.transports ?? []).filter(
      (transport): transport is string => typeof transport === 'string' && transport.length <= 20
    );
    return {
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey),
      counter: credential.counter,
      transports: transports.slice(0, 10),
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp
    };
  } catch (err) {
    // The library's messages describe the response, never a secret.
    log.debug('A passkey registration did not verify', { reason: err instanceof Error ? err.message : 'unknown' });
    return null;
  }
};

/**
 * Options for using a passkey. With `passkeys`, they are the allowed
 * credentials (a second factor, or confirming a change); with null, any
 * discoverable passkey for this site (passkey-first sign-in).
 */
export const authenticationOptions = (
  passkeys: Passkey[] | null,
  userVerification: 'preferred' | 'required'
): Promise<PublicKeyCredentialRequestOptionsJSON> =>
  generateAuthenticationOptions({
    rpID: site.rpId(),
    timeout: TIMEOUT,
    userVerification,
    ...(passkeys ? { allowCredentials: descriptors(passkeys) } : {})
  });

/** The challenge a browser response answers (from its clientDataJSON), or null if it cannot be read. */
export const challengeOf = (response: AuthenticationResponseJSON | RegistrationResponseJSON): string | null => {
  try {
    const encoded = (response as { response?: { clientDataJSON?: unknown } } | null)?.response?.clientDataJSON;
    if (!isBase64url(encoded)) return null;
    const clientData = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as { challenge?: unknown };
    return isBase64url(clientData?.challenge) ? clientData.challenge : null;
  } catch {
    return null;
  }
};

/**
 * Checks an assertion from one of this account's passkeys against the
 * challenge sent: origin, rpID, signature, user verification when required,
 * and a counter that has not gone back. On success updates the passkey's
 * counter and lastUsedAt and resolves true; otherwise false.
 */
export const verifyAuthentication = async (
  user: UserDocument,
  response: AuthenticationResponseJSON,
  expectedChallenge: string,
  requireUserVerification: boolean
): Promise<boolean> => {
  if (!response || typeof response !== 'object' || !isBase64url(response.id)) return false;
  if (typeof expectedChallenge !== 'string' || !expectedChallenge) return false;
  const passkey = (user.mfa?.passkeys ?? []).find((entry) => sameText(entry.credentialId, response.id));
  if (!passkey) return false;
  // A user handle, when the authenticator sends one, must be this account's.
  const userHandle = response.response?.userHandle;
  if (userHandle && !(user.mfa?.handle && sameText(userHandle, user.mfa.handle))) return false;
  let newCounter: number;
  try {
    const result = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: site.origin(),
      expectedRPID: site.rpId(),
      credential: {
        id: passkey.credentialId,
        publicKey: new Uint8Array(passkey.publicKey),
        counter: passkey.counter,
        transports: [...(passkey.transports ?? [])] as never
      },
      requireUserVerification
    });
    if (!result.verified) return false;
    newCounter = result.authenticationInfo.newCounter;
  } catch (err) {
    log.debug('A passkey assertion did not verify', { reason: err instanceof Error ? err.message : 'unknown' });
    return false;
  }
  // Only from the counter checked above, so two uses at once cannot both move it.
  const saved = await User.updateOne(
    { _id: user._id, 'mfa.passkeys': { $elemMatch: { _id: passkey._id, counter: passkey.counter } } },
    { $set: { 'mfa.passkeys.$.counter': newCounter, 'mfa.passkeys.$.lastUsedAt': new Date() } }
  );
  return saved.matchedCount === 1;
};

/**
 * Passkey-first sign-in: the account a passkey belongs to, by its credential
 * id, when the response's userHandle matches mfa.handle; otherwise null.
 */
export const accountOf = async (response: AuthenticationResponseJSON): Promise<UserDocument | null> => {
  if (!response || typeof response !== 'object' || !isBase64url(response.id)) return null;
  const userHandle = response.response?.userHandle;
  if (!isBase64url(userHandle)) return null;
  const user = await User.findOne({ 'mfa.passkeys.credentialId': response.id }).select('-password');
  if (!user || user.guest || !user.mfa?.handle) return null;
  return sameText(userHandle, user.mfa.handle) ? user : null;
};
