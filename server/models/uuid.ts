// A record's UUID (docs/adr/0030-nameless-chemistry-core.md): its identity for the chemistry and across
// apps, given once and kept. A new record keeps one it brings (an account's own records imported again)
// only if no other record has it: a copy of a standard material, or of another record, carries that
// record's, and would be taken for it.
import { randomUUID } from 'node:crypto';
import type mongoose from 'mongoose';
import standardData from '../../data/index.js';

// The standard library's UUIDs (data/): a record that is not one of its own never has one of them, as a
// potter's copy of a standard material would.
let standardUuids: Set<string> | undefined;
const isStandardUuid = (uuid: string): boolean => {
  standardUuids ??= new Set(
    [...standardData.load('materials'), ...standardData.load('additives')]
      .map((record) => (record as { uuid?: unknown }).uuid)
      .filter((value): value is string => typeof value === 'string')
  );
  return standardUuids.has(uuid);
};

// No default: a record read without one (saved before UUIDs, until the migration gives it one) has none,
// rather than a new one at every read. A new record is given one as it is saved (keepUuidOwn).
export const uuidField = { uuid: { type: String } };

/** Gives a new record a UUID of its own when the one it brings is taken. */
export const keepUuidOwn = (schema: mongoose.Schema): void => {
  schema.index({ uuid: 1 });
  schema.pre('validate', async function () {
    if (!this.isNew) return;
    const uuid = this.get('uuid');
    if (typeof uuid !== 'string' || !uuid) {
      this.set('uuid', randomUUID());
      return;
    }
    const standard = this.get('ownedBy') === 'Standard';
    const Model = this.constructor as mongoose.Model<unknown>;
    if ((!standard && isStandardUuid(uuid)) || (await Model.exists({ uuid, _id: { $ne: this._id } }))) {
      this.set('uuid', randomUUID());
    }
  });
  // Several new records at once: no two keep the same one. (Mongoose's types leave out insertMany's
  // docs; this version passes them first, with no next.)
  const preInsertMany = schema.pre.bind(schema) as unknown as (
    hook: 'insertMany',
    run: (docs: unknown) => void
  ) => void;
  preInsertMany('insertMany', (docs) => {
    const seen = new Set<string>();
    for (const doc of Array.isArray(docs) ? (docs as Array<Record<string, unknown>>) : []) {
      const uuid = doc?.uuid;
      if (typeof uuid === 'string' && uuid) {
        if (seen.has(uuid)) doc.uuid = randomUUID();
        else seen.add(uuid);
      }
    }
  });
};
