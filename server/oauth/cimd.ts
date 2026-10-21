// Fetching an app's Client ID Metadata Document (CIMD; docs/adr/0024): an
// app names itself by an https:// address, and the authorization server
// reads the app's details from it. That makes the server fetch an address a
// stranger chose, so every fetch it makes goes through guardedFetch, which
// lets it reach only the public internet, never this machine, its network
// or the cloud's metadata service (169.254.169.254):
//
//   - https only, on port 443, to a host name (not an IP address), with a
//     path and no query, user name or password (allowedClientIdUrl);
//   - the name is resolved here, and refused if any address it gives is
//     loopback, private, link-local, CGNAT, unique-local, multicast or
//     otherwise special (publicAddress); the connection then goes to the
//     address checked, with the name only for TLS (SNI) and the Host header,
//     so a second lookup cannot point it elsewhere (DNS rebinding);
//   - no redirects followed; at most 5 seconds; at most 5 kB; JSON only;
//   - at most FETCH_LIMITS a minute: from one address (a /56 for IPv6), for
//     one host, and for everyone together (countFetch).
//
// An app with a working connection never needs a fetch to go on working: its
// document is kept with the connection (server/oauth/client_documents.ts).
//
// oidc-provider checks the rest (the document's client_id is the address, no
// secrets) and keeps a document for CACHE_SECONDS, from 1 to 24 hours.
//
// Apps that sign their token requests (private_key_jwt), as ChatGPT's
// document says it does, only with OAUTH_CIMD_AUTH=private_key_jwt
// (cimdAuthMode; docs/adr/0024, "Amended: ChatGPT's document"). Their public
// keys (a JWKS) are fetched through the same guard, from an address on the
// app's own site (checked in server/oauth/provider.ts checkClientMetadata),
// with a budget of their own (JWKS_FETCH_LIMITS), kept at most 15 minutes
// (JWKS_CACHE_SECONDS) so a key the app replaces stops working soon, and only
// a set of 1 to 5 public signing keys is taken (checkJwks).
import crypto from 'node:crypto';
import dns from 'node:dns';
import https from 'node:https';
import net from 'node:net';
import { ipKeyGenerator } from 'express-rate-limit';

/**
 * How apps named by their address may authenticate at the token endpoint
 * (OAUTH_CIMD_AUTH), off by default:
 *   off              only public apps (token_endpoint_auth_method none), as before;
 *   public           an app whose document also lists none among its
 *                    token_endpoint_auth_methods_supported (ChatGPT's) is
 *                    taken as a public app, and nothing is fetched from its jwks_uri;
 *   private_key_jwt  as public, and an app whose document asks for
 *                    private_key_jwt signs every token request with its own key.
 */
export type CimdAuthMode = 'off' | 'public' | 'private_key_jwt';
export const cimdAuthMode = (): CimdAuthMode => {
  const mode = process.env.OAUTH_CIMD_AUTH;
  return mode === 'public' || mode === 'private_key_jwt' ? mode : 'off';
};

export const FETCH_TIMEOUT_MS = 5000;
export const MOST_BYTES = 5 * 1024;
/** Fetches a minute: from one address, for one host named, and for everyone together. */
export const FETCH_LIMITS = { address: 10, host: 10, everyone: 120 } as const;
/** How long a fetched document is kept: its Cache-Control, held between an hour and a day. */
export const CACHE_SECONDS = { min: 60 * 60, max: 24 * 60 * 60 } as const;

/** Address blocks that are never fetched from (IANA special-purpose registries, and more). */
const BLOCKED = new net.BlockList();
for (const [prefix, bits] of [
  ['0.0.0.0', 8], // "this network"
  ['10.0.0.0', 8], // private
  ['100.64.0.0', 10], // CGNAT
  ['127.0.0.0', 8], // loopback
  ['169.254.0.0', 16], // link-local, the cloud's metadata service
  ['172.16.0.0', 12], // private
  ['192.0.0.0', 24], // IETF protocol assignments
  ['192.0.2.0', 24], // documentation
  ['192.88.99.0', 24], // 6to4 relay
  ['192.168.0.0', 16], // private
  ['198.18.0.0', 15], // benchmarking
  ['198.51.100.0', 24], // documentation
  ['203.0.113.0', 24], // documentation
  ['224.0.0.0', 4], // multicast
  ['240.0.0.0', 4] // reserved, and broadcast
] as const) {
  BLOCKED.addSubnet(prefix, bits, 'ipv4');
}
for (const [prefix, bits] of [
  ['::', 96], // unspecified, loopback, and IPv4-compatible (::10.0.0.1, deprecated)
  ['::ffff:0:0:0', 96], // SIIT, IPv4-translated (::ffff:0:10.0.0.1)
  ['64:ff9b::', 96], // NAT64, any IPv4 address inside
  ['64:ff9b:1::', 48], // local NAT64
  ['100::', 64], // discard
  ['2001::', 23], // IETF protocol assignments, Teredo (2001::/32) among them
  ['2001:db8::', 32], // documentation
  ['2002::', 16], // 6to4, any IPv4 address inside
  ['3fff::', 20], // documentation
  ['5f00::', 16], // segment routing
  ['fc00::', 7], // unique local
  ['fe80::', 10], // link-local
  ['fec0::', 10], // site-local (deprecated)
  ['ff00::', 8] // multicast
] as const) {
  BLOCKED.addSubnet(prefix, bits, 'ipv6');
}

