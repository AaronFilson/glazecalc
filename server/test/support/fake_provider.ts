// A stand-in for Google, GitHub and Microsoft, for the server tests and the
// browser tests (e2e/oauth.spec.js): the endpoints server/lib/oauth.ts calls
// when OAUTH_TEST_BASE points here. It checks what a real provider checks (the
// client id and secret, the redirect URI, the PKCE verifier against the
// challenge, a code used once) and answers as each does: Google with an ID
// token signed by a key of its own, published at /google/jwks; GitHub with an
// access token for /user and /user/emails; Microsoft with an ID token naming
// the person's tenant (tid), its issuer <base>/microsoft/<tid>/v2.0, signed by
// the same key, published at /microsoft/jwks with the issuer template
// Microsoft's `common` keys carry.
//
// The person signing in at the provider is set beforehand: for the next
// authorize request (next.google = { sub, email, emailVerified }), which
// redirects back as the provider would, or by issue(), which reads the
// authorize URL the app made and gives the code the callback gets.
import crypto from 'node:crypto';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import jwt from 'jsonwebtoken';

export type FakeProviderId = 'google' | 'github' | 'microsoft';

/** Microsoft's tenant for personal accounts; the fake's default tenant. */
export const CONSUMER_TENANT = '9188040d-6c67-4c5b-b112-36a304b66dad';

export interface FakeIdentity {
  /** Google's and Microsoft's sub; GitHub's id, digits only. */
  sub: string;
  email?: string | null;
  /** Google and GitHub; Microsoft sends no such claim. */
  emailVerified?: boolean;
  /** Microsoft: the tenant (CONSUMER_TENANT when none is given). */
  tid?: string;
}

interface Grant {
  provider: FakeProviderId;
  identity: FakeIdentity;
  nonce?: string;
  challenge: string;
  method: string;
  redirectUri: string;
  clientId: string;
  /** max_age=0 (Google) or prompt=login (Microsoft) was asked for: the person signed in again just now (auth_time). */
  signInAgain: boolean;
}

/** The settings the app needs to use the fake: the client ids and secrets it expects. */
export const FAKE_SETTINGS = {
  GOOGLE_CLIENT_ID: 'google-client',
  GOOGLE_CLIENT_SECRET: 'google-secret',
  GITHUB_CLIENT_ID: 'github-client',
  GITHUB_CLIENT_SECRET: 'github-secret',
  MICROSOFT_CLIENT_ID: '00000000-1111-2222-3333-444444444444',
  MICROSOFT_CLIENT_SECRET: 'microsoft-secret'
};

const SECRETS: Record<FakeProviderId, [string, string]> = {
  google: [FAKE_SETTINGS.GOOGLE_CLIENT_ID, FAKE_SETTINGS.GOOGLE_CLIENT_SECRET],
  github: [FAKE_SETTINGS.GITHUB_CLIENT_ID, FAKE_SETTINGS.GITHUB_CLIENT_SECRET],
  microsoft: [FAKE_SETTINGS.MICROSOFT_CLIENT_ID, FAKE_SETTINGS.MICROSOFT_CLIENT_SECRET]
};

const sha256 = (value: string): string => crypto.createHash('sha256').update(value).digest('base64url');

export class FakeProvider {
  /** http://127.0.0.1:<port>, once started: OAUTH_TEST_BASE. */
  base = '';
  /** Who signs in at the next authorize request, per provider; none answers access_denied. */
  next: Partial<Record<FakeProviderId, FakeIdentity>> = {};
  /** Changes made to the next ID token, to test that the app refuses it (nonce, aud, iss, tid, exp, auth_time). */
  tamper: Record<string, unknown> | null = null;
  /**
   * The issuer /microsoft/jwks names for its key: the `common` key set's
   * template by default (null); one tenant's issuer to test that its key signs
   * for no other; or '' for none.
   */
  microsoftKeyIssuer: string | null = null;
  /** Token requests answered, per provider. */
  tokenRequests: Record<FakeProviderId, number> = { google: 0, github: 0, microsoft: 0 };
  private server: http.Server | null = null;
  private readonly keys: { privateKey: crypto.KeyObject; publicKey: crypto.KeyObject };
  private readonly kid: string;
  private readonly grants = new Map<string, Grant>();
  private readonly accessTokens = new Map<string, FakeIdentity>();

