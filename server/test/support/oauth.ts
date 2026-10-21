// Helpers for the authorization server tests (oauth_tests.ts, oauth_cimd_auth_tests.ts): requests
// with a browser's cookies, the consent flow, the token endpoint and the MCP endpoint.
import crypto from 'node:crypto';
import AccessToken from '../../models/access_token.ts';
import { base, expect, makeUser } from './app.ts';

export const SITE = 'https://glazecalc.test';
export const RESOURCE = SITE + '/mcp';
export const REDIRECT = 'http://127.0.0.1:7777/callback';
export const DAY = 24 * 60 * 60 * 1000;

/** Cookies as a browser keeps them for the site: by name, with their paths. Secure ones too (the tests use http). */
export class Jar {
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
export const request = async (
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

export const form = (fields: Record<string, string>) => new URLSearchParams(fields).toString();
export const FORM = { 'content-type': 'application/x-www-form-urlencoded' };
export const JSON_TYPE = { 'content-type': 'application/json', accept: 'application/json' };

/** A PKCE pair (S256). */
export const pkce = () => {
  const verifier = crypto.randomBytes(32).toString('base64url');
  return { verifier, challenge: crypto.createHash('sha256').update(verifier).digest('base64url') };
};

/** An app registering itself (DCR); the client id. */
export const register = async (metadata: Record<string, unknown> = {}, headers: Record<string, string> = {}) =>
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
export const registered = async (metadata: Record<string, unknown> = {}): Promise<string> => {
  const res = await register(metadata);
  const body = (await res.json()) as { client_id: string };
  expect(res.status, JSON.stringify(body)).to.equal(201);
  return body.client_id;
};

export interface Started {
  jar: Jar;
  uid: string;
  verifier: string;
  state: string;
  res: Response;
}

/** The start of a connection: GET /oauth/authorize, which sends the browser to the consent API. */
export const authorize = async (
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
export const details = (started: Started, session: string) =>
  request('/api/connect/' + started.uid, {
    jar: started.jar,
    headers: { accept: 'application/json', authorization: 'Bearer ' + session }
  });

/** The consent page's answer: the address the browser goes to next. */
export const answer = async (started: Started, session: string, body: Record<string, unknown>) =>
  request('/api/connect/' + started.uid, {
    method: 'POST',
    jar: started.jar,
    headers: { ...JSON_TYPE, authorization: 'Bearer ' + session },
    body: JSON.stringify(body)
  });

/** The browser back at the authorization server after the answer: the redirect to the app, with code, state and iss. */
export const resume = async (started: Started, redirectTo: string): Promise<URL> => {
  const url = new URL(redirectTo);
  expect(url.origin).to.equal(SITE);
  const res = await request(url.pathname + url.search, { jar: started.jar });
  expect(res.status, await res.clone().text()).to.equal(303);
  return new URL(res.headers.get('location')!);
};

export interface Tokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

export const token = (fields: Record<string, string>, headers: Record<string, string> = {}) =>
  request('/oauth/token', { method: 'POST', headers: { ...FORM, ...headers }, body: form(fields) });

/**
 * A whole connection, as an assistant and the person make one: the tokens, and
 * the connection's row. `auth` adds the app's own fields to the code exchange
 * (a signed client assertion).
 */
export const connect = async (
  clientId: string,
  session: string,
  {
    scope = 'data:read',
    write,
    redirect = REDIRECT,
    auth = () => ({})
  }: { scope?: string; write?: boolean; redirect?: string; auth?: () => Record<string, string> } = {}
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
    code_verifier: started.verifier,
    ...auth()
  });
  const tokens = (await res.json()) as Tokens;
  expect(res.status, JSON.stringify(tokens)).to.equal(200);
  const row = (await AccessToken.findOne({ kind: 'oauth', clientId }).sort({ createdAt: -1, _id: -1 }))!;
  return { tokens, row, code, verifier: started.verifier };
};

export const refresh = (refreshToken: string, clientId: string) =>
  token({ grant_type: 'refresh_token', refresh_token: refreshToken, client_id: clientId });

let rpcId = 0;
/** A JSON-RPC request to /mcp. */
export const rpc = async (method: string, params: object, accessToken?: string) => {
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
export const toolNames = async (accessToken?: string): Promise<string[]> =>
  ((await rpc('tools/list', {}, accessToken)).body.result.tools as Array<{ name: string }>).map((t) => t.name);

/** An account with a confirmed email, signed in. */
export const person = async () => {
  const made = await makeUser();
  return { ...made, session: made.token };
};
