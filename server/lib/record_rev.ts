// A record's revision: a count of the changes made to it (`rev`, 0 when it is
// made) and when the last was (`updatedAt`). A client that worked from a copy
// of a record says which revision it saw (If-Match: "<rev>" on a REST change,
// delete or undo, or `rev` on an assistant's update tool), and the change is
// refused when the record has moved on, so an edit made offline is never
// written over someone else's. Without it, the last write wins, as it always
// has (PATs, assistants and older apps).
//
//   409 { code: 'record-conflict', record }   the record is at another revision; `record` is how it is now
//   404 { code: 'record-gone' }               there is no such record any more (removed, or in the Trash)
//
// A record saved before revisions has none: it reads as 0, and the boot
// migration (server/lib/record_rev_migration.ts) writes 0 to it.
import type { Request } from 'express';
import { say } from './messages.ts';
import type { Reply } from './rest_changes.ts';

/** The revision of a stored record: 0 for one that has none yet. */
export const revOf = (record: object | null | undefined): number => {
  const rev = (record as { rev?: unknown } | null | undefined)?.rev;
  return typeof rev === 'number' && Number.isInteger(rev) && rev >= 0 ? rev : 0;
};

/** An account's count of changes to its preferences ('prefsRev') or prices ('pricesRev'): 0 for none yet. */
export const counterOf = (account: object | null | undefined, field: 'prefsRev' | 'pricesRev'): number => {
  const count = (account as Record<string, unknown> | null | undefined)?.[field];
  return typeof count === 'number' && Number.isInteger(count) && count >= 0 ? count : 0;
};

/**
 * What a change adds to a record's update: its revision up by one and the time.
 * Spread $set's value into the change's own: { $set: { ...changes, ...bump().$set }, $inc: bump().$inc }.
 */
export const bump = (now = new Date()) => ({ $inc: { rev: 1 }, $set: { updatedAt: now } });

/** An update document for a change that sets `changes`: them, the revision up by one and the time. */
export const withBump = (changes: Record<string, unknown>, now = new Date()) => ({
  $set: { ...changes, updatedAt: now },
  $inc: { rev: 1 }
});

/** The same, for an aggregation-pipeline update (updatePipeline). */
export const bumpStage = (now = new Date()) => ({
  rev: { $add: [{ $ifNull: ['$rev', 0] }, 1] },
  updatedAt: { $literal: now }
});

/**
 * The revision a request names: If-Match: "3" (W/"3" and a bare 3 too), or
 * undefined for no header, `*` or anything that is not a count, which asks for
 * no check.
 */
export const ifMatchOf = (req: Pick<Request, 'headers'>): number | undefined => {
  const header = req.headers['if-match'];
  const text = Array.isArray(header) ? header[0] : header;
  if (typeof text !== 'string') return undefined;
  const match = /^\s*(?:W\/)?"?(\d{1,15})"?\s*$/.exec(text);
  return match ? Number(match[1]) : undefined;
};

/** A revision from an assistant's `rev` input: a whole number from 0, or undefined for none. */
export const revInput = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : undefined;

/**
 * The part of a record's filter that holds it to a revision; nothing for no
 * revision. 0 also matches a record that has none (not migrated yet).
 */
export const revFilter = (rev: number | undefined): Record<string, unknown> => {
  if (rev === undefined) return {};
  return rev === 0 ? { $or: [{ rev: 0 }, { rev: { $exists: false } }] } : { rev };
};

/** 409: the record is not at the revision the change was made from; `record` is how it is now. */
export const conflict = (label: string, record: unknown): Reply => ({
  status: 409,
  body: say('record-conflict', { label }, { record: JSON.parse(JSON.stringify(record ?? null)) as unknown })
});

/** 404 for a change that named a revision: the record is not there any more. */
export const gone = (label: string): Reply => ({ status: 404, body: say('record-gone', { label }) });
