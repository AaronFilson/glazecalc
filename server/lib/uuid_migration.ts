// Gives the records saved before UUIDs (docs/adr/0030-nameless-chemistry-core.md) one each, and the
// lines of every recipe the uuid of the material or additive they name. Run at start, as the revisions'
// migration is (record_rev_migration.ts). Safe to repeat: only what has none is written, and a line whose
// name matches nothing is left as it is (the chemistry then goes by its name, as it always did).
import { randomUUID } from 'node:crypto';
import Additive from '../models/additive.ts';
import Material from '../models/material.ts';
import Recipe from '../models/recipe.ts';

type Line = { name?: unknown; uuid?: unknown; [key: string]: unknown };

/** Writes a uuid on each material and additive that has none; resolves with how many it gave. */
const giveRecordsUuids = async (): Promise<number> => {
  let given = 0;
  for (const Model of [Material, Additive]) {
    // The collection directly: the schema's own defaults and timestamps must not touch what it did not name.
    const missing = await Model.collection.find({ uuid: { $exists: false } }, { projection: { _id: 1 } }).toArray();
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

/** The uuid of each record by name: the owner's own first, then the standard library's. */
const uuidsByName = async (Model: typeof Material | typeof Additive, owner: string) => {
  const rows = await Model.collection
    .find(
      { ownedBy: { $in: [owner, 'Standard'] }, uuid: { $exists: true } },
      { projection: { name: 1, uuid: 1, ownedBy: 1 } }
    )
    .toArray();
  const byName = new Map<string, string>();
  // Standard first, so that the owner's own record of the same name takes its place.
  for (const row of rows.filter((r) => r.ownedBy === 'Standard')) byName.set(String(row.name), String(row.uuid));
  for (const row of rows.filter((r) => r.ownedBy !== 'Standard')) byName.set(String(row.name), String(row.uuid));
  return byName;
};

/** The lines with a uuid where their name finds one; null when none changed. */
const withUuids = (lines: unknown, byName: Map<string, string>): Line[] | null => {
  if (!Array.isArray(lines)) return null;
  let changed = false;
  const out = lines.map((line: Line) => {
    if (!line || typeof line !== 'object' || line.uuid || typeof line.name !== 'string') return line;
    const uuid = byName.get(line.name);
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
  for (const owner of owners) {
    const [materials, additives] = await Promise.all([
      uuidsByName(Material, String(owner)),
      uuidsByName(Additive, String(owner))
    ]);
    const cursor = Recipe.collection.find({ ownedBy: owner }, { projection: { materials: 1, additives: 1 } });
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