/** Whether an address is on the public internet: not loopback, private, link-local or otherwise special. */
export const publicAddress = (address: string): boolean => {
  const family = net.isIP(address);
  if (family === 4) return !BLOCKED.check(address, 'ipv4');
  if (family !== 6) return false;
  // An IPv4 address written as IPv6 (::ffff:10.0.0.1) is judged as the IPv4 one; in hex (::ffff:a00:1),
  // refused. (Not a BlockList rule: one for ::ffff:0:0/96 would match every IPv4 address.)
  const mapped = /^::ffff:(.+)$/i.exec(address);
  if (mapped) {
    const rest = mapped[1]!;
    if (net.isIPv4(rest)) return !BLOCKED.check(rest, 'ipv4');
    return false;
  }
  return !BLOCKED.check(address, 'ipv6');
};

/**
 * Whether an app may be named by this address: https, port 443, a host name
 * (never an IP address or localhost), a path beyond "/", and no query, user
 * name, password or fragment.
 */
export const allowedClientIdUrl = (id: string): boolean => {
  const url = URL.parse(id);
  if (!url || url.protocol !== 'https:' || id.includes('#')) return false;
  if (url.port && url.port !== '443') return false;
  if (url.username || url.password || url.search || id.includes('?')) return false;
  if (url.pathname === '/' || !url.pathname) return false;
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(host) || !host.includes('.') || /^localhost$|\.localhost$|\.local$|\.internal$/i.test(host)) {
    return false;
  }
  return true;
};

/** What the network side gives back: kept small so the tests can stand in for it. */
export interface RawAnswer {
  status: number;
  headers: Record<string, string>;
  body: Buffer;
}

/** The two network steps, which the tests replace (useNetwork) so that nothing leaves the machine. */
export interface Network {
  lookup: (hostname: string) => Promise<{ address: string; family: number }[]>;
  /** One GET to the checked address, with the name for TLS and Host. Rejects past the time or size limits. */
  get: (
    target: { address: string; family: number; hostname: string; path: string },
    signal?: AbortSignal
  ) => Promise<RawAnswer>;
}

const realNetwork: Network = {
  lookup: (hostname) => dns.promises.lookup(hostname, { all: true, verbatim: true }),
  get: ({ address, family, hostname, path }, signal) =>
    new Promise<RawAnswer>((resolve, reject) => {
      const request = https.request(
        {
          host: address,
          family,
          port: 443,
          path,
          method: 'GET',
          servername: hostname,
          headers: { host: hostname, accept: 'application/json', 'user-agent': 'Glazecalc-CIMD' },
          timeout: FETCH_TIMEOUT_MS,
          signal,
          // No connection pooling: each fetch is to the address just checked.
          agent: false
        },
        (response) => {
          const chunks: Buffer[] = [];
          let size = 0;
          response.on('data', (chunk: Buffer) => {
            size += chunk.length;
            if (size > MOST_BYTES) {
              response.destroy();
              reject(new Error('response too large'));
              return;
            }
            chunks.push(chunk);
          });
          response.on('end', () => {
            const headers: Record<string, string> = {};
            for (const [name, value] of Object.entries(response.headers)) {
              if (typeof value === 'string') headers[name] = value;
            }
            resolve({ status: response.statusCode ?? 0, headers, body: Buffer.concat(chunks) });
          });
          response.on('error', reject);
        }
      );
      request.on('timeout', () => request.destroy(new Error('timed out')));
      request.on('error', reject);
      request.end();
    })
};

