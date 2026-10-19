// The authorization server for AI assistants (docs/adr/0024-authorization-server.md):
// its metadata, the apps that register (DCR) or name themselves by address
// (CIMD, with the guard against fetching anything but the public internet,
// and no real network), PKCE, the one resource, the consent API, refresh
// tokens that rotate, and a connection ending everywhere at once. Then the
// MCP endpoint taking its tokens, and nothing else taking them.
import crypto from 'node:crypto';
import * as limits from '../lib/rate_limit.ts';
import AccessToken, { OAUTH_REFRESH_DAYS, OAUTH_WRITE_DAYS, revokeOne } from '../models/access_token.ts';
import Activity from '../models/activity.ts';
import Note from '../models/note.ts';
import User from '../models/user.ts';
import { DCR_IDLE_DAYS, DCR_UNUSED_DAYS, OAuthRecord, recordKey } from '../oauth/adapter.ts';
import {
  allowedClientIdUrl,
  countFetch,
  FETCH_LIMITS,
  publicAddress,
  resetFetchCount,
  useNetwork,
  type Network,
  type RawAnswer
} from '../oauth/cimd.ts';
import { keptClientDocument, RETRY_SECONDS } from '../oauth/client_documents.ts';
import { checkClientMetadata, cleanName, getProvider } from '../oauth/provider.ts';
import { redirectShown } from '../oauth/interactions.ts';
import { revokeGrant } from '../oauth/revoke.ts';
import { CONNECTION_MADE } from '../lib/account_mail.ts';
import { securitySchemes } from '../mcp/server.ts';
import { READ_ONLY_TOKEN, WRITE_TOOLS } from '../mcp/tools/account_write.ts';
import { api, base, expect, makeUser, sessionToken } from './support/app.ts';
import * as mail from './support/mail.ts';
import { makeToken } from './support/tokens.ts';

const SITE = 'https://glazecalc.test';
const RESOURCE = SITE + '/mcp';
const REDIRECT = 'http://127.0.0.1:7777/callback';
const DAY = 24 * 60 * 60 * 1000;

/** Cookies as a browser keeps them for the site: by name, with their paths. Secure ones too (the tests use http). */
class Jar {
  private cookies = new Map<string, { value: string; path: string }>();

  take(res: Response): void {
    for (const line of res.headers.getSetCookie()) {
      const [pair, ...attributes] = line.split(';');
      const at = pair!.indexOf('=');
      const name = pair!.slice(0, at).trim();
      const value = pair!.slice(at + 1).trim();
      const path =
        attributes
          .map((a) => a.trim())
          .find((a) => /^path=/i.test(a))
          ?.slice(5) ?? '/';
      const gone = attributes.some((a) => /^expires=Thu, 01 Jan 1970/i.test(a.trim())) || value === '';
      if (gone) this.cookies.delete(name + path);
      else this.cookies.set(name + path, { value, path });
    }
  }

  header(path: string): string {
    const name = (key: string, cookiePath: string) => key.slice(0, key.length - cookiePath.length);
    return [...this.cookies.entries()]
      .filter(([, cookie]) => path === cookie.path || path.startsWith(cookie.path.replace(/\/?$/, '/')))
      .map(([key, cookie]) => name(key, cookie.path) + '=' + cookie.value)
      .join('; ');
  }
}

/** A request to the site, never following redirects, with the jar's cookies. */
const request = async (
  path: string,
  {
    method = 'GET',
    headers = {},
    body,
    jar
  }: { method?: string; headers?: Record<string, string>; body?: string; jar?: Jar } = {}
): Promise<Response> => {
  const pathname = path.split('?')[0]!;
  const cookie = jar?.header(pathname);
  const res = await fetch(base() + path, {
    method,
    redirect: 'manual',
    headers: { ...headers, ...(cookie && { cookie }) },
    ...(body !== undefined && { body })
  });
  jar?.take(res);
  return res;
};

const form = (fields: Record<string, string>) => new URLSearchParams(fields).toString();
const FORM = { 'content-type': 'application/x-www-form-urlencoded' };
const JSON_TYPE = { 'content-type': 'application/json', accept: 'application/json' };

/** A PKCE pair (S256). */
const pkce = () => {
  const verifier = crypto.randomBytes(32).toString('base64url');
  return { verifier, challenge: crypto.createHash('sha256').update(verifier).digest('base64url') };
};

/** An app registering itself (DCR); the client id. */
const register = async (metadata: Record<string, unknown> = {}, headers: Record<string, string> = {}) =>
  request('/oauth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify({
      client_name: 'Test Assistant',
      redirect_uris: [REDIRECT],
      token_endpoint_auth_method: 'none',
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      ...metadata
    })
  });
const registered = async (metadata: Record<string, unknown> = {}): Promise<string> => {
  const res = await register(metadata);
  const body = (await res.json()) as { client_id: string };
  expect(res.status, JSON.stringify(body)).to.equal(201);
  return body.client_id;
};

interface Started {
  jar: Jar;
  uid: string;
  verifier: string;
  state: string;
  res: Response;
}

/** The start of a connection: GET /oauth/authorize, which sends the browser to the consent API. */
const authorize = async (
  clientId: string,
  {
    scope = 'data:read',
    extra = {},
    redirect = REDIRECT,
    jar = new Jar()
  }: { scope?: string; extra?: Record<string, string>; redirect?: string; jar?: Jar } = {}
): Promise<Started> => {
  const { verifier, challenge } = pkce();
  const state = crypto.randomBytes(8).toString('hex');
  const query = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirect,
    response_type: 'code',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
    ...(scope && { scope }),
    ...extra
  });
  const res = await request('/oauth/authorize?' + query.toString(), { jar });
  const location = res.headers.get('location') ?? '';
  const uid = /\/api\/connect\/([\w-]+)$/.exec(location)?.[1] ?? '';
  return { jar, uid, verifier, state, res };
};

/** The consent page's own request for what to show. */
const details = (started: Started, session: string) =>
  request('/api/connect/' + started.uid, {
    jar: started.jar,
    headers: { accept: 'application/json', authorization: 'Bearer ' + session }
  });

/** The consent page's answer: the address the browser goes to next. */
const answer = async (started: Started, session: string, body: Record<string, unknown>) =>
  request('/api/connect/' + started.uid, {
    method: 'POST',
    jar: started.jar,
    headers: { ...JSON_TYPE, authorization: 'Bearer ' + session },
    body: JSON.stringify(body)
  });

/** The browser back at the authorization server after the answer: the redirect to the app, with code, state and iss. */
const resume = async (started: Started, redirectTo: string): Promise<URL> => {
  const url = new URL(redirectTo);
  expect(url.origin).to.equal(SITE);
  const res = await request(url.pathname + url.search, { jar: started.jar });
  expect(res.status, await res.clone().text()).to.equal(303);
  return new URL(res.headers.get('location')!);
};

interface Tokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

const token = (fields: Record<string, string>) =>
  request('/oauth/token', { method: 'POST', headers: FORM, body: form(fields) });

/** A whole connection, as an assistant and the person make one: the tokens, and the connection's row. */
const connect = async (
  clientId: string,
  session: string,
  { scope = 'data:read', write, redirect = REDIRECT }: { scope?: string; write?: boolean; redirect?: string } = {}
) => {
  const started = await authorize(clientId, { scope, redirect });
  expect(started.res.status, await started.res.clone().text()).to.equal(303);
  const allowed = await answer(started, session, { decision: 'allow', ...(write !== undefined && { write }) });
  const { redirectTo } = (await allowed.json()) as { redirectTo: string };
  expect(allowed.status).to.equal(200);
  const back = await resume(started, redirectTo);
  expect(back.searchParams.get('state')).to.equal(started.state);
  expect(back.searchParams.get('iss')).to.equal(SITE);
  const code = back.searchParams.get('code')!;
  const res = await token({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirect,
    client_id: clientId,
    code_verifier: started.verifier
  });
  const tokens = (await res.json()) as Tokens;
  expect(res.status, JSON.stringify(tokens)).to.equal(200);
  const row = (await AccessToken.findOne({ kind: 'oauth', clientId }).sort({ createdAt: -1, _id: -1 }))!;
  return { tokens, row, code, verifier: started.verifier };
};

const refresh = (refreshToken: string, clientId: string) =>
  token({ grant_type: 'refresh_token', refresh_token: refreshToken, client_id: clientId });

