// Everything an account holds, as a download: "Download my data". Only fields
// named here are written, so the password hash, the token version and reset
// links can never end up in a file, and every query is limited to the user.
import type { Types } from 'mongoose';
import { OWNED_KINDS } from './account_data.ts';
import { left as recoveryCodesLeft } from './recovery_codes.ts';
import AccessToken from '../models/access_token.ts';
import Activity from '../models/activity.ts';
import RecordVersion from '../models/record_version.ts';
import User, { mfaOn, type UserFields } from '../models/user.ts';

type Id = string | Types.ObjectId;
type Row = Record<string, unknown>;

/** Bump when a field is renamed or removed; adding one does not need it. */
export const EXPORT_VERSION = 1;

/** A record without the database's own bookkeeping. */
const bare = ({ ownedBy: _owner, __v: _version, ...record }: Row): Row => record;

/** The user's records of one kind, oldest first, without the database's own bookkeeping. */
export const recordsOf = async (kind: string, userId: Id): Promise<Row[]> => {
  const found = await OWNED_KINDS[kind]
    .find({ ownedBy: String(userId) })
    .sort({ _id: 1 })
    .lean();
  return found.map(bare);
};

/**
 * How the account signs in, in names and dates only: never the authenticator
 * secret, a passkey's public key or credential id, the user handle or a
 * recovery code's hash.
 */
const signInOf = (user: Pick<UserFields, 'mfa' | 'identities' | 'passwordless'>): Row => {
  const mfa = user.mfa;
  const on = mfaOn(user);
  return {
    // false for an account made with a provider that has not set a password yet.
    ownPassword: !user.passwordless,
    // Each provider's own id for the person, as it gave it, and when it was linked and last used.
    providers: (user.identities ?? []).map((identity) => ({
      provider: identity.provider,
      subject: identity.subject,
      linkedAt: identity.linkedAt,
      lastUsedAt: identity.lastUsedAt
    })),
    authenticatorApp: mfa?.totp ? { addedAt: mfa.totp.addedAt, lastUsedAt: mfa.totp.lastUsedAt } : null,
    passkeys: (mfa?.passkeys ?? []).map((passkey) => ({
      name: passkey.name,
      addedAt: passkey.addedAt,
      lastUsedAt: passkey.lastUsedAt
    })),
    recoveryCodes: { madeAt: on ? mfa?.recoveryMadeAt : undefined, left: on ? recoveryCodesLeft(user) : 0 }
  };
};

/** Earlier versions of the user's records, kept for Undo, oldest first. */
const versionsOf = async (userId: Id): Promise<Row[]> =>
  (
    await RecordVersion.find({ ownedBy: String(userId) })
      .sort({ savedAt: 1, _id: 1 })
      .lean()
  ).map(({ fromCollection, recordId, savedAt, by, record }) => ({
    fromCollection,
    recordId,
    savedAt,
    by,
    record: bare((record ?? {}) as Row)
  }));

/** What access tokens and connected apps did, oldest first. */
const activityOf = async (userId: Id): Promise<Row[]> =>
  (
    await Activity.find({ ownedBy: String(userId) })
      .sort({ at: 1, _id: 1 })
      .lean()
  ).map(({ at, via, client, action, fromCollection, recordId, title }) => ({
    at,
    via,
    client,
    action,
    fromCollection,
    recordId,
    title
  }));

/** The account's access tokens and connected apps, in names and dates only: never a token's hash. */
const accessTokensOf = async (userId: Id): Promise<Row[]> =>
  (await AccessToken.find({ userId }).sort({ createdAt: 1, _id: 1 }).lean()).map(
    ({ kind, name, clientId, hint, scopes, createdAt, expiresAt, lastUsedAt, revokedAt, revokedWhy }) => ({
      kind,
      name,
      ...(clientId && { clientId }),
      ...(hint && { endsWith: hint }),
      scopes,
      createdAt,
      expiresAt,
      lastUsedAt,
      revokedAt,
      revokedWhy
    })
  );

