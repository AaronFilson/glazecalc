// ChatGPT's client metadata document and signed token requests
// (OAUTH_CIMD_AUTH; docs/adr/0024, "Amended: ChatGPT's document"), off,
// public and private_key_jwt, with the network stood in for (nothing leaves
// the machine); then the token endpoint's limits, which suit the few shared
// addresses of Claude's and ChatGPT's servers.
import crypto from 'node:crypto';
import { errors, type ClientMetadata } from 'oidc-provider';
import {
  CEILINGS,
  countTokenGrant,
  networkKey,
  OAUTH_TOKEN_LIMITS,
  oauthTokenAll,
  oauthTokenFailures,
  resetTokenGrants
} from '../lib/rate_limit.ts';
import AccessToken from '../models/access_token.ts';
import { OAuthRecord, recordKey } from '../oauth/adapter.ts';
import {
  checkJwks,
  checkTestBase,
  cimdTestBase,
  countKeySetFetch,
  guardedFetch,
  JWKS_CACHE_SECONDS,
  JWKS_FETCH_LIMITS,
  JWKS_STALE_SECONDS,
  markKeySetProven,
  MOST_KEY_SETS,
  resetFetchCount,
  siteOf,
  useKeySetClock,
  useNetwork,
  type Network,
  type RawAnswer
} from '../oauth/cimd.ts';
import { ASSERTION_SECONDS, checkAssertion, claimAssertion } from '../oauth/client_assertions.ts';
import { checkClientMetadata, getProvider } from '../oauth/provider.ts';
import { expect } from './support/app.ts';
import {
  answer,
  authorize,
  connect,
  person,
  REDIRECT,
  refresh,
  register,
  request,
  resume,
  SITE,
  token,
  type Tokens
} from './support/oauth.ts';

const ADDRESS = '93.184.215.14';
const HOST = 'app.example';
const CALLBACK = 'https://app.example/callback';
const TOKEN_ENDPOINT = SITE + '/oauth/token';
const ASSERTION_TYPE = 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer';

let calls: string[] = [];

type Reply = (path: string) => Partial<RawAnswer> | undefined;

/** A stand-in for the network: every name is `address` (or as `lookup` says), and each path answers as `reply` says. */
const network = (reply: Reply, lookup?: (hostname: string) => string[]): Network => ({
  lookup: async (hostname) =>
    (lookup ? lookup(hostname) : [ADDRESS]).map((address) => ({ address, family: address.includes(':') ? 6 : 4 })),
  get: async ({ hostname, path }) => {
    calls.push(hostname + path);
    const answer = reply(path) ?? { status: 404 };
    return { status: 200, headers: { 'content-type': 'application/json' }, body: Buffer.from(''), ...answer };
  }
});

const json = (value: unknown, headers: Record<string, string> = {}): Partial<RawAnswer> => ({
  body: Buffer.from(JSON.stringify(value)),
  headers: { 'content-type': 'application/json', ...headers }
});

let n = 0;
/** A client_id no other test has used, and the address of its keys, on the same site. */
const fresh = () => {
  const id = `${Date.now()}-${n++}`;
  return { url: `https://${HOST}/clients/${id}.json`, jwksUri: `https://${HOST}/keys/${id}.json` };
};

/** A document shaped as ChatGPT's (https://chatgpt.com/oauth/client.json, read 2026-10-21). */
const chatgptDocument = (url: string, jwksUri: string, more: Record<string, unknown> = {}): ClientMetadata => ({
  client_id: url,
  client_name: 'ChatGPT Test',
  redirect_uris: [CALLBACK],
  grant_types: ['authorization_code', 'refresh_token'],
  response_types: ['code'],
  token_endpoint_auth_method: 'private_key_jwt',
  token_endpoint_auth_methods_supported: ['none', 'private_key_jwt'],
  token_endpoint_auth_signing_alg: 'RS256',
  jwks_uri: jwksUri,
  ...more
});

/** Claude's shape: a public app, nothing else. */
const claudeDocument = (url: string): ClientMetadata => ({
  client_id: url,
  client_name: 'Claude Test',
  redirect_uris: [CALLBACK],
  grant_types: ['authorization_code', 'refresh_token'],
  response_types: ['code'],
  token_endpoint_auth_method: 'none'
});

interface Key {
  privateKey: crypto.KeyObject;
  jwk: Record<string, unknown>;
}

const makeKey = (kind: 'rsa' | 'ec' | 'rsa1024', kid: string, alg = kind === 'ec' ? 'ES256' : 'RS256'): Key => {
  const pair =
    kind === 'ec'
      ? crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' })
      : crypto.generateKeyPairSync('rsa', { modulusLength: kind === 'rsa' ? 2048 : 1024 });
  return { privateKey: pair.privateKey, jwk: { ...pair.publicKey.export({ format: 'jwk' }), kid, use: 'sig', alg } };
};

const b64 = (value: unknown): string => Buffer.from(JSON.stringify(value)).toString('base64url');

/** A JWT signed as `header.alg` says: RS256, PS256, ES256, HS256 (with `secret`) or none. */
const signJwt = (header: Record<string, unknown>, claims: Record<string, unknown>, key?: Key, secret?: Buffer) => {
  const input = b64(header) + '.' + b64(claims);
  const data = Buffer.from(input);
  let signature = Buffer.alloc(0);
  if (header.alg === 'RS256') signature = crypto.sign('sha256', data, key!.privateKey);
  if (header.alg === 'PS256') {
    signature = crypto.sign('sha256', data, {
      key: key!.privateKey,
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
      saltLength: 32
    });
  }
  if (header.alg === 'ES256')
    signature = crypto.sign('sha256', data, { key: key!.privateKey, dsaEncoding: 'ieee-p1363' });
  if (header.alg === 'HS256') signature = crypto.createHmac('sha256', secret!).update(input).digest();
  return input + '.' + signature.toString('base64url');
};

const now = () => Math.floor(Date.now() / 1000);