/**
 * The browser tests' stand-in (CIMD_TEST_BASE, outside production only, and
 * only an http address on 127.0.0.1): every name is taken as a public
 * address, and each GET goes to <base>/<host><path> on the tests' own server,
 * so the real server is tested whole with nothing fetched from the internet.
 */
const testNetwork = (base: string): Network => ({
  lookup: async () => [{ address: '93.184.215.14', family: 4 }],
  get: async ({ hostname, path }, signal) => {
    const res = await fetch(base + '/' + hostname + path, { redirect: 'manual', ...(signal && { signal }) });
    const body = Buffer.from(await res.arrayBuffer());
    if (body.length > MOST_BYTES) throw new Error('response too large');
    const headers: Record<string, string> = {};
    res.headers.forEach((value, name) => {
      headers[name] = value;
    });
    return { status: res.status, headers, body };
  }
});

/** CIMD_TEST_BASE when it may be used: outside production, and only as http://127.0.0.1:<port>; else null. */
export const cimdTestBase = (): string | null => {
  const base = process.env.CIMD_TEST_BASE;
  return process.env.NODE_ENV !== 'production' && base && /^http:\/\/127\.0\.0\.1:\d{1,5}$/.test(base) ? base : null;
};

const defaultNetwork = (): Network => {
  const base = cimdTestBase();
  return base ? testNetwork(base) : realNetwork;
};

let network: Network = defaultNetwork();

/** Puts a stand-in for the network in place (the tests), or the usual one back with no argument. */
export const useNetwork = (replacement?: Network): void => {
  network = replacement ?? defaultNetwork();
};

// The fetches of the last minute, in memory as the other limits: by address, by host, and all of them.
let fetchTimes = new Map<string, number[]>();

/** Who is asking for a fetch, and of what host: the request's address (Express's, trusting one proxy) and the host named. */
export interface FetchFor {
  address?: string;
  host: string;
}

/** The key for an address: a /56 for IPv6, as the other limits (express-rate-limit), so one network counts once. */
export const addressKey = (address: string | undefined): string => (address ? ipKeyGenerator(address, 56) : 'unknown');

const recent = (key: string, now: number): number[] => {
  const times = (fetchTimes.get(key) ?? []).filter((time) => now - time < 60 * 1000);
  if (times.length) fetchTimes.set(key, times);
  else fetchTimes.delete(key);
  return times;
};

/**
 * Counts one fetch; false (and not counted) once any of FETCH_LIMITS is
 * reached: from this address, for this host, or for everyone. One stranger
 * naming many addresses uses up only their own share, and a host only its
 * own. RATE_LIMITS=off turns it off, as the others.
 */
export const countFetch = ({ address, host }: FetchFor, now = Date.now()): boolean => {
  if (process.env.RATE_LIMITS === 'off') return true;
  // Hosts nobody names again are swept now and then, so the counts stay small.
  if (fetchTimes.size > 1000) for (const key of [...fetchTimes.keys()]) recent(key, now);
  const keys = [
    ['address:' + addressKey(address), FETCH_LIMITS.address],
    ['host:' + host.toLowerCase(), FETCH_LIMITS.host],
    ['everyone', FETCH_LIMITS.everyone]
  ] as const;
  if (keys.some(([key, limit]) => recent(key, now).length >= limit)) return false;
  for (const [key] of keys) fetchTimes.set(key, [...recent(key, now), now]);
  return true;
};

/** Forgets the fetches counted (the tests), and the key sets kept. */
export const resetFetchCount = (): void => {
  fetchTimes = new Map();
  keySets.clear();
};

/** One GET of an allowed address, through the guard: resolved here, every address public, the checked one used. */
const fetchRaw = async (url: string, init: RequestInit): Promise<RawAnswer> => {
  const target = new URL(url);
  const hostname = target.hostname;
  const signals = [AbortSignal.timeout(FETCH_TIMEOUT_MS), ...(init.signal ? [init.signal] : [])];
  const signal = AbortSignal.any(signals);
  const addresses = await network.lookup(hostname);
  // Every address the name gives must be public, so that which one is used cannot matter.
  if (!addresses.length || !addresses.every((entry) => publicAddress(entry.address))) {
    throw new Error('address not public');
  }
  const { address, family } = addresses[0]!;
  const answer = await network.get({ address, family, hostname, path: target.pathname }, signal);
  if (answer.body.length > MOST_BYTES) throw new Error('response too large');
  // A redirect is answered as it is (oidc-provider refuses anything but 200), never followed.
  if (answer.status === 200) {
    const type = (answer.headers['content-type'] ?? '').split(';')[0]!.trim().toLowerCase();
    if (type !== 'application/json' && !/^application\/[\w.+-]+\+json$/.test(type)) {
      throw new Error('not JSON');
    }
  }
  return answer;
};