  /**
   * A new signing key for each fake, unless one is given (a PEM private key):
   * the browser tests give each worker's fake the same one, since the app keeps
   * the keys it fetched for a minute and would refuse a second fake's tokens.
   */
  constructor(privateKeyPem?: string) {
    if (privateKeyPem) {
      const privateKey = crypto.createPrivateKey(privateKeyPem);
      this.keys = { privateKey, publicKey: crypto.createPublicKey(privateKey) };
    } else {
      this.keys = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    }
    const der = this.keys.publicKey.export({ format: 'der', type: 'spki' });
    this.kid = 'fake-' + crypto.createHash('sha256').update(der).digest('hex').slice(0, 8);
  }

  async start(port = 0): Promise<void> {
    this.server = http.createServer((req, res) => {
      this.handle(req, res).catch(() => {
        res.writeHead(500).end();
      });
    });
    await new Promise<void>((resolve) => this.server!.listen(port, '127.0.0.1', resolve));
    this.base = 'http://127.0.0.1:' + (this.server.address() as AddressInfo).port;
  }

  async stop(): Promise<void> {
    if (this.server) await new Promise((resolve) => this.server!.close(resolve));
    this.server = null;
  }

  /**
   * As if the person signed in at the provider: reads the authorize URL the app
   * sent the browser to, and gives the code and state the callback gets.
   */
  issue(provider: FakeProviderId, authorizeUrl: string, identity: FakeIdentity): { code: string; state: string } {
    const url = new URL(authorizeUrl);
    const get = (name: string) => url.searchParams.get(name) ?? '';
    const code = crypto.randomBytes(16).toString('hex');
    this.grants.set(code, {
      provider,
      identity,
      nonce: url.searchParams.get('nonce') ?? undefined,
      challenge: get('code_challenge'),
      method: get('code_challenge_method'),
      redirectUri: get('redirect_uri'),
      clientId: get('client_id'),
      signInAgain: get('max_age') === '0' || (provider === 'microsoft' && get('prompt') === 'login')
    });
    return { code, state: get('state') };
  }

  private json(res: http.ServerResponse, status: number, body: unknown): void {
    res.writeHead(status, { 'Content-Type': 'application/json' }).end(JSON.stringify(body));
  }

  private async body(req: http.IncomingMessage): Promise<URLSearchParams> {
    let text = '';
    for await (const chunk of req) text += String(chunk);
    return new URLSearchParams(text);
  }