/** A client assertion for the app, signed with `key`; `claims` and `header` change or (undefined) remove parts. */
const assertion = (
  clientId: string,
  key: Key,
  { claims = {}, header = {} }: { claims?: Record<string, unknown>; header?: Record<string, unknown> } = {}
): string => {
  const head: Record<string, unknown> = { alg: key.jwk.alg, kid: key.jwk.kid, typ: 'JWT', ...header };
  const body: Record<string, unknown> = {
    iss: clientId,
    sub: clientId,
    aud: SITE,
    jti: crypto.randomUUID(),
    iat: now(),
    exp: now() + 60,
    ...claims
  };
  for (const part of [head, body])
    for (const [name, value] of Object.entries(part)) if (value === undefined) delete part[name];
  return signJwt(head, body, key);
};

const signed = (value: string) => ({ client_assertion_type: ASSERTION_TYPE, client_assertion: value });

/** The person allows the app, and the app gets its code (not yet exchanged). */
const codeFor = async (clientId: string, session: string) => {
  const started = await authorize(clientId, { redirect: CALLBACK });
  expect(started.res.status, await started.res.clone().text()).to.equal(303);
  const allowed = await answer(started, session, { decision: 'allow' });
  const { redirectTo } = (await allowed.json()) as { redirectTo: string };
  const back = await resume(started, redirectTo);
  return { code: back.searchParams.get('code')!, verifier: started.verifier };
};

const exchange = (clientId: string, { code, verifier }: { code: string; verifier: string }, auth = {}) =>
  token({
    grant_type: 'authorization_code',
    code,
    redirect_uri: CALLBACK,
    client_id: clientId,
    code_verifier: verifier,
    ...auth
  });

const refreshSigned = (refreshToken: string, clientId: string, value: string, headers: Record<string, string> = {}) =>
  token({ grant_type: 'refresh_token', refresh_token: refreshToken, client_id: clientId, ...signed(value) }, headers);

const metadata = async () =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- JSON read in the tests
  (await (await request('/.well-known/oauth-authorization-server')).json()) as any;

/** What checkClientMetadata said when it refused (its error_description), or null when it took the document. */
const refusal = (check: () => void): string | null => {
  try {
    check();
    return null;
  } catch (err) {
    expect(err).to.be.instanceOf(errors.InvalidClientMetadata);
    return String((err as { error_description?: string }).error_description);
  }
};

const setMode = (mode: string | undefined): void => {
  if (mode === undefined) delete process.env.OAUTH_CIMD_AUTH;
  else process.env.OAUTH_CIMD_AUTH = mode;
};

