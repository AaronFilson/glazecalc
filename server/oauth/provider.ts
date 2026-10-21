// Glazecalc's own OAuth authorization server, for AI assistants that connect
// to the MCP endpoint (docs/adr/0024-authorization-server.md; integrations
// plan items 33 and 34): oidc-provider, pinned, run inside Express. It is a
// Koa app; only its own handler (provider.callback()) ever sees Koa, under
// /oauth/, before the client's pages.
//
// What it gives out, and to whom:
//   - The authorization code flow with PKCE (S256 only), and refresh tokens
//     that rotate: each is used once, and a second use (a copied one) ends
//     the whole connection. Nothing else: no implicit flow, no client
//     credentials, no device flow, no OpenID Connect (no ID tokens, no
//     userinfo), no DPoP, no pushed requests, no logout endpoint.
//   - Public clients (token_endpoint_auth_method none): an assistant cannot
//     keep a secret. An app names itself by an https:// address (CIMD,
//     server/oauth/cimd.ts), or registers itself (DCR), which is limited and
//     expires (server/oauth/adapter.ts). OAUTH_CIMD_AUTH (cimd.ts
//     cimdAuthMode, off by default) also takes ChatGPT's document: as a public
//     app (public), or signing its token requests with its own key
//     (private_key_jwt; server/oauth/client_assertions.ts). Never a secret,
//     and never for an app that registered itself.
//   - Tokens for the MCP endpoint alone: the one resource (RFC 8707) is
//     resourceUrl(), the default too, and anything else is invalid_target.
//     Access tokens are opaque and last an hour.
//   - RFC 9207: every authorization answer carries iss.
//
// Who said yes: the person, on the consent page, each time (interactions.ts),
// signed in on the website as usual; there is no sign-in here and no lasting
// session of its own. Each yes is a connection: a row in access_tokens (kind
// 'oauth', server/models/access_token.ts) beside the grant here. The row is
// the connection: revoked, every token of the grant stops (resource.ts and
// findAccount below ask for a working row).
import { AsyncLocalStorage } from 'node:async_hooks';
import crypto from 'node:crypto';
import express, { type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import mongoose from 'mongoose';
import Provider, { errors, type ClientMetadata, type Configuration, type KoaContextWithOIDC } from 'oidc-provider';
import appSecret from '../lib/app_secret.ts';
import * as log from '../lib/log.ts';
import * as limits from '../lib/rate_limit.ts';
import * as site from '../lib/site.ts';
import AccessToken, {
  OAUTH_ACCESS_SECONDS,
  OAUTH_REFRESH_DAYS,
  OAUTH_WRITE_DAYS,
  type AccessTokenDocument
} from '../models/access_token.ts';
import User from '../models/user.ts';
import { issuerUrl, resourceUrl } from '../mcp/urls.ts';
import {
  extendGrant,
  grantSourceOnRecord,
  keepRegisteredClient,
  MongoAdapter,
  whenClientDocumentWanted,
  whenGrantEnded,
  whenReused
} from './adapter.ts';
import {
  allowedClientIdUrl,
  CACHE_SECONDS,
  checkJwks,
  cimdAuthMode,
  CLIENT_KEY_ALGS,
  countFetch,
  guardedFetch,
  markKeySetProven,
  MOST_BYTES,
  whoIsAsking,
  type CimdAuthMode
} from './cimd.ts';
import { assertClientAssertion, CLOCK_TOLERANCE } from './client_assertions.ts';
import { keepClientDocument, keptClientDocument } from './client_documents.ts';
import { revokeGrant } from './revoke.ts';

/** The scopes an app can be given (server/lib/scopes.ts); data:write only when the person ticks it. */
export const OAUTH_SCOPES = ['data:read', 'data:write'] as const;
/** The longest name an app may give itself. */
export const CLIENT_NAME_MOST = 60;
/** At most this many redirect URIs for one app. */
const MOST_REDIRECTS = 10;
/** How long the person has to say yes or no, and how long the server's own short session lasts. */
export const INTERACTION_SECONDS = 15 * 60;

const DAY = 24 * 60 * 60;

/** The authorization server's addresses, all under /oauth/. */
export const ROUTES = {
  authorization: '/oauth/authorize',
  token: '/oauth/token',
  registration: '/oauth/register',
  revocation: '/oauth/revoke',
  jwks: '/oauth/jwks',
  // Not offered, but oidc-provider names them: kept under /oauth/ all the same.
  introspection: '/oauth/introspect',
  userinfo: '/oauth/userinfo',
  end_session: '/oauth/session/end',
  pushed_authorization_request: '/oauth/par',
  device_authorization: '/oauth/device/auth',
  code_verification: '/oauth/device',
  backchannel_authentication: '/oauth/backchannel',
  challenge: '/oauth/challenge',
  credential: '/oauth/credential'
} as const;

/**
 * The addresses under /oauth/ that are offered, exactly as written: the
 * endpoints above that are on, and the way back from the consent page
 * (/oauth/authorize/<uid>). oidc-provider's own router would also take them
 * in other letter cases or with a slash at the end (/oauth/REGISTER,
 * /oauth/register/), which the limits here would not know; anything else
 * under /oauth/ is answered 404 before it gets there.
 */
const OFFERED = new Set<string>([
  ROUTES.authorization,
  ROUTES.token,
  ROUTES.registration,
  ROUTES.revocation,
  ROUTES.jwks
]);
const RESUME = /^\/oauth\/authorize\/[A-Za-z0-9_-]{1,64}$/;

/** Whether a path is one the authorization server offers, written exactly so. */
export const offeredPath = (path: string): boolean => OFFERED.has(path) || RESUME.test(path);

/** A path as oidc-provider's router matches it: any letter case, without a slash at the end. */
const routerPath = (path: string): string => path.toLowerCase().replace(/\/+$/, '');

/** The consent API's address for an interaction: it sends the browser on to the consent page (interactions.ts). */
export const interactionPath = (uid: string): string => '/api/connect/' + uid;

const LOOPBACK_HOSTS = new Set(['127.0.0.1', '[::1]', '::1', 'localhost']);
/** Schemes an app's own redirect may never use, even written as its own (native) scheme. */
const NEVER_SCHEMES = new Set([
  'javascript:',
  'data:',
  'file:',
  'vbscript:',
  'blob:',
  'about:',
  'ws:',
  'wss:',
  'ftp:',
  'mailto:',
  'tel:',
  'sms:',
  'intent:',
  'view-source:'
]);

/**
 * Whether a host is this site's own, one under it or one above it
 * (glazecalcapp.com and www.glazecalcapp.com; glazecalcapp.com from staging):
 * no app is given its answer there, where the consent page would show the
 * site's own name as the place the answer goes.
 */
const isOwnHost = (hostname: string): boolean => {
  const own = site.rpId();
  const host = hostname.replace(/\.+$/, '');
  return host === own || host.endsWith('.' + own) || own.endsWith('.' + host);
};

/** Whether a redirect URI goes back to the person's own computer (an app running there). */
export const isLoopback = (uri: string): boolean => {
  const url = URL.parse(uri);
  return Boolean(url && url.protocol === 'http:' && LOOPBACK_HOSTS.has(url.hostname));
};

/** Whether a redirect URI is an app's own scheme (cursor://..., com.example.app:/...), as native apps use. */
const isAppScheme = (uri: string): boolean => {
  const url = URL.parse(uri);
  return Boolean(
    url &&
    !['http:', 'https:'].includes(url.protocol) &&
    !NEVER_SCHEMES.has(url.protocol) &&
    /^[a-z][a-z0-9+.-]*:$/.test(url.protocol)
  );
};

const refuse = (description: string): never => {
  throw new errors.InvalidClientMetadata(description);
};

/** The token endpoint's answer once an account is over its own count (limits.countTokenGrant): 429, as OAuth writes it. */
class TooManyTokenRequests extends errors.OIDCProviderError {
  override error_description = 'Too many token requests for this account. Please wait a few minutes and try again.';

  constructor() {
    super(429, 'too_many_requests');
  }
}

/**
 * The keys of an app named by its address that signs its token requests
 * (private_key_jwt): exactly one of a jwks_uri on the client_id's own site
 * (https, port 443, a host name, the same origin, not the document itself;
 * so an app's document can never aim the server's fetches at someone else)
 * or a jwks of 1 to 5 public keys (cimd.ts checkJwks); and a signing alg, if
 * named, from CLIENT_KEY_ALGS.
 */
const checkClientKeys = (metadata: ClientMetadata): void => {
  const clientId = String(metadata.client_id);
  const { jwks_uri: uri, jwks } = metadata;
  if ((uri === undefined) === (jwks === undefined)) refuse('private_key_jwt needs one of jwks_uri and jwks');
  if (uri !== undefined) {
    if (
      typeof uri !== 'string' ||
      !allowedClientIdUrl(uri) ||
      uri === clientId ||
      new URL(uri).origin !== new URL(clientId).origin
    ) {
      refuse("jwks_uri must be an https address on the client_id's own site");
    }
  } else {
    try {
      checkJwks(jwks);
    } catch (err) {
      refuse('jwks: ' + (err instanceof Error ? err.message : 'not taken'));
    }
  }
  const alg = metadata.token_endpoint_auth_signing_alg;
  if (alg !== undefined && !(CLIENT_KEY_ALGS as readonly unknown[]).includes(alg)) {
    refuse(`token_endpoint_auth_signing_alg must be one of ${CLIENT_KEY_ALGS.join(', ')}`);
  }
};

/**
 * What any app must be, however it named itself (CIMD or DCR), checked
 * whenever its details are read: public (no secret), the code and refresh
 * grants only, a short name, and redirect URIs that are https (never to this
 * site), an app's own scheme, or http back to the person's own computer. An
 * app whose redirects are all of the last two is a native app (loopback ports
 * may then vary, RFC 8252). Sync, as oidc-provider asks.
 *
 * With OAUTH_CIMD_AUTH (`mode`; cimd.ts cimdAuthMode), for an app named by its
 * address only, never one that registered itself:
 *   public: a document that asks for another method but also lists none in
 *     token_endpoint_auth_methods_supported (ChatGPT's) is taken as a public
 *     app: none, and its jwks_uri, jwks and signing alg dropped, so nothing is
 *     fetched from them. Our metadata offers none, so none is what such an app
 *     uses (OpenAI: the method is picked from what both sides list).
 *   private_key_jwt: as public; and a document that asks for private_key_jwt
 *     is taken as it says, with its keys (checkClientKeys). oidc-provider then
 *     holds the app to that one method at the token and revocation endpoints.
 * The plural list is read here and dropped: nothing else keeps it.
 */
export const checkClientMetadata = (metadata: ClientMetadata, mode: CimdAuthMode = cimdAuthMode()): void => {
  const offered = metadata.token_endpoint_auth_methods_supported as unknown;
  delete metadata.token_endpoint_auth_methods_supported;
  const named = mode !== 'off' && typeof metadata.client_id === 'string' && isCimdClient(metadata.client_id);
  const signs = named && mode === 'private_key_jwt' && metadata.token_endpoint_auth_method === 'private_key_jwt';
  if (signs) checkClientKeys(metadata);
  else if (
    named &&
    metadata.token_endpoint_auth_method !== 'none' &&
    Array.isArray(offered) &&
    offered.every((method) => typeof method === 'string') &&
    offered.includes('none')
  ) {
    metadata.token_endpoint_auth_method = 'none';
    delete metadata.jwks_uri;
    delete metadata.jwks;
    delete metadata.token_endpoint_auth_signing_alg;
  }
  if (!signs && metadata.token_endpoint_auth_method !== 'none') {
    refuse('only public clients (token_endpoint_auth_method none)');
  }
  const grants = metadata.grant_types ?? [];
  if (!grants.every((grant) => grant === 'authorization_code' || grant === 'refresh_token')) {
    refuse('only the authorization_code and refresh_token grant types');
  }
  if (!(metadata.response_types ?? []).every((type) => type === 'code')) refuse('only the code response type');
  const never = ['sector_identifier_uri', 'request_uris', 'initiate_login_uri'] as const;
  for (const field of signs ? never : (['jwks', 'jwks_uri', ...never] as const)) {
    if (metadata[field] !== undefined) refuse(`${field} is not supported`);
  }
  const name = metadata.client_name;
  if (name !== undefined && (typeof name !== 'string' || [...name].length > CLIENT_NAME_MOST)) {
    refuse(`client_name must be at most ${CLIENT_NAME_MOST} characters`);
  }
  const redirects = metadata.redirect_uris;
  if (!Array.isArray(redirects) || !redirects.length || redirects.length > MOST_REDIRECTS) {
    refuse(`redirect_uris must have 1 to ${MOST_REDIRECTS} addresses`);
  }
  for (const uri of redirects as unknown[]) {
    if (typeof uri !== 'string' || uri.length > 2000) refuse('redirect_uris must be addresses');
    const url = URL.parse(uri as string);
    if (!url || url.username || url.password) refuse('redirect_uris must be addresses without credentials');
    const ok =
      (url!.protocol === 'https:' && !LOOPBACK_HOSTS.has(url!.hostname)) ||
      isLoopback(uri as string) ||
      isAppScheme(uri as string);
    if (!ok) refuse('redirect_uris must be https, an app scheme, or http to 127.0.0.1, [::1] or localhost');
    if (url!.protocol === 'https:' && isOwnHost(url!.hostname)) {
      refuse("redirect_uris must be the app's own addresses, not this site's");
    }
  }
  if (
    metadata.application_type !== 'native' &&
    (redirects as string[]).every((uri) => isLoopback(uri) || isAppScheme(uri))
  ) {
    metadata.application_type = 'native';
  }
};

/**
 * An app's name for showing: control, format and direction characters taken
 * out (no right-to-left override turning "moc.elpmaxe" round), spaces
 * collapsed, at most CLIENT_NAME_MOST characters. undefined when nothing is left.
 */
export const cleanName = (name: unknown): string | undefined => {
  if (typeof name !== 'string') return undefined;
  const clean = name
    .normalize('NFKC')
    .replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
  return clean ? [...clean].slice(0, CLIENT_NAME_MOST).join('') : undefined;
};

/** Whether an app named itself by its address (CIMD) rather than registering (DCR). */
export const isCimdClient = (clientId: string): boolean => /^https:\/\//i.test(clientId);

// A connection's row, loaded once per request by findAccount for the token
// endpoint's other hooks (rotateRefreshToken, the refresh token's lifetime).
const rows = new WeakMap<object, AccessTokenDocument>();

/** Whether a connection's row works now: not revoked, not expired. */
const working = (row: AccessTokenDocument | null, now = new Date()): row is AccessTokenDocument =>
  Boolean(row && !row.revokedAt && row.expiresAt > now);

/** Seconds from now until a date, at least 1. */
const secondsUntil = (date: Date): number => Math.max(1, Math.floor((date.getTime() - Date.now()) / 1000));

/** The cookies' signing keys: from APP_SECRET, so a restart keeps a consent page open in a browser working. */
const cookieKeys = (): string[] => [
  crypto.createHmac('sha256', appSecret).update('glazecalc oauth cookies').digest('base64url')
];

/**
 * A signing key for this process only. Nothing here is signed (tokens are
 * opaque, there are no ID tokens), but oidc-provider wants a key, and without
 * one it would use the well-known development keys.
 */
const processKey = () => {
  const { privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  return { ...privateKey.export({ format: 'jwk' }), use: 'sig', alg: 'ES256', kid: 'process' };
};

const page = (title: string, text: string): string =>
  '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">' +
  `<title>${title}</title></head><body><main><h1>${title}</h1><p>${text}</p>` +
  '<p><a href="/">Glazecalc</a></p></main></body></html>';

const escapeHtml = (text: string): string =>
  text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);

/**
 * What OAUTH_CIMD_AUTH changes in oidc-provider's settings; with it off,
 * nothing (every setting as before). public lets checkClientMetadata see a
 * document's token_endpoint_auth_methods_supported; private_key_jwt also
 * takes signed token requests: the asymmetric algs only, the checks in
 * client_assertions.ts, and keys of at most 5 kB.
 */
const modeSettings = (mode: CimdAuthMode): Partial<Configuration> => {
  if (mode !== 'private_key_jwt') return {};
  return {
    clientAuthMethods: ['none', 'private_key_jwt'],
    enabledJWA: { idTokenSigningAlgValues: ['ES256'], clientAuthSigningAlgValues: [...CLIENT_KEY_ALGS] },
    clockTolerance: CLOCK_TOLERANCE,
    assertJwtClientAuthClaimsAndHeader: assertClientAssertion,
    fetchResponseBodyLimits: { 'client_id metadata document': MOST_BYTES, jwks_uri: MOST_BYTES }
  };
};

const configuration = (mode: CimdAuthMode): Configuration => ({
  adapter: MongoAdapter,
  jwks: { keys: [processKey()] },
  clients: [],
  clientDefaults: {
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    token_endpoint_auth_method: 'none',
    id_token_signed_response_alg: 'ES256'
  },
  clientAuthMethods: ['none'],
  responseTypes: ['code'],
  // No OpenID Connect scopes: the scopes are the MCP endpoint's (getResourceServerInfo).
  scopes: [],
  claims: {},
  subjectTypes: ['public'],
  enabledJWA: { idTokenSigningAlgValues: ['ES256'] },
  pkce: { required: () => true },
  routes: ROUTES,
  allowOmittingSingleRegisteredRedirectUri: false,
  cookies: {
    keys: cookieKeys(),
    names: { session: '_gc_oauth_session', interaction: '_gc_oauth_interaction', resume: '_gc_oauth_resume' },
    long: { httpOnly: true, sameSite: 'lax' },
    short: { httpOnly: true, sameSite: 'lax' }
  },
  ttl: {
    AccessToken: OAUTH_ACCESS_SECONDS,
    AuthorizationCode: 60,
    Interaction: INTERACTION_SECONDS,
    Session: INTERACTION_SECONDS,
    // A connection that can change records lasts OAUTH_WRITE_DAYS from the yes; one that reads, OAUTH_REFRESH_DAYS.
    Grant: (_ctx, grant) =>
      (grant.resources?.[resourceUrl()]?.split(' ').includes('data:write') ? OAUTH_WRITE_DAYS : OAUTH_REFRESH_DAYS) *
      DAY,
    // A refresh token lasts as long as its connection.
    RefreshToken: (ctx) => {
      const row = ctx && rows.get(ctx);
      return row ? secondsUntil(row.expiresAt) : OAUTH_REFRESH_DAYS * DAY;
    }
  },
  // No ID tokens and no OpenID Connect session: tokens never end with the server's short session.
  expiresWithSession: () => false,
  // Every code exchange gives a refresh token (no offline_access needed); refresh tokens always rotate.
  issueRefreshToken: (_ctx, client) => client.grantTypeAllowed('refresh_token'),
  rotateRefreshToken: async (ctx) => {
    const row = rows.get(ctx);
    if (!row) throw new errors.InvalidGrant('connection not found');
    // A read-only connection lasts OAUTH_REFRESH_DAYS from its last refresh; one that writes never grows longer.
    if (!row.scopes.includes('data:write')) {
      const until = new Date(Date.now() + OAUTH_REFRESH_DAYS * DAY * 1000);
      await AccessToken.updateOne({ _id: row._id, revokedAt: null }, { $set: { expiresAt: until } });
      row.expiresAt = until;
      await extendGrant(row.grantId!, until);
    }
    if (!isCimdClient(row.clientId ?? '')) await keepRegisteredClient(row.clientId!);
    return true;
  },
  // Only the grant the person just made on the consent page: a request never rides on an earlier yes.
  loadExistingGrant: async (ctx) => {
    const grantId = ctx.oidc.result?.consent?.grantId;
    return grantId ? ctx.oidc.provider.Grant.find(grantId) : undefined;
  },
  // The account, for a code or refresh token only while its connection works: a
  // revoked or expired one, or a trial, gets invalid_grant.
  findAccount: async (ctx, sub, token) => {
    if (!mongoose.isObjectIdOrHexString(sub)) return undefined;
    const user = await User.findById(sub, { guest: 1 }).lean();
    if (!user || user.guest) return undefined;
    const grantId = (token as { grantId?: string } | undefined)?.grantId;
    if (token && grantId) {
      const row = await AccessToken.findOne({ kind: 'oauth', grantId });
      if (!working(row) || String(row.userId) !== sub || row.clientId !== (token as { clientId?: string }).clientId) {
        return undefined;
      }
      // At the token endpoint, once per request: the account's own count (limits.countTokenGrant) for a refresh
      // token, asked for before oidc-provider uses it, so one refused for the count still works later. Not for a
      // code: oidc-provider has used it up before it asks for the account, so a 429 would lose it (and each code
      // needs the person's yes on the consent page anyway). Not for a refresh token already used either: its
      // second use is found next and ends the connection (a copied token), which no count may hold up.
      const { kind, consumed } = token as { kind?: string; consumed?: unknown };
      if (
        !rows.has(ctx) &&
        kind === 'RefreshToken' &&
        !consumed &&
        routerPath(current.getStore()?.path ?? '') === ROUTES.token &&
        !limits.countTokenGrant(sub)
      ) {
        throw new TooManyTokenRequests();
      }
      rows.set(ctx, row);
    }
    return { accountId: sub, claims: () => ({ sub }) };
  },
  interactions: { url: (_ctx, interaction) => interactionPath(interaction.uid) },
  extraClientMetadata: {
    // Not used for itself: its check runs once for every client, with all its metadata (checkClientMetadata).
    // The plural list only when OAUTH_CIMD_AUTH is on: the check reads it, then drops it.
    properties: mode === 'off' ? ['software_id'] : ['software_id', 'token_endpoint_auth_methods_supported'],
    validator: (_ctx, key, _value, metadata) => {
      if (key === 'software_id') checkClientMetadata(metadata, mode);
    }
  },
  // A browser-based app may call the token endpoint from the origin of one of its https redirect URIs.
  clientBasedCORS: (_ctx, origin, client) =>
    origin.startsWith('https://') && (client.redirectUris ?? []).some((uri) => URL.parse(uri)?.origin === origin),
  renderError: (ctx, out) => {
    ctx.type = 'html';
    const why = typeof out.error_description === 'string' ? out.error_description : String(out.error ?? '');
    ctx.body = page('This app could not be connected', 'Glazecalc could not connect it: ' + escapeHtml(why) + '.');
  },
  fetch: guardedFetch as unknown as Configuration['fetch'],
  fetchResponseBodyLimits: { 'client_id metadata document': MOST_BYTES },
  features: {
    devInteractions: { enabled: false },
    userinfo: { enabled: false },
    rpInitiatedLogout: { enabled: false },
    pushedAuthorizationRequests: { enabled: false },
    dPoP: { enabled: false },
    introspection: { enabled: false },
    // An app may revoke only its own tokens.
    revocation: { enabled: true, allowedPolicy: (_ctx, client, token) => token.clientId === client.clientId },
    registration: {
      enabled: true,
      initialAccessToken: false,
      // No registration access token: a self-registered app cannot read or change its registration later.
      issueRegistrationAccessToken: false,
      idFactory: () => 'dcr_' + crypto.randomBytes(18).toString('base64url')
    },
    resourceIndicators: {
      enabled: true,
      defaultResource: () => resourceUrl(),
      useGrantedResource: () => true,
      getResourceServerInfo: (_ctx, resource) => {
        if (resource !== resourceUrl()) throw new errors.InvalidTarget();
        return {
          scope: OAUTH_SCOPES.join(' '),
          audience: resourceUrl(),
          accessTokenTTL: OAUTH_ACCESS_SECONDS,
          accessTokenFormat: 'opaque'
        };
      }
    },
    clientIdMetadataDocument: {
      enabled: true,
      // Experimental in oidc-provider: draft 02 of the Client ID Metadata Document, acknowledged.
      ack: 'draft-02',
      allowFetch: (_ctx, clientId) =>
        allowedClientIdUrl(clientId) &&
        countFetch({ address: current.getStore()?.address, host: new URL(clientId).host }),
      // Every app is allowed; one with a working connection has its document kept from now on (client_documents.ts).
      allowClient: async (_ctx, client) => {
        await keepClientDocument(client.clientId, client.metadata()).catch((err: unknown) =>
          log.error('Could not keep an app document', { err })
        );
        return true;
      },
      cacheDuration: { min: CACHE_SECONDS.min, max: CACHE_SECONDS.max }
    }
  } as Configuration['features'],
  ...modeSettings(mode)
});

/**
 * The request the authorization server is answering: its path, for
 * whenGrantEnded, and its address (Express's req.ip, which trusts one proxy
 * hop; Koa's would take the first X-Forwarded-For, which anyone can write),
 * for the fetch limits (cimd.ts countFetch).
 */
const current = new AsyncLocalStorage<{ path: string; address: string | undefined }>();

let made:
  { issuer: string; mode: CimdAuthMode; provider: Provider; handler: ReturnType<Provider['callback']> } | undefined;

/**
 * The authorization server for the site's address and OAUTH_CIMD_AUTH, made on
 * first use (the tests set the address first, and may change the mode).
 */
export const getProvider = (): Provider => serverFor().provider;

const serverFor = () => {
  const issuer = issuerUrl();
  const mode = cimdAuthMode();
  if (made?.issuer === issuer && made.mode === mode) return made;
  const provider = new Provider(issuer, configuration(mode));
  // X-Forwarded-Proto is set to the site's own (handOver), never the client's.
  provider.proxy = true;
  // Koa's own logging is off; errors are logged here, without the request.
  provider.silent = true;
  provider.on('server_error', (_ctx, err) => log.error('OAuth server error', { err }));
  // A code or refresh token exchanged by an app that signs: its keys belong to an app with a working connection.
  provider.on('grant.success', (ctx) => {
    const client = ctx.oidc.client;
    if (client?.tokenEndpointAuthMethod === 'private_key_jwt' && client.jwksUri) markKeySetProven(client.jwksUri);
  });
  made = { issuer, mode, provider, handler: provider.callback() };
  return made;
};

whenReused((grantId) => revokeGrant(grantId, 'reused'));
// Key-set fetches are counted by the address of the token request that asked for them.
whoIsAsking(() => current.getStore()?.address);
// An app named by its address reads from the document kept with its working connections first.
whenClientDocumentWanted((clientId) =>
  keptClientDocument(clientId, (metadata) => getProvider().Client.validate(metadata), current.getStore()?.address)
);
// The app ended its connection (revocation), or at the token endpoint a refresh token or code was used twice.
whenGrantEnded((grantId) =>
  revokeGrant(grantId, routerPath(current.getStore()?.path ?? '') === ROUTES.token ? 'reused' : 'app')
);

/**
 * Puts the site's own host and scheme in place of whatever the request said,
 * for oidc-provider (provider.proxy is on, so Koa would believe a client's
 * X-Forwarded-Host and X-Forwarded-Proto): its addresses, cookies and
 * redirects are then always the site's.
 */
const asTheSite = (req: Request): void => {
  const site = new URL(issuerUrl());
  req.headers.host = site.host;
  delete req.headers['x-forwarded-host'];
  req.headers['x-forwarded-proto'] = site.protocol.slice(0, -1);
};

/** Hands a request to the authorization server, as the site's own (asTheSite). */
const handOver = (req: Request, res: Response): void => {
  asTheSite(req);
  void current.run({ path: req.path, address: req.ip }, () => serverFor().handler(req, res));
};

/**
 * Express middleware for the consent API (/api/connect, server/app.ts), whose
 * routes call oidc-provider directly (interactionDetails, interactionResult):
 * the same site's host and scheme as handOver, and the request's address for
 * the fetch limits.
 */
export const asTheSiteForConnect = (req: Request, _res: Response, next: NextFunction): void => {
  asTheSite(req);
  current.run({ path: req.path, address: req.ip }, next);
};

// The token endpoint's form, read here only when a limit on refusals is over
// (grantOnRecord); oidc-provider then takes the form as read (req.body)
// rather than reading the request again, and says once in the log that it
// did ("already parsed request body detected"), which is expected here. Its
// own limit on a form's size.
const tokenForm = express.urlencoded({ extended: false, limit: '56kb' });
const held = new WeakMap<Request, Promise<boolean>>();

/**
 * Whether a token request's code or refresh token is one the server holds
 * (adapter.ts grantSourceOnRecord): such a request goes on even when the
 * token endpoint's counts of refusals are over (rate_limit.ts), so a working
 * connection is never turned away by them. Asked once per request.
 */
const grantOnRecord = (req: Request, res: Response): Promise<boolean> => {
  let answer = held.get(req);
  if (!answer) {
    answer = (async () => {
      await new Promise<void>((resolve, reject) => {
        void tokenForm(req, res, (err?: unknown) => (err ? reject(err as Error) : resolve()));
      });
      const form = (req.body ?? {}) as Record<string, unknown>;
      const kind =
        form.grant_type === 'refresh_token'
          ? 'RefreshToken'
          : form.grant_type === 'authorization_code'
            ? 'AuthorizationCode'
            : undefined;
      const value = kind === 'RefreshToken' ? form.refresh_token : form.code;
      if (!kind || typeof value !== 'string' || !value || value.length > 512) return false;
      return grantSourceOnRecord(kind, value);
    })().catch(() => false);
    held.set(req, answer);
  }
  return answer;
};
limits.whenGrantOnRecord(grantOnRecord);

/** The authorization server's limits (server/lib/rate_limit.ts), by address and method. */
const limitsFor = (req: Request): RequestHandler[] => {
  // As the router matches it, should a path other than offeredPath's ever get this far.
  const path = routerPath(req.path);
  if (path === ROUTES.registration) return [limits.oauthRegister, limits.oauthRegisterAll];
  if (path === ROUTES.token) return [limits.oauthTokenFailures, limits.oauthTokenAll];
  if (path === ROUTES.authorization || path.startsWith(ROUTES.authorization + '/')) {
    return [limits.oauthAuthorize];
  }
  return [limits.oauthOther];
};

/**
 * Every authorization request asks for data:read, whatever its scope said (or
 * if it said none): a connection always reads, and data:write comes only on
 * top, when asked for and allowed. Without it, a token for an app that asked
 * only for data:write, or for nothing, would allow nothing.
 */
const withRead = (req: Request): void => {
  const url = new URL(req.url, 'http://x');
  const scopes = (url.searchParams.get('scope') ?? '').split(' ').filter(Boolean);
  if (scopes.includes('data:read')) return;
  url.searchParams.set('scope', ['data:read', ...scopes].join(' '));
  req.url = url.pathname + url.search;
};

/** Express middleware: everything under /oauth/ goes to the authorization server, after its limits. */
export const oauthServer = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.path.startsWith('/oauth/')) return next();
  if (!offeredPath(req.path)) {
    res.status(404).json({ error: 'not_found', error_description: 'There is nothing at this address.' });
    return;
  }
  if (routerPath(req.path) === ROUTES.authorization && ['GET', 'HEAD'].includes(req.method)) withRead(req);
  const chain = limitsFor(req);
  const run =
    (i: number) =>
    (error?: unknown): void => {
      if (error) return next(error);
      if (res.headersSent) return;
      if (i === chain.length) return handOver(req, res);
      void chain[i]!(req, res, run(i + 1));
    };
  run(0)();
};

