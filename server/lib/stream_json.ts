// Replies too large to hold in memory at once: an account's records of one
// kind (GET /api/<kind>/getAll) and its export (GET /api/export). They are
// written a piece at a time as the database's cursor gives the records, and
// wait while the connection is behind, so the server holds about one batch of
// records however many the account keeps. Built whole, one reply for a few
// hundred large records held a gigabyte.
//
// A reply that fits in one piece is sent as res.send sends it, with its
// length. One that fails before its first piece is sent is still an ordinary
// 500; one that fails later is cut off, so a half-written file never looks
// whole.
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { Response } from 'express';
import type { RecordModel } from './guest_limits.ts';
import * as log from './log.ts';

type Row = Record<string, unknown>;

/** About this much text is written at a time. */
const PIECE = 64 * 1024;

async function* inPieces(parts: AsyncIterable<string>): AsyncGenerator<string> {
  let piece = '';
  for await (const part of parts) {
    piece += part;
    if (piece.length >= PIECE) {
      yield piece;
      piece = '';
    }
  }
  if (piece) yield piece;
}

/** Sends text given in parts, as above, with the Content-Type the route set. */
export const sendParts = async (res: Response, parts: AsyncIterable<string>): Promise<void> => {
  const pieces = inPieces(parts);
  const first = await pieces.next();
  const second = first.done ? first : await pieces.next();
  if (second.done) {
    res.send(first.done ? '' : first.value);
    return;
  }
  async function* all(): AsyncGenerator<string> {
    yield first.value as string;
    yield second.value as string;
    yield* pieces;
  }
  try {
    await pipeline(Readable.from(all()), res);
  } catch (err) {
    // The browser went away; or the database failed part way, and the reply is cut off.
    if ((err as { code?: string }).code !== 'ERR_STREAM_PREMATURE_CLOSE') {
      log.error('Could not finish a reply', { code: log.codeOf(err) });
    }
  }
};

/** A JSON array of what `items` gives, each written by `write`. */
export async function* jsonArray<T>(
  items: AsyncIterable<T>,
  write: (item: T) => string = (item) => JSON.stringify(item)
): AsyncGenerator<string> {
  yield '[';
  let first = true;
  for await (const item of items) {
    yield first ? write(item) : ',' + write(item);
    first = false;
  }
  yield ']';
}

const isPlainObject = (value: unknown): value is Row => {
  if (!value || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value) as unknown;
  return proto === Object.prototype || proto === null;
};

/** A value as a document's JSON has it: objects left empty are left out, but not as a list's items (Mongoose's minimize). */
const minimized = (value: unknown, inList: boolean): unknown => {
  if (Array.isArray(value)) return value.map((item) => minimized(item, true));
  if (!isPlainObject(value)) return value;
  const out: Row = {};
  let kept = false;
  for (const [key, item] of Object.entries(value)) {
    const left = minimized(item, false);
    if (left === undefined) continue;
    out[key] = left;
    kept = true;
  }
  return kept || inList ? out : undefined;
};

/**
 * Writes a record read lean as the model's own documents write their JSON,
 * which is what GET /api/<kind>/getAll sent before it read lean: the schema's
 * defaults for the fields the record does not have, first and in the
 * schema's order (an empty list of notes, rev 0), then its own fields, as
 * stored, without objects left empty. A document would also cast a value of
 * the wrong type (a number where the schema has a text), which only records
 * saved before these schemas can hold; the app reads either.
 */
export const asDocumentJson = (Model: RecordModel): ((record: Row) => string) => {
  const defaults = Object.entries(new Model().toObject() as Row).filter(([key]) => key !== '_id');
  return (record) => {
    const out: Row = {};
    for (const [key, value] of defaults) if (!(key in record)) out[key] = value;
    for (const [key, value] of Object.entries(record)) {
      const left = minimized(value, false);
      if (left !== undefined) out[key] = left;
    }
    return JSON.stringify(out);
  };
};
