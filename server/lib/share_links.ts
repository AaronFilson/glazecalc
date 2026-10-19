// Read-only share links to a recipe (docs/adr/0020-share-links.md): making
// the link's secret, finding a link by it, and what the shared page is sent.
//
// The page is sent the recipe as it is now, so the owner's edits show, but
// only the fields named here: what the unity formula and the worked
// calculation need, the title and date, the firing as stated and whether it is
// for a food surface (never the firing logs it is linked to), and the notes, with
// the firing's schedule note and the result summaries for each cone and
// atmosphere, when the owner chose to show them. A line that is a
// standard material or additive is marked
// ownedBy 'Standard' and carries the library's current hazards, which are
// public (the library ships in data/), so the page can show the recipe's
// hazards as the recipe page does; a potter's own record carries none of its
// own words, its hazards included. Never the owner, their email or id, the
// record's ids, prices or costs, a material's notes, or anything a later
// version adds to a recipe: a new field stays private until it is named here.
import crypto from 'node:crypto';
import type { Types } from 'mongoose';
import firing from '../../lib/cones/firing.js';
import type { FiringBlock } from '../../lib/cones/firing.js';
import results from '../../lib/cones/results.js';
import Additive from '../models/additive.ts';
import Material from '../models/material.ts';
import Recipe from '../models/recipe.ts';
import ShareLink from '../models/share_link.ts';
import { forgetStandardSets, standardSet, type StandardSet } from './standard_library.ts';

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

/**
 * Every recipe the account shares now: its id and title, when its link was
 * made and whether it shows the notes, newest first. Never a hash or a secret.
 * A link whose recipe is gone is left out.
 */
export async function sharedBy(ownedBy: string) {
  const links = await ShareLink.find({ ownedBy }, { _id: 0, recipeId: 1, createdAt: 1, includeNotes: 1 })
    .sort({ createdAt: -1 })
    .lean();
  if (!links.length) return [];
  const recipes = await Recipe.find({ _id: { $in: links.map((link) => link.recipeId) }, ownedBy }, { title: 1 }).lean();
  const titles = new Map(recipes.map((recipe) => [String(recipe._id), recipe.title ?? '']));
  return links
    .filter((link) => titles.has(String(link.recipeId)))
    .map((link) => ({
      recipeId: String(link.recipeId),
      title: titles.get(String(link.recipeId)) as string,
      createdAt: link.createdAt,
      includeNotes: link.includeNotes === true
    }));
}

/** Stops every link of an account (a password reset, signing out everywhere); resolves with how many. */
export const stopAllSharing = async (ownedBy: string | Types.ObjectId): Promise<number> =>
  (await ShareLink.deleteMany({ ownedBy: String(ownedBy) })).deletedCount;

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

const MORE = {
  name: 1,
  aliases: 1,
  fields: 1,
  percentmole: 1,
  loi: 1,
  molecularweight: 1,
  noChemistry: 1,
  chemistryOf: 1,
  rawformula: 1
};

const namesOf = (record: Row): string[] =>
  [record.name, ...(Array.isArray(record.aliases) ? record.aliases : [])].filter(isText).map(folded);

/** Records by each of their names and aliases, the first that has it winning. */
const byName = (records: Row[]): Map<string, Row> => {
  const map = new Map<string, Row>();
  for (const record of records) for (const name of namesOf(record)) if (!map.has(name)) map.set(name, record);
  return map;
};

/**
 * The standard additives and materials by name, from the copy
 * server/lib/standard_library.ts keeps (read again every few minutes, so a
 * deploy's seed shows), made again only when that copy is new.
 */
interface Standards {
  additives: Map<string, Row>;
  materials: Map<string, Row>;
  /** Each standard record's hazards by its id, '' where it gives none. */
  hazards: Map<string, string>;
}
let standards: { from: [StandardSet, StandardSet]; maps: Standards } | undefined;

/** Forgets the standard records kept (for tests that change them). */
export const forgetStandards = (): void => {
  standards = undefined;
  forgetStandardSets();
};

async function standardRecords(): Promise<Standards> {
  const from = await Promise.all([standardSet(Additive), standardSet(Material)]);
  if (standards && standards.from[0] === from[0] && standards.from[1] === from[1]) return standards.maps;
  const [additives, materials] = from.map((set) => set.rows);
  const hazards = new Map<string, string>();
  for (const record of [...additives!, ...materials!]) {
    hazards.set(String(record._id), isText(record.hazards) ? record.hazards : '');
  }
  const maps = { additives: byName(additives!), materials: byName(materials!), hazards };
  standards = { from: [from[0]!, from[1]!], maps };
  return maps;
}

/** The owner's records of one kind that have any of the names (case aside); no others are read. */
const ownersNamed = async (Model: typeof Additive | typeof Material, ownedBy: string, names: string[]) => {
  const found = await (Model as typeof Additive)
    .find({ ownedBy, $or: [{ name: { $in: names } }, { aliases: { $in: names } }] }, MORE)
    .collation({ locale: 'en', strength: 2 })
    .lean();
  return byName(found as Row[]);
};

