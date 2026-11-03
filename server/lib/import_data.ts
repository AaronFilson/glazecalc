// Importing an account export ("Download my data", server/lib/export_data.ts)
// into the signed-in account: server/routes/import_routes.ts.
//
// Only the records (recipes, materials, additives, firing logs, notes, advice)
// and, when the person asks, the preferences, prices and materials on hand are
// read from the file. Everything else in it (the account, sign-in methods,
// access tokens, share links, earlier versions, the activity log, the Trash) is
// never imported. Ids in the file are never trusted: every added record gets a
// new id and the signed-in account as its owner, and only the fields a user may
// set (server/lib/record_fields.ts) are kept.
//
// Each record of the file is, against the account's records of its kind:
//   - identical: the same content, ids aside. Skipped; links to it land on the account's.
//   - similar: the same name or title, other content. The person chooses for each:
//     keep both (added as new), skip (links land on the account's), or replace (the
//     account's record takes the file's content in place, its old version kept in its
//     history as for any edit, server/lib/record_history.ts saveVersion).
//   - new: added.
// Links between records (a recipe's materials and firing logs, a note's record,
// the prices' and the shelf's keys) are rewritten to the ids the records end up
// with.
//
// Everything is checked before anything is written; one bad record refuses the
// whole file, with a list of what is wrong. MongoDB runs standalone in
// production (deploy/compose.prod.yaml, no replica set), so there are no
// transactions: an ImportRun (server/models/import_run.ts) lists every id
// before the first insert, and a failure part way undoes exactly that, as
// "Undo this import" does within IMPORT_UNDO_HOURS.
import crypto from 'node:crypto';
import mongoose, { type Types } from 'mongoose';
import { isPrice } from '../../lib/recipe/cost.js';
import Additive from '../models/additive.ts';
import Advice from '../models/advice.ts';
import Firing from '../models/firing.ts';
import ImportRun, { IMPORT_UNDO_HOURS } from '../models/import_run.ts';
import Material from '../models/material.ts';
import Note from '../models/note.ts';
import Recipe from '../models/recipe.ts';
import RecordVersion from '../models/record_version.ts';
import Trash from '../models/trash.ts';
import User, { PREFERENCES, SHELF_KEY_LONGEST, SHELF_MOST, type Price, type UserDocument } from '../models/user.ts';
import { EXPORT_VERSION } from './export_data.ts';
import { accountRecords, ACCOUNT_RECORDS_MOST, type RecordModel } from './guest_limits.ts';
import * as log from './log.ts';
import { say } from './messages.ts';
import { missing, RECORD_FIELDS, type RecordKind } from './record_fields.ts';
import { saveVersion, titleOf } from './record_history.ts';
import { setShelf } from './shelf.ts';
import { standardSet } from './standard_library.ts';

type Row = Record<string, unknown>;

/** The most records one file may hold, of every kind together (owner decision, round 12). */
export const IMPORT_RECORDS_MOST = 20_000;
/** The largest body the import routes take; nginx allows the same on these paths (deploy/nginx). */
export const IMPORT_BODY_LIMIT = '20mb';
/** As PUT /api/prices (server/routes/user_routes.ts). */
const PRICES_MOST = 1000;
/** Problems listed when a file is refused. */
const PROBLEMS_LISTED = 50;

/**
 * The kinds imported, in the order their ids are settled: those a recipe or a
 * note links to first.
 */
export const IMPORT_KINDS: RecordKind[] = ['materials', 'additives', 'firing', 'advice', 'recipes', 'notes'];
const MODELS: Record<RecordKind, RecordModel> = {
  additives: Additive,
  advice: Advice,
  firing: Firing,
  materials: Material,
  notes: Note,
  recipes: Recipe
};
/** The kinds a note can be about (its relatedCollection), whose relatedId is an id to rewrite. */
const NOTE_TARGETS: RecordKind[] = ['recipes', 'materials', 'additives', 'firing'];

export type Choice = 'both' | 'skip' | 'replace';
export const CHOICES: readonly Choice[] = ['both', 'skip', 'replace'];
export interface Include {
  preferences?: boolean;
  prices?: boolean;
  shelf?: boolean;
}