describe('OAuth: ChatGPT’s document and signed token requests (OAUTH_CIMD_AUTH)', function () {
  this.timeout(30000);

  const rsa = makeKey('rsa', 'rsa-1');
  const ec = makeKey('ec', 'ec-1');

  beforeEach(() => {
    calls = [];
    resetFetchCount();
  });
  after(() => {
    useNetwork();
    useKeySetClock();
    setMode(undefined);
  });

  describe('off (the default): as before', () => {
    before(() => setMode(undefined));

    it('offers only none, refuses ChatGPT’s document and fetches nothing from its keys', async () => {
      const meta = await metadata();
      expect(meta.token_endpoint_auth_methods_supported).to.eql(['none']);
      expect(meta).to.not.have.property('token_endpoint_auth_signing_alg_values_supported');
      const { url, jwksUri } = fresh();
      useNetwork(network((path) => (url.endsWith(path) ? json(chatgptDocument(url, jwksUri)) : undefined)));
      const started = await authorize(url, { redirect: CALLBACK });
      expect(started.res.status).to.equal(400);
      expect(await started.res.text()).to.include('only public clients');
      // Fetched (oidc-provider may ask twice for one that failed), never its keys.
      expect([...new Set(calls)]).to.eql([HOST + new URL(url).pathname]);
    });

    it('takes the browser tests’ stand-in address only with NODE_ENV=test, and only on this machine', () => {
      const saved = { base: process.env.CIMD_TEST_BASE, env: process.env.NODE_ENV };
      try {
        process.env.CIMD_TEST_BASE = 'http://127.0.0.1:5100';
        process.env.NODE_ENV = 'test';
        expect(cimdTestBase()).to.equal('http://127.0.0.1:5100');
        expect(() => checkTestBase()).to.not.throw();
        // Anything but test leaves the guard on: unset, development, production.
        for (const env of [undefined, 'development', 'production', 'TEST']) {
          if (env === undefined) delete process.env.NODE_ENV;
          else process.env.NODE_ENV = env;
          expect(cimdTestBase(), String(env)).to.equal(null);
        }
        // With production the server will not start at all.
        process.env.NODE_ENV = 'production';
        expect(() => checkTestBase()).to.throw('CIMD_TEST_BASE must not be set when NODE_ENV is production');
        delete process.env.CIMD_TEST_BASE;
        expect(() => checkTestBase()).to.not.throw();
        process.env.NODE_ENV = 'test';
        for (const base of [
          'http://10.0.0.1:80',
          'http://localhost:5100',
          'https://127.0.0.1:5100',
          'http://127.0.0.1:5100/x'
        ]) {
          process.env.CIMD_TEST_BASE = base;
          expect(cimdTestBase(), base).to.equal(null);
        }
      } finally {
        for (const [name, value] of [
          ['CIMD_TEST_BASE', saved.base],
          ['NODE_ENV', saved.env]
        ] as const) {
          if (value === undefined) delete process.env[name];
          else process.env[name] = value;
        }
      }
    });

    it('checks a document the same way when called directly', () => {
      const { url, jwksUri } = fresh();
      expect(refusal(() => checkClientMetadata(chatgptDocument(url, jwksUri), 'off'))).to.include(
        'only public clients'
      );
      expect(refusal(() => checkClientMetadata(claudeDocument(url), 'off'))).to.equal(null);
    });
  });

  describe('public: ChatGPT’s document as a public app', () => {
    before(() => setMode('public'));

    it('connects it with no client authentication, and never fetches its keys', async () => {
      const meta = await metadata();
      expect(meta.token_endpoint_auth_methods_supported).to.eql(['none']);
      const { url, jwksUri } = fresh();
      useNetwork(
        network((path) => {
          if (url.endsWith(path)) return json(chatgptDocument(url, jwksUri));
          throw new Error('fetched ' + path);
        })
      );
      const { session } = await person();
      const { tokens, row } = await connect(url, session, { redirect: CALLBACK });
      expect(row.clientSource).to.equal('cimd');
      expect(row.clientHost).to.equal(HOST);
      expect(calls).to.eql([HOST + new URL(url).pathname]);
      // Kept as a public app: none, without its keys.
      const kept = JSON.parse((await OAuthRecord.findById(recordKey('ClientDocument', url)).lean())!.payload);
      expect(kept.token_endpoint_auth_method).to.equal('none');
      expect(kept).to.not.have.any.keys('jwks_uri', 'jwks', 'token_endpoint_auth_methods_supported');
      const next = await refresh(tokens.refresh_token, url);
      expect(next.status, await next.clone().text()).to.equal(200);

      // Checked again when its time is up: still public, and its keys still never fetched.
      await OAuthRecord.updateOne(
        { _id: recordKey('ClientDocument', url) },
        { $set: { freshUntil: new Date(Date.now() - 1000) } }
      );
      calls = [];
      const again = await refresh(((await next.json()) as Tokens).refresh_token, url);
      expect(again.status, await again.clone().text()).to.equal(200);
      expect(calls).to.eql([HOST + new URL(url).pathname]);
    });

    it('refuses a document that asks for private_key_jwt without listing none', async () => {
      for (const more of [
        { token_endpoint_auth_methods_supported: undefined },
        { token_endpoint_auth_methods_supported: ['private_key_jwt'] }
      ]) {
        const { url, jwksUri } = fresh();
        useNetwork(network((path) => (url.endsWith(path) ? json(chatgptDocument(url, jwksUri, more)) : undefined)));
        const started = await authorize(url, { redirect: CALLBACK });
        expect(started.res.status, JSON.stringify(more)).to.equal(400);
      }
      // A list that is not one of strings is refused too.
      const { url, jwksUri } = fresh();
      expect(
        refusal(() =>
          checkClientMetadata(
            chatgptDocument(url, jwksUri, { token_endpoint_auth_methods_supported: ['none', 7] }),
            'public'
          )
        )
      ).to.include('only public clients');
    });

    it('never does it for an app that registers itself (DCR)', async () => {
      const res = await register({
        token_endpoint_auth_method: 'private_key_jwt',
        token_endpoint_auth_methods_supported: ['none', 'private_key_jwt'],
        jwks_uri: 'https://app.example/keys.json'
      });
      expect(res.status).to.equal(400);
      expect(((await res.json()) as { error: string }).error).to.equal('invalid_client_metadata');
      // A public one still registers, and the list is not kept.
      const ok = await register({ token_endpoint_auth_methods_supported: ['none'] });
      expect(ok.status).to.equal(201);
      expect(await ok.json()).to.not.have.property('token_endpoint_auth_methods_supported');
    });

    it('connects Claude’s document as before', async () => {
      const { url } = fresh();
      useNetwork(network((path) => (url.endsWith(path) ? json(claudeDocument(url)) : undefined)));
      const { session } = await person();
      await connect(url, session, { redirect: CALLBACK });
    });
  });

  describe('private_key_jwt: apps that sign their token requests', () => {
    before(() => setMode('private_key_jwt'));

    /** A ChatGPT-shaped app with these keys (and document changes); its client_id and key address. */
    const app = (keys: unknown, more: Record<string, unknown> = {}, keyHeaders: Record<string, string> = {}) => {
      const { url, jwksUri } = fresh();
      useNetwork(
        network((path) => {
          if (url.endsWith(path)) return json(chatgptDocument(url, jwksUri, more));
          if (jwksUri.endsWith(path)) return json(keys, keyHeaders);
          return undefined;
        })
      );
      return { url, jwksUri };
    };

    it('offers both methods and the algs it takes, with none first', async () => {
      const meta = await metadata();
      expect(meta.token_endpoint_auth_methods_supported).to.eql(['none', 'private_key_jwt']);
      expect(meta.token_endpoint_auth_signing_alg_values_supported).to.eql(['RS256', 'PS256', 'ES256']);
      expect(meta.revocation_endpoint_auth_methods_supported).to.eql(['none', 'private_key_jwt']);
    });

    it('connects with a signed code exchange, and takes aud as the issuer or the token endpoint', async () => {
      const { url, jwksUri } = app({ keys: [rsa.jwk, ec.jwk] });
      const { session } = await person();
      const { tokens, row } = await connect(url, session, {
        redirect: CALLBACK,
        auth: () => signed(assertion(url, rsa))
      });
      expect(row.clientSource).to.equal('cimd');
      expect(calls).to.eql([HOST + new URL(url).pathname, HOST + new URL(jwksUri).pathname]);
      const kept = JSON.parse((await OAuthRecord.findById(recordKey('ClientDocument', url)).lean())!.payload);
      expect(kept).to.include({ token_endpoint_auth_method: 'private_key_jwt', jwks_uri: jwksUri });
      const viaEndpoint = await refreshSigned(
        tokens.refresh_token,
        url,
        assertion(url, rsa, { claims: { aud: TOKEN_ENDPOINT } })
      );
      expect(viaEndpoint.status, await viaEndpoint.clone().text()).to.equal(200);
      const { refresh_token } = (await viaEndpoint.json()) as Tokens;
      const two = await refreshSigned(
        refresh_token,
        url,
        assertion(url, rsa, { claims: { aud: [SITE, TOKEN_ENDPOINT] } })
      );
      expect(two.status).to.equal(401);
      expect(((await two.json()) as { error: string }).error).to.equal('invalid_client');
      // The keys were fetched once: oidc-provider keeps them with the app, and they are kept here too.
      expect(calls.filter((call) => call.includes('/keys/'))).to.have.length(1);
      // A one-value array is the issuer as well; and the refused ones left the refresh token working.
      const one = await refreshSigned(refresh_token, url, assertion(url, rsa, { claims: { aud: [SITE] } }));
      expect(one.status, await one.clone().text()).to.equal(200);
    });

    it('refuses every assertion that is not right, and the refresh token still works after', async () => {
      const { url } = app({ keys: [rsa.jwk, ec.jwk] });
      const { session } = await person();
      const { tokens } = await connect(url, session, { redirect: CALLBACK, auth: () => signed(assertion(url, rsa)) });
      const stranger = makeKey('rsa', 'rsa-1');
      const claims = (more: Record<string, unknown>) => assertion(url, rsa, { claims: more });
      const cases: Record<string, string> = {
        'alg none': signJwt(
          { alg: 'none', typ: 'JWT' },
          { iss: url, sub: url, aud: SITE, jti: 'a', iat: now(), exp: now() + 60 }
        ),
        'HS256 with the public key': signJwt(
          { alg: 'HS256', kid: 'rsa-1' },
          { iss: url, sub: url, aud: SITE, jti: crypto.randomUUID(), iat: now(), exp: now() + 60 },
          undefined,
          Buffer.from(crypto.createPublicKey(rsa.privateKey).export({ format: 'pem', type: 'spki' }) as string)
        ),
        'ES256, not the document’s alg': assertion(url, ec),
        'another iss': claims({ iss: 'https://app.example/clients/other.json' }),
        'another sub': claims({ sub: 'https://app.example/clients/other.json' }),
        'no sub': claims({ sub: undefined }),
        'no jti': claims({ jti: undefined }),
        'no exp': claims({ exp: undefined }),
        'no iat': claims({ iat: undefined }),
        'exp an hour ahead': claims({ exp: now() + 3600 }),
        'iat 10 minutes old': claims({ iat: now() - 600, exp: now() + 30 }),
        'typ at+jwt': assertion(url, rsa, { header: { typ: 'at+jwt' } }),
        'aud elsewhere': claims({ aud: 'https://elsewhere.example' }),
        'wrong signature': assertion(url, stranger),
        'unknown kid': assertion(url, makeKey('rsa', 'nobody'))
      };
      const before = calls.length;
      for (const [what, value] of Object.entries(cases)) {
        const res = await refreshSigned(tokens.refresh_token, url, value);
        expect(res.status, what).to.be.oneOf([400, 401]);
        const body = (await res.json()) as { error: string };
        expect(body.error, what).to.be.oneOf(['invalid_client', 'invalid_request']);
      }
      // An unknown kid fetched nothing more: the keys are fresh.
      expect(calls.length).to.equal(before);
      const ok = await refreshSigned(tokens.refresh_token, url, assertion(url, rsa));
      expect(ok.status, await ok.clone().text()).to.equal(200);
    });

    it('takes each assertion once, even two at the same moment', async () => {
      const { url } = app({ keys: [rsa.jwk] });
      const first = await person();
      const second = await person();
      const a = await connect(url, first.session, { redirect: CALLBACK, auth: () => signed(assertion(url, rsa)) });
      const b = await connect(url, second.session, { redirect: CALLBACK, auth: () => signed(assertion(url, rsa)) });
      const once = assertion(url, rsa);
      const used = await refreshSigned(a.tokens.refresh_token, url, once);
      expect(used.status).to.equal(200);
      const again = await refreshSigned(b.tokens.refresh_token, url, once);
      expect(again.status).to.equal(401);
      // Two at once, each with its own refresh token and the same assertion: one passes.
      const both = assertion(url, rsa);
      const next = (await used.json()) as Tokens;
      const answers = await Promise.all([
        refreshSigned(next.refresh_token, url, both),
        refreshSigned(b.tokens.refresh_token, url, both)
      ]);
      expect(answers.map((res) => res.status).sort()).to.eql([200, 401]);
    });

    it('claims an assertion atomically', async () => {
      const iss = 'https://app.example/clients/race.json';
      const jti = crypto.randomUUID();
      const results = await Promise.allSettled(Array.from({ length: 10 }, () => claimAssertion(iss, jti, now() + 60)));
      expect(results.filter((result) => result.status === 'fulfilled')).to.have.length(1);
    });

    it('holds a signing app to its method: no code, refresh or revocation without an assertion', async () => {
      const { url } = app({ keys: [rsa.jwk] });
      const { session } = await person();
      const code = await codeFor(url, session);
      const bare = await exchange(url, code);
      expect(bare.status).to.equal(401);
      expect(((await bare.json()) as { error: string }).error).to.equal('invalid_client');
      // The code was not used up by the refusal.
      const made = await exchange(url, code, signed(assertion(url, rsa)));
      expect(made.status, await made.clone().text()).to.equal(200);
      const tokens = (await made.json()) as Tokens;
      expect((await refresh(tokens.refresh_token, url)).status).to.equal(401);
      const revoke = await request('/oauth/revoke', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token: tokens.refresh_token, client_id: url }).toString()
      });
      expect(revoke.status).to.equal(401);
      const row = (await AccessToken.findOne({ kind: 'oauth', clientId: url }))!;
      expect(row.revokedAt ?? null).to.equal(null);
      const ok = await refreshSigned(tokens.refresh_token, url, assertion(url, rsa));
      expect(ok.status, await ok.clone().text()).to.equal(200);
    });

    it('takes keys only from the app’s own site', async () => {
      for (const jwksUri of [
        'https://keys.example/keys.json',
        'https://app.example.evil.example/keys.json',
        'https://app.example:8443/keys.json',
        'http://app.example/keys.json'
      ]) {
        const { url } = fresh();
        calls = [];
        useNetwork(network((path) => (url.endsWith(path) ? json(chatgptDocument(url, jwksUri)) : { status: 500 })));
        const started = await authorize(url, { redirect: CALLBACK });
        expect(started.res.status, jwksUri).to.equal(400);
        expect(
          calls.filter((call) => !call.endsWith(new URL(url).pathname)),
          jwksUri
        ).to.eql([]);
      }
      const { url } = fresh();
      const check = (document: ClientMetadata) => refusal(() => checkClientMetadata(document, 'private_key_jwt'));
      // Its own document is no key set.
      expect(check(chatgptDocument(url, url))).to.include('jwks_uri');
      // Keys written in the document itself, checked as fetched ones are; never both ways.
      expect(check(chatgptDocument(url, undefined as unknown as string, { jwks: { keys: [rsa.jwk] } }))).to.equal(null);
      expect(
        check(chatgptDocument(url, undefined as unknown as string, { jwks: { keys: [{ ...rsa.jwk, d: 'x' }] } }))
      ).to.include('public keys only');
      expect(check(chatgptDocument(url, `https://${HOST}/k.json`, { jwks: { keys: [rsa.jwk] } }))).to.include(
        'one of jwks_uri and jwks'
      );
      expect(
        check(chatgptDocument(url, `https://${HOST}/k.json`, { token_endpoint_auth_signing_alg: 'HS256' }))
      ).to.include('token_endpoint_auth_signing_alg');
      // Never for an app that registered itself, whatever the mode.
      expect(check({ ...chatgptDocument(url, `https://${HOST}/k.json`), client_id: 'dcr_x' })).to.include(
        'only public clients'
      );
    });

    it('refuses key sets that are not public signing keys of the right size, or not fetched safely', async () => {
      const weak = makeKey('rsa1024', 'weak');
      const privateJwk = { ...(rsa.privateKey.export({ format: 'jwk' }) as Record<string, unknown>), kid: 'p' };
      const sets: Record<string, { keys?: unknown; reply?: Reply; lookup?: (host: string) => string[] }> = {
        'private members': { keys: { keys: [privateJwk] } },
        'six keys': { keys: { keys: Array.from({ length: 6 }, (_, i) => ({ ...rsa.jwk, kid: 'k' + i })) } },
        'a 1024-bit key': { keys: { keys: [weak.jwk] } },
        'too large': { keys: { keys: [rsa.jwk], pad: 'x'.repeat(6000) } },
        redirect: { reply: () => ({ status: 302, headers: { location: 'http://169.254.169.254/' } }) },
        'not JSON': { reply: () => ({ body: Buffer.from('<html>'), headers: { 'content-type': 'text/html' } }) }
      };
      const { session } = await person();
      for (const [what, set] of Object.entries(sets)) {
        const { url, jwksUri } = fresh();
        useNetwork(
          network((path) => {
            if (url.endsWith(path)) return json(chatgptDocument(url, jwksUri));
            if (jwksUri.endsWith(path)) return set.reply ? set.reply(path) : json(set.keys);
            return undefined;
          })
        );
        const code = await codeFor(url, session);
        const signer = what === 'a 1024-bit key' ? weak : rsa;
        const res = await exchange(url, code, signed(assertion(url, signer)));
        expect(res.status, what).to.equal(401);
      }
      // The name of the app's site turning private between the document and its keys (DNS rebinding).
      const { url, jwksUri } = fresh();
      let lookups = 0;
      useNetwork(
        network(
          (path) => {
            if (url.endsWith(path)) return json(chatgptDocument(url, jwksUri));
            if (jwksUri.endsWith(path)) return json({ keys: [rsa.jwk] });
            return undefined;
          },
          () => (lookups++ === 0 ? [ADDRESS] : ['169.254.169.254'])
        )
      );
      const code = await codeFor(url, session);
      calls = [];
      expect((await exchange(url, code, signed(assertion(url, rsa)))).status).to.equal(401);
      expect(calls).to.eql([]);
    });

    it('checks key sets by their parts', () => {
      expect(() => checkJwks({ keys: [rsa.jwk, ec.jwk] })).to.not.throw();
      for (const [what, set] of Object.entries({
        empty: { keys: [] },
        'no keys': {},
        'a symmetric key': { keys: [{ kty: 'oct', k: 'abc' }] },
        'for encryption': { keys: [{ ...rsa.jwk, use: 'enc' }] },
        'an EC key on P-384': {
          keys: [crypto.generateKeyPairSync('ec', { namedCurve: 'P-384' }).publicKey.export({ format: 'jwk' })]
        },
        'an RSA key for ES256': { keys: [{ ...rsa.jwk, alg: 'ES256' }] },
        'an Ed25519 key': { keys: [crypto.generateKeyPairSync('ed25519').publicKey.export({ format: 'jwk' })] }
      })) {
        expect(() => checkJwks(set), what).to.throw();
      }
    });

    it(`keeps keys at most ${JWKS_CACHE_SECONDS.max / 60} minutes, whatever they say, so a replaced key works soon`, async () => {
      let keys = { keys: [rsa.jwk] };
      const { url, jwksUri } = fresh();
      useNetwork(
        network((path) => {
          if (url.endsWith(path)) return json(chatgptDocument(url, jwksUri));
          if (jwksUri.endsWith(path)) {
            return json(keys, { 'cache-control': 'max-age=31536000', expires: 'Fri, 01 Jan 2100 00:00:00 GMT' });
          }
          return undefined;
        })
      );
      let clock = Date.now();
      useKeySetClock(() => clock);
      try {
        const first = await guardedFetch(jwksUri, { method: 'GET' });
        expect(first.headers.get('cache-control')).to.equal(`max-age=${JWKS_CACHE_SECONDS.max}`);
        expect(first.headers.get('expires')).to.equal(null);

        const { session } = await person();
        const { tokens } = await connect(url, session, { redirect: CALLBACK, auth: () => signed(assertion(url, rsa)) });
        // The app replaces its key.
        const replaced = makeKey('rsa', 'rsa-2');
        keys = { keys: [replaced.jwk] };
        const early = await refreshSigned(tokens.refresh_token, url, assertion(url, replaced));
        expect(early.status).to.equal(401);
        // Fifteen minutes on: the keys kept here have run out, and so have oidc-provider's (its own clock, moved here).
        clock += (JWKS_CACHE_SECONDS.max + 1) * 1000;
        const client = (await getProvider().Client.find(url)) as unknown as {
          asymmetricKeyStore: { freshUntil: number };
        };
        client.asymmetricKeyStore.freshUntil = 0;
        const later = await refreshSigned(tokens.refresh_token, url, assertion(url, replaced));
        expect(later.status, await later.clone().text()).to.equal(200);
      } finally {
        useKeySetClock();
      }
    });

    it(`fetches new keys at most ${JWKS_FETCH_LIMITS.site} times a minute for one site, its subdomains together`, async () => {
      process.env.RATE_LIMITS = 'on';
      try {
        const { url, jwksUri } = app({ keys: [rsa.jwk] });
        const { session } = await person();
        const code = await codeFor(url, session);
        resetFetchCount();
        // Other names under the same site, each asked for from an address of its own.
        for (let i = 0; i < JWKS_FETCH_LIMITS.site; i++) {
          expect(countKeySetFetch({ host: `a${i}.${HOST}`, address: `203.0.113.${i + 1}` })).to.equal(true);
        }
        calls = [];
        const res = await exchange(url, code, signed(assertion(url, rsa)));
        expect(res.status).to.equal(401);
        expect(calls.filter((call) => call.endsWith(new URL(jwksUri).pathname))).to.eql([]);
        // Another site has its own.
        expect(countKeySetFetch({ host: 'other.example', address: '203.0.113.99' })).to.equal(true);
        expect(siteOf('A1.Evil.Example.')).to.equal('evil.example');
      } finally {
        process.env.RATE_LIMITS = 'off';
        resetFetchCount();
      }
    });

    it('counts new keys fetched by the asking address (an IPv6 one with its /48) and for everyone', () => {
      process.env.RATE_LIMITS = 'on';
      try {
        resetFetchCount();
        // One /48, a /56 and a site after another inside it.
        for (let i = 0; i < JWKS_FETCH_LIMITS.address; i++) {
          const address = `2001:db8:7:${(i * 256).toString(16)}::1`;
          expect(countKeySetFetch({ host: `s${i}.example`, address })).to.equal(true);
        }
        expect(countKeySetFetch({ host: 'last.example', address: '2001:db8:7:ff00::1' })).to.equal(false);
        expect(countKeySetFetch({ host: 'last.example', address: '2001:db8:8::1' })).to.equal(true);
        resetFetchCount();
        for (let i = 0; i < JWKS_FETCH_LIMITS.everyone; i++) {
          countKeySetFetch({ host: `h${i}.example`, address: `198.51.100.${i + 1}` });
        }
        expect(countKeySetFetch({ host: 'last.example', address: '192.0.2.1' })).to.equal(false);
        // Proven keys have a count of their own; and the next minute starts again.
        expect(countKeySetFetch({ host: 'last.example', proven: true })).to.equal(true);
        expect(countKeySetFetch({ host: 'last.example', address: '192.0.2.1' }, Date.now() + 61 * 1000)).to.equal(true);
      } finally {
        process.env.RATE_LIMITS = 'off';
        resetFetchCount();
      }
    });

    /**
     * A new authorization server, as when oidc-provider reads an app afresh: its
     * copy of the app's keys is gone, so it asks for them again (the ones kept here stay).
     */
    const newServer = () => {
      setMode('public');
      getProvider();
      setMode('private_key_jwt');
    };

    /** Whether a promise rejects. */
    const rejects = async (promise: Promise<unknown>): Promise<boolean> => {
      try {
        await promise;
        return false;
      } catch {
        return true;
      }
    };

    it('keeps using an app’s last good keys once it has a working connection, for a day at most', async () => {
      let down = false;
      const { url, jwksUri } = fresh();
      useNetwork(
        network((path) => {
          if (url.endsWith(path)) return json(chatgptDocument(url, jwksUri));
          if (jwksUri.endsWith(path)) {
            if (down) throw new Error('down');
            return json({ keys: [rsa.jwk] });
          }
          return undefined;
        })
      );
      let clock = Date.now();
      useKeySetClock(() => clock);
      try {
        const { session } = await person();
        const { tokens } = await connect(url, session, { redirect: CALLBACK, auth: () => signed(assertion(url, rsa)) });
        // Its keys' time runs out, and its site cannot be reached.
        down = true;
        clock += (JWKS_CACHE_SECONDS.max + 1) * 1000;
        newServer();
        calls = [];
        const next = await refreshSigned(tokens.refresh_token, url, assertion(url, rsa));
        expect(next.status, await next.clone().text()).to.equal(200);
        expect(calls.filter((call) => call.includes('/keys/'))).to.have.length(1);
        // Tried again a minute later, not at once.
        calls = [];
        expect((await guardedFetch(jwksUri, { method: 'GET' })).status).to.equal(200);
        expect(calls).to.eql([]);
        // A day after the last good fetch they are no longer taken.
        clock += JWKS_STALE_SECONDS * 1000;
        newServer();
        const late = await refreshSigned(((await next.json()) as Tokens).refresh_token, url, assertion(url, rsa));
        expect(late.status).to.equal(401);
      } finally {
        useKeySetClock();
      }
    });

    it('serves proven keys over every budget, and never pushes them out for strangers’ keys', async () => {
      let down = false;
      useNetwork(
        network((path) => {
          if (!path.startsWith('/keys/')) return undefined;
          if (down) return { status: 503 };
          return json({ keys: [rsa.jwk] });
        })
      );
      let clock = Date.now();
      useKeySetClock(() => clock);
      process.env.RATE_LIMITS = 'on';
      try {
        const proven = fresh().jwksUri;
        const unproven = fresh().jwksUri;
        expect((await guardedFetch(proven, { method: 'GET' })).status).to.equal(200);
        expect((await guardedFetch(unproven, { method: 'GET' })).status).to.equal(200);
        markKeySetProven(proven);
        clock += (JWKS_CACHE_SECONDS.max + 1) * 1000;
        // Every budget used up.
        for (let i = 0; i < JWKS_FETCH_LIMITS.proven; i++) countKeySetFetch({ host: `p${i}.example`, proven: true });
        for (let i = 0; i < JWKS_FETCH_LIMITS.everyone; i++) {
          countKeySetFetch({ host: `h${i}.example`, address: `198.51.100.${i + 1}` });
        }
        calls = [];
        const kept = await guardedFetch(proven, { method: 'GET' });
        expect(kept.status).to.equal(200);
        expect(((await kept.json()) as { keys: unknown[] }).keys).to.have.length(1);
        expect(await rejects(guardedFetch(unproven, { method: 'GET' }))).to.equal(true);
        expect(calls).to.eql([]);

        // Many strangers' sets fetched after: the proven one is still kept.
        process.env.RATE_LIMITS = 'off';
        resetFetchCount();
        const keep = fresh().jwksUri;
        expect((await guardedFetch(keep, { method: 'GET' })).status).to.equal(200);
        markKeySetProven(keep);
        const stranger = (i: number) => `https://${HOST}/keys/evicted-${i}.json`;
        const many = MOST_KEY_SETS.unproven + 5;
        for (let i = 0; i < many; i++) {
          expect((await guardedFetch(stranger(i), { method: 'GET' })).status).to.equal(200);
        }
        // The oldest strangers' sets are gone (fetched again), the newest kept (not fetched).
        calls = [];
        await guardedFetch(stranger(0), { method: 'GET' });
        await guardedFetch(stranger(many - 1), { method: 'GET' });
        expect(calls).to.eql([HOST + new URL(stranger(0)).pathname]);
        // The proven one is kept: once its site fails, its last good set is used.
        down = true;
        clock += (JWKS_CACHE_SECONDS.max + 1) * 1000;
        expect((await guardedFetch(keep, { method: 'GET' })).status).to.equal(200);
        expect((await guardedFetch(stranger(many - 1), { method: 'GET' })).status).to.equal(503);
      } finally {
        process.env.RATE_LIMITS = 'off';
        useKeySetClock();
        resetFetchCount();
      }
    });

    it('still connects Claude’s document with none', async () => {
      const { url } = fresh();
      useNetwork(network((path) => (url.endsWith(path) ? json(claudeDocument(url)) : undefined)));
      const { session } = await person();
      const { tokens } = await connect(url, session, { redirect: CALLBACK });
      expect((await refresh(tokens.refresh_token, url)).status).to.equal(200);
    });
  });

  describe('the assertion checks', () => {
    const where = { issuer: SITE, tokenEndpoint: TOKEN_ENDPOINT, clientId: 'x' };
    const at = 1_800_000_000;
    const good = { iss: 'x', sub: 'x', jti: 'j', iat: at, exp: at + 60, aud: SITE };

    it('take a short-lived, typed assertion for the issuer, and the token endpoint for now', () => {
      expect(checkAssertion(good, { alg: 'RS256' }, where, at)).to.equal('issuer');
      expect(checkAssertion(good, { typ: 'client-authentication+jwt' }, where, at)).to.equal('issuer');
      expect(checkAssertion(good, { typ: 'application/JWT' }, where, at)).to.equal('issuer');
      expect(checkAssertion({ ...good, aud: TOKEN_ENDPOINT }, {}, where, at)).to.equal('token endpoint');
      expect(checkAssertion({ ...good, exp: at + ASSERTION_SECONDS }, {}, where, at)).to.equal('issuer');
    });

    it('refuse the rest', () => {
      for (const [what, claims, header] of [
        ['another sub', { ...good, sub: 'y' }, {}],
        ['no sub', { ...good, sub: undefined }, {}],
        ['another iss', { ...good, iss: 'y' }, {}],
        ['typ dpop+jwt', good, { typ: 'dpop+jwt' }],
        ['iat in the future', { ...good, iat: at + 60 }, {}],
        ['iat too old', { ...good, iat: at - ASSERTION_SECONDS - 60 }, {}],
        ['exp too far', { ...good, exp: at + ASSERTION_SECONDS + 60 }, {}],
        ['no iat', { ...good, iat: undefined }, {}],
        ['a string iat', { ...good, iat: String(at) }, {}],
        ['two audiences', { ...good, aud: [SITE, TOKEN_ENDPOINT] }, {}],
        ['the revocation endpoint', { ...good, aud: SITE + '/oauth/revoke' }, {}],
        ['a long jti', { ...good, jti: 'j'.repeat(300) }, {}]
      ] as const) {
        expect(() => checkAssertion(claims as Record<string, unknown>, header, where, at), what).to.throw();
      }
    });
  });
});

