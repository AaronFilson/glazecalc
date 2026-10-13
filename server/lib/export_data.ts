// Everything an account holds, as a download: "Download my data". Only fields
// named here are written, so the password hash, the token version and reset
// links can never end up in a file, and every query is limited to the user.
import type { Types } from 'mongoose';
import { OWNED_KINDS } from './account_data.ts';
import User from '../models/user.ts';

type Id = string | Types.ObjectId;
type Row = Record<string, unknown>;

/** Bump when a field is renamed or removed; adding one does not need it. */
export const EXPORT_VERSION = 1;

/** The user's records of one kind, oldest first, without the database's own bookkeeping. */
export const recordsOf = async (kind: string, userId: Id): Promise<Row[]> => {
  const found = await OWNED_KINDS[kind]
    .find({ ownedBy: String(userId) })
    .sort({ _id: 1 })
    .lean();
  return found.map(({ ownedBy: _owner, __v: _version, ...record }: Row) => record);
};

/** The whole export: the account, its preferences and shelf, and every kind of record. */
export const exportAccount = async (userId: Id, now = new Date()): Promise<Row | null> => {
  const user = await User.findById(userId, {
    email: 1,
    displayname: 1,
    role: 1,
    settings: 1,
    preferences: 1,
    shelf: 1,
    guest: 1,
    expiresAt: 1
  }).lean();
  if (!user) return null;
  const kinds = Object.keys(OWNED_KINDS);
  const lists = await Promise.all(kinds.map((kind) => recordsOf(kind, userId)));
  return {
    format: 'glazecalc-export',
    version: EXPORT_VERSION,
    exportedAt: now.toISOString(),
    account: {
      id: String(user._id),
      // A trial's placeholder address means nothing to its owner.
      ...(user.guest ? { trial: true, expiresAt: user.expiresAt } : { email: user.email }),
      displayname: user.displayname,
      role: user.role,
      settings: user.settings
    },
    preferences: user.preferences ?? {},
    shelf: user.shelf ?? [],
    records: Object.fromEntries(kinds.map((kind, i) => [kind, lists[i]]))
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
