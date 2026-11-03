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