/** What the person sends: the file as it was downloaded, the choice for each similar record, and what else to take. */
export interface ImportRequest {
  file: unknown;
  /** By `${kind}:${index}`; a similar record without one is kept alongside ('both'). */
  choices?: Record<string, Choice>;
  include?: Include;
}

export interface Problem {
  kind: string;
  index: number;
  title?: string;
  /** 'not-object', 'missing' (a field it must have) or 'invalid' (a field of the wrong shape). */
  reason: 'not-object' | 'missing' | 'invalid';
  field?: string;
}

/** A record of the file whose name matches one of the account's, with other content. */
export interface Similar {
  kind: RecordKind;
  index: number;
  title: string;
  existingId: string;
  existingTitle: string;
}

type Status = 'new' | 'identical' | 'similar';
interface Prepared {
  kind: RecordKind;
  index: number;
  oldId?: string;
  doc: Row;
  status: Status;
  existingId?: string;
}

export interface Counts {
  inFile: number;
  new: number;
  identical: number;
  similar: number;
}

/** What a warning is about, and how many times it came up. */
export type WarningCode = 'line-unlinked' | 'firing-link-dropped' | 'note-unlinked' | 'key-dropped';

/** What the routes answer: a status and a body. */
export interface Reply {
  status: number;
  body: Row;
}

const isObject = (value: unknown): value is Row => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

/** A copy of the row without these keys. */
const without = (row: Row, keys: string[]): Row =>
  Object.fromEntries(Object.entries(row).filter(([key]) => !keys.includes(key)));

const pick = (source: Row, fields: string[]): Row =>
  Object.fromEntries(fields.filter((field) => source[field] !== undefined).map((field) => [field, source[field]]));

/** A name or title as compared for "the same name": case, spacing and width folded. */
const folded = (record: Row): string =>
  (titleOf(record) ?? '').normalize('NFKC').toLocaleLowerCase('en').replace(/\s+/g, ' ').trim();

/** Upgrades a file of an earlier version, one version at a time. None yet: version 1 is the first. */
const UPGRADES: Record<number, (file: Row) => Row> = {};

/** The value with ids, owners and empty values taken out, and keys in order, for comparing content. */
const canonical = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonical);
  if (value instanceof Date) return value.toISOString();
  if (value instanceof mongoose.Types.ObjectId) return String(value);
  if (isObject(value)) {
    const out: Row = {};
    for (const key of Object.keys(value).sort()) {
      if (key === '_id' || key === 'ownedBy' || key === '__v') continue;
      const inner = canonical(value[key]);
      if (inner === undefined || inner === null || inner === '' || (Array.isArray(inner) && !inner.length)) continue;
      out[key] = inner;
    }
    return out;
  }
  return value;
};

/**
 * A fingerprint of a record's content: its fields as the schema gives them
 * (defaults and cleaning applied), without ids, and without the links that
 * name another record by id (a recipe's firing logs, a note's record), whose
 * ids differ from account to account.
 */
const fingerprint = (kind: RecordKind, record: Row): string => {
  const Model = MODELS[kind];
  const doc = pick(new Model({ ...pick(record, RECORD_FIELDS[kind].fields), ownedBy: 'x' }).toObject() as Row, [
    ...RECORD_FIELDS[kind].fields
  ]);
  if (kind === 'recipes' && Array.isArray(doc.firings)) {
    doc.firings = (doc.firings as Row[]).map((link) => (isObject(link) ? { ...link, firing: undefined } : link));
  }
  if (kind === 'notes' && NOTE_TARGETS.includes(doc.relatedCollection as RecordKind)) doc.relatedId = undefined;
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(canonical(doc)))
    .digest('base64');
};

/** The first problem of a record, or null when it can be saved. */
const problemOf = async (kind: RecordKind, record: unknown, index: number): Promise<Problem | null> => {
  if (!isObject(record)) return { kind, index, reason: 'not-object' };
  const title = titleOf(record);
  const { fields, required } = RECORD_FIELDS[kind];
  const lacking = required.find((field) => missing(record[field]));
  if (lacking) return { kind, index, title, reason: 'missing', field: lacking };
  try {
    await new MODELS[kind]({ ...pick(record, fields), ownedBy: 'x' }).validate();
  } catch (err) {
    const field = Object.keys((err as { errors?: Row }).errors ?? {})[0];
    return { kind, index, title, reason: 'invalid', ...(field && { field: field.split('.')[0] }) };
  }
  return null;
};