  private async handle(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const url = new URL(req.url ?? '/', this.base);
    const [, provider, ...rest] = url.pathname.split('/') as [string, FakeProviderId, ...string[]];
    const step = rest.join('/');
    if (!(provider in SECRETS)) return this.json(res, 404, { error: 'not_found' });

    if (step === 'authorize' && req.method === 'GET') {
      const back = new URL(url.searchParams.get('redirect_uri') ?? '');
      const identity = this.next[provider];
      delete this.next[provider];
      if (!identity) {
        back.searchParams.set('error', 'access_denied');
      } else {
        const { code } = this.issue(provider, url.toString(), identity);
        back.searchParams.set('code', code);
      }
      back.searchParams.set('state', url.searchParams.get('state') ?? '');
      res.writeHead(302, { Location: back.toString() }).end();
      return;
    }

    if (step === 'token' && req.method === 'POST') {
      const form = await this.body(req);
      const [id, secret] = SECRETS[provider];
      if (form.get('client_id') !== id || form.get('client_secret') !== secret) {
        return this.json(res, 401, { error: 'invalid_client' });
      }
      const code = form.get('code') ?? '';
      const grant = this.grants.get(code);
      this.grants.delete(code);
      const verifier = form.get('code_verifier') ?? '';
      if (
        !grant ||
        grant.provider !== provider ||
        grant.clientId !== id ||
        grant.method !== 'S256' ||
        grant.redirectUri !== form.get('redirect_uri') ||
        sha256(verifier) !== grant.challenge
      ) {
        // GitHub answers 200 with the error; Google 400.
        return this.json(res, provider === 'github' ? 200 : 400, { error: 'invalid_grant' });
      }
      this.tokenRequests[provider]++;
      if (provider === 'github') {
        const accessToken = 'gho_' + crypto.randomBytes(12).toString('hex');
        this.accessTokens.set(accessToken, grant.identity);
        return this.json(res, 200, { access_token: accessToken, token_type: 'bearer', scope: 'user:email' });
      }
      const now = Math.floor(Date.now() / 1000);
      if (provider === 'microsoft') {
        // As Microsoft's v2.0 ID token: the tenant's issuer, tid, a sub, the
        // email when the account has one (never email_verified), and auth_time
        // when the app registration asks for it (here: after prompt=login).
        const tid = grant.identity.tid ?? CONSUMER_TENANT;
        const claims: Record<string, unknown> = {
          ver: '2.0',
          iss: this.base + '/microsoft/' + tid + '/v2.0',
          aud: id,
          tid,
          sub: grant.identity.sub,
          ...(grant.identity.email ? { email: grant.identity.email } : {}),
          nonce: grant.nonce,
          ...(grant.signInAgain && { auth_time: now }),
          iat: now,
          nbf: now,
          exp: now + 3600,
          ...this.tamper
        };
        this.tamper = null;
        const idToken = jwt.sign(claims, this.keys.privateKey, { algorithm: 'RS256', keyid: this.kid });
        return this.json(res, 200, { access_token: 'eyJ.fake', id_token: idToken, token_type: 'Bearer' });
      }
      const claims: Record<string, unknown> = {
        iss: this.base + '/google',
        aud: id,
        sub: grant.identity.sub,
        ...(grant.identity.email ? { email: grant.identity.email, email_verified: grant.identity.emailVerified } : {}),
        nonce: grant.nonce,
        ...(grant.signInAgain && { auth_time: now }),
        iat: now,
        exp: now + 3600,
        ...this.tamper
      };
      this.tamper = null;
      const idToken = jwt.sign(claims, this.keys.privateKey, { algorithm: 'RS256', keyid: this.kid });
      return this.json(res, 200, { access_token: 'ya29.fake', id_token: idToken, token_type: 'Bearer' });
    }

    if (provider === 'google' && step === 'jwks') {
      const jwk = this.keys.publicKey.export({ format: 'jwk' });
      return this.json(res, 200, { keys: [{ ...jwk, kid: this.kid, use: 'sig', alg: 'RS256' }] });
    }

    if (provider === 'microsoft' && step === 'jwks') {
      const jwk = this.keys.publicKey.export({ format: 'jwk' });
      const issuer = this.microsoftKeyIssuer ?? this.base + '/microsoft/{tenantid}/v2.0';
      return this.json(res, 200, {
        keys: [{ ...jwk, kid: this.kid, use: 'sig', ...(this.microsoftKeyIssuer !== '' && { issuer }) }]
      });
    }

    if (provider === 'github' && step.startsWith('api/')) {
      const auth = req.headers.authorization ?? '';
      const identity = this.accessTokens.get(auth.replace(/^Bearer /, ''));
      if (!identity) return this.json(res, 401, { message: 'Bad credentials' });
      if (step === 'api/user') return this.json(res, 200, { id: Number(identity.sub), login: 'potter' + identity.sub });
      if (step === 'api/user/emails') {
        // Another verified address that is not the primary one: only the primary counts.
        const emails: unknown[] = [{ email: 'other-' + identity.sub + '@example.org', primary: false, verified: true }];
        if (identity.email)
          emails.push({ email: identity.email, primary: true, verified: identity.emailVerified === true });
        return this.json(res, 200, emails);
      }
    }
    return this.json(res, 404, { error: 'not_found' });
  }
}
