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
import dns from 'node:dns';
import https from 'node:https';
import net from 'node:net';
import { ipKeyGenerator } from 'express-rate-limit';

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

let network: Network = realNetwork;

/** Puts a stand-in for the network in place (the tests), or the real one back with no argument. */
export const useNetwork = (replacement?: Network): void => {
  network = replacement ?? realNetwork;
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

/** Forgets the fetches counted (the tests). */
export const resetFetchCount = (): void => {
  fetchTimes = new Map();
};

/**
 * The fetch oidc-provider makes every outgoing request with (its `fetch`
 * setting): only a GET of an address allowedClientIdUrl takes, to a public
 * address, under the limits above. Rejects otherwise, which oidc-provider
 * answers as a client it cannot use.
 */
export const guardedFetch = async (input: string | URL, init: RequestInit = {}): Promise<Response> => {
  const url = String(input);
  if ((init.method ?? 'GET').toUpperCase() !== 'GET') throw new Error('only GET');
  if (!allowedClientIdUrl(url)) throw new Error('address not allowed');
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
  const headers = new Headers();
  for (const name of ['content-type', 'cache-control', 'expires']) {
    const value = answer.headers[name];
    if (value) headers.set(name, value);
  }
  // A Response has no body for these statuses; the body is not wanted then anyway.
  const empty = answer.status < 200 || answer.status === 204 || answer.status === 304 || answer.status >= 300;
  return new Response(empty ? null : new Uint8Array(answer.body), {
    status: answer.status < 200 || answer.status > 599 ? 502 : answer.status,
    headers
  });
};