/** The file, upgraded to EXPORT_VERSION, or the refusal to send. */
const readFile = (file: unknown): { file: Row; version: number } | Reply => {
  if (!isObject(file) || file.format !== 'glazecalc-export' || !isObject(file.records)) {
    return { status: 400, body: say('import-not-export') };
  }
  const version = file.version;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return { status: 400, body: say('import-not-export') };
  }
  if (version > EXPORT_VERSION) return { status: 422, body: say('import-newer') };
  let upgraded = file;
  for (let v = version; v < EXPORT_VERSION; v++) upgraded = UPGRADES[v]?.(upgraded) ?? upgraded;
  return { file: upgraded, version };
};

/** The ids of the Standard materials and additives: keys and links that stay as they are. */
const standardIds = async (): Promise<Set<string>> => {
  const sets = await Promise.all([standardSet(Material), standardSet(Additive)]);
  return new Set(sets.flatMap((set) => set.rows.map((row) => String(row._id))));
};

interface Analysis {
  version: number;
  prepared: Prepared[];
  counts: Record<string, Counts>;
  similar: Similar[];
  file: Row;
}

/** Reads and checks the file, and compares each record with the account's; nothing is written. */
const analyse = async (userId: string, given: unknown): Promise<Analysis | Reply> => {
  const read = readFile(given);
  if ('status' in read) return read;
  const { file, version } = read;
  const records = file.records as Row;
  const lists = Object.fromEntries(
    IMPORT_KINDS.map((kind) => [kind, Array.isArray(records[kind]) ? (records[kind] as unknown[]) : []])
  ) as Record<RecordKind, unknown[]>;
  const total = IMPORT_KINDS.reduce((sum, kind) => sum + lists[kind].length, 0);
  if (total > IMPORT_RECORDS_MOST) {
    return { status: 413, body: say('import-too-many', { most: IMPORT_RECORDS_MOST, count: total }) };
  }
  const problems: Problem[] = [];
  for (const kind of IMPORT_KINDS) {
    for (const [index, record] of lists[kind].entries()) {
      const problem = await problemOf(kind, record, index);
      if (problem) problems.push(problem);
    }
  }
  if (problems.length) {
    return {
      status: 422,
      body: say('import-invalid', { count: problems.length }, { problems: problems.slice(0, PROBLEMS_LISTED) })
    };
  }
  const prepared: Prepared[] = [];
  const counts: Record<string, Counts> = {};
  const similar: Similar[] = [];
  for (const kind of IMPORT_KINDS) {
    const list = lists[kind] as Row[];
    counts[kind] = { inFile: list.length, new: 0, identical: 0, similar: 0 };
    if (!list.length) continue;
    const fields = RECORD_FIELDS[kind].fields;
    const existing = (await MODELS[kind]
      .find({ ownedBy: userId }, Object.fromEntries(fields.map((field) => [field, 1])))
      .sort({ _id: 1 })
      .lean()) as Row[];
    const byPrint = new Map<string, string>();
    const byName = new Map<string, Row>();
    for (const record of existing) {
      const print = fingerprint(kind, record);
      if (!byPrint.has(print)) byPrint.set(print, String(record._id));
      const name = folded(record);
      if (name && !byName.has(name)) byName.set(name, record);
    }
    list.forEach((record, index) => {
      const oldId = mongoose.isValidObjectId(record._id) ? String(record._id) : undefined;
      const doc = pick(record, fields);
      const same = byPrint.get(fingerprint(kind, record));
      const named = byName.get(folded(record));
      if (same) {
        counts[kind]!.identical++;
        prepared.push({ kind, index, oldId, doc, status: 'identical', existingId: same });
      } else if (named) {
        counts[kind]!.similar++;
        prepared.push({ kind, index, oldId, doc, status: 'similar', existingId: String(named._id) });
        similar.push({
          kind,
          index,
          title: titleOf(record) ?? '',
          existingId: String(named._id),
          existingTitle: titleOf(named) ?? ''
        });
      } else {
        counts[kind]!.new++;
        prepared.push({ kind, index, oldId, doc, status: 'new' });
      }
    });
  }
  return { version, prepared, counts, similar, file };
};