/**
 * The records whose chemistry the recipe's additives borrow by name, as the
 * recipe page finds it (findByName): the standard additives, the owner's, the
 * standard materials, then the owner's; the first that matches a name is the
 * page's. Each is sent as its chemistry only. A standard record keeps its
 * name and aliases (they are public); the owner's own record is sent under the
 * name the recipe asked for, never its own name or aliases, which the recipe
 * does not show. Only the records asked for are read.
 */
async function borrowedFor(additives: Row[], ownedBy: string): Promise<Row[]> {
  const wanted = new Map<string, string>(); // folded, to the name as the recipe wrote it
  const want = (name: unknown) => {
    if (isText(name) && !wanted.has(folded(name))) wanted.set(folded(name), name.trim());
  };
  for (const additive of additives) {
    if (isOldCopy(additive)) want(additive.name);
    want(additive.chemistryOf);
  }
  if (!wanted.size) return [];
  const { additives: stdAdditives, materials: stdMaterials } = await standardRecords();
  const picked = new Map<string, { rank: number; record: Row; asked: string | null }>();
  const asked = new Set<string>();
  // An old copy's record may itself borrow another's chemistry: one step more.
  for (let round = 0; round < 2; round++) {
    const fresh = [...wanted.entries()].filter(([name]) => !asked.has(name));
    if (!fresh.length) break;
    fresh.forEach(([name]) => asked.add(name));
    const texts = [...new Set(fresh.map(([, text]) => text))];
    const [ownAdditives, ownMaterials] = await Promise.all([
      ownersNamed(Additive, ownedBy, texts),
      ownersNamed(Material, ownedBy, texts)
    ]);
    const lists: [Map<string, Row>, boolean][] = [
      [stdAdditives, true],
      [ownAdditives, false],
      [stdMaterials, true],
      [ownMaterials, false]
    ];
    for (const [name, text] of fresh) {
      const rank = lists.findIndex(([map]) => map.has(name));
      if (rank < 0) continue;
      const record = lists[rank]![0].get(name) as Row;
      const standard = lists[rank]![1];
      picked.set(standard ? 's' + rank + ':' + String(record.name) : 'o:' + name, {
        rank,
        record,
        asked: standard ? null : text
      });
      if (isText(record.chemistryOf)) want(record.chemistryOf);
    }
  }
  return [...picked.values()]
    .sort((a, b) => a.rank - b.rank)
    .map(({ record, asked: text }) => {
      if (text !== null) return { ...chemistryOf(record), name: text };
      const aliases = Array.isArray(record.aliases) ? record.aliases.filter(isText) : [];
      return { ...chemistryOf(record), ...(aliases.length && { aliases }) };
    });
}

/**
 * A line as sent, and for a standard material or additive the library's
 * hazards now (its safety data sheet may have changed since the recipe was
 * saved), or else those of the copy in the line, as the recipe page reads them
 * (client/app/pages/recipe/recipe-hazards.ts, hazardSources).
 */
function sentLine(line: unknown, hazards: Map<string, string>): Row | null {
  const out = lineOf(line);
  if (!out) return null;
  const row = line as Row;
  if (row.ownedBy === 'Standard') {
    out.ownedBy = 'Standard';
    const known = row._id !== undefined && row._id !== null ? hazards.get(String(row._id)) : undefined;
    const text = known ?? (isText(row.hazards) ? row.hazards : undefined);
    if (text?.trim()) out.hazards = text;
  }
  return out;
}

/** What the shared page is sent for a recipe: see the top of this file. */
export async function sharedRecipe(recipe: Row, includeNotes: boolean, ownedBy: string): Promise<Row> {
  const { hazards } = await standardRecords();
  const lines = (list: unknown) =>
    Array.isArray(list) ? list.map((line) => sentLine(line, hazards)).filter((line) => line !== null) : [];
  const materials = lines(recipe.materials);
  const additives = lines(recipe.additives);
  const notes = includeNotes ? [recipe.notes].flat().filter(isText) : [];
  // The schedule note is the author's own words, like the notes: shared only when the notes are.
  const stated = firing.cleanFiring(recipe.firedAt as FiringBlock | undefined);
  const firedAt = includeNotes || !stated ? stated : firing.cleanFiring({ ...stated, schedule: undefined });
  // So are the summaries of how it came out at each cone and atmosphere; never the logs they came from.
  const coneResults = includeNotes ? (results.cleanConeResults(recipe.coneResults ?? []) ?? []) : [];
  return {
    title: isText(recipe.title) ? recipe.title : '',
    ...(isText(recipe.date) && { date: recipe.date }),
    includeAdditives: recipe.includeAdditives === true,
    // The firing as the author stated it, in their own scale (the page shows a conversion beside it), and
    // whether it is for a food surface. Not the firing logs it is linked to: those stay the author's.
    ...(firedAt && { firedAt }),
    ...(recipe.foodSurface === true && { foodSurface: true }),
    materials,
    additives,
    ...(notes.length && { notes }),
    ...(coneResults.length && { coneResults }),
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
