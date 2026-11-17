// How the core tells records apart (docs/adr/0030-nameless-chemistry-core.md). The core never reads
// what a record is called: it asks the host's idOf for the record's identity, an opaque value it only
// compares and passes back in a result or a problem's values. By default that is the record's `id`.
// The readers come with each call, in the host (docs/adr/0031-functional-core.md), and the core keeps
// none: Glazecalc's reads a record's uuid, or its name for a record without one.

import type { Readers } from './host.ts';

/**
 * A record's identity or label: a string or a number (a UUID, a name, a database key as text). The core
 * only compares it and passes it back.
 */
export type Identity = string | number;

/**
 * A host's reader of something about a record. Its record is the host's own type, which the core never
 * looks into: it passes back the records it was given, so a reader may type them as it likes.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the host's record type, not the core's
export type Reader<T> = (record: any) => T;

const recordId = (record: { id?: Identity }): Identity | undefined => record.id;

/** The identity of a record, as the host reads it (by default its `id`); undefined for no record. */
export const idOf = (host: Readers, record: unknown): Identity | undefined =>
  record === null || record === undefined ? undefined : (host.idOf ?? recordId)(record as never);

/**
 * The label a result gives a record, as the host reads it: by default its identity. A host whose identities
 * are not for people (UUIDs) gives its own (Glazecalc's is the name). The core only passes it back.
 */
export const labelOf = (host: Readers, record: unknown): Identity | undefined =>
  record === null || record === undefined ? undefined : host.labelOf ? host.labelOf(record) : idOf(host, record);

/** The ids a result keeps beside its labels, as a property that is not enumerable (swaps' from and to). */
export const IDS: unique symbol = Symbol('ids');

// Which records are the same material, as lines to add up: by default the same identity and the same
// chemistry, so two of one record's own analyses stay two lines.
const sameChemistry = (host: Readers, record: { fields?: unknown; loi?: unknown; percentmole?: unknown }): string =>
  JSON.stringify([
    idOf(host, record),
    ((record.fields ?? []) as { name: unknown; amount: unknown }[])
      .map((field) => [String(field.name), String(field.amount)])
      .sort(),
    String(record.loi ?? ''),
    String(record.percentmole ?? '')
  ]);

/** The key two records share when they are the same material, as lines to add up, as the host reads it. */
export const keyOf = (host: Readers, record: unknown): string =>
  host.keyOf ? host.keyOf(record) : sameChemistry(host, record as never);