/** What happens to each record: added with a new id, left out for the account's, or the account's replaced. */
type Fate = { action: 'add'; id: Types.ObjectId } | { action: 'skip'; id: string } | { action: 'replace'; id: string };

const fateOf = (record: Prepared, choices: Record<string, Choice>): Fate => {
  if (record.status === 'identical') return { action: 'skip', id: record.existingId! };
  if (record.status === 'similar') {
    const choice = choices[`${record.kind}:${record.index}`];
    if (choice === 'skip') return { action: 'skip', id: record.existingId! };
    if (choice === 'replace') return { action: 'replace', id: record.existingId! };
  }
  return { action: 'add', id: new mongoose.Types.ObjectId() };
};

interface Plan {
  writes: Array<{ record: Prepared; fate: Fate; doc: Row }>;
  warnings: Partial<Record<WarningCode, number>>;
  idMap: Record<RecordKind, Map<string, string>>;
}

/** Each record's fate, and its links rewritten to the ids the records end up with. */
const planOf = (analysis: Analysis, choices: Record<string, Choice>, standard: Set<string>): Plan => {
  const warnings: Partial<Record<WarningCode, number>> = {};
  const warn = (code: WarningCode) => (warnings[code] = (warnings[code] ?? 0) + 1);
  const idMap = Object.fromEntries(IMPORT_KINDS.map((kind) => [kind, new Map<string, string>()])) as Record<
    RecordKind,
    Map<string, string>
  >;
  const fates = analysis.prepared.map((record) => {
    const fate = fateOf(record, choices);
    if (record.oldId) idMap[record.kind].set(record.oldId, String(fate.id));
    return fate;
  });
  const lineId = (line: unknown): unknown => {
    if (!isObject(line)) return line;
    // The line is a copy of the material: never the other account's owner or bookkeeping.
    const own = without(line, ['ownedBy', '__v']);
    if (own._id === undefined) return own;
    const old = String(own._id);
    const mapped = idMap.materials.get(old) ?? idMap.additives.get(old);
    if (mapped) return { ...own, _id: mapped };
    if (standard.has(old)) return own;
    // An own material this file does not hold: the line keeps its copy of the chemistry, without the link.
    warn('line-unlinked');
    return without(own, ['_id']);
  };
  const writes = analysis.prepared.map((record, i) => {
    const doc: Row = { ...record.doc };
    if (record.kind === 'recipes') {
      for (const lines of ['materials', 'additives']) {
        if (Array.isArray(doc[lines])) doc[lines] = (doc[lines] as unknown[]).map(lineId);
      }
      if (Array.isArray(doc.firings)) {
        doc.firings = (doc.firings as Row[]).flatMap((link) => {
          const mapped = isObject(link) ? idMap.firing.get(String(link.firing)) : undefined;
          if (mapped) return [{ ...link, firing: mapped }];
          warn('firing-link-dropped');
          return [];
        });
      }
    }
    if (record.kind === 'notes' && NOTE_TARGETS.includes(doc.relatedCollection as RecordKind)) {
      const target = doc.relatedCollection as RecordKind;
      const mapped = idMap[target].get(String(doc.relatedId));
      if (mapped) doc.relatedId = mapped;
      else if (!standard.has(String(doc.relatedId))) {
        // About a record this file does not hold: kept, as a general note, rather than lost.
        warn('note-unlinked');
        doc.relatedCollection = 'Notes';
        doc.relatedId = 'general notes';
      }
    }
    return { record, fate: fates[i]!, doc };
  });
  return { writes, warnings, idMap };
};

