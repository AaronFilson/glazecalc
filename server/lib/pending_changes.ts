// Confirm before changes (docs/adr/0025-confirm-before-changes.md): when the
// account asks for it (User.confirmChanges), a change an access token or a
// connected app asks for waits as a PendingChange (models/pending_change.ts)
// until the person approves it, and is then made here, by the same code the
// tool or route would have run (the runner each registers: 'mcp' in
// server/mcp/tools/account_write.ts, 'rest' in server/lib/rest_changes.ts).
//
// Approving runs it once: one findOneAndUpdate takes it from pending to
// running, so two approvals at once (two tabs, the page and a retry) make one
// change. Before it is made, everything is checked again as if it had just
// been asked: the token or grant still works and still allows it, and the
// record or shelf it changes is as it was when it was asked for (`base`).
// The limits on changes are counted by the runner, as the tool or route
// counts them. Only the person approves, on the website, with their own web
// session (server/routes/pending_change_routes.ts); the token that asked can
// only read what came of it. What this guards against is an assistant that
// misbehaves or was led astray by what it read, not a stolen token: whoever
// holds a token is trusted as far as the person chose when they made it.
//
// A runaway assistant cannot fill the queue: at most MOST_WAITING_PER_TOKEN
// wait from one token or app, and MOST_WAITING from all of the account's
// (revoked or expired ones not counted); the check comes after the row is
// written, so two asks at once can never both slip under it.
//
// When the setting cannot be read, the change waits (fail closed).
import crypto from 'node:crypto';
import mongoose, { type Types } from 'mongoose';
import languages from '../../lib/regions/languages.js';
import AccessToken from '../models/access_token.ts';
import PendingChange, { PENDING_MINUTES, type PendingStatus } from '../models/pending_change.ts';
import RecordVersion, { VERSIONS_KEPT } from '../models/record_version.ts';
import User, { CONFIRM_CHANGES, type ConfirmChanges, type UserDocument } from '../models/user.ts';
import { OWNED_KINDS } from './account_data.ts';
import * as log from './log.ts';
import { titleOf, type TokenActor } from './record_history.ts';
import { allows, isScope, type Permission, type Scope } from './scopes.ts';
import * as site from './site.ts';

/** At most this many changes wait for one account at once; more are refused, changing nothing. */
export const MOST_WAITING = 20;
/** And at most this many from one token or app, so one runaway assistant cannot fill the account's queue. */
export const MOST_WAITING_PER_TOKEN = 5;

/** Thrown by askToConfirm when too many changes are waiting already: from this token or app, or on the account. */
export class TooManyWaiting extends Error {
  readonly which: 'token' | 'account';
  constructor(which: 'token' | 'account') {
    super('Too many changes waiting: ' + which);
    this.which = which;
  }
}

/** What a change is, as its page and an assistant's question say it: a message code (server/lib/messages.ts) and its values. */
export interface Summary {
  code: string;
  params: Record<string, string | number>;
}

/** The record or shelf a change is made to, which must not change while it waits. */
export type BaseRef = { kind: 'record'; area: string; id: string } | { kind: 'shelf' };

/** A waiting change as it is stored (models/pending_change.ts), read lean. */
export interface Pending {
  _id: string;
  userId: Types.ObjectId;
  tokenId: Types.ObjectId;
  via: 'pat' | 'oauth';
  client: string;
  source: 'mcp' | 'rest';
  action: string;
  permission: string;
  removal: boolean;
  args?: unknown;
  argsDigest: string;
  summary: Summary;
  base?: (BaseRef & { version?: string | null }) | null;
  status: PendingStatus;
  outcome?: unknown;
  createdAt: Date;
  decidedAt?: Date;
  expiresAt: Date;
}

/** Who the change is made as when it runs: the account, and the token or grant that asked, checked again. */
export interface RunContext {
  user: UserDocument;
  tokenId: string;
  scopes: Scope[];
  actor: TokenActor;
}

/** What a runner answers: whether the change was made, and the tool's or route's own answer. */
export interface RunResult {
  made: boolean;
  reply: unknown;
}

export type Runner = (ctx: RunContext, change: Pending) => Promise<RunResult>;

const runners = new Map<Pending['source'], Runner>();

/** The code that makes a kind of change: the MCP tools' and the REST routes'. */
export const registerRunner = (source: Pending['source'], runner: Runner): void => {
  runners.set(source, runner);
};