/** A Response for oidc-provider, with only the headers it reads. */
const responseOf = (status: number, body: Buffer | null, headerValues: Record<string, string | undefined>) => {
  const headers = new Headers();
  for (const [name, value] of Object.entries(headerValues)) if (value) headers.set(name, value);
  // A Response has no body for these statuses; the body is not wanted then anyway.
  const empty = status < 200 || status === 204 || status === 304 || status >= 300;
  return new Response(empty || !body ? null : new Uint8Array(body), {
    status: status < 200 || status > 599 ? 502 : status,
    headers
  });
};

/**
 * The fetch oidc-provider makes every outgoing request with (its `fetch`
 * setting): only a GET of an address allowedClientIdUrl takes, to a public
 * address, under the limits above. Rejects otherwise, which oidc-provider
 * answers as a client it cannot use. With OAUTH_CIMD_AUTH=private_key_jwt, a
 * fetch of an app's keys goes on to fetchKeySet.
 */
export const guardedFetch = async (input: string | URL, init: RequestInit = {}): Promise<Response> => {
  const url = String(input);
  if ((init.method ?? 'GET').toUpperCase() !== 'GET') throw new Error('only GET');
  if (!allowedClientIdUrl(url)) throw new Error('address not allowed');
  if (isKeySetFetch(init)) return fetchKeySet(url, init);
  const answer = await fetchRaw(url, init);
  return responseOf(answer.status, answer.body, {
    'content-type': answer.headers['content-type'],
    'cache-control': answer.headers['cache-control'],
    expires: answer.headers['expires']
  });
};

// An app's keys (private_key_jwt). oidc-provider fetches two things only: an
// app's document, always with redirect: 'manual' (and client_documents.ts
// asks the same), and the keys at the jwks_uri of an app whose document
// passed checkClientMetadata, without. Sector identifiers and request objects
// are refused or off. So with the mode on, a fetch without redirect: 'manual'
// is a key set, and is held to the stricter rules here: were oidc-provider
// ever to fetch a document another way, it would fail checkJwks and be
// refused, never let through.

/** The signing algorithms taken for an app's client assertions: asymmetric only, never HS* or none. */
export const CLIENT_KEY_ALGS = ['RS256', 'PS256', 'ES256'] as const;
/** Key-set fetches a minute: for one host, and for everyone together (the asker is the app's own server). */
export const JWKS_FETCH_LIMITS = { host: 6, everyone: 60 } as const;
/** How long a fetched key set is used: its max-age, held between a minute and 15 minutes. */
export const JWKS_CACHE_SECONDS = { min: 60, max: 15 * 60 } as const;
/** At most this many keys in an app's set. */
export const MOST_KEYS = 5;
/** At most this many key sets kept in memory. */
const MOST_KEY_SETS = 200;

const isKeySetFetch = (init: RequestInit): boolean =>
  cimdAuthMode() === 'private_key_jwt' && init.redirect !== 'manual';

/** Members of a private or symmetric key: never in a public key set. */
const PRIVATE_MEMBERS = ['d', 'p', 'q', 'dp', 'dq', 'qi', 'oth', 'k'];

/**
 * Throws unless `value` is a set of 1 to MOST_KEYS public signing keys, each
 * RSA of at least 2048 bits or EC on P-256, with `use` sig when given, an alg
 * from CLIENT_KEY_ALGS fitting its type when given, and nothing private.
 * One bad key refuses the whole set.
 */