/** A price or shelf key with the file's own ids rewritten; null for an id of a record the file does not hold. */
const keyFor = (key: string, idMap: Plan['idMap'], standard: Set<string>): string | null => {
  const mapped = idMap.materials.get(key) ?? idMap.additives.get(key);
  if (mapped) return mapped;
  if (key.startsWith('name:') || standard.has(key) || !mongoose.isValidObjectId(key)) return key;
  return null;
};

const filePrices = (file: Row): Price[] =>
  (Array.isArray(file.prices) ? (file.prices as unknown[]) : []).filter((entry): entry is Price => {
    const { key, perKg } = (entry ?? {}) as Partial<Price>;
    return typeof key === 'string' && key !== '' && key.length <= SHELF_KEY_LONGEST && isPrice(perKg);
  });

const fileShelf = (file: Row): string[] =>
  (Array.isArray(file.shelf) ? (file.shelf as unknown[]) : []).filter(
    (key): key is string => typeof key === 'string' && key !== '' && key.length <= SHELF_KEY_LONGEST
  );

/** The file's preferences that the account can take: known keys with one of their choices. */
const filePreferences = (file: Row): Row => {
  const given = isObject(file.preferences) ? file.preferences : {};
  return Object.fromEntries(
    Object.entries(given).filter(
      ([key, value]) =>
        key in PREFERENCES && (PREFERENCES[key as keyof typeof PREFERENCES] as readonly unknown[]).includes(value)
    )
  );
};

const choicesIn = (given: unknown): Record<string, Choice> =>
  isObject(given)
    ? (Object.fromEntries(Object.entries(given).filter(([, choice]) => CHOICES.includes(choice as Choice))) as Record<
        string,
        Choice
      >)
    : {};

/** How many records the import would add. */
const addedCount = (plan: Plan): number => plan.writes.filter((write) => write.fate.action === 'add').length;

/** Room left under the account's limit, counted up to it. */
const roomLeft = async (userId: string): Promise<number> => {
  const most = Number(process.env.ACCOUNT_MAX_RECORDS) || ACCOUNT_RECORDS_MOST;
  return most - (await accountRecords(userId, most));
};

/** POST /api/import/preview: what the import would do, writing nothing. */
export const previewImport = async (user: UserDocument, request: ImportRequest): Promise<Reply> => {
  const userId = String(user._id);
  const analysis = await analyse(userId, request.file);
  if ('status' in analysis) return analysis;
  const plan = planOf(analysis, choicesIn(request.choices), await standardIds());
  const room = await roomLeft(userId);
  const adding = addedCount(plan);
  return {
    status: 200,
    body: {
      version: analysis.version,
      counts: analysis.counts,
      similar: analysis.similar,
      warnings: plan.warnings,
      preferences: Object.keys(filePreferences(analysis.file)).length,
      prices: filePrices(analysis.file).length,
      shelf: fileShelf(analysis.file).length,
      accountHasPrices: Boolean(user.prices?.length),
      adding,
      roomLeft: room,
      fits: adding <= room
    }
  };
};

/** What one import did, as kept for its Undo (models/import_run.ts). */
interface RunRecord {
  _id: Types.ObjectId;
  ownedBy: string;
  added: Record<string, Array<string | Types.ObjectId>>;
  replaced: Array<{ kind: string; recordId: Types.ObjectId; versionId?: Types.ObjectId }>;
  before: { preferences?: Row; prices?: Price[]; shelf?: string[] };
}

/**
 * Takes an import back: removes the records it added (from their lists and
 * from the Trash), puts each record it replaced back as it was, and the
 * preferences, prices and shelf as they were if it changed them.
 */
