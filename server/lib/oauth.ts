// Glazecalc as an OAuth client of Google, GitHub and Microsoft, for signing in
// (docs/adr/0015-provider-sign-in.md, docs/adr/0023-microsoft-sign-in.md,
// docs/integrations-plan.md Phase 1). The routes are server/routes/oauth_routes.ts.
//
// All use the authorization code flow with PKCE (S256) and `state`; Google's
// and Microsoft's are OpenID Connect, so they have a `nonce` and an ID token
// too. Written with fetch and node:crypto rather than a library: three fixed
// providers need a handful of requests between them, and the ID tokens are
// checked with jsonwebtoken, which the app already uses. What comes back is the
// provider's unchanging id for the person (Google's `sub`, GitHub's numeric
// `id`, never the login name; Microsoft's tenant and `sub`) and an email with
// whether the provider has verified it. Microsoft's email is never trusted
// (trustsEmail). Every provider token is dropped once the identity is read.
//
// Settings, read when used. A provider is on only when both of its are set,
// and its button shows only then (deploy/README.md, "Sign in with Google,
// GitHub and Microsoft"):
//   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
//   GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET
//   MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET
// The callback each is registered with is SITE_URL + /api/auth/<provider>/callback.
//
//   OAUTH_TEST_BASE  only with NODE_ENV=test: every provider endpoint is under
//                    this address instead (the tests' fake provider); the
//                    server will not start with it and NODE_ENV=production.
import crypto, { type KeyObject } from 'node:crypto';
import jwt from 'jsonwebtoken';
import * as log from './log.ts';
import type { MessageCode } from './messages.ts';
import { siteUrl } from './site.ts';

export const PROVIDERS = ['google', 'github', 'microsoft'] as const;
export type ProviderId = (typeof PROVIDERS)[number];

export const isProvider = (value: unknown): value is ProviderId =>
  typeof value === 'string' && (PROVIDERS as readonly string[]).includes(value);

/**
 * Whether the provider's email may find an account, or make one confirmed.
 * Microsoft's may not: its `email` claim "isn't guaranteed to be correct and
 * is mutable over time - never use it for authorization"
 * (https://learn.microsoft.com/en-us/entra/identity-platform/optional-claims-reference);
 * a tenant's administrator can set it to any address ("nOAuth"). A new
 * account from Microsoft starts with its email unconfirmed, and an email
 * another account has is refused, never linked (ADR 23).
 */
export const trustsEmail = (provider: ProviderId): boolean => provider !== 'microsoft';

/** What a provider says about the person. */
export interface ProviderIdentity {
  subject: string;
  /** Lower-cased; null when the provider sent none. */
  email: string | null;
  /** Whether the provider says the person controls the email. */
  emailVerified: boolean;
}

interface Endpoints {
  authorize: string;
  token: string;
  /** Google and Microsoft: their signing keys. Google: the issuers its ID tokens may name. */
  jwks?: string;
  issuers?: string[];
  /**
   * Microsoft: the issuer, with `{tenantid}` for the token's own tenant (the
   * multi-tenant check of
   * https://learn.microsoft.com/en-us/entra/identity-platform/access-tokens#validate-the-issuer).
   */
  issuerTemplate?: string;
  /** GitHub: its REST API. */
  api?: string;
}

/**
 * OAUTH_TEST_BASE when it may be used: only with NODE_ENV=test outright (not
 * merely "not production"), since it sends every provider step, and the ID
 * tokens' keys, to another address.
 */
export const testBase = (): string | null =>
  process.env.NODE_ENV === 'test' && process.env.OAUTH_TEST_BASE
    ? process.env.OAUTH_TEST_BASE.replace(/\/+$/, '')
    : null;

/**
 * At start: throws if OAUTH_TEST_BASE is set with NODE_ENV=production (a
 * stray test setting on a real server), and warns when the fake provider is on.
 */
