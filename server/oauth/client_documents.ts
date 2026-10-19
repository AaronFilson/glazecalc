// The documents of apps named by their address (CIMD; docs/adr/0024, "Review
// fixes"), kept for as long as someone has a working connection to the app.
// oidc-provider keeps fetched documents only in memory, at most 100 of them,
// and fetches again when one is gone; a stranger naming many addresses could
// push a connected app's document out, or use up the fetches (cimd.ts
// countFetch), and the app's next refresh would then fail. So the document
// is kept here, in oauth_records, beside the connection, and oidc-provider
// reads it through the adapter (server/oauth/adapter.ts) before it would
// ever fetch: a working connection never waits on a fetch.
//
// It is the app's own public details, nothing about the person, and goes
// once no connection to the app works (keptClientDocument; at the latest
// when the last one would have ended, TTL).
//
// The document is still checked again when its time is up (its Cache-Control,
// held between an hour and a day, as oidc-provider does): a new one that
// passes every check replaces it. A check that cannot be made (the limits, the
// network, the app's server) or a document that no longer passes keeps the
// one already checked, and the next check is RETRY_SECONDS later: ending a
// connection is for the person (or the app revoking its token), not for a
// failed fetch.
import type { AdapterPayload, ClientMetadata } from 'oidc-provider';
import * as log from '../lib/log.ts';
import AccessToken from '../models/access_token.ts';
import { OAuthRecord, recordKey } from './adapter.ts';
import { CACHE_SECONDS, countFetch, guardedFetch } from './cimd.ts';

const KIND = 'ClientDocument';
/** After a check that could not be made or did not pass, how long until the next. */
export const RETRY_SECONDS = 5 * 60;

const keyFor = (clientId: string): string => recordKey(KIND, clientId);

/** The latest end of the working connections to this app, or undefined when there is none. */
const workingUntil = async (clientId: string, now: Date): Promise<Date | undefined> => {
  const row = await AccessToken.findOne(
    { kind: 'oauth', clientId, revokedAt: null, expiresAt: { $gt: now } },
    { expiresAt: 1 }
  )
    .sort({ expiresAt: -1 })
    .lean();
  return row?.expiresAt;
};

/** How long a fetched document may be used before it is checked again: its max-age or Expires, held to CACHE_SECONDS. */
export const freshSeconds = (headers: Headers, now = Date.now()): number => {
  let seconds: number | undefined;
  const maxAge = /(?:^|,)\s*max-age\s*=\s*(\d+)/i.exec(headers.get('cache-control') ?? '');
  if (maxAge) seconds = Number(maxAge[1]);
  else {
    const expires = Date.parse(headers.get('expires') ?? '');
    if (!Number.isNaN(expires)) seconds = Math.floor((expires - now) / 1000);
  }
  return Math.max(CACHE_SECONDS.min, Math.min(CACHE_SECONDS.max, seconds ?? CACHE_SECONDS.min));
};

/**
 * Keeps an app's document (the metadata oidc-provider made of it) when
 * someone has a working connection to it. oidc-provider's allowClient calls
 * this whenever it has read an app from its address, which it does only when
 * none is kept here yet: at the first connection's code exchange, the row
 * then made. It is then checked again after CACHE_SECONDS.min.
 */
export const keepClientDocument = async (
  clientId: string,
  metadata: ClientMetadata,
  now = new Date()
): Promise<void> => {
  const until = await workingUntil(clientId, now);
  if (!until) return;
  await OAuthRecord.updateOne(
    { _id: keyFor(clientId) },
    {
      $set: {
        kind: KIND,
        payload: JSON.stringify(metadata),
        freshUntil: new Date(now.getTime() + CACHE_SECONDS.min * 1000),
        expiresAt: until
      }
    },
    { upsert: true }
  );
};

/** One check at a time for each app. */
const checking = new Map<string, Promise<AdapterPayload>>();

/**
 * Fetches an app's document again (within the limits) and keeps it when it
 * passes oidc-provider's checks (`validate`) and the address's own; otherwise
 * keeps the one it had. Either way, gives back the one to use.
 */
const checkAgain = async (
  clientId: string,
  kept: AdapterPayload,
  until: Date,
  validate: (metadata: ClientMetadata) => Promise<void>,
  address: string | undefined,
  now: Date
): Promise<AdapterPayload> => {
  // Over the limits: the kept one, checked on a later request.
  if (!countFetch({ address, host: new URL(clientId).host }, now.getTime())) return kept;
  let fresh: AdapterPayload | undefined;
  let seconds = RETRY_SECONDS;
  try {
    const res = await guardedFetch(clientId, { method: 'GET', headers: { accept: 'application/json' } });
    if (res.status !== 200) throw new Error('answered ' + res.status);
    const document = (await res.json()) as unknown;
    if (!document || typeof document !== 'object' || Array.isArray(document)) throw new Error('not an object');
    const metadata = document as ClientMetadata;
    if (metadata.client_id !== clientId) throw new Error('client_id is not its address');
    if ('client_secret' in metadata || 'client_secret_expires_at' in metadata) throw new Error('has a secret');
    await validate({ ...metadata });
    fresh = metadata as AdapterPayload;
    seconds = freshSeconds(res.headers, now.getTime());
  } catch (err) {
    log.warn('Kept the document of a connected app; checking it again failed', {
      client: clientId,
      why: err instanceof Error ? err.message : String(err)
    });
  }
  await OAuthRecord.updateOne(
    { _id: keyFor(clientId) },
    {
      $set: {
        ...(fresh && { payload: JSON.stringify(fresh) }),
        freshUntil: new Date(now.getTime() + seconds * 1000),
        expiresAt: until
      }
    }
  );
  return fresh ?? kept;
};

/**
 * The document kept for an app named by its address, for oidc-provider's
 * adapter: undefined unless someone has a working connection to the app
 * (oidc-provider then reads it from its address as usual). Checked again,
 * as above, when its time is up.
 */
export const keptClientDocument = async (
  clientId: string,
  validate: (metadata: ClientMetadata) => Promise<void>,
  address?: string,
  now = new Date()
): Promise<AdapterPayload | undefined> => {
  const until = await workingUntil(clientId, now);
  if (!until) {
    // Nobody's connection to the app works any more: what was kept goes now (or, unasked, when the last would have ended).
    await OAuthRecord.deleteOne({ _id: keyFor(clientId), kind: KIND });
    return undefined;
  }
  const record = await OAuthRecord.findById(keyFor(clientId)).lean();
  if (!record || record.kind !== KIND) return undefined;
  const kept = JSON.parse(record.payload) as AdapterPayload;
  if (record.freshUntil && record.freshUntil > now) {
    // Kept as long as the latest working connection, which a refresh may have made longer.
    if (!record.expiresAt || record.expiresAt < until) {
      await OAuthRecord.updateOne({ _id: record._id }, { $set: { expiresAt: until } });
    }
    return kept;
  }
  let check = checking.get(clientId);
  if (!check) {
    check = checkAgain(clientId, kept, until, validate, address, now).finally(() => checking.delete(clientId));
    checking.set(clientId, check);
  }
  return check;
};