const undoRun = async (run: RunRecord): Promise<void> => {
  const ownedBy = run.ownedBy;
  for (const kind of IMPORT_KINDS) {
    const ids = (run.added[kind] ?? []).map(String);
    if (!ids.length) continue;
    await MODELS[kind].deleteMany({ ownedBy, _id: { $in: ids } });
    await Trash.deleteMany({ ownedBy, recordId: { $in: ids } });
    await RecordVersion.deleteMany({ ownedBy, recordId: { $in: ids } });
  }
  for (const { kind, recordId, versionId } of run.replaced) {
    const version = versionId ? await RecordVersion.findOne({ _id: versionId, ownedBy }).lean() : null;
    if (!version) continue;
    const earlier = without(version.record as Row, ['_id', 'ownedBy']);
    const Model = MODELS[kind as RecordKind];
    const before = await Model.findOneAndReplace(
      { _id: recordId, ownedBy },
      { ...earlier, ownedBy },
      { returnDocument: 'before', lean: true }
    );
    if (before) await saveVersion(kind, before as Row & { _id: Types.ObjectId }, 'session', { replacing: versionId });
  }
  const { preferences, prices, shelf } = run.before;
  if (preferences || prices) {
    await User.updateOne(
      { _id: ownedBy },
      { $set: { ...(preferences && { preferences }), ...(prices && { prices }) } }
    );
  }
  if (shelf) await setShelf(ownedBy, shelf);
};

/** Accounts with an import under way, and since when: one at a time each. */
const running = new Map<string, number>();
const RUNNING_MS = 10 * 60 * 1000;

/** POST /api/import: the import itself. */
export const runImport = async (user: UserDocument, request: ImportRequest, now = new Date()): Promise<Reply> => {
  const userId = String(user._id);
  const since = running.get(userId);
  if (since && now.getTime() - since < RUNNING_MS) return { status: 409, body: say('import-busy') };
  running.set(userId, now.getTime());
  try {
    return await importLocked(user, request, now);
  } finally {
    running.delete(userId);
  }
};

