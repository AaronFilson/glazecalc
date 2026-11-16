/** The identity of a record (by default its `id`); undefined for no record. */
export function idOf(record: unknown): any;
/** Sets how the core reads a record's identity. */
export function setIdOf(read: (record: any) => unknown): void;
/** The key two records share when they are the same material, as lines to add up. */
export function keyOf(record: unknown): string;
/** Sets how the core reads which records are the same material. */
export function setKeyOf(read: (record: any) => string): void;
/** The label a result gives a record (by default its identity). */
export function labelOf(record: unknown): any;
/** Sets what a result calls a record. */
export function setLabelOf(read: (record: any) => unknown): void;
/** The ids a result keeps beside its labels, out of sight of JSON and Object.keys. */
export const IDS: unique symbol;
