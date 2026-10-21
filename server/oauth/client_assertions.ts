// The checks on an app's signed token request (private_key_jwt; RFC 7523,
// docs/adr/0024 "Amended: ChatGPT's document"), only with
// OAUTH_CIMD_AUTH=private_key_jwt. oidc-provider has already checked the
// assertion's alg (one of CLIENT_KEY_ALGS, or the app's own), its signature
// against the app's keys, exp, nbf, jti, iss (the client_id) and an aud it
// knows; these run after, as its assertJwtClientAuthClaimsAndHeader:
//
//   - iss and sub both the client_id (RFC 7523 section 3), so an assertion
//     the app's key signed for something else is not taken as one for us;
//   - typ: none, JWT or client-authentication+jwt (draft-ietf-oauth-rfc7523bis),
//     so no other kind of token (an access token, a DPoP proof) passes as one;
//   - a short life: iat given, not in the future, at most ASSERTION_SECONDS
//     old, and exp at most ASSERTION_SECONDS ahead (a long-lived one would be
//     a stolen assertion's window);
//   - aud: one value, this server's issuer; the token endpoint's address is
//     taken too for now and logged, until we know what ChatGPT sends;
//   - used once, even by two requests at the same moment: claimAssertion
//     inserts a record whose id is the iss and jti, and a second insert fails
//     on the unique _id. (oidc-provider's own check, which runs after, finds
//     and then saves, so two at once could both pass it.)
//
// A refusal is invalid_client, without saying which check failed.
import { errors, type KoaContextWithOIDC } from 'oidc-provider';
import * as log from '../lib/log.ts';
import { isDuplicateKey } from '../lib/mongo_errors.ts';
import { OAuthRecord, recordKey } from './adapter.ts';

/** The longest an assertion may live, and the oldest it may be, in seconds. */
export const ASSERTION_SECONDS = 5 * 60;
/** The clock difference allowed, as oidc-provider's own (clockTolerance). */
export const CLOCK_TOLERANCE = 15;

const KIND = 'ClientAssertion';
const TYPES = new Set(['jwt', 'client-authentication+jwt']);

type Json = Record<string, unknown>;

const refuse = (why: string): never => {
  throw new errors.InvalidClientAuth(why);
};

/**
 * Checks an assertion's header and claims (as above, all but the one use);
 * which address its aud named. Throws invalid_client otherwise.
 */
export const checkAssertion = (
  claims: Json,
  header: Json,
  { issuer, tokenEndpoint, clientId }: { issuer: string; tokenEndpoint: string; clientId: string },
  now = Math.floor(Date.now() / 1000)
): 'issuer' | 'token endpoint' => {
  // RFC 7523 section 3: iss and sub are both the client_id (oidc-provider checks only iss).
  if (claims.iss !== clientId) refuse('client assertion iss must be the client_id');
  if (claims.sub !== clientId) refuse('client assertion sub must be the client_id');
  const typ = header.typ;
  if (typ !== undefined) {
    const type = typeof typ === 'string' ? typ.toLowerCase().replace(/^application\//, '') : '';
    if (!TYPES.has(type)) refuse('client assertion typ is not taken');
  }
  const { iat, exp } = claims;
  if (typeof iat !== 'number' || !Number.isFinite(iat)) refuse('client assertion must have iat');
  if (typeof exp !== 'number' || !Number.isFinite(exp)) refuse('client assertion must have exp');
  if ((iat as number) > now + CLOCK_TOLERANCE) refuse('client assertion iat is in the future');
  if (now - (iat as number) > ASSERTION_SECONDS + CLOCK_TOLERANCE) refuse('client assertion is too old');
  if ((exp as number) - now > ASSERTION_SECONDS + CLOCK_TOLERANCE) refuse('client assertion lives too long');
  if (typeof claims.jti !== 'string' || !claims.jti || claims.jti.length > 256) refuse('client assertion jti');
  let aud = claims.aud;
  if (Array.isArray(aud)) {
    if (aud.length !== 1) refuse('client assertion aud must have one value');
    aud = aud[0];
  }
  if (aud === issuer) return 'issuer';
  if (aud === tokenEndpoint) return 'token endpoint';
  return refuse('client assertion aud must be the issuer');
};

/**
 * Marks an assertion used (by its iss and jti) until it expires; a second use,
 * even one at the same moment, is refused. The record goes with the TTL
 * index on expiresAt (adapter.ts).
 */
export const claimAssertion = async (iss: string, jti: string, exp: number): Promise<void> => {
  try {
    await OAuthRecord.create({
      _id: recordKey(KIND, JSON.stringify([iss, jti])),
      kind: KIND,
      payload: '{}',
      expiresAt: new Date((exp + CLOCK_TOLERANCE) * 1000)
    });
  } catch (err) {
    if (isDuplicateKey(err)) refuse('client assertion tokens must only be used once');
    throw err;
  }
};

/** oidc-provider's assertJwtClientAuthClaimsAndHeader: checkAssertion, then claimAssertion. */
export const assertClientAssertion = async (
  ctx: KoaContextWithOIDC,
  claims: Json,
  header: Json,
  client: { clientId: string }
): Promise<void> => {
  const audience = checkAssertion(claims, header, {
    issuer: ctx.oidc.issuer,
    tokenEndpoint: ctx.oidc.urlFor('token'),
    clientId: client.clientId
  });
  if (audience === 'token endpoint') {
    log.info('A client assertion named the token endpoint as its audience', { client: client.clientId });
  }
  await claimAssertion(claims.iss as string, claims.jti as string, claims.exp as number);
};