/** The whole export: the account, its preferences and shelf, and every kind of record. */
export const exportAccount = async (userId: Id, now = new Date()): Promise<Row | null> => {
  const user = await User.findById(userId, {
    email: 1,
    displayname: 1,
    role: 1,
    preferences: 1,
    shelf: 1,
    guest: 1,
    expiresAt: 1,
    emailChangedAt: 1,
    mfa: 1,
    identities: 1,
    passwordless: 1
  }).lean();
  if (!user) return null;
  const kinds = Object.keys(OWNED_KINDS);
  const [lists, versions, activity, accessTokens] = await Promise.all([
    Promise.all(kinds.map((kind) => recordsOf(kind, userId))),
    versionsOf(userId),
    activityOf(userId),
    accessTokensOf(userId)
  ]);
  return {
    format: 'glazecalc-export',
    version: EXPORT_VERSION,
    exportedAt: now.toISOString(),
    account: {
      id: String(user._id),
      // A trial's placeholder address means nothing to its owner.
      ...(user.guest ? { trial: true, expiresAt: user.expiresAt } : { email: user.email }),
      ...(user.emailChangedAt && { emailChangedAt: user.emailChangedAt }),
      displayname: user.displayname,
      role: user.role
    },
    preferences: user.preferences ?? {},
    shelf: user.shelf ?? [],
    signIn: signInOf(user),
    records: Object.fromEntries(kinds.map((kind, i) => [kind, lists[i]])),
    versions,
    activity,
    accessTokens
  };
};

// CSV, as RFC 4180 writes it, for spreadsheets. A text cell that starts like a
// formula gets a leading apostrophe, so a spreadsheet shows it as text.
const cell = (value: unknown): string => {
  let text = Array.isArray(value) ? value.join('; ') : value == null ? '' : String(value);
  if (typeof value === 'string' && /^[=+@\t\r]|^-(?![\d.])/.test(text)) text = "'" + text;
  return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
};

/** A header and rows as CSV with a byte-order mark, so Excel reads it as UTF-8. */
const csv = (header: string[], rows: unknown[][]): string =>
  '﻿' + [header, ...rows].map((row) => row.map(cell).join(',')).join('\r\n') + '\r\n';

interface Line {
  name?: string;
  amount?: string | number;
  unit?: string;
}

/** Recipes, a row for each material and additive in them. */
export const recipesCsv = async (userId: Id): Promise<string> => {
  const rows: unknown[][] = [];
  for (const recipe of await recordsOf('recipes', userId)) {
    const lines = [
      ...((recipe.materials as Line[]) ?? []).map((line) => ['Material', line]),
      ...((recipe.additives as Line[]) ?? []).map((line) => ['Additive', line])
    ] as Array<[string, Line]>;
    if (!lines.length) lines.push(['', {}]);
    for (const [type, line] of lines) {
      rows.push([recipe.title, recipe.date, recipe.notes, type, line.name, line.amount, line.unit]);
    }
  }
  return csv(['Recipe', 'Date', 'Notes', 'Type', 'Ingredient', 'Amount', 'Unit of additive'], rows);
};

interface Oxide {
  name?: string;
  amount?: string | number;
}

/** Materials, a row each, with the analysis as "CaO 1; SiO2 2". */
export const materialsCsv = async (userId: Id): Promise<string> => {
  const rows = (await recordsOf('materials', userId)).map((material) => [
    material.name,
    material.rawformula,
    material.relatedTo,
    material.notes,
    ((material.fields as Oxide[]) ?? []).map((oxide) => `${oxide.name} ${oxide.amount}`),
    material.percentmole,
    material.loi,
    material.molecularweight,
    material.equivalent,
    material.formulaweight
  ]);
  return csv(
    [
      'Name',
      'Formula',
      'Related to',
      'Notes',
      'Analysis',
      'Analysis basis',
      'Loss on ignition',
      'Molecular weight',
      'Equivalent weight',
      'Formula weight'
    ],
    rows
  );
};
