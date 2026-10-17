// Glazecalc as an OAuth client of Google and GitHub, for signing in
// (docs/adr/0015-provider-sign-in.md, docs/integrations-plan.md Phase 1).
// The routes are server/routes/oauth_routes.ts.
//
// Both use the authorization code flow with PKCE (S256) and `state`; Google's
// is OpenID Connect, so it has a `nonce` and an ID token too. Written with
// fetch and node:crypto rather than a library: two fixed providers need four
// requests between them, and the ID token is checked with jsonwebtoken, which
// the app already uses. What comes back is the provider's unchanging id for the
// person (Google's `sub`, GitHub's numeric `id`, never the login name) and an
// email with whether the provider has verified it. Every provider token is
// dropped once the identity is read.
//
// Settings, read when used. A provider is on only when both of its are set,
// and its button shows only then (deploy/README.md, "Sign in with Google and
// GitHub"):
//   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
//   GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET
// The callback each is registered with is SITE_URL + /api/auth/<provider>/callback.
//
//   OAUTH_TEST_BASE  outside production only: every provider endpoint is under
//                    this address instead (the tests' fake provider).
import crypto, { type KeyObject } from 'node:crypto';
import jwt from 'jsonwebtoken';
import * as log from './log.ts';
import type { MessageCode } from './messages.ts';
import { siteUrl } from './site.ts';

export const PROVIDERS = ['google', 'github'] as const;
export type ProviderId = (typeof PROVIDERS)[number];

export const isProvider = (value: unknown): value is ProviderId =>
  typeof value === 'string' && (PROVIDERS as readonly string[]).includes(value);

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
  /** Google: its signing keys and the issuers its ID tokens may name. */
  jwks?: string;
  issuers?: string[];
  /** GitHub: its REST API. */
  api?: string;
}

const testBase = (): string | null =>
  process.env.NODE_ENV !== 'production' && process.env.OAUTH_TEST_BASE
    ? process.env.OAUTH_TEST_BASE.replace(/\/+$/, '')
    : null;

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
  github: ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET']
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
   * asked to sign the person in again (max_age=0) and its answer must say
   * they did after this (auth_time). GitHub cannot be asked to (ADR 15).
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

// Google's signing keys, by key id, fetched when a token names one not yet
// known (they rotate every few weeks), at most once a minute.
const keyCache = new Map<string, { keys: Map<string, KeyObject>; at: number }>();
const REFETCH_MS = 60 * 1000;

const fetchKeys = async (url: string): Promise<Map<string, KeyObject>> => {
  let res: Response;
  try {
    res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (err) {
    throw failed('keys request: ' + log.codeOf(err));
  }
  const body = (await readJson(res)) as { keys?: unknown } | null;
  if (!res.ok || !body || !Array.isArray(body.keys)) throw failed('keys answer ' + res.status);
  const keys = new Map<string, KeyObject>();
  for (const jwk of body.keys as Array<Record<string, unknown>>) {
    if (jwk?.kty !== 'RSA' || typeof jwk.kid !== 'string' || (jwk.use && jwk.use !== 'sig')) continue;
    try {
      keys.set(jwk.kid, crypto.createPublicKey({ key: jwk as crypto.JsonWebKey, format: 'jwk' }));
    } catch {
      // One unreadable key does not stop the others.
    }
  }
  return keys;
};

const keyFor = async (url: string, kid: string): Promise<KeyObject> => {
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
  const idToken = tokens.id_token;
  if (typeof idToken !== 'string') throw failed('no ID token');
  const decoded = jwt.decode(idToken, { complete: true });
  if (!decoded || typeof decoded.payload === 'string' || decoded.header.alg !== 'RS256' || !decoded.header.kid) {
    throw failed('ID token not readable');
  }
  const { jwks, issuers } = endpoints('google');
  const key = await keyFor(jwks!, decoded.header.kid);
  let claims: jwt.JwtPayload;
  try {
    claims = jwt.verify(idToken, key, {
      algorithms: ['RS256'],
      audience: credentials('google')!.id,
      issuer: issuers as [string, ...string[]],
      clockTolerance: CLOCK_TOLERANCE
    }) as jwt.JwtPayload;
  } catch (err) {
    throw failed('ID token refused: ' + (err instanceof Error ? err.name : 'error'));
  }
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
  const email = typeof claims.email === 'string' && claims.email ? claims.email.trim().toLowerCase() : null;
  return { subject: claims.sub, email, emailVerified: claims.email_verified === true };
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
  return provider === 'google' ? googleIdentity(tokens, started.nonce, started.freshSince) : githubIdentity(tokens);
};