export const checkTestBase = (): void => {
  if (process.env.OAUTH_TEST_BASE && process.env.NODE_ENV === 'production') {
    throw new Error('OAUTH_TEST_BASE must not be set when NODE_ENV is production');
  }
  if (testBase()) log.warn('OAUTH_TEST_BASE is set: sign-in providers are the tests’ fake provider');
};
checkTestBase();

/** Where each provider's steps are. */
export const endpoints = (provider: ProviderId): Endpoints => {
  const base = testBase();
  if (provider === 'google') {
    return base
      ? {
          authorize: base + '/google/authorize',
          token: base + '/google/token',
          jwks: base + '/google/jwks',
          issuers: [base + '/google']
        }
      : {
          authorize: 'https://accounts.google.com/o/oauth2/v2/auth',
          token: 'https://oauth2.googleapis.com/token',
          jwks: 'https://www.googleapis.com/oauth2/v3/certs',
          issuers: ['https://accounts.google.com', 'accounts.google.com']
        };
  }
  if (provider === 'microsoft') {
    // The `common` endpoints: personal and work or school accounts (the owner's
    // decision; https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc).
    return base
      ? {
          authorize: base + '/microsoft/authorize',
          token: base + '/microsoft/token',
          jwks: base + '/microsoft/jwks',
          issuerTemplate: base + '/microsoft/{tenantid}/v2.0'
        }
      : {
          authorize: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
          token: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
          jwks: 'https://login.microsoftonline.com/common/discovery/v2.0/keys',
          issuerTemplate: 'https://login.microsoftonline.com/{tenantid}/v2.0'
        };
  }
  return base
    ? { authorize: base + '/github/authorize', token: base + '/github/token', api: base + '/github/api' }
    : {
        authorize: 'https://github.com/login/oauth/authorize',
        token: 'https://github.com/login/oauth/access_token',
        api: 'https://api.github.com'
      };
};

const SETTINGS: Record<ProviderId, [string, string]> = {
  google: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
  github: ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET'],
  microsoft: ['MICROSOFT_CLIENT_ID', 'MICROSOFT_CLIENT_SECRET']
};

/** The provider's client id and secret, or null when it is off. */
export const credentials = (provider: ProviderId): { id: string; secret: string } | null => {
  const [idName, secretName] = SETTINGS[provider];
  const id = (process.env[idName] ?? '').trim();
  const secret = (process.env[secretName] ?? '').trim();
  return id && secret ? { id, secret } : null;
};

/** The providers that are on here, in the order the buttons show. */
export const enabled = (): ProviderId[] => PROVIDERS.filter((provider) => credentials(provider) !== null);

/** The one address the provider sends the person back to; registered with the provider. */
export const redirectUri = (provider: ProviderId): string => siteUrl() + '/api/auth/' + provider + '/callback';

/** 32 random bytes, base64url: a state, a nonce, a PKCE verifier, the cookie's value. */
export const randomValue = (): string => crypto.randomBytes(32).toString('base64url');

export const sha256 = (value: string): string => crypto.createHash('sha256').update(value).digest('base64url');

/** What the provider's sign-in page is sent with. */
export interface Started {
  state: string;
  nonce: string;
  verifier: string;
  /**
   * A fresh sign-in confirming a change (ADR 15): when it started. Google is
   * asked to sign the person in again (max_age=0), Microsoft too
   * (prompt=login, ADR 23), and their answers must say they did after this
   * (auth_time). GitHub cannot be asked to (ADR 15).
   */
  freshSince?: Date;
}

/** How far the provider's clock may be from ours, in seconds. */
const CLOCK_TOLERANCE = 60;

