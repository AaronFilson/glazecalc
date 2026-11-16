// How the core tells records apart (docs/adr/0030-nameless-chemistry-core.md). The core never reads
// what a record is called: it asks idOf for the record's identity, an opaque value it only compares
// and passes back in a result or a problem's values. By default that is the record's `id`. A host
// whose records have no ids yet sets its own (Glazecalc's, until its stored records have ids, is
// the record's name, so that the results stay the same).

/** A reader of something about a record; the core passes the records it was given. */
export type Reader<T> = (record: any) => T;

let current: Reader<unknown> = (record) => record.id;
// Which records are the same material, as lines to add up: by default the same identity and the same
// chemistry, so two of one record's own analyses stay two lines.
let currentKey: Reader<string> = (record) =>
  JSON.stringify([
    idOf(record),
    ((record.fields ?? []) as { name: unknown; amount: unknown }[])
      .map((field) => [String(field.name), String(field.amount)])
      .sort(),
    String(record.loi ?? ''),
    String(record.percentmole ?? '')
  ]);

/** The identity of a record (by default its `id`); undefined for no record. */
export const idOf = (record: unknown): any => (record === null || record === undefined ? undefined : current(record));

/** Sets how the core reads a record's identity. */
export const setIdOf = (read: Reader<unknown>): void => {
  if (typeof read !== 'function') throw new TypeError('setIdOf takes a function');
  current = read;
};

// What a result calls a record: by default its identity. A host whose identities are not for people
// (UUIDs) sets its own (Glazecalc's is the name). The core only passes it back.
let currentLabel: Reader<unknown> = (record) => idOf(record);

/** The label a result gives a record (by default its identity). */
export const labelOf = (record: unknown): any =>
  record === null || record === undefined ? undefined : currentLabel(record);

/** Sets what a result calls a record. */
export const setLabelOf = (read: Reader<unknown>): void => {
  if (typeof read !== 'function') throw new TypeError('setLabelOf takes a function');
  currentLabel = read;
};

/** The ids a result keeps beside its labels, as a property that is not enumerable (swaps' from and to). */
export const IDS: unique symbol = Symbol('ids');

/** The key two records share when they are the same material, as lines to add up. */
export const keyOf = (record: unknown): string => currentKey(record);

/** Sets how the core reads which records are the same material. */
export const setKeyOf = (read: Reader<string>): void => {
  if (typeof read !== 'function') throw new TypeError('setKeyOf takes a function');
  currentKey = read;
};
