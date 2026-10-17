// Read-only share links to a recipe (docs/adr/0020-share-links.md): making
// the link's secret, finding a link by it, and what the shared page is sent.
//
// The page is sent the recipe as it is now, so the owner's edits show, but
// only the fields named here: what the unity formula and the worked
// calculation need, the title and date, and the notes when the owner chose to
// show them. Never the owner, their email or id, the record's ids, prices or
// costs, a material's notes, or anything a later version adds to a recipe: a
// new field stays private until it is named here.
import crypto from 'node:crypto';
import type { Types } from 'mongoose';
import Additive from '../models/additive.ts';
import Material from '../models/material.ts';
import Recipe from '../models/recipe.ts';
import ShareLink from '../models/share_link.ts';

type Row = Record<string, unknown>;

/** 32 random bytes (256 bits), in base64url: 43 characters. */
const SECRET_BYTES = 32;
const SECRET = /^[A-Za-z0-9_-]{43}$/;

/** A new link's secret: what goes after /shared# in the address. */
export const newSecret = (): string => crypto.randomBytes(SECRET_BYTES).toString('base64url');

/** The SHA-256 of a secret, in hex: all that is stored. */
export const hashOf = (secret: string): string => crypto.createHash('sha256').update(secret).digest('hex');

/** Whether a string could be a secret, before the database is asked. */
export const looksLikeSecret = (secret: unknown): secret is string => typeof secret === 'string' && SECRET.test(secret);

/** The recipe's link, where it has one: when it was made and whether it shows the notes. Never its hash. */
export const linkOf = async (recipeId: string, ownedBy: string) =>
  ShareLink.findOne({ recipeId, ownedBy }, { _id: 0, createdAt: 1, includeNotes: 1 }).lean();

/** Stops sharing a recipe: its link, if it has one, no longer opens it. */
export const stopSharing = async (recipeId: string | Types.ObjectId, ownedBy: string): Promise<boolean> =>
  (await ShareLink.deleteOne({ recipeId, ownedBy })).deletedCount === 1;

const isText = (value: unknown): value is string => typeof value === 'string';
const isNumberOrText = (value: unknown): value is string | number =>
  typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value));

/** The chemistry of a material or additive, and nothing else of it. */
const CHEMISTRY = ['name', 'rawformula', 'percentmole', 'loi', 'molecularweight'] as const;

function chemistryOf(record: Row): Row {
  const out: Row = {};
  for (const key of CHEMISTRY) if (isNumberOrText(record[key])) out[key] = record[key];
  if (Array.isArray(record.fields)) {
    out.fields = record.fields
      .filter((field): field is Row => Boolean(field) && typeof field === 'object')
      .filter((field) => isText(field.name))
      .map((field) => ({ name: field.name, amount: isNumberOrText(field.amount) ? field.amount : '' }));
  }
  if (record.noChemistry === true) out.noChemistry = true;
  if (isText(record.chemistryOf)) out.chemistryOf = record.chemistryOf;
  return out;
}

/** A line of the recipe: its chemistry and amount, and an additive's unit. */
function lineOf(line: unknown): Row | null {
  if (!line || typeof line !== 'object') return null;
  const row = line as Row;
  if (!isText(row.name)) return null;
  const out = chemistryOf(row);
  if (isNumberOrText(row.amount)) out.amount = String(row.amount);
  if (row.unit === 'percent' || row.unit === 'parts' || row.unit === 'grams') out.unit = row.unit;
  return out;
}

const folded = (text: string): string => text.normalize('NFKC').trim().toLowerCase();

/**
 * Whether an additive is a copy saved before additives carried their LOI,
 * whose chemistry the recipe page borrows from the library's record of that
 * name (client/app/pages/recipe/recipe-analysis.ts, isOldCopy).
 */
const isOldCopy = (additive: Row): boolean => !additive.percentmole && !additive.chemistryOf && !additive.noChemistry;

/**
 * The records whose chemistry the recipe's additives borrow by name, as the
 * recipe page finds them (findByName): the standard additives, the owner's,
 * the standard materials, then the owner's; each record's chemistry only, in
 * that order, so the first that matches a name is the page's.
 */
async function borrowedFor(additives: Row[], ownedBy: string): Promise<Row[]> {
  const wanted = new Set<string>();
  for (const additive of additives) {
    if (isOldCopy(additive) && isText(additive.name)) wanted.add(folded(additive.name));
    if (isText(additive.chemistryOf)) wanted.add(folded(additive.chemistryOf));
  }
  if (!wanted.size) return [];
  const fields = { name: 1, aliases: 1, fields: 1, percentmole: 1, loi: 1, molecularweight: 1 };
  const more = { ...fields, noChemistry: 1, chemistryOf: 1, rawformula: 1 };
  const lists = await Promise.all([
    Additive.find({ ownedBy: 'Standard' }, more).lean(),
    Additive.find({ ownedBy }, more).lean(),
    Material.find({ ownedBy: 'Standard' }, more).lean(),
    Material.find({ ownedBy }, more).lean()
  ]);
  const records = lists.flat() as Row[];
  const names = (record: Row): string[] =>
    [record.name, ...(Array.isArray(record.aliases) ? record.aliases : [])].filter(isText).map(folded);
  const picked = new Set<number>();
  // An old copy's record may itself borrow another's chemistry: one step more.
  for (let round = 0; round < 2; round++) {
    for (const name of [...wanted]) {
      const index = records.findIndex((record) => names(record).includes(name));
      if (index < 0 || picked.has(index)) continue;
      picked.add(index);
      const chemistry = records[index].chemistryOf;
      if (isText(chemistry)) wanted.add(folded(chemistry));
    }
  }
  return [...picked]
    .sort((a, b) => a - b)
    .map((index) => {
      const aliases = Array.isArray(records[index].aliases) ? records[index].aliases.filter(isText) : [];
      return { ...chemistryOf(records[index]), ...(aliases.length && { aliases }) };
    });
}

/** What the shared page is sent for a recipe: see the top of this file. */
export async function sharedRecipe(recipe: Row, includeNotes: boolean, ownedBy: string): Promise<Row> {
  const lines = (list: unknown) => (Array.isArray(list) ? list.map(lineOf).filter((line) => line !== null) : []);
  const materials = lines(recipe.materials);
  const additives = lines(recipe.additives);
  const notes = includeNotes ? [recipe.notes].flat().filter(isText) : [];
  return {
    title: isText(recipe.title) ? recipe.title : '',
    ...(isText(recipe.date) && { date: recipe.date }),
    includeAdditives: recipe.includeAdditives === true,
    materials,
    additives,
    ...(notes.length && { notes }),
    borrowed: await borrowedFor(additives as Row[], ownedBy)
  };
}

/**
 * The recipe a secret opens, as the shared page is sent it, or null: no such
 * link (never made, replaced or stopped), or the recipe is gone (in the
 * Trash, deleted, or its account deleted). Each is the same null, so the page
 * cannot tell them apart, nor tell anyone whether a link once worked.
 */
export async function openShared(secret: string): Promise<Row | null> {
  if (!looksLikeSecret(secret)) return null;
  const link = await ShareLink.findOne({ hash: hashOf(secret) }).lean();
  if (!link) return null;
  const recipe = await Recipe.findOne({ _id: link.recipeId, ownedBy: link.ownedBy }).lean();
  if (!recipe) return null;
  return sharedRecipe(recipe as Row, link.includeNotes === true, link.ownedBy);
}
