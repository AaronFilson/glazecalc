// Where the authorization server (server/oauth/provider.ts, docs/adr/0024)
// keeps what it makes: the apps that registered (DCR), grants, codes, access
// and refresh tokens, interactions and its short sessions. One MongoDB
// collection, oauth_records; each record goes when it expires (a TTL index on
// expiresAt), so nothing is kept past its use.
//
// A record's id is its kind and the SHA-256 of what oidc-provider calls it,
// and a token's own value (its jti) is never stored: a copy of the database
// holds no code, access token or refresh token anyone could use. The payload
// is kept as JSON text, so the client ids in it (https:// addresses, with
// dots) are never taken for field paths.
//
// Two things are atomic here that oidc-provider leaves to the adapter: a code
// or refresh token is consumed once (consume); the second use, even one that
// raced the first, ends its whole grant (revokeGrantRecords) and is refused.
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { errors, type Adapter, type AdapterPayload } from 'oidc-provider';

/** The kinds whose id is the token itself: their jti is never stored. */
const SECRET_KINDS = new Set([
  'AccessToken',
  'AuthorizationCode',
  'RefreshToken',
  'RegistrationAccessToken',
  'InitialAccessToken',
  'ClientCredentials',
  'DeviceCode',
  'BackchannelAuthenticationRequest',
  'PushedAuthorizationRequest'
]);
/** The kinds a second use of is a stolen or replayed one. */
const ONE_USE = new Set(['AuthorizationCode', 'RefreshToken']);

/** How long an app that registered itself (DCR) is kept before anyone connects it. */
export const DCR_UNUSED_DAYS = 7;
/** How long one is kept after its last use once someone has connected it. */
export const DCR_IDLE_DAYS = 30;
const DAY = 24 * 60 * 60 * 1000;

const recordSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    kind: { type: String, required: true },
    /** oidc-provider's payload, as JSON text, without a token's jti. */
    payload: { type: String, required: true },
    grantId: String,
    uid: String,
    userCode: String,
    /** When a code or refresh token was used: set once, atomically. */
    consumedAt: Date,
    expiresAt: Date
  },
  { versionKey: false, collection: 'oauth_records' }
);
recordSchema.index({ grantId: 1 }, { partialFilterExpression: { grantId: { $type: 'string' } } });
recordSchema.index({ uid: 1 }, { partialFilterExpression: { uid: { $type: 'string' } } });
recordSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OAuthRecord = mongoose.model('OAuthRecord', recordSchema);

const sha256 = (text: string): string => crypto.createHash('sha256').update(text, 'utf8').digest('hex');

/** A record's _id: its kind and the hash of oidc-provider's id for it. */
export const recordKey = (kind: string, id: string): string => kind + ':' + sha256(id);

const epoch = (date: Date): number => Math.floor(date.getTime() / 1000);

/**
 * Removes every record of these grants: their codes, access and refresh
 * tokens, and the grants themselves. Their tokens stop working at once (the
 * MCP endpoint also asks for a working connection, server/oauth/resource.ts).
 */
export const deleteGrantRecords = async (grantIds: readonly string[]): Promise<void> => {
  const ids = grantIds.filter((id) => typeof id === 'string' && id);
  if (!ids.length) return;
  await OAuthRecord.deleteMany({ grantId: { $in: ids } });
  await OAuthRecord.deleteMany({ _id: { $in: ids.map((id) => recordKey('Grant', id)) } });
};

/**
 * Moves a grant's end to `until` (a read-only connection, renewed when its
 * refresh token is used): the record goes then, and oidc-provider reads the
 * same end from the payload.
 */
export const extendGrant = async (grantId: string, until: Date): Promise<void> => {
  const _id = recordKey('Grant', grantId);
  const record = await OAuthRecord.findById(_id).lean();
  if (!record) return;
  const payload = JSON.parse(record.payload) as AdapterPayload;
  payload.exp = epoch(until);
  await OAuthRecord.updateOne({ _id }, { $set: { payload: JSON.stringify(payload), expiresAt: until } });
};

/**
 * Keeps an app that registered itself (DCR) for DCR_IDLE_DAYS from now: once
 * someone connects it, and each time its refresh token is used. One that
 * nobody connects goes after DCR_UNUSED_DAYS (upsert).
 */
