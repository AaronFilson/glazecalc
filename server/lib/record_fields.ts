// What a user may set on each kind of record they keep (`fields`), and what a
// new one must have (`required`): one list for the record routes
// (server/routes/records.ts) and the import of an account export
// (server/lib/import_data.ts), so the two never drift apart.

export interface RecordFields {
  fields: string[];
  required: string[];
}

export const RECORD_FIELDS = {
  recipes: {
    fields: [
      'title',
      'date',
      'notes',
      'materials',
      'additives',
      'computed',
      'includeAdditives',
      'firing',
      'firedAt',
      'foodSurface',
      'firings',
      'coneResults',
      'sgTarget'
    ],
    required: ['title', 'materials']
  },
  additives: {
    fields: [
      'name',
      'rawformula',
      'fields',
      'notes',
      'relatedTo',
      'percentmole',
      'loi',
      'molecularweight',
      'equivalent',
      'formulaweight',
      // A commercial stain, say: left out of the unity formula.
      'noChemistry'
    ],
    required: ['name', 'fields']
  },
  advice: { fields: ['title', 'content', 'tags'], required: ['title', 'content', 'tags'] },
  firing: {
    fields: ['title', 'kiln', 'date', 'notes', 'fieldsIncluded', 'rows'],
    required: ['title', 'fieldsIncluded', 'rows']
  },
  materials: {
    fields: [
      'name',
      'rawformula',
      'relatedTo',
      'notes',
      'fields',
      'percentmole',
      'loi',
      'molecularweight',
      'equivalent',
      'formulaweight'
    ],
    required: ['name', 'fields', 'formulaweight', 'loi', 'molecularweight', 'percentmole', 'equivalent']
  },
  notes: {
    fields: ['title', 'content', 'relatedCollection', 'relatedId'],
    required: ['content', 'relatedCollection', 'relatedId']
  }
} satisfies Record<string, RecordFields>;

export type RecordKind = keyof typeof RECORD_FIELDS;

/** Absent or empty. 0 is a value: a material's loss on ignition can be 0. */
export const missing = (value: unknown): boolean => value === undefined || value === null || value === '';

/**
 * The most a record of any kind holds, checked on every way one comes in: the
 * record routes, a token's change the person approves, the import. Without
 * them a record's lists (a recipe's lines, a firing log's rows) took anything:
 * 33,000 empty lines are 100 KB, sent as 165 bytes gzipped, and a few hundred
 * such recipes held the server's memory when the account's records were read.
 * Each is well past any real record: the largest real recipe is about 100 KB
 * (40 lines, each a copy of a library material, which nests 5 deep: the
 * record, its lines, a line, its oxides, an oxide), a firing log from an
 * assistant has up to 500 rows (server/mcp/tools/dictation_write.ts), a
 * recipe up to 200 firing links. `bytes` is more than the record routes take
 * at once (express.json's 100 KB), for a record that grew by many changes (a
 * recipe's firing links are added one at a time) and comes back in an import.
 */
export const RECORD_MOST = {
  /** Its JSON, in bytes. */
  bytes: 256 * 1024,
  /** Lists and objects within each other, the record itself counting as one (MongoDB stops at 100). */
  depth: 16,
  /** Items in one list, or keys in one object. */
  items: 1000,
  /** Characters in one text, or in a key. */
  chars: 100_000
} as const;

export type RecordLimit = keyof typeof RECORD_MOST;

/** The limit a value goes over, looking no deeper than RECORD_MOST.depth; null when it is within them. */
const overLimit = (value: unknown, level: number): RecordLimit | null => {
  if (typeof value === 'string') return value.length > RECORD_MOST.chars ? 'chars' : null;
  if (!value || typeof value !== 'object') return null;
  if (level > RECORD_MOST.depth) return 'depth';
  if (Array.isArray(value)) {
    if (value.length > RECORD_MOST.items) return 'items';
    for (const item of value) {
      const over = overLimit(item, level + 1);
      if (over) return over;
    }
    return null;
  }
  const keys = Object.keys(value);
  if (keys.length > RECORD_MOST.items) return 'items';
  for (const key of keys) {
    if (key.length > RECORD_MOST.chars) return 'chars';
    const over = overLimit((value as Record<string, unknown>)[key], level + 1);
    if (over) return over;
  }
  return null;
};

/**
 * The first of RECORD_MOST that a record's fields (or the fields a change
 * sets) go over, and the field it is in; null when they are within all of
 * them. Nesting is looked at only as deep as the limit, so however deep a
 * value goes, this answers rather than running out of stack.
 */
export const recordProblem = (fields: Record<string, unknown>): { limit: RecordLimit; field: string } | null => {
  for (const [field, value] of Object.entries(fields)) {
    const limit = overLimit(value, 2);
    if (limit) return { limit, field };
  }
  // Once the nesting is known to be shallow, the JSON can be written to be measured.
  if (Buffer.byteLength(JSON.stringify(fields)) <= RECORD_MOST.bytes) return null;
  const largest = Object.entries(fields)
    .map(([field, value]) => ({ field, bytes: Buffer.byteLength(JSON.stringify(value) ?? '') }))
    .sort((a, b) => b.bytes - a.bytes)[0];
  return { limit: 'bytes', field: largest?.field ?? '' };
};

/** RECORD_MOST's limit as a message gives it: bytes in KB. */
export const mostOf = (limit: RecordLimit): number =>
  limit === 'bytes' ? RECORD_MOST.bytes / 1024 : RECORD_MOST[limit];
