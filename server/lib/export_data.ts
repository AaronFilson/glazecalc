// Everything an account holds, as a download: "Download my data". Only fields
// named here are written, so the password hash, the token version and reset
// links can never end up in a file, and every query is limited to the user.
// Each file is written a record at a time as it is read
// (server/lib/stream_json.ts), so however much the account keeps, the server
// holds little of it at once; the JSON is not indented, which made it up to
// five times larger.
import type { Types } from 'mongoose';
import firing from '../../lib/cones/firing.js';
import type { FiringBlock } from '../../lib/cones/firing.js';
import { OWNED_KINDS } from './account_data.ts';
import { left as recoveryCodesLeft } from './recovery_codes.ts';
import { jsonArray } from './stream_json.ts';
import AccessToken from '../models/access_token.ts';
import Activity from '../models/activity.ts';
import RecordVersion from '../models/record_version.ts';
import ShareLink from '../models/share_link.ts';
import User, { mfaOn, type UserFields } from '../models/user.ts';

type Id = string | Types.ObjectId;
type Row = Record<string, unknown>;

/** Bump when a field is renamed or removed; adding one does not need it. */
export const EXPORT_VERSION = 1;

/** A record without the database's own bookkeeping. */
const bare = ({ ownedBy: _owner, __v: _version, ...record }: Row): Row => record;

/** The user's records of one kind, oldest first, without the database's own bookkeeping, one at a time. */
export async function* recordsOf(kind: string, userId: Id): AsyncGenerator<Row> {
  const found = OWNED_KINDS[kind]
    .find({ ownedBy: String(userId) })
    .sort({ _id: 1 })
    .lean<Row[]>()
    .cursor();
  for await (const record of found) yield bare(record);
}

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
async function* versionsOf(userId: Id): AsyncGenerator<Row> {
  const found = RecordVersion.find({ ownedBy: String(userId) })
    .sort({ savedAt: 1, _id: 1 })
    .lean()
    .cursor();
  for await (const { fromCollection, recordId, savedAt, by, record } of found) {
    yield { fromCollection, recordId, savedAt, by, record: bare((record ?? {}) as Row) };
  }
}

/** What access tokens and connected apps did, oldest first. */
async function* activityOf(userId: Id): AsyncGenerator<Row> {
  const found = Activity.find({ ownedBy: String(userId) })
    .sort({ at: 1, _id: 1 })
    .lean()
    .cursor();
  for await (const { at, via, client, action, fromCollection, recordId, title } of found) {
    yield { at, via, client, action, fromCollection, recordId, title };
  }
}

/** The account's access tokens and connected apps, in names and dates only: never a token's hash. */
async function* accessTokensOf(userId: Id): AsyncGenerator<Row> {
  const found = AccessToken.find({ userId }).sort({ createdAt: 1, _id: 1 }).lean().cursor();
  for await (const token of found) {
    const { kind, name, clientId, clientHost, redirectHost, hint, scopes } = token;
    const { createdAt, expiresAt, lastUsedAt, revokedAt, revokedWhy } = token;
    yield {
      kind,
      name,
      ...(clientId && { clientId }),
      ...(clientHost && { clientHost }),
      ...(redirectHost && { redirectHost }),
      ...(hint && { endsWith: hint }),
      scopes,
      createdAt,
      expiresAt,
      lastUsedAt,
      revokedAt,
      revokedWhy
    };
  }
}

/**
 * The recipes shared by link: which, since when, and whether the notes show.
 * Never the link: only its hash is kept, and that is left out too.
 */
async function* shareLinksOf(userId: Id): AsyncGenerator<Row> {
  const found = ShareLink.find({ ownedBy: String(userId) })
    .sort({ createdAt: 1, _id: 1 })
    .lean()
    .cursor();
  for await (const { recipeId, createdAt, includeNotes } of found) yield { recipeId, createdAt, includeNotes };
}

/**
 * The whole export, as JSON text a part at a time: the account, its
 * preferences, shelf and prices, every kind of record, and the rest (each
 * list read as it is written); null when there is no such account.
 */
