// The standard library (data/), as the MCP tools read it: the materials and
// additives every installation ships with, found by name or alias the way the
// app finds them. Loaded once, on first use, and never changed.
import standardData from '../../data/index.js';
import type { AdditiveRecord, MaterialRecord } from '../../lib/recipe/index.js';

/** A standard record as stored, with the fields the tools show. */
export interface LibraryRecord extends MaterialRecord {
  _id?: unknown;
  rawformula?: string;
  aliases?: string[];
  notes?: string[];
  hazards?: string;
  manufacturer?: string;
  replaces?: string[];
  noChemistry?: boolean;
}

interface Library {
  materials: LibraryRecord[];
  additives: LibraryRecord[];
  byName: Map<string, LibraryRecord>;
  additiveByName: Map<string, LibraryRecord>;
  /** By the database id the app's shelf keeps for a standard record (client: libraryKey). */
  byId: Map<string, LibraryRecord>;
}

let loaded: Library | undefined;

/** A name as compared: case, accents, spaces and dashes do not matter. */
export const nameKey = (name: string): string =>
  name
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[\s\-_.,()'’]+/g, ' ')
    .trim();

const index = (records: LibraryRecord[]): Map<string, LibraryRecord> => {
  const map = new Map<string, LibraryRecord>();
  // Names first, so an alias never hides another record's own name.
  for (const record of records) map.set(nameKey(record.name), record);
  for (const record of records) {
    for (const alias of record.aliases ?? []) {
      const key = nameKey(alias);
      if (!map.has(key)) map.set(key, record);
    }
  }
  return map;
};

const library = (): Library => {
  if (!loaded) {
    // Without the database's _id: a tool shows names, never ids of shared records.
    const byId = new Map<string, LibraryRecord>();
    const strip = ({ _id: id, __v: _v, ownedBy: _owner, ...rest }: Record<string, unknown>) => {
      const record = rest as unknown as LibraryRecord;
      if (id) byId.set(String(id), record);
      return record;
    };
    const materials = standardData.load<Record<string, unknown>>('materials').map(strip);
    const additives = standardData.load<Record<string, unknown>>('additives').map(strip);
    loaded = { materials, additives, byName: index(materials), additiveByName: index(additives), byId };
  }
  return loaded;
};

/** Every standard material. */
export const standardMaterials = (): LibraryRecord[] => library().materials;

/** The standard material with this name or alias. */
export const findMaterial = (name: string): LibraryRecord | undefined => library().byName.get(nameKey(name));

/** The standard material or additive the app's shelf names by its id. */
export const findById = (id: string): LibraryRecord | undefined => library().byId.get(id);

/** The standard additive (colorant, opacifier) with this name or alias. */
export const findAdditive = (name: string): (LibraryRecord & AdditiveRecord) | undefined =>
  library().additiveByName.get(nameKey(name)) as (LibraryRecord & AdditiveRecord) | undefined;

/**
 * Standard materials (and additives, with `additives`) whose name, alias or
 * maker matches every word of the query, those whose name starts with it first.
 */
export const searchLibrary = (
  query: string,
  {
    limit = 20,
    additives = false,
    category,
    region
  }: { limit?: number; additives?: boolean; category?: string; region?: string } = {}
): Array<LibraryRecord & { kind: 'material' | 'additive' }> => {
  const words = nameKey(query).split(' ').filter(Boolean);
  const { materials, additives: extras } = library();
  const pool = [
    ...materials.map((record) => ({ ...record, kind: 'material' as const })),
    ...(additives ? extras.map((record) => ({ ...record, kind: 'additive' as const })) : [])
  ];
  const whole = nameKey(query);
  return pool
    .filter((record) => !category || record.category === category)
    .filter((record) => !region || !record.region?.length || record.region.includes(region))
    .filter((record) => {
      const text = nameKey([record.name, ...(record.aliases ?? []), record.manufacturer ?? ''].join(' '));
      return words.every((word) => text.includes(word));
    })
    .sort((a, b) => Number(nameKey(b.name).startsWith(whole)) - Number(nameKey(a.name).startsWith(whole)))
    .slice(0, limit);
};

/** A record's oxides as { oxide: amount } (weight percent, or moles in a formula). */
export const oxidesOf = (record: MaterialRecord): Record<string, number> =>
  Object.fromEntries((record.fields ?? []).map((field) => [field.name, Number(field.amount)]));