/**
 * The account's choice, failing closed: 'all' when it cannot be read (the
 * database answers with an error, or the account is not found), 'off' for an
 * account that never chose.
 */
export const confirmSettingOf = async (userId: string | Types.ObjectId): Promise<ConfirmChanges> => {
  try {
    const user = await User.findById(userId, { confirmChanges: 1 }).lean();
    if (!user) return 'all';
    const value = user.confirmChanges ?? 'off';
    return CONFIRM_CHANGES.includes(value) ? value : 'all';
  } catch (err) {
    log.error('Could not read whether changes need confirming', { code: log.codeOf(err) });
    return 'all';
  }
};

/**
 * Whether a change by this token must wait for the person, and why: the
 * account's setting ('all', or 'removals' for a removal), or null when it
 * need not wait (the setting is off, it covers only removals and this is
 * none, or the token is a personal token made to need no confirmation). Any
 * kind of token or grant (`via`) is asked the same; a token whose exemption
 * cannot be read is asked.
 */
export const confirmationFor = async (
  userId: string | Types.ObjectId,
  tokenId: string | Types.ObjectId,
  removal: boolean
): Promise<Exclude<ConfirmChanges, 'off'> | null> => {
  const setting = await confirmSettingOf(userId);
  if (setting === 'off' || (setting === 'removals' && !removal)) return null;
  try {
    const token = await AccessToken.findOne({ _id: tokenId, userId }, { kind: 1, noConfirm: 1 }).lean();
    return token?.kind === 'pat' && token.noConfirm === true ? null : setting;
  } catch {
    return setting;
  }
};

/** JSON with its keys in order, so the same arguments always give the same digest. */
const canonical = (value: unknown): string => {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return '{' + entries.map(([k, v]) => JSON.stringify(k) + ':' + canonical(v)).join(',') + '}';
  }
  return JSON.stringify(value) ?? 'null';
};

const sha256 = (text: string): string => crypto.createHash('sha256').update(text).digest('hex');

/** The digest that ties a change to its tool or route and exact arguments. */
export const digestOf = (source: string, action: string, args: unknown): string =>
  sha256(canonical({ source, action, args }));

/**
 * A digest of the record or shelf as it is now, or null when there is no such
 * record (the change then fails as it would have, when it runs).
 */
export const versionOf = async (userId: string, base: BaseRef): Promise<string | null> => {
  if (base.kind === 'shelf') {
    const user = await User.findById(userId, { shelf: 1, shelfPrevious: 1 }).lean();
    return user ? sha256(canonical({ shelf: user.shelf ?? [], previous: user.shelfPrevious ?? null })) : null;
  }
  const Model = OWNED_KINDS[base.area];
  if (!Model) return null;
  const record = await Model.findOne({ _id: base.id, ownedBy: userId }).lean();
  return record ? sha256(canonical(record)) : null;
};

/** The page where the person approves a change, in their language: https://glazecalcapp.com/de/confirm/<id>. */
export const confirmUrl = (id: string, language?: string | null): string =>
  site.siteUrl() + languages.languagePrefix(language || 'en') + '/confirm/' + encodeURIComponent(id);

/** What askToConfirm needs to know about a change. */
export interface Ask {
  userId: string;
  tokenId: string;
  via: 'pat' | 'oauth';
  client: string;
  source: Pending['source'];
  action: string;
  permission: Permission;
  removal: boolean;
  args: unknown;
  summary: Summary;
  base?: BaseRef | null;
}

/**
 * Whether the account has more changes waiting than it may: from this token
 * or app (MOST_WAITING_PER_TOKEN), or in all (MOST_WAITING). Changes from a
 * token or app that was revoked or has expired are not counted.
 */
const overTheLimit = async (userId: string, tokenId: string, now: Date): Promise<'token' | 'account' | null> => {
  const waiting = await PendingChange.find(
    { userId, status: 'pending', expiresAt: { $gt: now } },
    { tokenId: 1 }
  ).lean();
  const tokenIds = [...new Set(waiting.map((row) => String(row.tokenId)))];
  const working = new Set(
    (
      await AccessToken.find(
        { _id: { $in: tokenIds }, userId, revokedAt: null, expiresAt: { $gt: now } },
        { _id: 1 }
      ).lean()
    ).map((row) => String(row._id))
  );
  const counted = waiting.filter((row) => working.has(String(row.tokenId)));
  if (counted.filter((row) => String(row.tokenId) === tokenId).length > MOST_WAITING_PER_TOKEN) return 'token';
  return counted.length > MOST_WAITING ? 'account' : null;
};