export const exportJson = async (userId: Id, now = new Date()): Promise<AsyncIterable<string> | null> => {
  const user = await User.findById(userId, {
    email: 1,
    displayname: 1,
    role: 1,
    preferences: 1,
    shelf: 1,
    shelfPrevious: 1,
    prices: 1,
    guest: 1,
    expiresAt: 1,
    emailChangedAt: 1,
    mfa: 1,
    identities: 1,
    passwordless: 1
  }).lean();
  if (!user) return null;
  const head = JSON.stringify({
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
    // The list before the last change, which Undo puts back; absent when there is none.
    ...(user.shelfPrevious && { shelfPrevious: user.shelfPrevious }),
    // Per kilogram, in the account's currency (preferences.currency, or the region's when '').
    prices: (user.prices ?? []).map(({ key, perKg }) => ({ key, perKg })),
    signIn: signInOf(user)
  });
  return (async function* () {
    // The head without its closing brace; then every kind of record, and the rest.
    yield head.slice(0, -1) + ',"records":{';
    for (const [i, kind] of Object.keys(OWNED_KINDS).entries()) {
      yield (i ? ',' : '') + JSON.stringify(kind) + ':';
      yield* jsonArray(recordsOf(kind, userId));
    }
    yield '},"versions":';
    yield* jsonArray(versionsOf(userId));
    yield ',"activity":';
    yield* jsonArray(activityOf(userId));
    yield ',"accessTokens":';
    yield* jsonArray(accessTokensOf(userId));
    yield ',"shareLinks":';
    yield* jsonArray(shareLinksOf(userId));
    yield '}';
  })();
};

// CSV, as RFC 4180 writes it, for spreadsheets. A cell that starts like a
// formula gets a leading apostrophe, so a spreadsheet shows it as text: any
// cell but a number, a list's once it is joined, and one that starts with a
// minus unless all of it is a number (-1+HYPERLINK(...) runs; -2 is minus two).
const PLAIN_NUMBER = /^-?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i;
const cell = (value: unknown): string => {
  let text = Array.isArray(value) ? value.join('; ') : value == null ? '' : String(value);
  if (typeof value !== 'number' && /^[=+\-@\t\r]/.test(text) && !PLAIN_NUMBER.test(text)) text = "'" + text;
  return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
};

/** A header and rows as CSV with a byte-order mark, so Excel reads it as UTF-8, a row at a time. */
async function* csv(header: string[], rows: AsyncIterable<unknown[]>): AsyncGenerator<string> {
  yield '﻿' + header.map(cell).join(',') + '\r\n';
  for await (const row of rows) yield row.map(cell).join(',') + '\r\n';
}

interface Line {
  name?: string;
  amount?: string | number;
  unit?: string;
}

/** A row for each material and additive in each recipe. */
async function* recipeRows(userId: Id): AsyncGenerator<unknown[]> {
  for await (const recipe of recordsOf('recipes', userId)) {
    const lines = [
      ...((recipe.materials as Line[]) ?? []).map((line) => ['Material', line]),
      ...((recipe.additives as Line[]) ?? []).map((line) => ['Additive', line])
    ] as Array<[string, Line]>;
    if (!lines.length) lines.push(['', {}]);
    // The firing as Glazy's export writes it (its "Cone" string and "Atmospheres" list), and the liner flag.
    // The cone carries the cone sign (Δ06), so a spreadsheet keeps it as text (lib/cones/firing.js, glazyConeCell).
    const glazy = firing.glazyFiring(recipe.firedAt as FiringBlock | undefined);
    const cone = firing.glazyConeCell(recipe.firedAt as FiringBlock | undefined);
    const food = recipe.foodSurface === true ? 'yes' : '';
    for (const [type, line] of lines) {
      yield [
        recipe.title,
        recipe.date,
        recipe.notes,
        type,
        line.name,
        line.amount,
        line.unit,
        cone,
        glazy.atmospheres,
        food
      ];
    }
  }
}

/** Recipes, a row for each material and additive in them. */
export const recipesCsv = (userId: Id): AsyncIterable<string> =>
  csv(
    [
      'Recipe',
      'Date',
      'Notes',
      'Type',
      'Ingredient',
      'Amount',
      'Unit of additive',
      'Cone',
      'Atmospheres',
      'Food surface'
    ],
    recipeRows(userId)
  );

interface Oxide {
  name?: string;
  amount?: string | number;
}

/** A row for each material. */
async function* materialRows(userId: Id): AsyncGenerator<unknown[]> {
  for await (const material of recordsOf('materials', userId)) {
    yield [
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
    ];
  }
}

/** Materials, a row each, with the analysis as "CaO 1; SiO2 2". */
export const materialsCsv = (userId: Id): AsyncIterable<string> =>
  csv(
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
    materialRows(userId)
  );
