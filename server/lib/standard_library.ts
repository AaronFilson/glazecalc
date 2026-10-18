// The standard library (data/): the materials, additives and advice every
// installation ships with. scripts/seed-standard.js copies data/ into the
// database (ownedBy 'Standard') on every deploy, and the database stays the
// one source the app reads, so a development database seeded otherwise, and
// the tests' own Standard rows, are what it serves.
//
// Read once and kept for STANDARD_KEPT_MS, per collection, for GET
// /api/<kind>/getStandard (record_routes.ts) and share links' borrowed
// chemistry and hazards (share_links.ts). Not for the life of the process:
// deploy.sh seeds after the new app has started, so what the app read at
// start may be the previous version's, and the next read picks up the seed.
// The MCP tools read data/ itself (server/mcp/library.ts).
import type { RecordModel } from './guest_limits.ts';

type Row = Record<string, unknown>;

export const STANDARD_KEPT_MS = 10 * 60 * 1000;

export interface StandardSet {
  /** The records as the schema gives them (its defaults included). */
  rows: Row[];
  /** The same as getStandard sends them, serialised once. */
  body: string;
}

const kept = new Map<string, { at: number; set: Promise<StandardSet> }>();

/** One collection's Standard records, read again when the copy is STANDARD_KEPT_MS old. */
export function standardSet(Model: RecordModel): Promise<StandardSet> {
  const key = Model.modelName;
  const now = kept.get(key);
  if (now && Date.now() - now.at <= STANDARD_KEPT_MS) return now.set;
  // Hydrated, not lean, so the body is what res.json(Model.find()) sent before:
  // the schema's defaults (an empty relatedTo, notes) included.
  const set = Model.find({ ownedBy: 'Standard' }).then((docs) => ({
    rows: docs.map((doc) => doc.toObject() as Row),
    body: JSON.stringify(docs)
  }));
  set.catch(() => {
    if (kept.get(key)?.set === set) kept.delete(key);
  });
  kept.set(key, { at: Date.now(), set });
  return set;
}

/** Forgets every copy kept (for tests that change the Standard records). */
export const forgetStandardSets = (): void => {
  kept.clear();
};
