// The shelf of materials on hand (User.shelf), changed in one place for the
// website, the REST routes (routes/user_routes.ts) and the MCP tools
// (mcp/tools/account_write.ts). Every change keeps the list it replaced in
// User.shelfPrevious, in the same update, so one Undo is always possible
// (undoShelf); a change that changes nothing keeps the earlier one.
//
// Updates are pipelines, so the list is read and written in one step: a
// change made at the same time elsewhere is never written over, order is
// kept, and the shelf stays within SHELF_MOST. Keys are wrapped in $literal:
// a key is the person's or an assistant's text, and one that starts with "$"
// must stay text.
import Material from '../models/material.ts';
import User, { SHELF_MOST } from '../models/user.ts';
import { findMaterial, libraryKeyOf, nameKey } from '../mcp/library.ts';

/** The shelf as it is now: what an expression in a pipeline reads. */
const NOW = { $ifNull: ['$shelf', []] };

/** The shelf keys for materials named: your own material's id, or the library's key; and the names not found. */
export const shelfKeys = async (
  userId: string,
  names: string[]
): Promise<{ keys: Array<{ name: string; keys: string[] }>; unknown: string[] }> => {
  const own = await Material.find({ ownedBy: userId }).lean();
  const byName = new Map(own.map((m) => [nameKey(m.name), m]));
  const keys: Array<{ name: string; keys: string[] }> = [];
  const unknown: string[] = [];
  for (const name of names) {
    const mine = byName.get(nameKey(name));
    const library = mine ? undefined : findMaterial(name);
    if (mine) keys.push({ name: mine.name, keys: [String(mine._id)] });
    else if (library)
      keys.push({ name: library.name, keys: [...new Set([libraryKeyOf(library), 'name:' + library.name])] });
    else unknown.push(name);
  }
  return { keys, unknown };
};

/** The account's shelf now. */
export const shelfOf = async (userId: string): Promise<string[]> =>
  (await User.findById(userId, { shelf: 1 }).lean())?.shelf ?? [];

/** What a change did: the shelf now, and whether it was changed. 'full' is a shelf over SHELF_MOST, left as it was. */
export type ShelfResult = { shelf: string[]; changed: boolean } | 'full';

/**
 * Puts a whole list in place of the shelf (the website's PUT). The list it
 * replaced is kept for Undo, unless the lists are the same.
 */
export const setShelf = async (userId: string, keys: string[]): Promise<void> => {
  await User.updateOne(
    { _id: userId },
    [
      {
        $set: {
          shelfPrevious: { $cond: [{ $eq: [NOW, { $literal: keys }] }, '$shelfPrevious', NOW] },
          shelf: { $literal: keys }
        }
      }
    ],
    { updatePipeline: true }
  );
};

/** Adds keys at the end, those not on the shelf already, while the shelf stays within SHELF_MOST. */
export const addKeys = async (userId: string, keys: string[]): Promise<ShelfResult> => {
  const adding = [...new Set(keys)];
  const before = await shelfOf(userId);
  const have = new Set(before);
  const fresh = adding.filter((key) => !have.has(key));
  if (!fresh.length) return { shelf: before, changed: false };
  if (before.length + fresh.length > SHELF_MOST) return 'full';
  // The same test again in the update, in case the shelf changed since it was read.
  const newOnes = { $filter: { input: { $literal: fresh }, cond: { $not: [{ $in: ['$$this', NOW] }] } } };
  const done = await User.findOneAndUpdate(
    { _id: userId, $expr: { $lte: [{ $size: { $setUnion: [NOW, { $literal: fresh }] } }, SHELF_MOST] } },
    [{ $set: { shelfPrevious: NOW, shelf: { $concatArrays: [NOW, newOnes] } } }],
    { returnDocument: 'after', updatePipeline: true, projection: { shelf: 1 } }
  ).lean();
  return done ? { shelf: done.shelf ?? [], changed: true } : 'full';
};

/** Takes keys off the shelf, the others keeping their order. */
export const removeKeys = async (userId: string, keys: string[]): Promise<{ shelf: string[]; changed: boolean }> => {
  const before = await shelfOf(userId);
  const going = new Set(keys);
  if (!before.some((key) => going.has(key))) return { shelf: before, changed: false };
  const done = await User.findOneAndUpdate(
    { _id: userId },
    [
      {
        $set: {
          shelfPrevious: NOW,
          shelf: { $filter: { input: NOW, cond: { $not: [{ $in: ['$$this', { $literal: [...going] }] }] } } }
        }
      }
    ],
    { returnDocument: 'after', updatePipeline: true, projection: { shelf: 1 } }
  ).lean();
  return { shelf: done?.shelf ?? [], changed: true };
};

/**
 * Puts back the list the last change replaced. There is one step back: the
 * list is then spent, so a second Undo finds nothing. Resolves with the shelf
 * now, or null when there is nothing to put back.
 */
export const undoShelf = async (userId: string): Promise<string[] | null> => {
  const done = await User.findOneAndUpdate(
    { _id: userId, shelfPrevious: { $exists: true } },
    [{ $set: { shelf: '$shelfPrevious' } }, { $unset: 'shelfPrevious' }],
    { returnDocument: 'after', updatePipeline: true, projection: { shelf: 1 } }
  ).lean();
  return done ? (done.shelf ?? []) : null;
};