/**
 * The authorization server's metadata (RFC 8414), at
 * /.well-known/oauth-authorization-server. With OAUTH_CIMD_AUTH=private_key_jwt
 * it offers that method beside none (which Claude needs to pick a document,
 * so it stays first), and the algs it takes.
 */
export const authorizationServerMetadata = () => {
  const provider = getProvider();
  const signing = cimdAuthMode() === 'private_key_jwt';
  const methods = signing ? ['none', 'private_key_jwt'] : ['none'];
  return {
    issuer: issuerUrl(),
    authorization_endpoint: provider.urlFor('authorization'),
    token_endpoint: provider.urlFor('token'),
    registration_endpoint: provider.urlFor('registration'),
    revocation_endpoint: provider.urlFor('revocation'),
    response_types_supported: ['code'],
    response_modes_supported: ['query'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: methods,
    ...(signing && { token_endpoint_auth_signing_alg_values_supported: [...CLIENT_KEY_ALGS] }),
    revocation_endpoint_auth_methods_supported: methods,
    ...(signing && { revocation_endpoint_auth_signing_alg_values_supported: [...CLIENT_KEY_ALGS] }),
    scopes_supported: [...OAUTH_SCOPES],
    authorization_response_iss_parameter_supported: true,
    client_id_metadata_document_supported: true,
    service_documentation: site.siteUrl() + '/assistants'
  };
};

/** The host of an address, or undefined. */
export const hostOf = (uri: unknown): string | undefined =>
  typeof uri === 'string' ? URL.parse(uri)?.host || undefined : undefined;

export type { KoaContextWithOIDC };
