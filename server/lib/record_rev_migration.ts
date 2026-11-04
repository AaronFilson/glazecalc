// Gives the records saved before revisions (server/lib/record_rev.ts) a rev of
// 0, and the accounts a prefsRev and pricesRev of 0. Run at start. Safe to
// repeat: only what has none is written, and nothing already counted changes.
// (A record with none reads as 0 anyway, so a failure here costs nothing.)
import Additive from '../models/additive.ts';
import Advice from '../models/advice.ts';
import Firing from '../models/firing.ts';
import Material from '../models/material.ts';
import Note from '../models/note.ts';
import Recipe from '../models/recipe.ts';
import User from '../models/user.ts';

const RECORD_MODELS = [Recipe, Material, Additive, Firing, Note, Advice];

/** Writes the missing revisions; resolves with how many records and accounts it gave one. */
export const addMissingRevs = async (): Promise<{ records: number; accounts: number }> => {
  let records = 0;
  for (const Model of RECORD_MODELS) {
    // The collection directly: the schema's own default and timestamps must not touch what it did not name.
    const result = await Model.collection.updateMany({ rev: { $exists: false } }, { $set: { rev: 0 } });
    records += result.modifiedCount;
  }
  const accounts = await User.collection.updateMany(
    { $or: [{ prefsRev: { $exists: false } }, { pricesRev: { $exists: false } }] },
    [
      {
        $set: {
          prefsRev: { $ifNull: ['$prefsRev', 0] },
          pricesRev: { $ifNull: ['$pricesRev', 0] }
        }
      }
    ]
  );
  return { records, accounts: accounts.modifiedCount };
};