export const keepRegisteredClient = async (clientId: string, now = new Date()): Promise<void> => {
  await OAuthRecord.updateOne(
    { _id: recordKey('Client', clientId), kind: 'Client' },
    { $set: { expiresAt: new Date(now.getTime() + DCR_IDLE_DAYS * DAY) } }
  );
};

/** oidc-provider's adapter: one instance for each kind of record (its name). */
export class MongoAdapter implements Adapter {
  readonly kind: string;

  constructor(kind: string) {
    this.kind = kind;
  }

  async upsert(id: string, payload: AdapterPayload, expiresIn?: number): Promise<void> {
    const stored: AdapterPayload = { ...payload };
    if (SECRET_KINDS.has(this.kind)) delete stored.jti;
    const now = Date.now();
    // An app registering itself has no end of its own: it goes after DCR_UNUSED_DAYS unless someone connects it.
    const expiresAt =
      typeof expiresIn === 'number' && expiresIn > 0
        ? new Date(now + expiresIn * 1000)
        : this.kind === 'Client'
          ? new Date(now + DCR_UNUSED_DAYS * DAY)
          : undefined;
    await OAuthRecord.updateOne(
      { _id: recordKey(this.kind, id) },
      {
        $set: {
          kind: this.kind,
          payload: JSON.stringify(stored),
          ...(typeof payload.grantId === 'string' && { grantId: payload.grantId }),
          ...(typeof payload.uid === 'string' && { uid: payload.uid }),
          ...(typeof payload.userCode === 'string' && { userCode: payload.userCode }),
          ...(expiresAt && { expiresAt })
        }
      },
      { upsert: true }
    );
  }

  /** The payload, or undefined; a record past its end is gone already, or about to be (TTL). */
  private async load(filter: Record<string, unknown>, id?: string): Promise<AdapterPayload | undefined> {
    const record = await OAuthRecord.findOne({ ...filter, kind: this.kind }).lean();
    if (!record) return undefined;
    if (record.expiresAt && record.expiresAt.getTime() <= Date.now()) return undefined;
    const payload = JSON.parse(record.payload) as AdapterPayload;
    if (id !== undefined && SECRET_KINDS.has(this.kind)) payload.jti = id;
    if (record.consumedAt) payload.consumed = epoch(record.consumedAt);
    return payload;
  }

  async find(id: string): Promise<AdapterPayload | undefined> {
    if (typeof id !== 'string' || !id) return undefined;
    return this.load({ _id: recordKey(this.kind, id) }, id);
  }

  async findByUid(uid: string): Promise<AdapterPayload | undefined> {
    if (typeof uid !== 'string' || !uid) return undefined;
    return this.load({ uid });
  }

  async findByUserCode(userCode: string): Promise<AdapterPayload | undefined> {
    if (typeof userCode !== 'string' || !userCode) return undefined;
    return this.load({ userCode });
  }

  /**
   * Marks a code or refresh token used, once. A second use (one that raced
   * the first past oidc-provider's own check) ends the grant and is refused.
   */
  async consume(id: string): Promise<void> {
    const _id = recordKey(this.kind, id);
    const claimed = await OAuthRecord.findOneAndUpdate(
      { _id, consumedAt: null },
      { $set: { consumedAt: new Date() } }
    ).lean();
    if (claimed || !ONE_USE.has(this.kind)) return;
    const used = await OAuthRecord.findById(_id, { grantId: 1 }).lean();
    if (used?.grantId) await revokeGrantRecordsAsReused(used.grantId);
    throw new errors.InvalidGrant(
      `${this.kind === 'RefreshToken' ? 'refresh token' : 'authorization code'} already used`
    );
  }

  async destroy(id: string): Promise<void> {
    await OAuthRecord.deleteOne({ _id: recordKey(this.kind, id) });
  }

  async revokeByGrantId(grantId: string): Promise<void> {
    await OAuthRecord.deleteMany({ kind: this.kind, grantId });
  }
}

/**
 * What a second use of a code or refresh token does to its connection, set by
 * server/oauth/provider.ts (it also stops the connection's row, which this
 * file does not load, so that models and adapter do not import each other).
 */
let onReuse = (grantId: string): Promise<void> => deleteGrantRecords([grantId]);
const revokeGrantRecordsAsReused = (grantId: string): Promise<void> => onReuse(grantId);

/** Sets what a reused code or refresh token does (server/oauth/provider.ts). */
export const whenReused = (handler: (grantId: string) => Promise<void>): void => {
  onReuse = handler;
};