describe('OAuth: the token endpoint’s limits, for apps on shared addresses', function () {
  this.timeout(120000);

  const forwarded = (address: string) => ({ 'x-forwarded-for': address });
  // Each test's addresses its own, so a guesser's count over its limit never meets another test.
  let last = 20;
  const someAddress = () => `198.51.100.${last++}`;

  before(() => setMode(undefined));
  afterEach(() => {
    process.env.RATE_LIMITS = 'off';
    resetTokenGrants();
  });
  after(() => useNetwork());

  /** A connection of a new person to an app that registered itself. */
  const connection = async () => {
    const res = await register();
    const clientId = ((await res.json()) as { client_id: string }).client_id;
    const { session } = await person();
    const { tokens } = await connect(clientId, session);
    return { clientId, tokens, session };
  };

  /** A new code for the app, the person allowing it again; not yet exchanged. */
  const newCode = async (clientId: string, session: string) => {
    const started = await authorize(clientId);
    const allowed = await answer(started, session, { decision: 'allow' });
    const back = await resume(started, ((await allowed.json()) as { redirectTo: string }).redirectTo);
    return (headers: Record<string, string> = {}) =>
      token(
        {
          grant_type: 'authorization_code',
          code: back.searchParams.get('code')!,
          redirect_uri: REDIRECT,
          client_id: clientId,
          code_verifier: started.verifier
        },
        headers
      );
  };

  const junk = (clientId: string, address: string) =>
    token(
      { grant_type: 'refresh_token', refresh_token: crypto.randomBytes(32).toString('base64url'), client_id: clientId },
      forwarded(address)
    );

  it('counts only refusals per address: many people’s refreshes from one address all work', async () => {
    const connections = await Promise.all(Array.from({ length: 4 }, () => connection()));
    const shared = someAddress();
    process.env.RATE_LIMITS = 'on';
    let done = 0;
    for (let round = 0; round < 5; round++) {
      for (const one of connections) {
        const res = await token(
          { grant_type: 'refresh_token', refresh_token: one.tokens.refresh_token, client_id: one.clientId },
          forwarded(shared)
        );
        expect(res.status, `refresh ${done}`).to.equal(200);
        one.tokens = (await res.json()) as Tokens;
        done++;
      }
    }
    // None of them counted against the address; a refusal does.
    const key = networkKey(shared);
    expect((await oauthTokenFailures.getKey(key))?.totalHits ?? 0).to.equal(0);
    const refused = await token(
      { grant_type: 'refresh_token', refresh_token: 'not-a-token', client_id: connections[0]!.clientId },
      forwarded(shared)
    );
    expect(refused.status).to.equal(400);
    expect((await oauthTokenFailures.getKey(key))?.totalHits).to.equal(1);
  });

  it(`stops an address's guesses after ${OAUTH_TOKEN_LIMITS.failures} refusals in 15 minutes, not its working tokens`, async () => {
    const { clientId, tokens, session } = await connection();
    const guesser = someAddress();
    process.env.RATE_LIMITS = 'on';
    for (let i = 0; i < OAUTH_TOKEN_LIMITS.failures; i++) {
      const res = await junk(clientId, guesser);
      expect(res.status, 'guess ' + i).to.equal(400);
    }
    const over = await junk(clientId, guesser);
    expect(over.status).to.equal(429);
    expect(((await over.json()) as { error: string }).error).to.equal('too_many_requests');
    // A refresh token and a code the server holds still work from there.
    const refreshed = await token(
      { grant_type: 'refresh_token', refresh_token: tokens.refresh_token, client_id: clientId },
      forwarded(guesser)
    );
    expect(refreshed.status, await refreshed.clone().text()).to.equal(200);
    expect(refreshed.headers.get('retry-after')).to.equal(null);
    // (A new yes replaces the connection, so the code comes after the refresh; and a code lasts a minute.)
    const exchanged = await (await newCode(clientId, session))(forwarded(guesser));
    expect(exchanged.status, await exchanged.clone().text()).to.equal(200);
    // And a junk one after them is still turned away.
    expect((await junk(clientId, guesser)).status).to.equal(429);
  });

  it('counts an IPv6 address’s refusals with its whole /48, so its /56s share one count', async () => {
    const { clientId } = await connection();
    process.env.RATE_LIMITS = 'on';
    // Two /56s of one /48, made for this test.
    for (const address of ['2001:db8:e1:100::1', '2001:db8:e1:200::1']) {
      expect((await junk(clientId, address)).status).to.equal(400);
    }
    expect((await oauthTokenFailures.getKey(networkKey('2001:db8:e1::1')))?.totalHits).to.equal(2);
    expect(networkKey('2001:db8:e1:ff00::1')).to.equal(networkKey('2001:db8:e1::1'));
    expect(networkKey('2001:db8:e2::1')).to.not.equal(networkKey('2001:db8:e1::1'));
  });

  it(`counts ${OAUTH_TOKEN_LIMITS.account} for one account in 15 minutes, leaving its refresh token working`, async () => {
    const { clientId, tokens } = await connection();
    const row = (await AccessToken.findOne({ kind: 'oauth', clientId }))!;
    const userId = String(row.userId);
    process.env.RATE_LIMITS = 'on';
    for (let i = 0; i < OAUTH_TOKEN_LIMITS.account; i++) expect(countTokenGrant(userId)).to.equal(true);
    const address = someAddress();
    const over = await token(
      { grant_type: 'refresh_token', refresh_token: tokens.refresh_token, client_id: clientId },
      forwarded(address)
    );
    expect(over.status).to.equal(429);
    expect(((await over.json()) as { error: string }).error).to.equal('too_many_requests');
    // Another account at the same address is answered; once the window is over, the same refresh token works.
    const other = await connection();
    const theirs = await token(
      { grant_type: 'refresh_token', refresh_token: other.tokens.refresh_token, client_id: other.clientId },
      forwarded(address)
    );
    expect(theirs.status).to.equal(200);
    resetTokenGrants();
    const later = await token(
      { grant_type: 'refresh_token', refresh_token: tokens.refresh_token, client_id: clientId },
      forwarded(address)
    );
    expect(later.status, await later.clone().text()).to.equal(200);
  });

  it('never burns a code for the account’s count, nor holds up the end of a copied refresh token', async () => {
    const { clientId, tokens, session } = await connection();
    const row = (await AccessToken.findOne({ kind: 'oauth', clientId }))!;
    const userId = String(row.userId);
    const first = await refresh(tokens.refresh_token, clientId);
    expect(first.status).to.equal(200);
    process.env.RATE_LIMITS = 'on';
    for (let i = 0; i < OAUTH_TOKEN_LIMITS.account; i++) countTokenGrant(userId);
    expect(countTokenGrant(userId)).to.equal(false);
    // Over its count, the first refresh token used again (a copy): refused as reused and its connection ended, not 429.
    const copied = await token(
      { grant_type: 'refresh_token', refresh_token: tokens.refresh_token, client_id: clientId },
      forwarded(someAddress())
    );
    expect(copied.status).to.equal(400);
    expect(((await copied.json()) as { error: string }).error).to.equal('invalid_grant');
    const ended = (await AccessToken.findById(row._id))!;
    expect(ended.revokedAt).to.be.instanceOf(Date);
    expect(ended.revokedWhy).to.equal('reused');
    // Still over: a new code is exchanged all the same (codes are not counted), so the person need not sign in again.
    const exchanged = await (await newCode(clientId, session))(forwarded(someAddress()));
    expect(exchanged.status, await exchanged.clone().text()).to.equal(200);
  });

  it('has a ceiling on everyone’s refusals together, which turns away only requests that would fail', async () => {
    const working = await connection();
    const reused = await connection();
    const used = await refresh(reused.tokens.refresh_token, reused.clientId);
    expect(used.status).to.equal(200);
    const before = CEILINGS.oauthTokenRefusals;
    CEILINGS.oauthTokenRefusals = 3;
    await oauthTokenAll.resetKey('oauth-token-all');
    process.env.RATE_LIMITS = 'on';
    try {
      // Each from its own address, so only the ceiling can stop them.
      const statuses: number[] = [];
      for (let i = 0; i < 4; i++) statuses.push((await junk('dcr_x', someAddress())).status);
      expect(statuses.slice(0, 3)).to.not.include(429);
      expect(statuses[3]).to.equal(429);
      // A working refresh token and a new code still go through, and are not counted.
      const refreshed = await token(
        { grant_type: 'refresh_token', refresh_token: working.tokens.refresh_token, client_id: working.clientId },
        forwarded(someAddress())
      );
      expect(refreshed.status, await refreshed.clone().text()).to.equal(200);
      const exchanged = await (await newCode(working.clientId, working.session))(forwarded(someAddress()));
      expect(exchanged.status, await exchanged.clone().text()).to.equal(200);
      expect((await oauthTokenAll.getKey('oauth-token-all'))?.totalHits).to.equal(3);
      // A refresh token used before is on record too: it reaches the reuse check, which ends its connection.
      const again = await token(
        { grant_type: 'refresh_token', refresh_token: reused.tokens.refresh_token, client_id: reused.clientId },
        forwarded(someAddress())
      );
      expect(again.status).to.equal(400);
      const row = (await AccessToken.findOne({ kind: 'oauth', clientId: reused.clientId }))!;
      expect(row.revokedWhy).to.equal('reused');
      // A token request that is not a form at all is turned away.
      const notForm = await request('/oauth/token', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...forwarded(someAddress()) },
        body: JSON.stringify({ grant_type: 'refresh_token', refresh_token: working.tokens.refresh_token })
      });
      expect(notForm.status).to.equal(429);
    } finally {
      CEILINGS.oauthTokenRefusals = before;
      await oauthTokenAll.resetKey('oauth-token-all');
    }
  });
});