/**
 * Keeps a change to wait for the person, and resolves with its id and the
 * address of its page. TooManyWaiting when too many are waiting already: the
 * change is written first and counted with the others, and taken back when it
 * is one too many, so asks that come at the same moment never pass the limits
 * together (at worst both are refused).
 */
export const askToConfirm = async (
  ask: Ask,
  now = new Date()
): Promise<{ id: string; url: string; expiresAt: Date }> => {
  const id = crypto.randomBytes(16).toString('base64url');
  const expiresAt = new Date(now.getTime() + PENDING_MINUTES * 60 * 1000);
  const base = ask.base ? { ...ask.base, version: await versionOf(ask.userId, ask.base) } : undefined;
  await PendingChange.create({
    _id: id,
    userId: ask.userId,
    tokenId: ask.tokenId,
    via: ask.via,
    client: ask.client.slice(0, 100),
    source: ask.source,
    action: ask.action,
    permission: ask.permission,
    removal: ask.removal,
    args: ask.args,
    argsDigest: digestOf(ask.source, ask.action, ask.args),
    summary: ask.summary,
    ...(base && { base }),
    createdAt: now,
    expiresAt
  });
  const over = await overTheLimit(ask.userId, ask.tokenId, now);
  if (over) {
    await PendingChange.deleteOne({ _id: id });
    throw new TooManyWaiting(over);
  }
  const user = await User.findById(ask.userId, { 'preferences.language': 1 }).lean();
  return { id, url: confirmUrl(id, user?.preferences?.language), expiresAt };
};

/** Which changes may be found: still to be decided, and not past their time. */
const live = (now: Date) => ({ expiresAt: { $gt: now } });

/** One of the account's changes, decided or not, or null: unknown, another account's, or past its time. */
export const findForUser = async (id: unknown, userId: string | Types.ObjectId, now = new Date()) =>
  typeof id === 'string' && id.length <= 64
    ? ((await PendingChange.findOne({ _id: id, userId, ...live(now) }).lean()) as Pending | null)
    : null;

/** What came of a decided change, for the token that asked: the status and the tool's or route's answer. */
export interface Outcome {
  status: PendingStatus;
  reply?: unknown;
}

/** The token or grant that asked, if it still works and still allows the change, as a RunContext. */
const runContext = async (change: Pending, now: Date): Promise<RunContext | null> => {
  const token = await AccessToken.findOne({ _id: change.tokenId, userId: change.userId }).lean();
  if (!token || token.revokedAt || !(token.expiresAt > now)) return null;
  const scopes = token.scopes.filter(isScope);
  if (!allows(scopes, change.permission as Permission)) return null;
  const user = await User.findById(change.userId, { password: 0, mfa: 0 });
  if (!user || user.guest) return null;
  return {
    user,
    tokenId: String(token._id),
    scopes,
    actor: { via: token.kind, tokenId: String(token._id), name: token.name }
  };
};

/** What a change answers when it is not made because something stopped it, in words a script or assistant can pass on. */
const refused = (code: 'pending-token-gone' | 'pending-conflict' | 'pending-failed'): RunResult => ({
  made: false,
  reply: { code }
});

/** Makes a change taken from pending to running, and writes down what came of it. */
const run = async (change: Pending, now: Date): Promise<Outcome> => {
  let status: PendingStatus;
  let result: RunResult;
  try {
    const ctx = await runContext(change, now);
    const sameBase =
      !change.base || (await versionOf(String(change.userId), change.base)) === (change.base.version ?? null);
    const runner = runners.get(change.source);
    if (!ctx) {
      status = 'failed';
      result = refused('pending-token-gone');
    } else if (!sameBase) {
      status = 'conflict';
      result = refused('pending-conflict');
    } else if (!runner) {
      status = 'failed';
      result = refused('pending-failed');
    } else {
      result = await runner(ctx, change);
      status = result.made ? 'done' : 'failed';
    }
  } catch (err) {
    log.error('A confirmed change could not be made', { action: change.action, code: log.codeOf(err) });
    status = 'failed';
    result = refused('pending-failed');
  }
  // The arguments go now: what is left says what came of it, never a note's text.
  await PendingChange.updateOne(
    { _id: change._id },
    { $set: { status, outcome: result.reply ?? null }, $unset: { args: 1 } }
  );
  return { status, reply: result.reply };
};