/** The provider's sign-in page, for a start. */
export const authorizeUrl = (provider: ProviderId, started: Started): string => {
  const { id } = credentials(provider)!;
  const url = new URL(endpoints(provider).authorize);
  const params: Record<string, string> = {
    response_type: 'code',
    client_id: id,
    redirect_uri: redirectUri(provider),
    state: started.state,
    code_challenge: sha256(started.verifier),
    code_challenge_method: 'S256'
  };
  if (provider === 'google') {
    // Only the account id and the email: no name or picture arrives.
    Object.assign(params, { scope: 'openid email', nonce: started.nonce, prompt: 'select_account' });
    if (started.freshSince) {
      // Sign the person in again whatever their Google session (OpenID Connect
      // max_age), and say when in the ID token (auth_time, which Google sends
      // when asked for and turned on in the client's settings: deploy/README.md).
      Object.assign(params, {
        max_age: '0',
        claims: JSON.stringify({ id_token: { auth_time: { essential: true } } })
      });
    }
  } else if (provider === 'microsoft') {
    // Only the account id and the email: no `profile`, so no name and no oid.
    // The account picker, as with Google; for a fresh sign-in, prompt=login,
    // which "forces the user to enter their credentials on that request"
    // (https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc).
    // No max_age: Microsoft does not document it, and with max_age=0 its ID
    // token has been seen to arrive already expired (ADR 23). auth_time comes
    // from the app registration's optional claims (deploy/README.md).
    Object.assign(params, {
      scope: 'openid email',
      nonce: started.nonce,
      prompt: started.freshSince ? 'login' : 'select_account'
    });
  } else {
    Object.assign(params, { scope: 'user:email', allow_signup: 'true' });
    // GitHub has no way to ask for the password again; the account picker at
    // least shows which GitHub account is answering (ADR 15).
    if (started.freshSince) params.prompt = 'select_account';
  }
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  return url.toString();
};

/** A provider step that did not work; `code` is the message for the person. */
export class ProviderError extends Error {
  readonly code: MessageCode;
  constructor(code: MessageCode, detail: string) {
    super(detail);
    this.code = code;
  }
}

const TIMEOUT_MS = 10000;
const failed = (detail: string) => new ProviderError('provider-failed', detail);

const readJson = async (res: Response): Promise<unknown> => {
  try {
    return await res.json();
  } catch {
    return null;
  }
};

/** Swaps the code for tokens at the provider's token endpoint. */
const exchange = async (provider: ProviderId, code: string, verifier: string): Promise<Record<string, unknown>> => {
  const { id, secret } = credentials(provider)!;
  let res: Response;
  try {
    res = await fetch(endpoints(provider).token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri(provider),
        client_id: id,
        client_secret: secret,
        code_verifier: verifier
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });
  } catch (err) {
    throw failed('token request: ' + log.codeOf(err));
  }
  const body = (await readJson(res)) as Record<string, unknown> | null;
  if (body?.error === 'invalid_client' || res.status === 401) {
    // The owner's settings, not the person: say so in the log (deploy/README.md).
    log.warn('A sign-in provider refused the client id or secret', { code: 'OAUTH_INVALID_CLIENT', provider });
  }
  if (!res.ok || !body || typeof body !== 'object' || body.error) {
    throw failed('token answer ' + res.status + ' ' + String(body?.error ?? ''));
  }
  return body;
};

// Google's and Microsoft's signing keys, by key id, fetched when a token names
// one not yet known (they rotate every few weeks), at most once a minute; each
// with the issuer the key set names for it, when it names one (Microsoft's do).
interface SigningKey {
  key: KeyObject;
  issuer?: string;
}
const keyCache = new Map<string, { keys: Map<string, SigningKey>; at: number }>();
const REFETCH_MS = 60 * 1000;