const importLocked = async (user: UserDocument, request: ImportRequest, now: Date): Promise<Reply> => {
  const userId = String(user._id);
  const analysis = await analyse(userId, request.file);
  if ('status' in analysis) return analysis;
  const standard = await standardIds();
  const plan = planOf(analysis, choicesIn(request.choices), standard);
  const room = await roomLeft(userId);
  const adding = addedCount(plan);
  if (adding > room) return { status: 413, body: say('import-over-limit', { count: adding, room }) };

  const include = isObject(request.include) ? (request.include as Include) : {};
  const account = await User.findById(userId, { preferences: 1, prices: 1, shelf: 1 }).lean();
  const changes: Row = {};
  const before: RunRecord['before'] = {};
  const preferences = include.preferences ? filePreferences(analysis.file) : {};
  if (Object.keys(preferences).length) {
    before.preferences = (account?.preferences ?? {}) as Row;
    changes.preferences = { ...before.preferences, ...preferences };
  }
  if (include.prices) {
    const byKey = new Map((account?.prices ?? []).map(({ key, perKg }) => [key, perKg]));
    let taken = 0;
    for (const { key, perKg } of filePrices(analysis.file)) {
      const mapped = keyFor(key, plan.idMap, standard);
      if (mapped === null) {
        plan.warnings['key-dropped'] = (plan.warnings['key-dropped'] ?? 0) + 1;
      } else if (byKey.has(mapped) || byKey.size < PRICES_MOST) {
        // The file's price wins for a material priced in both.
        byKey.set(mapped, perKg);
        taken++;
      }
    }
    if (taken) {
      before.prices = (account?.prices ?? []).map(({ key, perKg }) => ({ key, perKg }));
      changes.prices = [...byKey].map(([key, perKg]) => ({ key, perKg }));
    }
  }
  let shelf: string[] | null = null;
  if (include.shelf) {
    const have = account?.shelf ?? [];
    const keys = new Set(have);
    for (const key of fileShelf(analysis.file)) {
      const mapped = keyFor(key, plan.idMap, standard);
      if (mapped === null) plan.warnings['key-dropped'] = (plan.warnings['key-dropped'] ?? 0) + 1;
      else if (keys.size < SHELF_MOST) keys.add(mapped);
    }
    if (keys.size > have.length) {
      before.shelf = have;
      shelf = [...keys];
    }
  }

  const added: Record<string, Types.ObjectId[]> = {};
  const counts: Record<string, { added: number; replaced: number; skipped: number }> = {};
  for (const kind of IMPORT_KINDS) counts[kind] = { added: 0, replaced: 0, skipped: 0 };
  for (const { record, fate } of plan.writes) {
    if (fate.action === 'add') (added[record.kind] ??= []).push(fate.id);
    counts[record.kind]![fate.action === 'add' ? 'added' : fate.action === 'replace' ? 'replaced' : 'skipped']++;
  }
  const run: RunRecord = { _id: new mongoose.Types.ObjectId(), ownedBy: userId, added, replaced: [], before };
  // Every id it will add, written before the first record, so a failure part way is undone exactly.
  await ImportRun.create({
    _id: run._id,
    ownedBy: userId,
    createdAt: now,
    expiresAt: new Date(now.getTime() + IMPORT_UNDO_HOURS * 60 * 60 * 1000),
    added,
    before,
    counts
  });
  try {
    for (const kind of IMPORT_KINDS) {
      const docs = plan.writes
        .filter(({ record, fate }) => record.kind === kind && fate.action === 'add')
        .map(({ fate, doc }) => ({ ...doc, _id: fate.id, ownedBy: userId }));
      if (docs.length) await MODELS[kind].insertMany(docs, { ordered: true });
    }
    for (const { record, fate, doc } of plan.writes) {
      if (fate.action !== 'replace') continue;
      const kind = record.kind;
      const unset = RECORD_FIELDS[kind].fields.filter((field) => doc[field] === undefined);
      const replaced = await MODELS[kind].findOneAndUpdate(
        { _id: fate.id, ownedBy: userId },
        { $set: doc, ...(unset.length && { $unset: Object.fromEntries(unset.map((field) => [field, 1])) }) },
        { runValidators: true, returnDocument: 'before', lean: true }
      );
      // Removed meanwhile: nothing to replace, and nothing to put back.
      if (!replaced) continue;
      await saveVersion(kind, replaced as Row & { _id: Types.ObjectId }, 'session', { now });
      const version = await RecordVersion.findOne({ ownedBy: userId, recordId: fate.id })
        .sort({ savedAt: -1, _id: -1 })
        .select({ _id: 1 })
        .lean();
      run.replaced.push({ kind, recordId: new mongoose.Types.ObjectId(fate.id), versionId: version?._id });
    }
    if (Object.keys(changes).length) await User.updateOne({ _id: userId }, { $set: changes });
    if (shelf) await setShelf(userId, shelf);
    await ImportRun.updateOne({ _id: run._id }, { $set: { replaced: run.replaced } });
  } catch (err) {
    log.error('Import failed, taking it back', { code: log.codeOf(err) });
    await undoRun(run).catch((undoErr: unknown) =>
      log.error('Could not take back a failed import', { code: log.codeOf(undoErr) })
    );
    await ImportRun.deleteOne({ _id: run._id }).catch(() => undefined);
    return { status: 500, body: say('import-failed') };
  }
  return {
    status: 200,
    body: {
      ...say('import-done'),
      importId: String(run._id),
      undoUntil: new Date(now.getTime() + IMPORT_UNDO_HOURS * 60 * 60 * 1000).toISOString(),
      counts,
      warnings: plan.warnings,
      preferences: Boolean(changes.preferences),
      prices: Boolean(changes.prices),
      shelf: Boolean(shelf)
    }
  };
};

/** POST /api/import/undo/:id: takes back one of the account's imports, within IMPORT_UNDO_HOURS. */
export const undoImport = async (user: UserDocument, id: string, now = new Date()): Promise<Reply> => {
  if (!mongoose.isValidObjectId(id)) return { status: 404, body: say('import-undo-gone') };
  const ownedBy = String(user._id);
  // Claimed and removed in one step, so two Undos at once take it back once.
  const run = (await ImportRun.findOneAndDelete({ _id: id, ownedBy, expiresAt: { $gt: now } }).lean()) as
    (RunRecord & Row) | null;
  if (!run) return { status: 404, body: say('import-undo-gone') };
  await undoRun({
    _id: run._id,
    ownedBy,
    added: (run.added ?? {}) as RunRecord['added'],
    replaced: (run.replaced ?? []) as RunRecord['replaced'],
    before: (run.before ?? {}) as RunRecord['before']
  });
  return { status: 200, body: say('import-undone') };
};

/** For tests: forgets the imports under way. */
export const forgetRunning = (): void => running.clear();