let rpcId = 0;
/** A JSON-RPC request to /mcp. */
const rpc = async (method: string, params: object, accessToken?: string) => {
  const res = await fetch(base() + '/mcp', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      'mcp-protocol-version': '2025-06-18',
      ...(accessToken && { authorization: 'Bearer ' + accessToken })
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: ++rpcId, method, params })
  });
  const text = await res.text();
  const data = text.includes('data: ')
    ? text
        .split('\n')
        .find((line) => line.startsWith('data: '))!
        .slice(6)
    : text;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- JSON read in the tests
  return { status: res.status, headers: res.headers, body: (data ? JSON.parse(data) : null) as any };
};
const toolNames = async (accessToken?: string): Promise<string[]> =>
  ((await rpc('tools/list', {}, accessToken)).body.result.tools as Array<{ name: string }>).map((t) => t.name);

/** An account with a confirmed email, signed in. */
const person = async () => {
  const made = await makeUser();
  return { ...made, session: made.token };
};

describe('OAuth: the authorization server', function () {
  // Each connection is several requests, and the suites run side by side.
  this.timeout(20000);

  describe('metadata', () => {
    it('says where everything is, and offers only what is built (RFC 8414)', async () => {
      const res = await request('/.well-known/oauth-authorization-server');
      expect(res.status).to.equal(200);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- JSON read in the tests
      const meta = (await res.json()) as any;
      expect(meta.issuer).to.equal(SITE);
      expect(meta.authorization_endpoint).to.equal(SITE + '/oauth/authorize');
      expect(meta.token_endpoint).to.equal(SITE + '/oauth/token');
      expect(meta.registration_endpoint).to.equal(SITE + '/oauth/register');
      expect(meta.revocation_endpoint).to.equal(SITE + '/oauth/revoke');
      expect(meta.response_types_supported).to.eql(['code']);
      expect(meta.grant_types_supported).to.eql(['authorization_code', 'refresh_token']);
      expect(meta.code_challenge_methods_supported).to.eql(['S256']);
      expect(meta.token_endpoint_auth_methods_supported).to.eql(['none']);
      expect(meta.authorization_response_iss_parameter_supported).to.equal(true);
      expect(meta.client_id_metadata_document_supported).to.equal(true);
      expect(meta).to.not.have.property('userinfo_endpoint');
      expect(meta).to.not.have.property('jwks_uri');
    });

    it('points the MCP endpoint at it, asking only for data:read (RFC 9728)', async () => {
      for (const path of ['/.well-known/oauth-protected-resource', '/.well-known/oauth-protected-resource/mcp']) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- JSON read in the tests
        const meta = (await (await request(path)).json()) as any;
        expect(meta.resource).to.equal(RESOURCE);
        expect(meta.authorization_servers).to.eql([SITE]);
        expect(meta.scopes_supported).to.eql(['data:read']);
      }
    });

    it('serves no OpenID Connect discovery, no userinfo, no logout and no device flow', async () => {
      for (const path of [
        '/.well-known/openid-configuration',
        '/oauth/.well-known/openid-configuration',
        '/oauth/userinfo',
        '/oauth/introspect',
        '/oauth/session/end',
        '/oauth/par',
        '/oauth/device/auth'
      ]) {
        const res = await request(path);
        expect(res.status, path).to.be.oneOf([404, 405]);
      }
    });

    it('answers 404 for every address under /oauth/ not written exactly as offered', async () => {
      // oidc-provider's own router ignores letter case and a slash at the end; the limits would not.
      const variants: Array<[string, string]> = [];
      for (const [method, path] of [
        ['GET', '/oauth/authorize'],
        ['POST', '/oauth/authorize'],
        ['POST', '/oauth/token'],
        ['POST', '/oauth/register'],
        ['POST', '/oauth/revoke'],
        ['GET', '/oauth/jwks'],
        ['GET', '/oauth/authorize/abcdefghijklmnopqrstu']
      ] as const) {
        const [, , name, ...rest] = path.split('/');
        const tail = rest.length ? '/' + rest.join('/') : '';
        variants.push(
          [method, path + '/'],
          [method, path.toUpperCase()],
          [method, '/oauth/' + name![0]!.toUpperCase() + name!.slice(1) + tail],
          [method, path.toUpperCase().replace('/OAUTH/', '/oauth/') + '/']
        );
      }
      // And addresses oidc-provider has but nothing here offers: reading or changing a registration.
      variants.push(['GET', '/oauth/register/dcr_someone'], ['PUT', '/oauth/register/dcr_someone']);
      for (const [method, path] of variants) {
        const res = await request(path, {
          method,
          ...(method !== 'GET' && {
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ client_name: 'Sideways', redirect_uris: [REDIRECT] })
          })
        });
        // /OAUTH/... is not under /oauth/ at all: the authorization server never sees it.
        if (path.startsWith('/OAUTH/')) {
          expect(res.status, method + ' ' + path).to.not.be.oneOf([200, 201, 303]);
          continue;
        }
        expect(res.status, method + ' ' + path).to.equal(404);
        expect(((await res.json()) as { error: string }).error, method + ' ' + path).to.equal('not_found');
      }
      // Written exactly, they still answer.
      expect((await request('/oauth/jwks')).status).to.equal(200);
      expect((await register()).status).to.equal(201);
    });
  });

  describe('apps that register themselves (DCR)', () => {
    it('registers a public app, with no secret and no registration token, kept 7 days unless connected', async () => {
      const res = await register();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- JSON read in the tests
      const body = (await res.json()) as any;
      expect(res.status).to.equal(201);
      expect(body.client_id).to.match(/^dcr_[\w-]{24}$/);
      expect(body).to.not.have.property('client_secret');
      expect(body).to.not.have.property('registration_access_token');
      expect(body.token_endpoint_auth_method).to.equal('none');
      // Loopback redirects only: a native app, whose port may change between runs (RFC 8252).
      expect(body.application_type).to.equal('native');
      const record = (await OAuthRecord.findById(recordKey('Client', body.client_id)).lean())!;
      const days = (record.expiresAt!.getTime() - Date.now()) / DAY;
      expect(days).to.be.within(DCR_UNUSED_DAYS - 0.01, DCR_UNUSED_DAYS);
    });

    it('refuses apps with secrets, other grants, unsafe redirects or long names', async () => {
      const cases: Record<string, Record<string, unknown>> = {
        secret: { token_endpoint_auth_method: 'client_secret_basic' },
        implicit: { grant_types: ['implicit'], response_types: ['token'] },
        credentials: { grant_types: ['client_credentials'] },
        'http elsewhere': { redirect_uris: ['http://app.example/callback'] },
        javascript: { redirect_uris: ['javascript:alert(1)'] },
        data: { redirect_uris: ['data:text/html,hi'] },
        'https to loopback': { redirect_uris: ['https://127.0.0.1/callback'] },
        credentialsInUri: { redirect_uris: ['https://user:pass@app.example/cb'] },
        none: { redirect_uris: [] },
        'long name': { client_name: 'x'.repeat(61) },
        jwks: { jwks_uri: 'https://app.example/jwks' },
        sector: { sector_identifier_uri: 'https://app.example/sector' }
      };
      for (const [what, metadata] of Object.entries(cases)) {
        const res = await register(metadata);
        expect(res.status, what).to.equal(400);
        expect(((await res.json()) as { error: string }).error, what).to.be.oneOf([
          'invalid_client_metadata',
          'invalid_redirect_uri'
        ]);
      }
      // A name of 60 characters, https and an app's own scheme are fine.
      expect((await register({ client_name: 'x'.repeat(60) })).status).to.equal(201);
      expect((await register({ redirect_uris: ['https://app.example/cb'] })).status).to.equal(201);
      expect((await register({ redirect_uris: ['com.example.app:/oauth'] })).status).to.equal(201);
    });

    it(`allows 10 an hour from one address, and counts everyone's together for the day`, async () => {
      const address = '203.0.113.' + Math.floor(Math.random() * 200 + 20);
      const all = 'oauth-register-all';
      limits.oauthRegisterAll.resetKey(all);
      process.env.RATE_LIMITS = 'on';
      try {
        for (let i = 0; i < 10; i++) {
          expect((await register({}, { 'x-forwarded-for': address })).status, 'registration ' + i).to.equal(201);
        }
        const over = await register({}, { 'x-forwarded-for': address });
        expect(over.status).to.equal(429);
        expect(((await over.json()) as { error: string }).error).to.equal('too_many_requests');
        // Another address may still register, and counts towards the day's total for everyone.
        expect((await register({}, { 'x-forwarded-for': '198.51.100.7' })).status).to.equal(201);
        const day = await limits.oauthRegisterAll.getKey(all);
        // The one refused from the first address never reached the day's count.
        expect(day?.totalHits).to.equal(11);
        expect(limits.OAUTH_REGISTRATIONS_A_DAY).to.equal(500);
      } finally {
        process.env.RATE_LIMITS = 'off';
        limits.oauthRegisterAll.resetKey(all);
      }
    });

    it(`counts only registrations made towards everyone's day, and an IPv6 network as one address`, async () => {
      const all = 'oauth-register-all';
      limits.oauthRegisterAll.resetKey(all);
      process.env.RATE_LIMITS = 'on';
      try {
        const refused = await register(
          { token_endpoint_auth_method: 'client_secret_basic' },
          { 'x-forwarded-for': '198.51.100.' + Math.floor(Math.random() * 200 + 20) }
        );
        expect(refused.status).to.equal(400);
        expect((await limits.oauthRegisterAll.getKey(all))?.totalHits ?? 0).to.equal(0);
        // Ten from one /64, then its neighbours in the same /56 are refused too.
        const network = '2001:db8:' + Math.floor(Math.random() * 0xfff).toString(16) + ':';
        for (let i = 0; i < 10; i++) {
          const res = await register({}, { 'x-forwarded-for': network + '100::' + (i + 1) });
          expect(res.status, 'registration ' + i).to.equal(201);
        }
        expect((await register({}, { 'x-forwarded-for': network + '100::99' })).status).to.equal(429);
        expect((await register({}, { 'x-forwarded-for': network + '1ff::1' })).status).to.equal(429);
        expect((await limits.oauthRegisterAll.getKey(all))?.totalHits).to.equal(10);
      } finally {
        process.env.RATE_LIMITS = 'off';
        limits.oauthRegisterAll.resetKey(all);
      }
    });

    it('keeps a connected app 30 days from its last use', async () => {
      const { session } = await person();
      const clientId = await registered();
      const { tokens } = await connect(clientId, session);
      const kept = async () => {
        const record = (await OAuthRecord.findById(recordKey('Client', clientId)).lean())!;
        return (record.expiresAt!.getTime() - Date.now()) / DAY;
      };
      expect(await kept()).to.be.within(DCR_IDLE_DAYS - 0.01, DCR_IDLE_DAYS);
      await OAuthRecord.updateOne(
        { _id: recordKey('Client', clientId) },
        { $set: { expiresAt: new Date(Date.now() + DAY) } }
      );
      expect((await refresh(tokens.refresh_token, clientId)).status).to.equal(200);
      expect(await kept()).to.be.within(DCR_IDLE_DAYS - 0.01, DCR_IDLE_DAYS);
    });

    it('checks every app the same way, and cleans the names it shows', () => {
      const base = {
        token_endpoint_auth_method: 'none',
        grant_types: ['authorization_code'],
        response_types: ['code']
      } as const;
      expect(() =>
        checkClientMetadata({ ...base, client_id: 'x', redirect_uris: ['https://a.example/cb'] })
      ).to.not.throw();
      expect(() => checkClientMetadata({ ...base, client_id: 'x', redirect_uris: ['vbscript:x'] })).to.throw();
      expect(() =>
        checkClientMetadata({ ...base, client_id: 'x', redirect_uris: ['cursor://anysphere.app/cb'] })
      ).to.not.throw();
      expect(() => checkClientMetadata({ ...base, client_id: 'x', redirect_uris: ['mailto:a@b.example'] })).to.throw();
      expect(cleanName('  Good\u202eapp\u0000  name ')).to.equal('Goodapp name');
      expect(cleanName('​⁦')).to.equal(undefined);
      expect(cleanName(42)).to.equal(undefined);
    });
  });

  describe('PKCE and the one resource', () => {
    let clientId: string;
    before(async () => {
      clientId = await registered();
    });

    it('refuses a start without PKCE, or with plain', async () => {
      const starts: Record<string, string>[] = [
        { code_challenge: '', code_challenge_method: '' },
        { code_challenge_method: 'plain' }
      ];
      for (const extra of starts) {
        const started = await authorize(clientId, { extra });
        expect(started.res.status).to.equal(303);
        const back = new URL(started.res.headers.get('location')!);
        expect(back.origin + back.pathname).to.equal(REDIRECT);
        expect(back.searchParams.get('error')).to.equal('invalid_request');
        expect(back.searchParams.get('iss')).to.equal(SITE);
      }
    });

    it('refuses a code with the wrong verifier, and any second use of a code', async () => {
      const { session } = await person();
      const started = await authorize(clientId);
      const { redirectTo } = (await (await answer(started, session, { decision: 'allow' })).json()) as {
        redirectTo: string;
      };
      const code = (await resume(started, redirectTo)).searchParams.get('code')!;
      const exchange = (verifier: string) =>
        token({
          grant_type: 'authorization_code',
          code,
          redirect_uri: REDIRECT,
          client_id: clientId,
          code_verifier: verifier
        });
      const wrong = await exchange(pkce().verifier);
      expect(wrong.status).to.equal(400);
      expect(((await wrong.json()) as { error: string }).error).to.equal('invalid_grant');

      // A code used once, and again: the second is refused, and ends the connection it made.
      const { session: other, user: otherUser } = await person();
      const second = await authorize(clientId);
      const answered = (await (await answer(second, other, { decision: 'allow' })).json()) as { redirectTo: string };
      const again = (await resume(second, answered.redirectTo)).searchParams.get('code')!;
      const use = () =>
        token({
          grant_type: 'authorization_code',
          code: again,
          redirect_uri: REDIRECT,
          client_id: clientId,
          code_verifier: second.verifier
        });
      const first = (await (await use()).json()) as Tokens;
      expect(first.access_token).to.be.a('string');
      const reused = await use();
      expect(reused.status).to.equal(400);
      expect(((await reused.json()) as { error: string }).error).to.equal('invalid_grant');
      // The event that revokes the row runs just after the answer.
      const why = async () => (await AccessToken.findOne({ userId: otherUser._id }))?.revokedWhy;
      for (let i = 0; i < 20 && (await why()) !== 'reused'; i++) await mail.settle();
      expect(await why()).to.equal('reused');
      expect((await rpc('tools/list', {}, first.access_token)).status).to.equal(401);
    });

    it('gives tokens for the MCP endpoint alone: another resource is invalid_target', async () => {
      const started = await authorize(clientId, { extra: { resource: 'https://other.example/api' } });
      const back = new URL(started.res.headers.get('location')!);
      expect(back.searchParams.get('error')).to.equal('invalid_target');
      const slash = await authorize(clientId, { extra: { resource: RESOURCE + '/' } });
      expect(new URL(slash.res.headers.get('location')!).searchParams.get('error')).to.equal('invalid_target');
      const named = await authorize(clientId, { extra: { resource: RESOURCE } });
      expect(named.res.headers.get('location')).to.match(/\/api\/connect\/[\w-]+$/);

      const { session } = await person();
      const { tokens } = await connect(clientId, session);
      const other = await token({
        grant_type: 'refresh_token',
        refresh_token: tokens.refresh_token,
        client_id: clientId,
        resource: 'https://other.example/api'
      });
      expect(other.status).to.equal(400);
      expect(((await other.json()) as { error: string }).error).to.equal('invalid_target');
    });

    it('answers with the site’s own addresses whatever Host a request names', async () => {
      const started = new Jar();
      const { challenge } = pkce();
      const res = await request(
        '/oauth/authorize?' +
          new URLSearchParams({
            client_id: clientId,
            redirect_uri: REDIRECT,
            response_type: 'code',
            code_challenge: challenge,
            code_challenge_method: 'S256',
            scope: 'data:read'
          }).toString(),
        { jar: started, headers: { 'x-forwarded-host': 'evil.example' } }
      );
      expect(res.status).to.equal(303);
      expect(res.headers.get('location')).to.match(/^\/api\/connect\/[\w-]+$/);
      // The cookies are the site's own, httpOnly; the resume cookie only for the way back.
      const cookies = res.headers.getSetCookie().join('\n');
      expect(cookies).to.match(/_gc_oauth_interaction=[^;]+;.*path=\/api\/connect\//i);
      expect(cookies).to.match(/_gc_oauth_resume=[^;]+;.*path=\/oauth\/authorize\//i);
      expect(cookies).to.match(/httponly/i);
      expect(cookies).to.match(/secure/i);
      expect(cookies).to.not.include('evil.example');
    });
  });

  describe('the consent API', () => {
    let clientId: string;
    before(async () => {
      clientId = await registered({ client_name: 'Helpful‮ Assistant' });
    });

    it('sends a browser on to the consent page, and tells the page what to show', async () => {
      const { session } = await person();
      const started = await authorize(clientId, { scope: 'data:read data:write' });
      const opened = await request('/api/connect/' + started.uid, {
        jar: started.jar,
        headers: { accept: 'text/html', 'sec-fetch-mode': 'navigate' }
      });
      expect(opened.status).to.equal(303);
      expect(opened.headers.get('location')).to.equal('/connect/' + started.uid);
      const shown = await details(started, session);
      expect(shown.status).to.equal(200);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- JSON read in the tests
      const body = (await shown.json()) as any;
      expect(body.uid).to.equal(started.uid);
      expect(body.client).to.eql({ name: 'Helpful Assistant', source: 'dcr', host: null, selfDescribed: true });
      expect(body.redirect).to.eql({ scheme: 'http:', host: '127.0.0.1:7777', loopback: true, app: null });
      expect(body.redirectElsewhere).to.equal(false);
      expect(body.writeRequested).to.equal(true);
      expect(shown.headers.get('cache-control')).to.equal('no-store');
    });

    it('hands oidc-provider the site’s own host and scheme, whatever X-Forwarded-Host or -Proto said', async () => {
      const { session } = await person();
      const started = await authorize(clientId);
      const provider = getProvider();
      const seen: Array<{ host: string; protocol: string }> = [];
      const own = provider.createContext.bind(provider);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- watching oidc-provider's own Koa contexts
      (provider as any).createContext = (req: any, res: any) => {
        const ctx = own(req, res);
        seen.push({ host: ctx.host, protocol: ctx.protocol });
        return ctx;
      };
      try {
        const headers = {
          authorization: 'Bearer ' + session,
          'x-forwarded-host': 'evil.example',
          'x-forwarded-proto': 'http'
        };
        const shown = await request('/api/connect/' + started.uid, {
          jar: started.jar,
          headers: { accept: 'application/json', ...headers }
        });
        expect(shown.status).to.equal(200);
        const denied = await request('/api/connect/' + started.uid, {
          method: 'POST',
          jar: started.jar,
          headers: { ...JSON_TYPE, ...headers },
          body: JSON.stringify({ decision: 'deny' })
        });
        expect(denied.status).to.equal(200);
      } finally {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- putting oidc-provider's own back
        delete (provider as any).createContext;
      }
      expect(seen.length).to.be.at.least(2);
      for (const ctx of seen) expect(ctx).to.eql({ host: 'glazecalc.test', protocol: 'https' });
    });

    it('asks to be signed in, and turns away trials, unconfirmed emails and other browsers', async () => {
      const started = await authorize(clientId);
      expect((await request('/api/connect/' + started.uid, { jar: started.jar, headers: JSON_TYPE })).status).to.equal(
        401
      );
      const trial = sessionToken(await api().post('/guest').send({}))!;
      const asTrial = await details(started, trial);
      expect(asTrial.status).to.equal(403);
      expect(((await asTrial.json()) as { code: string }).code).to.equal('connect-trial');
      expect((await answer(started, trial, { decision: 'allow' })).status).to.equal(403);
      const unconfirmed = await person();
      await User.updateOne({ _id: unconfirmed.user._id }, { $set: { emailUnverified: true } });
      const asUnconfirmed = await details(started, unconfirmed.session);
      expect(asUnconfirmed.status).to.equal(403);
      expect(((await asUnconfirmed.json()) as { code: string }).code).to.equal('connect-needs-confirmed-email');
      // Without the interaction's cookie (another browser), or with another uid: not found.
      const { session } = await person();
      const elsewhere = await request('/api/connect/' + started.uid, {
        headers: { accept: 'application/json', authorization: 'Bearer ' + session }
      });
      expect(elsewhere.status).to.equal(404);
      const other = await authorize(clientId);
      expect((await details({ ...started, uid: other.uid }, session)).status).to.equal(404);
      expect((await details({ ...started, uid: 'not a uid!' }, session)).status).to.equal(404);
      expect(await AccessToken.countDocuments({ clientId })).to.equal(0);
    });

    it('takes an answer only from the site’s own pages, and only allow or deny', async () => {
      const { session } = await person();
      const started = await authorize(clientId);
      const forged = await request('/api/connect/' + started.uid, {
        method: 'POST',
        jar: started.jar,
        headers: {
          ...JSON_TYPE,
          cookie: '',
          origin: 'https://evil.example',
          'sec-fetch-site': 'cross-site',
          authorization: 'Bearer ' + session
        },
        body: JSON.stringify({ decision: 'allow' })
      });
      expect(forged.status).to.equal(403);
      for (const body of [{}, { decision: 'yes' }, { decision: 'allow', write: 'true' }]) {
        expect((await answer(started, session, body)).status, JSON.stringify(body)).to.equal(400);
      }
      expect(
        await AccessToken.countDocuments({ clientId, userId: (await User.findOne({}).sort({ _id: -1 }))!._id })
      ).to.equal(0);
    });

    it('stands alone: an earlier yes in the same browser, even another account’s, carries nothing over', async () => {
      const a = await person();
      const b = await person();
      const jar = new Jar();
      const first = await authorize(clientId, { jar });
      const one = (await (await answer(first, a.session, { decision: 'allow' })).json()) as { redirectTo: string };
      await resume(first, one.redirectTo);
      // The same browser, a few minutes later, signed in as someone else: asked again, and the answer is theirs.
      const second = await authorize(clientId, { jar });
      expect(second.res.headers.get('location')).to.match(/\/api\/connect\/[\w-]+$/);
      const two = (await (await answer(second, b.session, { decision: 'allow' })).json()) as { redirectTo: string };
      const back = await resume(second, two.redirectTo);
      const res = await token({
        grant_type: 'authorization_code',
        code: back.searchParams.get('code')!,
        redirect_uri: REDIRECT,
        client_id: clientId,
        code_verifier: second.verifier
      });
      const tokens = (await res.json()) as Tokens;
      expect((await rpc('tools/list', {}, tokens.access_token)).status).to.equal(200);
      const rowB = (await AccessToken.findOne({ userId: b.user._id, kind: 'oauth' }))!;
      expect(rowB.lastUsedAt).to.be.an.instanceOf(Date);
      expect((await AccessToken.findOne({ userId: a.user._id, kind: 'oauth' }))!.lastUsedAt).to.equal(undefined);
    });

    it('sends the app access_denied when the person says no, and makes nothing', async () => {
      const { session, user } = await person();
      const started = await authorize(clientId);
      const denied = await answer(started, session, { decision: 'deny' });
      const { redirectTo } = (await denied.json()) as { redirectTo: string };
      const back = await resume(started, redirectTo);
      expect(back.searchParams.get('error')).to.equal('access_denied');
      expect(back.searchParams.get('code')).to.equal(null);
      expect(await AccessToken.countDocuments({ userId: user._id })).to.equal(0);
      // Answered once: a second answer finds nothing.
      expect((await answer(started, session, { decision: 'allow' })).status).to.equal(404);
    });

    it('makes a read-only connection unless the app asked to change records and the person ticked it', async () => {
      const { session, user } = await person();
      const unticked = await connect(clientId, session, { scope: 'data:read data:write' });
      expect(unticked.tokens.scope).to.equal('data:read');
      expect(unticked.row.scopes).to.eql(['data:read']);
      const notAsked = await connect(clientId, session, { scope: 'data:read', write: true });
      expect(notAsked.tokens.scope).to.equal('data:read');
      const onlyWrite = await connect(clientId, session, { scope: 'data:write', write: true });
      expect(onlyWrite.tokens.scope).to.equal('data:read data:write');
      const none = await connect(clientId, session, { scope: '' });
      expect(none.tokens.scope).to.equal('data:read');
      // One connection per app: each new one ended the one before.
      const rows = await AccessToken.find({ userId: user._id, kind: 'oauth' }).sort({ createdAt: 1, _id: 1 });
      expect(rows.map((row) => row.revokedWhy ?? 'working')).to.eql(['replaced', 'replaced', 'replaced', 'working']);
      const row = rows[3]!;
      expect(row.name).to.equal('Helpful Assistant');
      expect(row.clientSource).to.equal('dcr');
      expect(row.clientHost).to.equal(undefined);
      expect(row.redirectHost).to.equal('127.0.0.1:7777');
      expect(row.grantId).to.be.a('string');
      expect(row.hash).to.equal(undefined);
      expect((await rpc('tools/list', {}, unticked.tokens.access_token)).status).to.equal(401);
    });

    it('shows an app’s own scheme whole, never as a host it looks like (evilapp://claude.ai)', async () => {
      const { session, user } = await person();
      const evil = await registered({ client_name: 'Claude', redirect_uris: ['evilapp://claude.ai/cb'] });
      const started = await authorize(evil, { redirect: 'evilapp://claude.ai/cb' });
      expect(started.res.status, await started.res.clone().text()).to.equal(303);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- JSON read in the tests
      const body = (await (await details(started, session)).json()) as any;
      expect(body.client).to.include({ name: 'Claude', host: null, selfDescribed: true });
      expect(body.redirect).to.eql({ scheme: 'evilapp:', host: null, loopback: false, app: 'evilapp://claude.ai/cb' });
      // The row and the notice name the scheme, never claude.ai.
      const { redirectTo } = (await (await answer(started, session, { decision: 'allow' })).json()) as {
        redirectTo: string;
      };
      expect((await resume(started, redirectTo)).protocol).to.equal('evilapp:');
      const row = (await AccessToken.findOne({ userId: user._id, kind: 'oauth' }))!;
      expect(row.redirectHost).to.equal('evilapp:');
      const [notice] = (await mail.waitFor(user.email, 1)).filter(
        (sent) => sent.subject === CONNECTION_MADE['en']!.subject
      );
      expect(notice!.text).to.include('It receives the answer at: evilapp:');
      expect(notice!.text).not.to.include('claude.ai');
      // Shown without its query, cleaned of anything that hides or reorders text.
      expect(redirectShown('com.example.app:/oauth?code=x#y')).to.eql({
        scheme: 'com.example.app:',
        host: null,
        loopback: false,
        app: 'com.example.app:/oauth'
      });
      expect(redirectShown('evilapp://claude.ai‮/cb').app).to.equal('evilapp://claude.ai/cb');
      expect(redirectShown('http://localhost:8080/cb')).to.include({ host: 'localhost:8080', loopback: true });
      expect(redirectShown(undefined)).to.include({ host: null, app: null, loopback: false });
    });

    it('emails a notice for each new connection: the app, its host, what it may do, and where to revoke it', async () => {
      const { session, user } = await person();
      const subject = CONNECTION_MADE['en']!.subject;
      const notices = async (count: number) =>
        (await mail.waitFor(user.email, count)).filter((sent) => sent.subject === subject);

      await connect(clientId, session, { scope: 'data:read data:write' });
      const [read] = await notices(1);
      expect(read!.text).to.include('The app: "Helpful Assistant"');
      expect(read!.text).to.include('It registered itself, so its name is only what it says about itself.');
      expect(read!.text).to.include('It receives the answer on the computer it was connected from (127.0.0.1:7777).');
      expect(read!.text).to.include('It cannot change anything.');
      expect(read!.text).not.to.include('Its address, checked');
      expect(read!.text).to.match(/connected to the Glazecalc account \S+ on \d{1,2} \w+ \d{4} at \d\d:\d\d \(UTC\)/);
      expect(read!.text).to.include('/account/apps');
      expect(read!.text).to.include('/forgot');

      await connect(clientId, session, { scope: 'data:read data:write', write: true });
      const [, write] = await notices(2);
      expect(write!.text).to.include(`for ${OAUTH_WRITE_DAYS} days it can also change them`);
      expect(write!.text).to.include('move them to the Trash');
      expect(write!.text).to.include('undo it on the website');
      expect(write!.text).not.to.include('It cannot change anything.');

      // A no sends nothing.
      const started = await authorize(clientId);
      await answer(started, session, { decision: 'deny' });
      expect(await notices(0)).to.have.length(2);
    });

    it('lasts 60 days to read, renewed as it is used, and 90 days to change records, never renewed', async () => {
      const { session } = await person();
      const read = await connect(clientId, session);
      expect((read.row.expiresAt.getTime() - Date.now()) / DAY).to.be.within(
        OAUTH_REFRESH_DAYS - 0.01,
        OAUTH_REFRESH_DAYS
      );
      await AccessToken.updateOne({ _id: read.row._id }, { $set: { expiresAt: new Date(Date.now() + 10 * DAY) } });
      const renewed = await refresh(read.tokens.refresh_token, clientId);
      expect(renewed.status).to.equal(200);
      const after = (await AccessToken.findById(read.row._id))!;
      expect((after.expiresAt.getTime() - Date.now()) / DAY).to.be.within(
        OAUTH_REFRESH_DAYS - 0.01,
        OAUTH_REFRESH_DAYS
      );
      const grant = (await OAuthRecord.findById(recordKey('Grant', read.row.grantId!)).lean())!;
      expect(Math.abs(grant.expiresAt!.getTime() - after.expiresAt.getTime())).to.be.below(2000);

      const other = await person();
      const write = await connect(clientId, other.session, { scope: 'data:read data:write', write: true });
      expect(write.tokens.scope).to.equal('data:read data:write');
      const ends = write.row.expiresAt.getTime();
      expect((ends - Date.now()) / DAY).to.be.within(OAUTH_WRITE_DAYS - 0.01, OAUTH_WRITE_DAYS);
      const next = (await (await refresh(write.tokens.refresh_token, clientId)).json()) as Tokens;
      expect(next.refresh_token).to.be.a('string');
      expect((await AccessToken.findById(write.row._id))!.expiresAt.getTime()).to.equal(ends);
    });
  });

  describe('tokens', () => {
    let clientId: string;
    before(async () => {
      clientId = await registered();
    });

    it('gives opaque access tokens for an hour, stored only as hashes', async () => {
      const { session } = await person();
      const { tokens, code } = await connect(clientId, session);
      expect(tokens.token_type).to.equal('Bearer');
      expect(tokens.expires_in).to.be.within(3590, 3600);
      expect(tokens.access_token).to.match(/^[\w-]{43}$/);
      expect(tokens.refresh_token).to.match(/^[\w-]{43}$/);
      expect(tokens).to.not.have.property('id_token');
      const everything = JSON.stringify(await OAuthRecord.find({}).lean());
      for (const secret of [tokens.access_token, tokens.refresh_token, code]) expect(everything).to.not.include(secret);
    });

    it('rotates refresh tokens, and a second use of one ends the whole connection', async () => {
      const { session } = await person();
      const { tokens, row } = await connect(clientId, session);
      const first = await refresh(tokens.refresh_token, clientId);
      const next = (await first.json()) as Tokens;
      expect(first.status).to.equal(200);
      expect(next.refresh_token).to.not.equal(tokens.refresh_token);
      expect((await rpc('tools/list', {}, next.access_token)).status).to.equal(200);
      // The first one again, as someone who copied it would.
      const reused = await refresh(tokens.refresh_token, clientId);
      expect(reused.status).to.equal(400);
      expect(((await reused.json()) as { error: string }).error).to.equal('invalid_grant');
      expect((await AccessToken.findById(row._id))!.revokedWhy).to.equal('reused');
      expect((await refresh(next.refresh_token, clientId)).status).to.equal(400);
      expect((await rpc('tools/list', {}, next.access_token)).status).to.equal(401);
      expect(await OAuthRecord.countDocuments({ grantId: row.grantId })).to.equal(0);
    });

    it('refuses a refresh token from another app', async () => {
      const { session } = await person();
      const { tokens } = await connect(clientId, session);
      const other = await registered();
      const res = await refresh(tokens.refresh_token, other);
      expect(res.status).to.equal(400);
      expect(((await res.json()) as { error: string }).error).to.equal('invalid_grant');
    });

    it('ends a connection when the app revokes its refresh token', async () => {
      const { session } = await person();
      const { tokens, row } = await connect(clientId, session);
      const res = await request('/oauth/revoke', {
        method: 'POST',
        headers: FORM,
        body: form({ token: tokens.refresh_token, token_type_hint: 'refresh_token', client_id: clientId })
      });
      expect(res.status).to.equal(200);
      // The event that revokes the row runs just after the answer.
      for (let i = 0; i < 20 && !(await AccessToken.findById(row._id))!.revokedAt; i++) await mail.settle();
      expect((await AccessToken.findById(row._id))!.revokedWhy).to.equal('app');
      expect((await rpc('tools/list', {}, tokens.access_token)).status).to.equal(401);
    });
  });

  describe('a connection ends everywhere at once', () => {
    let clientId: string;
    before(async () => {
      clientId = await registered();
    });

    it('when its row is revoked on the account page', async () => {
      const { session, user } = await person();
      const { tokens, row } = await connect(clientId, session);
      expect((await rpc('tools/list', {}, tokens.access_token)).status).to.equal(200);
      expect(await revokeOne(user._id, row._id, ['pat', 'oauth'], 'person')).to.equal(true);
      expect((await rpc('tools/list', {}, tokens.access_token)).status).to.equal(401);
      expect((await refresh(tokens.refresh_token, clientId)).status).to.equal(400);
      expect(await OAuthRecord.countDocuments({ grantId: row.grantId })).to.equal(0);
      expect(await OAuthRecord.countDocuments({ _id: recordKey('Grant', row.grantId!) })).to.equal(0);
    });

    it('when only the row is revoked, before the grant is deleted', async () => {
      const { session } = await person();
      const { tokens, row } = await connect(clientId, session);
      await AccessToken.updateOne({ _id: row._id }, { $set: { revokedAt: new Date(), revokedWhy: 'person' } });
      expect((await rpc('tools/list', {}, tokens.access_token)).status).to.equal(401);
      expect((await refresh(tokens.refresh_token, clientId)).status).to.equal(400);
    });

    it('when it expires', async () => {
      const { session } = await person();
      const { tokens, row } = await connect(clientId, session);
      await AccessToken.updateOne({ _id: row._id }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
      expect((await rpc('tools/list', {}, tokens.access_token)).status).to.equal(401);
      expect((await refresh(tokens.refresh_token, clientId)).status).to.equal(400);
    });

    it('by its grant (revokeGrant)', async () => {
      const { session } = await person();
      const { tokens, row } = await connect(clientId, session);
      await revokeGrant(row.grantId!);
      expect((await AccessToken.findById(row._id))!.revokedWhy).to.equal('person');
      expect((await rpc('tools/list', {}, tokens.access_token)).status).to.equal(401);
    });

    it('with a password reset, and with "Sign out everywhere"', async () => {
      const { session, user } = await person();
      const { tokens, row } = await connect(clientId, session);
      // Once the connection's notice is written.
      const before = (await mail.waitFor(user.email, 0)).length;
      expect((await api().post('/password/forgot').send({ email: user.email })).status).to.equal(200);
      const sent = await mail.waitFor(user.email, before + 1);
      const link = mail.tokenIn(sent[sent.length - 1]!);
      expect(
        (await api().post('/password/reset').send({ token: link, password: 'brand-new-password' })).status
      ).to.equal(200);
      expect((await AccessToken.findById(row._id))!.revokedWhy).to.equal('password-reset');
      expect((await rpc('tools/list', {}, tokens.access_token)).status).to.equal(401);
      expect((await refresh(tokens.refresh_token, clientId)).status).to.equal(400);
      expect(await OAuthRecord.countDocuments({ grantId: row.grantId })).to.equal(0);

      const other = await person();
      const second = await connect(clientId, other.session);
      expect(
        (
          await api()
            .post('/signout-everywhere')
            .set('Authorization', 'Bearer ' + other.session)
        ).status
      ).to.equal(200);
      expect((await AccessToken.findById(second.row._id))!.revokedWhy).to.equal('signed-out-everywhere');
      expect((await rpc('tools/list', {}, second.tokens.access_token)).status).to.equal(401);
      expect((await refresh(second.tokens.refresh_token, clientId)).status).to.equal(400);
    });

    it('when the account becomes a trial’s, or is gone', async () => {
      const { session, user } = await person();
      const { tokens } = await connect(clientId, session);
      await User.updateOne({ _id: user._id }, { $set: { guest: true } });
      expect((await rpc('tools/list', {}, tokens.access_token)).status).to.equal(401);
      expect((await refresh(tokens.refresh_token, clientId)).status).to.equal(400);
    });
  });

  describe('the MCP endpoint and the rest of the site', () => {
    let clientId: string;
    before(async () => {
      clientId = await registered();
    });

    it('takes a connected app’s token for the person’s own tools, and limits it to them', async () => {
      const { session } = await person();
      const { tokens, row } = await connect(clientId, session);
      const names = await toolNames(tokens.access_token);
      expect(names).to.include('list_recipes');
      expect(names).to.include('create_recipe');
      expect((await AccessToken.findById(row._id))!.lastUsedAt).to.be.an.instanceOf(Date);
    });

    it('never takes it anywhere under /api', async () => {
      const { session } = await person();
      const { tokens } = await connect(clientId, session);
      for (const path of ['/recipe/getAll', '/notes/getAll', '/tokens', '/usersettings', '/export']) {
        const res = await api()
          .get(path)
          .set('Authorization', 'Bearer ' + tokens.access_token);
        expect(res.status, path).to.equal(403);
        expect(res.body.code, path).to.equal('token-not-here');
      }
      // A made-up one of the same shape: 401.
      const made = await api()
        .get('/recipe/getAll')
        .set('Authorization', 'Bearer ' + 'a'.repeat(43));
      expect(made.status).to.equal(401);
    });

    it('asks a read-only app to step up before it changes anything (403 insufficient_scope)', async () => {
      const { session, user } = await person();
      const { tokens } = await connect(clientId, session);
      for (const name of WRITE_TOOLS) {
        const res = await rpc('tools/call', { name, arguments: {} }, tokens.access_token);
        expect(res.status, name).to.equal(403);
        const header = res.headers.get('www-authenticate')!;
        expect(header).to.match(/^Bearer realm="glazecalc", error="insufficient_scope"/);
        expect(header).to.include('scope="data:read data:write"');
        expect(header).to.include('resource_metadata="' + SITE + '/.well-known/oauth-protected-resource/mcp"');
      }
      // Reading goes on as before.
      const listed = await rpc('tools/call', { name: 'list_recipes', arguments: {} }, tokens.access_token);
      expect(listed.status).to.equal(200);
      expect(await Note.countDocuments({ ownedBy: String(user._id) })).to.equal(0);
    });

    it('lets an app allowed to change records change them, logged as the connection', async () => {
      const { session, user } = await person();
      const { tokens, row } = await connect(clientId, session, { scope: 'data:read data:write', write: true });
      const res = await rpc(
        'tools/call',
        { name: 'add_notebook_entry', arguments: { content: 'Glazed' } },
        tokens.access_token
      );
      expect(res.status).to.equal(200);
      expect(res.body.result.isError).to.not.equal(true);
      expect(await Note.countDocuments({ ownedBy: String(user._id) })).to.equal(1);
      const logged = (await Activity.findOne({ ownedBy: String(user._id) }).lean()) as Record<string, unknown> | null;
      expect(logged?.via).to.equal('oauth');
      expect(String(logged?.tokenId)).to.equal(String(row._id));
    });

    it('keeps the in-tool refusal for a read-only personal token', async () => {
      const { user } = await person();
      const pat = await makeToken(user, { scopes: ['data:read'] });
      const res = await rpc('tools/call', { name: 'add_notebook_entry', arguments: { content: 'x' } }, pat);
      expect(res.status).to.equal(200);
      expect(res.body.result.isError).to.equal(true);
      expect(res.body.result.content[0].text).to.equal(READ_ONLY_TOKEN);
      expect(res.body.result._meta['mcp/www_authenticate'][0]).to.include('scope="data:read data:write"');
    });

    it('describes how each tool may be called, for ChatGPT', async () => {
      const { session } = await person();
      const { tokens } = await connect(clientId, session);
      const listed = (await rpc('tools/list', {}, tokens.access_token)).body.result.tools as Array<{
        name: string;
        _meta?: { securitySchemes?: unknown };
      }>;
      for (const tool of listed) expect(tool._meta?.securitySchemes, tool.name).to.eql(securitySchemes(tool.name));
      expect(securitySchemes('search_materials')).to.eql([
        { type: 'noauth' },
        { type: 'oauth2', scopes: ['data:read'] }
      ]);
      expect(securitySchemes('list_recipes')).to.eql([{ type: 'oauth2', scopes: ['data:read'] }]);
      expect(securitySchemes('move_to_trash')).to.eql([{ type: 'oauth2', scopes: ['data:read', 'data:write'] }]);
    });

    it('refuses a token whose audience is not the MCP endpoint', async () => {
      const { session } = await person();
      const { tokens } = await connect(clientId, session);
      const key = recordKey('AccessToken', tokens.access_token);
      const record = (await OAuthRecord.findById(key).lean())!;
      const payload = JSON.parse(record.payload) as Record<string, unknown>;
      await OAuthRecord.updateOne(
        { _id: key },
        { $set: { payload: JSON.stringify({ ...payload, aud: SITE + '/api' }) } }
      );
      expect((await rpc('tools/list', {}, tokens.access_token)).status).to.equal(401);
    });
  });
});

describe('OAuth: apps named by their address (CIMD)', function () {
  this.timeout(20000);

  const ADDRESS = '93.184.215.14';
  let calls: string[];

  /** A stand-in for the network: names resolve as `names` says, and each address answers as `answers` says. */
  const network = (
    names: Record<string, string[]>,
    answers: Record<string, (path: string) => Partial<RawAnswer>>
  ): Network => ({
    lookup: async (hostname) =>
      (names[hostname] ?? []).map((address) => ({ address, family: address.includes(':') ? 6 : 4 })),
    get: async ({ hostname, path }) => {
      calls.push(hostname + path);
      const answer = answers[hostname]?.(path) ?? { status: 404 };
      return { status: 200, headers: { 'content-type': 'application/json' }, body: Buffer.from(''), ...answer };
    }
  });

  const documentFor = (url: string, more: Record<string, unknown> = {}) => ({
    body: Buffer.from(
      JSON.stringify({
        client_id: url,
        client_name: 'Address Assistant',
        redirect_uris: ['https://app.example/callback'],
        token_endpoint_auth_method: 'none',
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        ...more
      })
    )
  });

  let n = 0;
  /** An address no other test has used, so oidc-provider's cache of documents never answers for it. */
  const fresh = () => `https://app.example/clients/${Date.now()}-${n++}.json`;

  /** The start of a connection as from an address (X-Forwarded-For, as nginx passes it on). */
  const authorizeFrom = async (clientId: string, forwardedFor: string) => {
    const { challenge } = pkce();
    const query = new URLSearchParams({
      client_id: clientId,
      redirect_uri: 'https://app.example/callback',
      response_type: 'code',
      code_challenge: challenge,
      code_challenge_method: 'S256',
      scope: 'data:read'
    });
    return request('/oauth/authorize?' + query.toString(), { headers: { 'x-forwarded-for': forwardedFor } });
  };

  beforeEach(() => {
    calls = [];
    resetFetchCount();
  });
  after(() => useNetwork());

  it('reads the app from its address and shows its host', async () => {
    const url = fresh();
    useNetwork(network({ 'app.example': [ADDRESS] }, { 'app.example': () => documentFor(url) }));
    const { session, user } = await person();
    const started = await authorize(url, { redirect: 'https://app.example/callback' });
    expect(started.res.status, await started.res.clone().text()).to.equal(303);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- JSON read in the tests
    const shown = (await (await details(started, session)).json()) as any;
    expect(shown.client).to.eql({
      name: 'Address Assistant',
      source: 'cimd',
      host: 'app.example',
      selfDescribed: false
    });
    expect(shown.redirect).to.eql({ scheme: 'https:', host: 'app.example', loopback: false, app: null });
    expect(shown.redirectElsewhere).to.equal(false);
    const { redirectTo } = (await (await answer(started, session, { decision: 'allow' })).json()) as {
      redirectTo: string;
    };
    const back = await resume(started, redirectTo);
    expect(back.origin + back.pathname).to.equal('https://app.example/callback');
    const row = (await AccessToken.findOne({ userId: user._id, kind: 'oauth' }))!;
    expect(row.clientSource).to.equal('cimd');
    expect(row.clientHost).to.equal('app.example');
    expect(calls).to.eql(['app.example' + new URL(url).pathname]);
    const [notice] = (await mail.waitFor(user.email, 1)).filter(
      (sent) => sent.subject === CONNECTION_MADE['en']!.subject
    );
    expect(notice!.text).to.include('The app: "Address Assistant"');
    expect(notice!.text).to.include('Its address, checked by Glazecalc: app.example');
    expect(notice!.text).to.include('It receives the answer at: app.example');
    expect(notice!.text).not.to.include('registered itself');
  });

  it('says when an app named by its address sends the answer to another host', async () => {
    const url = fresh();
    useNetwork(
      network(
        { 'app.example': [ADDRESS] },
        { 'app.example': () => documentFor(url, { redirect_uris: ['https://elsewhere.example/callback'] }) }
      )
    );
    const { session } = await person();
    const started = await authorize(url, { redirect: 'https://elsewhere.example/callback' });
    expect(started.res.status, await started.res.clone().text()).to.equal(303);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- JSON read in the tests
    const shown = (await (await details(started, session)).json()) as any;
    expect(shown.client.host).to.equal('app.example');
    expect(shown.redirect.host).to.equal('elsewhere.example');
    expect(shown.redirectElsewhere).to.equal(true);
  });

  it('never fetches from this machine, its network or the cloud’s metadata service', async () => {
    for (const address of [
      '169.254.169.254',
      '127.0.0.1',
      '10.0.0.5',
      '172.16.3.4',
      '192.168.1.1',
      '100.64.0.1',
      '0.0.0.0',
      '224.0.0.1',
      '::1',
      '::',
      'fd00::1',
      'fe80::1',
      '::ffff:10.0.0.1',
      '::ffff:a9fe:a9fe',
      '64:ff9b::a9fe:a9fe',
      '::a9fe:a9fe',
      '::ffff:0:a9fe:a9fe',
      '2002:a9fe:a9fe::1'
    ]) {
      const url = fresh();
      useNetwork(network({ 'app.example': [address] }, { 'app.example': () => documentFor(url) }));
      const started = await authorize(url, { redirect: 'https://app.example/callback' });
      expect(started.res.status, address).to.equal(400);
    }
    // One public address among private ones is still refused.
    const url = fresh();
    useNetwork(network({ 'app.example': [ADDRESS, '10.0.0.1'] }, { 'app.example': () => documentFor(url) }));
    expect((await authorize(url, { redirect: 'https://app.example/callback' })).res.status).to.equal(400);
    expect(calls).to.eql([]);
  });

  it('fetches only https on 443 by name, with a path and no query', async () => {
    useNetwork(network({ 'app.example': [ADDRESS] }, {}));
    for (const url of [
      'http://app.example/client.json',
      'https://app.example:8443/client.json',
      `https://${ADDRESS}/client.json`,
      'https://[2606:2800:220:1::1]/client.json',
      'https://app.example/',
      'https://app.example/client.json?x=1',
      'https://user@app.example/client.json',
      'https://localhost/client.json',
      'https://printer.local/client.json'
    ]) {
      const started = await authorize(url, { redirect: 'https://app.example/callback' });
      expect(started.res.status, url).to.equal(400);
    }
    expect(calls).to.eql([]);
  });

  it('refuses redirects, large or non-JSON answers, and documents for another address', async () => {
    const cases: Record<string, (url: string) => Partial<RawAnswer>> = {
      redirect: () => ({ status: 302, headers: { location: 'http://169.254.169.254/' } }),
      large: (url) => ({
        body: Buffer.from(JSON.stringify({ ...JSON.parse(documentFor(url).body!.toString()), pad: 'x'.repeat(6000) }))
      }),
      html: (url) => ({ ...documentFor(url), headers: { 'content-type': 'text/html' } }),
      mismatch: () => documentFor('https://app.example/someone-else.json'),
      secret: (url) => documentFor(url, { token_endpoint_auth_method: 'client_secret_post' }),
      'http redirect': (url) => documentFor(url, { redirect_uris: ['http://app.example/callback'] })
    };
    for (const [what, reply] of Object.entries(cases)) {
      const url = fresh();
      useNetwork(network({ 'app.example': [ADDRESS] }, { 'app.example': () => reply(url) }));
      const started = await authorize(url, { redirect: 'https://app.example/callback' });
      expect(started.res.status, what).to.equal(400);
    }
    // Each was fetched (oidc-provider may ask twice for one that failed) and refused for what came back.
    expect(new Set(calls).size).to.equal(Object.keys(cases).length);
  });

  it('checks the guard’s parts', async () => {
    for (const address of ['93.184.215.14', '8.8.8.8', '2606:2800:220:1:248:1893:25c8:1946']) {
      expect(publicAddress(address), address).to.equal(true);
    }
    for (const address of ['169.254.169.254', '10.1.2.3', '::1', 'fc00::1', 'not an address', '::ffff:127.0.0.1']) {
      expect(publicAddress(address), address).to.equal(false);
    }
    // IPv4 inside IPv6 every other way: IPv4-compatible (::/96), SIIT (::ffff:0:0:0/96), NAT64, 6to4 and Teredo.
    for (const address of [
      '::a9fe:a9fe',
      '::169.254.169.254',
      '::10.0.0.1',
      '::8.8.8.8',
      '::ffff:0:a9fe:a9fe',
      '::ffff:0:10.0.0.1',
      '64:ff9b::a00:1',
      '64:ff9b:1::a00:1',
      '2002:a00:1::1',
      '2002:a9fe:a9fe::1',
      '2001:0:4136:e378:8000:63bf:3fff:fdd2'
    ]) {
      expect(publicAddress(address), address).to.equal(false);
    }
    expect(allowedClientIdUrl('https://app.example/oauth/client.json')).to.equal(true);
    expect(allowedClientIdUrl('https://app.example:443/oauth/client.json')).to.equal(true);
    expect(allowedClientIdUrl('https://app.example/a#b')).to.equal(false);
    expect(allowedClientIdUrl('https://intranet/client.json')).to.equal(false);
  });

  it('limits fetches a minute from one address, for one host, and for everyone together', () => {
    process.env.RATE_LIMITS = 'on';
    try {
      const now = Date.now();
      for (let i = 0; i < FETCH_LIMITS.address; i++) {
        expect(countFetch({ address: '198.51.100.1', host: `h${i}.example` }, now)).to.equal(true);
      }
      expect(countFetch({ address: '198.51.100.1', host: 'other.example' }, now)).to.equal(false);
      // An IPv6 network counts as one address.
      for (let i = 0; i < FETCH_LIMITS.address; i++) {
        expect(countFetch({ address: '2001:db8:1:2::' + (i + 1), host: `v${i}.example` }, now)).to.equal(true);
      }
      expect(countFetch({ address: '2001:db8:1:3::1', host: 'other.example' }, now)).to.equal(false);
      resetFetchCount();
      for (let i = 0; i < FETCH_LIMITS.host; i++) {
        expect(countFetch({ address: '198.51.100.' + (i + 1), host: 'busy.example' }, now)).to.equal(true);
      }
      expect(countFetch({ address: '198.51.100.99', host: 'BUSY.example' }, now)).to.equal(false);
      expect(countFetch({ address: '198.51.100.99', host: 'quiet.example' }, now)).to.equal(true);
      resetFetchCount();
      for (let i = 0; i < FETCH_LIMITS.everyone; i++) {
        expect(countFetch({ address: '203.0.113.' + (i % 200), host: `e${i}.example` }, now)).to.equal(true);
      }
      expect(countFetch({ address: '192.0.2.1', host: 'last.example' }, now)).to.equal(false);
      expect(countFetch({ address: '192.0.2.1', host: 'last.example' }, now + 61 * 1000)).to.equal(true);
    } finally {
      process.env.RATE_LIMITS = 'off';
      resetFetchCount();
    }
  });

  it('counts fetches by the address that asked (one proxy hop), each its own share', async () => {
    const hosts = Array.from({ length: FETCH_LIMITS.address + 2 }, (_, i) => `a${Date.now()}x${i}.example`);
    const urls = hosts.map((host) => `https://${host}/client.json`);
    useNetwork(
      network(
        Object.fromEntries(hosts.map((host) => [host, [ADDRESS]])),
        Object.fromEntries(hosts.map((host, i) => [host, () => documentFor(urls[i]!)]))
      )
    );
    const stranger = '198.51.100.' + Math.floor(Math.random() * 200 + 20);
    process.env.RATE_LIMITS = 'on';
    try {
      for (let i = 0; i < FETCH_LIMITS.address; i++) {
        expect((await authorizeFrom(urls[i]!, stranger)).status, urls[i]).to.equal(303);
      }
      // The stranger's share is used up, whatever X-Forwarded-For they write first; another address's is not.
      expect((await authorizeFrom(urls[FETCH_LIMITS.address]!, '192.0.2.9, ' + stranger)).status).to.equal(400);
      expect((await authorizeFrom(urls[FETCH_LIMITS.address + 1]!, '203.0.113.77')).status).to.equal(303);
    } finally {
      process.env.RATE_LIMITS = 'off';
    }
  });

  it('keeps a connected app working without fetching, however many other addresses are named', async function () {
    this.timeout(120000);
    const url = fresh();
    // Any document under app.example is there, as its own address says.
    useNetwork(
      network({ 'app.example': [ADDRESS] }, { 'app.example': (path) => documentFor('https://app.example' + path) })
    );
    const { session, user } = await person();
    const { tokens } = await connect(url, session, { redirect: 'https://app.example/callback' });
    const key = recordKey('ClientDocument', url);
    expect(await OAuthRecord.exists({ _id: key })).to.not.equal(null);
    // Two hundred other addresses push it out of oidc-provider's memory (it keeps 100).
    for (let batch = 0; batch < 10; batch++) {
      await Promise.all(
        Array.from({ length: 21 }, () => authorize(fresh(), { redirect: 'https://app.example/callback' }))
      );
    }
    // The app's server is down, and every fetch is used up.
    calls = [];
    useNetwork({
      lookup: async (hostname) => {
        calls.push(hostname);
        throw new Error('down');
      },
      get: async () => {
        throw new Error('down');
      }
    });
    process.env.RATE_LIMITS = 'on';
    try {
      for (let i = 0; i < FETCH_LIMITS.everyone; i++) {
        countFetch({ address: '203.0.113.' + (i % 200), host: `f${i}.example` });
      }
      const res = await refresh(tokens.refresh_token, url);
      const next = (await res.json()) as Tokens;
      expect(res.status, JSON.stringify(next)).to.equal(200);
      expect(calls).to.eql([]);

      // Its time up, it is checked again: a failed check keeps the one it had, and tries again later.
      await OAuthRecord.updateOne({ _id: key }, { $set: { freshUntil: new Date(Date.now() - 1000) } });
      resetFetchCount();
      const again = await refresh(next.refresh_token, url);
      const after = (await again.json()) as Tokens;
      expect(again.status, JSON.stringify(after)).to.equal(200);
      expect(calls).to.eql(['app.example']);
      const kept = (await OAuthRecord.findById(key).lean())!;
      expect((kept.freshUntil!.getTime() - Date.now()) / 1000).to.be.within(RETRY_SECONDS - 30, RETRY_SECONDS);

      // A check that passes takes the new document, for as long as its Cache-Control says.
      calls = [];
      useNetwork(
        network(
          { 'app.example': [ADDRESS] },
          {
            'app.example': () => ({
              ...documentFor(url, { client_name: 'Renamed Assistant' }),
              headers: { 'content-type': 'application/json', 'cache-control': 'max-age=7200' }
            })
          }
        )
      );
      await OAuthRecord.updateOne({ _id: key }, { $set: { freshUntil: new Date(Date.now() - 1000) } });
      const third = await refresh(after.refresh_token, url);
      expect(third.status, await third.clone().text()).to.equal(200);
      const renewed = (await OAuthRecord.findById(key).lean())!;
      expect(JSON.parse(renewed.payload).client_name).to.equal('Renamed Assistant');
      expect((renewed.freshUntil!.getTime() - Date.now()) / 1000).to.be.within(7200 - 30, 7200);
      expect(calls).to.eql(['app.example' + new URL(url).pathname]);
    } finally {
      process.env.RATE_LIMITS = 'off';
      resetFetchCount();
    }

    // Revoked, it is no longer read from what was kept, and goes.
    await AccessToken.updateMany({ userId: user._id, kind: 'oauth' }, { $set: { revokedAt: new Date() } });
    expect(await keptClientDocument(url, async () => {})).to.equal(undefined);
    expect(await OAuthRecord.exists({ _id: key })).to.equal(null);
  });
});