const fetchKeys = async (url: string): Promise<Map<string, SigningKey>> => {
  let res: Response;
  try {
    res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (err) {
    throw failed('keys request: ' + log.codeOf(err));
  }
  const body = (await readJson(res)) as { keys?: unknown } | null;
  if (!res.ok || !body || !Array.isArray(body.keys)) throw failed('keys answer ' + res.status);
  const keys = new Map<string, SigningKey>();
  for (const jwk of body.keys as Array<Record<string, unknown>>) {
    if (jwk?.kty !== 'RSA' || typeof jwk.kid !== 'string' || (jwk.use && jwk.use !== 'sig')) continue;
    try {
      keys.set(jwk.kid, {
        key: crypto.createPublicKey({ key: jwk as crypto.JsonWebKey, format: 'jwk' }),
        ...(typeof jwk.issuer === 'string' && { issuer: jwk.issuer })
      });
    } catch {
      // One unreadable key does not stop the others.
    }
  }
  return keys;
};

const keyFor = async (url: string, kid: string): Promise<SigningKey> => {
  const cached = keyCache.get(url);
  const known = cached?.keys.get(kid);
  if (known) return known;
  if (cached && Date.now() - cached.at < REFETCH_MS) throw failed('unknown key id');
  const keys = await fetchKeys(url);
  keyCache.set(url, { keys, at: Date.now() });
  const key = keys.get(kid);
  if (!key) throw failed('unknown key id');
  return key;
};

/** Forgets the fetched keys (the tests' fake provider makes new ones). */
export const forgetKeys = (): void => keyCache.clear();

/** An ID token's signed claims: signature, audience and times (exp, nbf) checked; the rest is the caller's. */
const verifiedClaims = async (
  provider: 'google' | 'microsoft',
  tokens: Record<string, unknown>,
  options: Pick<jwt.VerifyOptions, 'issuer'> = {}
): Promise<{ claims: jwt.JwtPayload; key: SigningKey }> => {
  const idToken = tokens.id_token;
  if (typeof idToken !== 'string') throw failed('no ID token');
  const decoded = jwt.decode(idToken, { complete: true });
  if (!decoded || typeof decoded.payload === 'string' || decoded.header.alg !== 'RS256' || !decoded.header.kid) {
    throw failed('ID token not readable');
  }
  const key = await keyFor(endpoints(provider).jwks!, decoded.header.kid);
  try {
    const claims = jwt.verify(idToken, key.key, {
      algorithms: ['RS256'],
      audience: credentials(provider)!.id,
      clockTolerance: CLOCK_TOLERANCE,
      ...options
    }) as jwt.JwtPayload;
    return { claims, key };
  } catch (err) {
    throw failed('ID token refused: ' + (err instanceof Error ? err.name : 'error'));
  }
};

/** The nonce this sign-in sent, a subject, and for a fresh sign-in, that the person signed in after it started (auth_time). */
const checkClaims = (claims: jwt.JwtPayload, nonce: string, freshSince?: Date): string => {
  if (typeof claims.nonce !== 'string' || claims.nonce !== nonce) throw failed('nonce does not match');
  if (typeof claims.sub !== 'string' || !claims.sub) throw failed('no subject');
  if (freshSince) {
    const authTime = claims.auth_time;
    const earliest = freshSince.getTime() / 1000 - CLOCK_TOLERANCE;
    const latest = Date.now() / 1000 + CLOCK_TOLERANCE;
    if (typeof authTime !== 'number' || authTime < earliest || authTime > latest) {
      throw new ProviderError('provider-not-fresh', 'auth_time ' + (typeof authTime === 'number' ? 'old' : 'missing'));
    }
  }
  return claims.sub;
};

const emailOf = (claims: jwt.JwtPayload): string | null =>
  typeof claims.email === 'string' && claims.email ? claims.email.trim().toLowerCase() : null;

/**
 * Checks Google's ID token: its signature, issuer, audience, expiry and the
 * nonce this sign-in sent, and for a fresh sign-in, that Google signed the
 * person in after it started (auth_time).
 */
const googleIdentity = async (
  tokens: Record<string, unknown>,
  nonce: string,
  freshSince?: Date
): Promise<ProviderIdentity> => {
  const { claims } = await verifiedClaims('google', tokens, {
    issuer: endpoints('google').issuers as [string, ...string[]]
  });
  const subject = checkClaims(claims, nonce, freshSince);
  return { subject, email: emailOf(claims), emailVerified: claims.email_verified === true };
};

/** A tenant id: a GUID, as Microsoft's tokens write it. */
const TENANT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Checks Microsoft's ID token as a multi-tenant app must
 * (https://learn.microsoft.com/en-us/entra/identity-platform/access-tokens#validate-the-issuer):
 * the signature against the `common` keys; `tid` a GUID; the issuer exactly
 * https://login.microsoftonline.com/{tid}/v2.0 with the token's own tid; the
 * key's own issuer, its {tenantid} filled the same way, that same issuer;
 * the audience, expiry, not-before and nonce; and for a fresh sign-in,
 * auth_time (an optional claim, deploy/README.md: without it, nothing is
 * confirmed). The subject is the tenant and `sub` together: `sub` is unique
 * only within a tenant, and Microsoft asks that tid be part of the key to a
 * person's data. The email comes back never verified (trustsEmail).
 */
const microsoftIdentity = async (
  tokens: Record<string, unknown>,
  nonce: string,
  freshSince?: Date
): Promise<ProviderIdentity> => {
  const { claims, key } = await verifiedClaims('microsoft', tokens);
  const tid = claims.tid;
  if (typeof tid !== 'string' || !TENANT_ID.test(tid)) throw failed('no tenant id');
  const issuer = endpoints('microsoft').issuerTemplate!.replace('{tenantid}', tid);
  if (claims.iss !== issuer) throw failed('issuer is not the tenant');
  // A key the key set gives one tenant's issuer signs only that tenant's tokens; one with none, nothing.
  if (!key.issuer || key.issuer.replace(/\{tenantid\}/i, tid) !== issuer) throw failed('key is not the issuer');
  const sub = checkClaims(claims, nonce, freshSince);
  return { subject: tid + ':' + sub, email: emailOf(claims), emailVerified: false };
};

const githubGet = async (path: string, accessToken: string): Promise<unknown> => {
  let res: Response;
  try {
    res = await fetch(endpoints('github').api + path, {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: 'Bearer ' + accessToken,
        'User-Agent': 'Glazecalc',
        'X-GitHub-Api-Version': '2022-11-28'
      },
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });
  } catch (err) {
    throw failed('GitHub API request: ' + log.codeOf(err));
  }
  const body = await readJson(res);
  if (!res.ok || !body) throw failed('GitHub API answer ' + res.status);
  return body;
};

/** GitHub's numeric user id, and its primary email only when GitHub has verified it (GET /user/emails). */
const githubIdentity = async (tokens: Record<string, unknown>): Promise<ProviderIdentity> => {
  const accessToken = tokens.access_token;
  if (typeof accessToken !== 'string' || !accessToken) throw failed('no access token');
  const user = (await githubGet('/user', accessToken)) as { id?: unknown };
  if (typeof user.id !== 'number' || !Number.isSafeInteger(user.id)) throw failed('no user id');
  const emails = await githubGet('/user/emails', accessToken);
  const primary = Array.isArray(emails)
    ? (emails as Array<{ email?: unknown; primary?: unknown; verified?: unknown }>).find(
        (entry) => entry?.primary === true && typeof entry.email === 'string'
      )
    : undefined;
  return {
    subject: String(user.id),
    email: primary ? (primary.email as string).trim().toLowerCase() : null,
    emailVerified: primary?.verified === true
  };
};

/** Finishes the provider's part: the code from the callback, swapped and read. */
export const identify = async (provider: ProviderId, code: string, started: Started): Promise<ProviderIdentity> => {
  const tokens = await exchange(provider, code, started.verifier);
  if (provider === 'google') return googleIdentity(tokens, started.nonce, started.freshSince);
  if (provider === 'microsoft') return microsoftIdentity(tokens, started.nonce, started.freshSince);
  return githubIdentity(tokens);
};
