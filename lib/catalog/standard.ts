// The standard materials and additives every installation starts with (data/materials.ndjson and
// data/additives.ndjson, beside this file): one document per line (NDJSON), each id written as MongoDB Extended
// JSON writes one, { "$oid": "…" }. Reading them needs no database: an id comes back as its hex string, or as
// what the host makes of it (Glazecalc's data/index.js makes an ObjectId).

/** The collections with standard records, as their files are named. */
const STANDARD_COLLECTIONS: readonly ['materials', 'additives'] = Object.freeze(['materials', 'additives']);

/** The file of a collection's standard records, relative to this folder. */
const standardFile = (collection: (typeof STANDARD_COLLECTIONS)[number]): string => `data/${collection}.ndjson`;

const isOid = (value: unknown): value is { $oid: string } =>
  typeof value === 'object' &&
  value !== null &&
  Object.keys(value).length === 1 &&
  typeof (value as { $oid?: unknown }).$oid === 'string';

/**
 * The documents of an NDJSON text, one a line, blank lines skipped, with each { "$oid": hex } as reviveId(hex):
 * the hex string itself unless the host says otherwise.
 */
function readRecords<T = Record<string, unknown>>(
  text: string,
  reviveId: (hex: string) => unknown = (hex) => hex
): T[] {
  return text
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line, (_key, value: unknown) => (isOid(value) ? reviveId(value.$oid) : value)) as T);
}

export { STANDARD_COLLECTIONS, standardFile, readRecords };