export const checkJwks = (value: unknown): void => {
  const keys = (value as { keys?: unknown } | null)?.keys;
  if (!value || typeof value !== 'object' || !Array.isArray(keys)) throw new Error('not a key set');
  if (!keys.length || keys.length > MOST_KEYS) throw new Error(`a key set must have 1 to ${MOST_KEYS} keys`);
  for (const key of keys as unknown[]) {
    if (!key || typeof key !== 'object' || Array.isArray(key)) throw new Error('a key is not an object');
    const jwk = key as Record<string, unknown>;
    if (PRIVATE_MEMBERS.some((member) => member in jwk)) throw new Error('a key set must hold public keys only');
    if (jwk.use !== undefined && jwk.use !== 'sig') throw new Error('a key must be for signing');
    if (jwk.kty !== 'RSA' && jwk.kty !== 'EC') throw new Error('a key must be RSA or EC');
    if (jwk.alg !== undefined) {
      const fits = jwk.kty === 'RSA' ? ['RS256', 'PS256'] : ['ES256'];
      if (typeof jwk.alg !== 'string' || !fits.includes(jwk.alg)) throw new Error('a key has an algorithm not taken');
    }
    let details: crypto.AsymmetricKeyDetails | undefined;
    try {
      details = crypto.createPublicKey({ key: jwk as crypto.JsonWebKey, format: 'jwk' }).asymmetricKeyDetails;
    } catch {
      throw new Error('a key cannot be read');
    }
    if (jwk.kty === 'RSA' && !((details?.modulusLength ?? 0) >= 2048)) throw new Error('an RSA key is under 2048 bits');
    if (jwk.kty === 'EC' && details?.namedCurve !== 'prime256v1') throw new Error('an EC key must be on P-256');
  }
};

/** How long a key set may be used: its max-age (or Expires), held to JWKS_CACHE_SECONDS. */
const keySetSeconds = (headers: Record<string, string>, now: number): number => {
  let seconds: number | undefined;
  const maxAge = /(?:^|,)\s*max-age\s*=\s*(\d+)/i.exec(headers['cache-control'] ?? '');
  if (maxAge) seconds = Number(maxAge[1]);
  else {
    const expires = Date.parse(headers['expires'] ?? '');
    if (!Number.isNaN(expires)) seconds = Math.floor((expires - now) / 1000);
  }
  return Math.max(JWKS_CACHE_SECONDS.min, Math.min(JWKS_CACHE_SECONDS.max, seconds ?? JWKS_CACHE_SECONDS.min));
};

// The key sets fetched, by address, until their time is up. oidc-provider
// keeps keys with each app it has in memory, but makes a new one (and asks
// again) whenever it reads an app afresh, so they are kept here too.
const keySets = new Map<string, { body: Buffer; until: number }>();
let clock = (): number => Date.now();

/** Puts a stand-in clock in place for the key sets kept (the tests), or the real one back with no argument. */
export const useKeySetClock = (replacement?: () => number): void => {
  clock = replacement ?? (() => Date.now());
};

/** Counts one key-set fetch against JWKS_FETCH_LIMITS; false (and not counted) once over. */
export const countKeySetFetch = (host: string, now = clock()): boolean => {
  if (process.env.RATE_LIMITS === 'off') return true;
  const keys = [
    ['jwks-host:' + host.toLowerCase(), JWKS_FETCH_LIMITS.host],
    ['jwks-everyone', JWKS_FETCH_LIMITS.everyone]
  ] as const;
  if (keys.some(([key, limit]) => recent(key, now).length >= limit)) return false;
  for (const [key] of keys) fetchTimes.set(key, [...recent(key, now), now]);
  return true;
};

const keySetResponse = (body: Buffer, seconds: number): Response =>
  // max-age only, never Expires: oidc-provider takes the longest of the two (and a minute).
  responseOf(200, body, { 'content-type': 'application/json', 'cache-control': `max-age=${seconds}` });

/**
 * An app's key set: the one kept, while its time lasts; otherwise fetched
 * within JWKS_FETCH_LIMITS, checked (checkJwks) and kept for keySetSeconds.
 * An answer that is not a key set is never kept, and is refused.
 */
const fetchKeySet = async (url: string, init: RequestInit): Promise<Response> => {
  const now = clock();
  const kept = keySets.get(url);
  if (kept && kept.until > now) return keySetResponse(kept.body, Math.ceil((kept.until - now) / 1000));
  if (!countKeySetFetch(new URL(url).host, now)) throw new Error('key set fetches over the limit');
  const answer = await fetchRaw(url, init);
  // Not kept, and no cache headers passed on: an error is never cached.
  if (answer.status !== 200) return responseOf(answer.status, null, {});
  let body: unknown;
  try {
    body = JSON.parse(answer.body.toString('utf8'));
  } catch {
    throw new Error('not JSON');
  }
  checkJwks(body);
  const seconds = keySetSeconds(answer.headers, now);
  keySets.delete(url);
  keySets.set(url, { body: answer.body, until: now + seconds * 1000 });
  for (const old of keySets.keys()) {
    if (keySets.size <= MOST_KEY_SETS) break;
    keySets.delete(old);
  }
  return keySetResponse(answer.body, seconds);
};