/**
 * Takes a waiting change from pending to running, once: null when it is not
 * waiting (decided already, past its time, or not this account's or token's).
 */
const take = async (id: string, filter: Record<string, unknown>, now: Date): Promise<Pending | null> =>
  (await PendingChange.findOneAndUpdate(
    { _id: id, status: 'pending', ...filter, ...live(now) },
    { $set: { status: 'running', decidedAt: now } },
    { returnDocument: 'after' }
  ).lean()) as Pending | null;

/** The person approves a change on the website: it is made, once. null when it is not waiting. */
export const approve = async (
  id: string,
  userId: string | Types.ObjectId,
  now = new Date()
): Promise<Outcome | null> => {
  const change = await take(id, { userId }, now);
  return change ? run(change, now) : null;
};

/** The person says no: nothing is changed, and the arguments go. false when it is not waiting. */
export const decline = async (id: string, filter: Record<string, unknown>, now = new Date()): Promise<boolean> => {
  const done = await PendingChange.updateOne(
    { _id: id, status: 'pending', ...filter, ...live(now) },
    { $set: { status: 'declined', decidedAt: now, outcome: null }, $unset: { args: 1 } }
  );
  return done.modifiedCount === 1;
};

/**
 * The changes, of those the person was shown (`ids`), that still wait from
 * one token or app, oldest first. Only these are approved or declined
 * together: never one that came after the page was opened.
 */
const waitingAmong = async (userId: string | Types.ObjectId, tokenId: string, ids: string[], now: Date) =>
  PendingChange.find({ _id: { $in: ids }, userId, tokenId, status: 'pending', ...live(now) })
    .sort({ createdAt: 1, _id: 1 })
    .select({ _id: 1 })
    .lean();

/** Approves the changes shown to the person (`ids`) that one token or app is waiting on, oldest first; resolves with how many were made and how many not. */
export const approveAll = async (
  userId: string | Types.ObjectId,
  tokenId: string,
  ids: string[],
  now = new Date()
): Promise<{ made: number; notMade: number }> => {
  const waiting = await waitingAmong(userId, tokenId, ids, now);
  let made = 0;
  let notMade = 0;
  for (const { _id } of waiting) {
    const outcome = await approve(_id, userId, now);
    if (!outcome) continue;
    if (outcome.status === 'done') made++;
    else notMade++;
  }
  return { made, notMade };
};

/** Declines the changes shown to the person (`ids`) that one token or app is waiting on; resolves with how many. */
export const declineAll = async (
  userId: string | Types.ObjectId,
  tokenId: string,
  ids: string[],
  now = new Date()
): Promise<number> => {
  let declined = 0;
  for (const { _id } of await waitingAmong(userId, tokenId, ids, now)) {
    if (await decline(_id, { userId, tokenId }, now)) declined++;
  }
  return declined;
};

/** The other changes one token or app is waiting on, oldest first, for the page to show them all. */
export const othersWaiting = async (
  userId: string | Types.ObjectId,
  tokenId: Types.ObjectId | string,
  except: string,
  now = new Date()
) =>
  (await PendingChange.find({ userId, tokenId, status: 'pending', _id: { $ne: except }, ...live(now) })
    .sort({ createdAt: 1, _id: 1 })
    .lean()) as Pending[];

/**
 * For the token that asked: whether its change still waits, or what came of
 * it. Reading it changes nothing, so the person's page still shows what came
 * of it too, until its time is up. null when there is no such change for this
 * token.
 */
export const outcomeForToken = async (
  id: unknown,
  tokenId: string,
  now = new Date()
): Promise<(Outcome & { expiresAt: Date }) | null> => {
  if (typeof id !== 'string' || id.length > 64) return null;
  const change = (await PendingChange.findOne({ _id: id, tokenId, ...live(now) }).lean()) as Pending | null;
  if (!change) return null;
  if (change.status === 'pending' || change.status === 'running') {
    return { status: change.status, expiresAt: change.expiresAt };
  }
  return { status: change.status, reply: change.outcome ?? undefined, expiresAt: change.expiresAt };
};

// What the approval page shows of a change, built here for the signed-in
// owner alone (never for the token that asked): each field it sets, as it is
// now and as it would be, and, for a removal, what this app changed in the
// record before (its versions, record_history.ts saveVersion).

/** One field a change sets: as it is now (absent for a new record) and as it would be, as text. */
export interface FieldChange {
  field: string;
  before?: string;
  after: string;
}

