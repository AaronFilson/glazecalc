// Gives the records saved before UUIDs (docs/adr/0030-nameless-chemistry-core.md) one each, and the
// lines of every recipe the uuid of the record they came from. Run at start, as the revisions'
// migration is (record_rev_migration.ts). Safe to repeat: only what has none is written.
//
// Standard records are never given one here: theirs are fixed in data/, and deploy.sh seeds them after
// the new app has started (scripts/seed-standard.js), so a uuid given here would be replaced and the
// lines given it left naming no record. A line takes a standard record's uuid from data/ itself.
//
// A line is matched by the record it came from (its _id: the owner's own, or a standard one), else by
// name, the owner's own record first; one that matches neither is left as it is (the chemistry then goes
// by its name, as it always did).
import { randomUUID } from 'node:crypto';
import standardData from '../../data/index.js';
import Additive from '../models/additive.ts';
import Material from '../models/material.ts';
import Recipe from '../models/recipe.ts';

type Line = { _id?: unknown; name?: unknown; uuid?: unknown; [key: string]: unknown };
type Maps = { byId: Map<string, string>; byName: Map<string, string> };

/** Writes a uuid on each of the accounts' materials and additives that has none; resolves with how many. */
const giveRecordsUuids = async (): Promise<number> => {
  let given = 0;
  for (const Model of [Material, Additive]) {
    // The collection directly: the schema's own defaults and timestamps must not touch what it did not name.
    const missing = await Model.collection
      .find({ uuid: { $exists: false }, ownedBy: { $ne: 'Standard' } }, { projection: { _id: 1 } })
      .toArray();
    if (!missing.length) continue;
    const result = await Model.collection.bulkWrite(
      missing.map((doc) => ({
        updateOne: { filter: { _id: doc._id, uuid: { $exists: false } }, update: { $set: { uuid: randomUUID() } } }
      }))
    );
    given += result.modifiedCount;
  }
  return given;
};

/** The standard records' uuids by _id and by name, from data/. */
const standardMaps = (collection: 'materials' | 'additives'): Maps => {
  const byId = new Map<string, string>();
  const byName = new Map<string, string>();
  for (const record of standardData.load(collection) as Array<{ _id?: unknown; name?: unknown; uuid?: unknown }>) {
    if (typeof record.uuid !== 'string') continue;
    byId.set(String(record._id), record.uuid);
    if (typeof record.name === 'string' && !byName.has(record.name)) byName.set(record.name, record.uuid);
  }
  return { byId, byName };
};

/** An owner's own records' uuids by _id and by name, over the standard ones. */
const ownerMaps = async (Model: typeof Material | typeof Additive, owner: string, standard: Maps): Promise<Maps> => {
  const rows = await Model.collection
    .find({ ownedBy: owner, uuid: { $exists: true } }, { projection: { name: 1, uuid: 1 } })
    .toArray();
  const byId = new Map(standard.byId);
  const byName = new Map(standard.byName);
  for (const row of rows) {
    byId.set(String(row._id), String(row.uuid));
    byName.set(String(row.name), String(row.uuid));
  }
  return { byId, byName };
};

/** The lines with a uuid where the record they came from, or their name, finds one; null when none changed. */
const withUuids = (lines: unknown, maps: Maps): Line[] | null => {
  if (!Array.isArray(lines)) return null;
  let changed = false;
  const out = lines.map((line: Line) => {
    if (!line || typeof line !== 'object' || line.uuid) return line;
    const uuid =
      (line._id !== undefined ? maps.byId.get(String(line._id)) : undefined) ??
      (typeof line.name === 'string' ? maps.byName.get(line.name) : undefined);
    if (!uuid) return line;
    changed = true;
    return { ...line, uuid };
  });
  return changed ? out : null;
};

/** Writes the uuids of the lines of each recipe that has a line without one; resolves with how many recipes. */
const giveRecipeLinesUuids = async (): Promise<number> => {
  let recipes = 0;
  const owners = await Recipe.collection.distinct('ownedBy', {
    $or: [
      { materials: { $elemMatch: { uuid: { $exists: false } } } },
      { additives: { $elemMatch: { uuid: { $exists: false } } } }
    ]
  });
  if (!owners.length) return 0;
  const standard = { materials: standardMaps('materials'), additives: standardMaps('additives') };
  for (const owner of owners) {
    const [materials, additives] = await Promise.all([
      ownerMaps(Material, String(owner), standard.materials),
      ownerMaps(Additive, String(owner), standard.additives)
    ]);
    const cursor = Recipe.collection.find(
      {
        ownedBy: owner,
        $or: [
          { materials: { $elemMatch: { uuid: { $exists: false } } } },
          { additives: { $elemMatch: { uuid: { $exists: false } } } }
        ]
      },
      { projection: { materials: 1, additives: 1 } }
    );
    for await (const recipe of cursor) {
      const set: Record<string, Line[]> = {};
      const m = withUuids(recipe.materials, materials);
      const a = withUuids(recipe.additives, additives);
      if (m) set.materials = m;
      if (a) set.additives = a;
      if (!Object.keys(set).length) continue;
      // Only if the lines are still those read: a change made meanwhile is left to the next start.
      const result = await Recipe.collection.updateOne(
        {
          _id: recipe._id,
          materials: recipe.materials,
          ...(recipe.additives !== undefined && { additives: recipe.additives })
        },
        { $set: set }
      );
      recipes += result.modifiedCount;
    }
  }
  return recipes;
};

/** Gives records and recipe lines their uuids; resolves with how many of each it wrote. */
export const addMissingUuids = async (): Promise<{ records: number; recipes: number }> => {
  const records = await giveRecordsUuids();
  const recipes = await giveRecipeLinesUuids();
  return { records, recipes };
};
