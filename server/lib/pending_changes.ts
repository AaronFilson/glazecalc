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
// counts them. Only the person approves, with their own web session
// (server/routes/pending_change_routes.ts); the token that asked can only
// read what came of it.
//
// When the setting cannot be read, the change waits (fail closed).
import crypto from 'node:crypto';
import type { Types } from 'mongoose';
import languages from '../../lib/regions/languages.js';
import AccessToken from '../models/access_token.ts';
import PendingChange, { FINAL_STATUSES, PENDING_MINUTES, type PendingStatus } from '../models/pending_change.ts';
import User, { CONFIRM_CHANGES, type ConfirmChanges, type UserDocument } from '../models/user.ts';
import { OWNED_KINDS } from './account_data.ts';
import * as log from './log.ts';
import type { TokenActor } from './record_history.ts';
import { allows, isScope, type Permission, type Scope } from './scopes.ts';
import * as site from './site.ts';

/** At most this many changes wait for one account at once; more are refused, changing nothing. */
export const MOST_WAITING = 20;

/** Thrown by askToConfirm when MOST_WAITING changes are waiting already. */
export class TooManyWaiting extends Error {}

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
 * Keeps a change to wait for the person, and resolves with its id and the
 * address of its page. TooManyWaiting when MOST_WAITING are waiting already.
 */
export const askToConfirm = async (ask: Ask, now = new Date()): Promise<{ id: string; url: string; expiresAt: Date }> => {
  const waiting = await PendingChange.countDocuments({
    userId: ask.userId,
    status: 'pending',
    expiresAt: { $gt: now }
  });
  if (waiting >= MOST_WAITING) throw new TooManyWaiting();
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

/**
 * An assistant's client asked the person, who said yes (form elicitation,
 * docs/adr/0025): made once, for the token that asked, and then forgotten.
 */
export const approveForToken = async (
  id: string,
  userId: string,
  tokenId: string,
  now = new Date()
): Promise<Outcome | null> => {
  const change = await take(id, { userId, tokenId }, now);
  if (!change) return null;
  const outcome = await run(change, now);
  await PendingChange.deleteOne({ _id: id });
  return outcome;
};

/** The person says no: nothing is changed, and the arguments go. false when it is not waiting. */
export const decline = async (id: string, filter: Record<string, unknown>, now = new Date()): Promise<boolean> => {
  const done = await PendingChange.updateOne(
    { _id: id, status: 'pending', ...filter, ...live(now) },
    { $set: { status: 'declined', decidedAt: now, outcome: null }, $unset: { args: 1 } }
  );
  return done.modifiedCount === 1;
};

/** Approves every change one token or grant is waiting on, oldest first; resolves with how many were made and how many not. */
export const approveAll = async (
  userId: string | Types.ObjectId,
  tokenId: string,
  now = new Date()
): Promise<{ made: number; notMade: number }> => {
  const waiting = await PendingChange.find({ userId, tokenId, status: 'pending', ...live(now) })
    .sort({ createdAt: 1, _id: 1 })
    .select({ _id: 1 })
    .lean();
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

/** How many changes one token or grant is waiting on. */
export const waitingFrom = (userId: string | Types.ObjectId, tokenId: Types.ObjectId | string, now = new Date()) =>
  PendingChange.countDocuments({ userId, tokenId, status: 'pending', ...live(now) });

/**
 * For the token that asked: whether its change still waits, or what came of
 * it. A decided change is forgotten once its token has read this (used).
 * null when there is no such change for this token.
 */
export const outcomeForToken = async (
  id: unknown,
  tokenId: string,
  now = new Date()
): Promise<(Outcome & { expiresAt: Date }) | null> => {
  if (typeof id !== 'string' || id.length > 64) return null;
  const change = (await PendingChange.findOne({ _id: id, tokenId, ...live(now) }).lean()) as Pending | null;
  if (!change) return null;
  if (!FINAL_STATUSES.includes(change.status)) return { status: change.status, expiresAt: change.expiresAt };
  await PendingChange.deleteOne({ _id: id, status: change.status });
  return { status: change.status, reply: change.outcome ?? undefined, expiresAt: change.expiresAt };
};