/** Turns a waiting change's arguments into the fields it sets, given the record as it is now (null for a new one). */
export type Preview = (args: unknown, current: Record<string, unknown> | null) => FieldChange[];

const previews = new Map<string, Preview>();

/** The fields a kind of change sets, for its page: registered by the tools and routes, by source and action. */
export const registerPreview = (source: Pending['source'], action: string, preview: Preview): void => {
  previews.set(source + ':' + action, preview);
};

/** At most this many characters of one value are sent; the page shows fewer, with a way to see these. */
export const VALUE_LONGEST = 20000;

/**
 * A field's value as text for the page: a list of materials or oxides as one
 * line each ("Silica 30"), a note's paragraphs one after another, anything
 * else as JSON.
 */
export const asText = (value: unknown): string => {
  const text = (() => {
    if (value === undefined || value === null) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) {
      return value
        .map((item) => {
          if (item && typeof item === 'object' && !Array.isArray(item)) {
            const row = item as Record<string, unknown>;
            const name = row.name ?? row.material;
            if (typeof name === 'string') {
              return [name, row.amount, row.unit].filter((part) => part !== undefined && part !== '').join(' ');
            }
          }
          return asText(item);
        })
        .join('\n');
    }
    if (typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>);
      if (entries.every(([, v]) => typeof v === 'number' || typeof v === 'string')) {
        return entries.map(([k, v]) => k + ' ' + String(v)).join('\n');
      }
    }
    return JSON.stringify(value) ?? '';
  })();
  return text.length > VALUE_LONGEST ? text.slice(0, VALUE_LONGEST) + '…' : text;
};

/** The fields given, each as it is in the record now and as it would be; those that would not change are left out. */
export const fieldChanges = (given: Record<string, unknown>, current: Record<string, unknown> | null): FieldChange[] =>
  Object.entries(given)
    .filter(([, value]) => value !== undefined)
    .map(([field, value]) => ({
      field,
      ...(current && { before: asText(current[field]) }),
      after: asText(value)
    }))
    .filter((change) => change.before !== change.after);

/** What this app did to the record before: what it was called before, and how long ago it last changed it. */
export interface History {
  /** Its title before this app's latest run of changes, when that was another. */
  titleBefore?: string;
  minutesAgo: number;
}

/**
 * Whether the token or app that asked changed this record lately: the newest
 * versions it saved, one after another, say what it was before them.
 */
const historyOf = async (
  change: Pending,
  current: Record<string, unknown> | null,
  now: Date
): Promise<History | null> => {
  if (change.base?.kind !== 'record') return null;
  const versions = await RecordVersion.find({
    ownedBy: String(change.userId),
    fromCollection: change.base.area,
    recordId: change.base.id
  })
    .sort({ savedAt: -1, _id: -1 })
    .limit(VERSIONS_KEPT)
    .select({ savedAt: 1, tokenId: 1, 'record.title': 1, 'record.name': 1 })
    .lean();
  const run: typeof versions = [];
  for (const version of versions) {
    if (String(version.tokenId) !== String(change.tokenId)) break;
    run.push(version);
  }
  if (!run.length) return null;
  const titleBefore = titleOf((run[run.length - 1]!.record ?? {}) as Record<string, unknown>) ?? '';
  const titleNow = current ? (titleOf(current) ?? '') : '';
  return {
    ...(titleBefore !== titleNow && { titleBefore }),
    minutesAgo: Math.max(0, Math.floor((now.getTime() - run[0]!.savedAt.getTime()) / 60000))
  };
};

/** What the page shows of a change besides its summary: the fields it sets, and for a removal what this app did before. */
export const detailsOf = async (
  change: Pending,
  now = new Date()
): Promise<{ changes: FieldChange[]; history: History | null }> => {
  let current: Record<string, unknown> | null = null;
  if (change.base?.kind === 'record' && mongoose.isValidObjectId(change.base.id)) {
    const Model = OWNED_KINDS[change.base.area];
    current = Model
      ? ((await Model.findOne({ _id: change.base.id, ownedBy: String(change.userId) }).lean()) as Record<
          string,
          unknown
        > | null)
      : null;
  }
  const preview = previews.get(change.source + ':' + change.action);
  const changes = change.status === 'pending' && preview && change.args != null ? preview(change.args, current) : [];
  const history = change.removal ? await historyOf(change, current, now) : null;
  return { changes, history };
};
