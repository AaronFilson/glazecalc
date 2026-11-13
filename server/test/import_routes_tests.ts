import type { RecordModel } from '../lib/guest_limits.ts';
import { forgetRunning, IMPORT_RECORDS_MOST } from '../lib/import_data.ts';
import { RECORD_MOST } from '../lib/record_fields.ts';
import Firing from '../models/firing.ts';
import ImportRun from '../models/import_run.ts';
import Material from '../models/material.ts';
import Note from '../models/note.ts';
import Recipe from '../models/recipe.ts';
import RecordVersion from '../models/record_version.ts';
import User from '../models/user.ts';
import { api, expect, makeUser, sessionToken } from './support/app.ts';
import { makeToken } from './support/tokens.ts';

type TestUser = Awaited<ReturnType<typeof makeUser>>;
type Row = Record<string, unknown>;

const post = (path: string, token: string, body: unknown) =>
  api()
    .post(path)
    .set('Authorization', 'Bearer ' + token)
    .send(body as object);
const exportOf = async (token: string): Promise<Row> =>
  (
    await api()
      .get('/export')
      .set('Authorization', 'Bearer ' + token)
  ).body as Row;

/** A record's content without ids and owners, as two accounts' copies compare. */
const content = (record: Row): Row => {
  // Ids at every depth: a recipe line's copy of its material drops the other account's owner too.
  const dropped = new Set(['_id', '__v', 'firing', 'ownedBy', 'relatedId', 'rev', 'updatedAt']);
  return JSON.parse(JSON.stringify(record, (key, value) => (dropped.has(key) ? undefined : value)));
};

const material = (ownedBy: string, name = 'My whiting') =>
  Material.create({
    name,
    ownedBy,
    rawformula: 'CaCO3',
    fields: [{ name: 'CaO', amount: '1' }],
    equivalent: 100,
    formulaweight: 56,
    loi: 44,
    molecularweight: 100,
    percentmole: 'molecular'
  });

describe('import API', () => {
  let alice: TestUser;
  let bob: TestUser;
  let ids: { material: string; firing: string; recipe: string };

  beforeEach(async () => {
    forgetRunning();
    [alice, bob] = await Promise.all([makeUser(), makeUser()]);
    const owner = String(alice.user._id);
    const whiting = await material(owner);
    const log = await Firing.create({ title: 'Cone 6 glaze', ownedBy: owner, fieldsIncluded: ['time'], rows: [] });
    const recipe = await Recipe.create({
      title: 'Satin white',
      ownedBy: owner,
      notes: ['fires satin'],
      materials: [{ _id: String(whiting._id), name: 'My whiting', amount: '20', ownedBy: owner }],
      additives: [],
      firings: [{ firing: String(log._id), result: 'good' }]
    });
    await Note.create({
      content: 'Sieve twice',
      ownedBy: owner,
      relatedCollection: 'recipes',
      relatedId: String(recipe._id)
    });
    await User.updateOne(
      { _id: alice.user._id },
      {
        preferences: { theme: 'dark', currency: 'EUR' },
        shelf: [String(whiting._id), 'name:Silica'],
        prices: [
          { key: String(whiting._id), perKg: 1.5 },
          { key: 'name:Silica', perKg: 0.5 }
        ]
      }
    );
    ids = { material: String(whiting._id), firing: String(log._id), recipe: String(recipe._id) };
  });

  it('carries every record into another account, its links pointing at the new records', async () => {
    const file = await exportOf(alice.token);
    const preview = await post('/import/preview', bob.token, { file });
    expect(preview).to.have.status(200);
    expect(preview.body.counts.recipes).to.eql({ inFile: 1, new: 1, identical: 0, similar: 0 });
    expect(preview.body).to.include({ adding: 4, fits: true, prices: 2, shelf: 2, preferences: 2 });
    expect(await Recipe.countDocuments({ ownedBy: String(bob.user._id) })).to.equal(0);

    const res = await post('/import', bob.token, { file, include: { preferences: true, prices: true, shelf: true } });
    expect(res).to.have.status(200);
    expect(res.body.code).to.equal('import-done');
    expect(res.body.counts.recipes).to.eql({ added: 1, replaced: 0, skipped: 0 });

    const owner = String(bob.user._id);
    const [mat, log, recipe, note] = await Promise.all([
      Material.findOne({ ownedBy: owner }).lean(),
      Firing.findOne({ ownedBy: owner }).lean(),
      Recipe.findOne({ ownedBy: owner }).lean(),
      Note.findOne({ ownedBy: owner }).lean()
    ]);
    expect(String(mat!._id)).to.not.equal(ids.material);
    expect((recipe!.materials as Row[])[0]!._id).to.equal(String(mat!._id));
    expect((recipe!.materials as Row[])[0]).to.not.have.property('ownedBy');
    expect(recipe!.firings![0]!.firing).to.equal(String(log!._id));
    expect(note!.relatedId).to.equal(String(recipe!._id));
    const user = await User.findById(bob.user._id).lean();
    expect(user!.preferences).to.include({ theme: 'dark', currency: 'EUR' });
    expect(user!.prices).to.deep.include({ key: String(mat!._id), perKg: 1.5 });
    expect(user!.shelf).to.eql([String(mat!._id), 'name:Silica']);

    // The two accounts' exports hold the same records, ids aside.
    const theirs = (await exportOf(bob.token)).records as Record<string, Row[]>;
    const mine = file.records as Record<string, Row[]>;
    for (const kind of ['materials', 'firing', 'recipes', 'notes']) {
      expect(theirs[kind]!.map(content), kind).to.eql(mine[kind]!.map(content));
    }
  });

  it('adds records at rev 0 and counts the changes it makes to the preferences and prices', async () => {
    const file = await exportOf(alice.token);
    await post('/import', bob.token, { file, include: { preferences: true, prices: true } });
    const added = await Recipe.findOne({ ownedBy: String(bob.user._id) }).lean();
    expect(added!.rev).to.equal(0);
    expect(added!.updatedAt).to.be.instanceOf(Date);
    const user = (await User.findById(bob.user._id).lean()) as unknown as { prefsRev?: number; pricesRev?: number };
    expect([user.prefsRev, user.pricesRev]).to.eql([1, 1]);
  });

  it('adds nothing when the same file is imported twice', async () => {
    const file = await exportOf(alice.token);
    await post('/import', bob.token, { file });
    const preview = await post('/import/preview', bob.token, { file });
    expect(preview.body.counts.recipes).to.eql({ inFile: 1, new: 0, identical: 1, similar: 0 });
    expect(preview.body.adding).to.equal(0);
    const again = await post('/import', bob.token, { file });
    expect(again.body.counts.recipes).to.eql({ added: 0, replaced: 0, skipped: 1 });
    expect(await Recipe.countDocuments({ ownedBy: String(bob.user._id) })).to.equal(1);
    // Importing into the account it came from adds nothing either.
    await post('/import', alice.token, { file });
    expect(await Recipe.countDocuments({ ownedBy: String(alice.user._id) })).to.equal(1);
  });

  describe('a record with the name of one in the account but other content', () => {
    let file: Row;
    let bobRecipe: string;
    beforeEach(async () => {
      file = await exportOf(alice.token);
      await post('/import', bob.token, { file });
      bobRecipe = String((await Recipe.findOne({ ownedBy: String(bob.user._id) }).lean())!._id);
      const changed = structuredClone(file) as { records: { recipes: Row[] } };
      changed.records.recipes[0]!.notes = ['fires glossy'];
      changed.records.recipes[0]!.title = '  SATIN white';
      file = changed;
    });

    it('is listed in the preview for the person to choose', async () => {
      const preview = await post('/import/preview', bob.token, { file });
      expect(preview.body.counts.recipes).to.eql({ inFile: 1, new: 0, identical: 0, similar: 1 });
      expect(preview.body.similar).to.eql([
        { kind: 'recipes', index: 0, title: '  SATIN white', existingId: bobRecipe, existingTitle: 'Satin white' }
      ]);
      // The material and the firing log are the same, so they are skipped.
      expect(preview.body.counts.materials.identical).to.equal(1);
    });

    it('is kept alongside when no choice is sent, or "both"', async () => {
      await post('/import', bob.token, { file, choices: { 'recipes:0': 'both' } });
      expect(await Recipe.countDocuments({ ownedBy: String(bob.user._id) })).to.equal(2);
    });

    it('is left out on "skip"', async () => {
      const res = await post('/import', bob.token, { file, choices: { 'recipes:0': 'skip' } });
      expect(res.body.counts.recipes).to.eql({ added: 0, replaced: 0, skipped: 1 });
      expect((await Recipe.findById(bobRecipe).lean())!.notes).to.eql(['fires satin']);
    });

    it('replaces the account\'s record in place on "replace", keeping its old version in the history', async () => {
      const res = await post('/import', bob.token, { file, choices: { 'recipes:0': 'replace' } });
      expect(res.body.counts.recipes).to.eql({ added: 0, replaced: 1, skipped: 0 });
      const recipes = await Recipe.find({ ownedBy: String(bob.user._id) }).lean();
      expect(recipes).to.have.length(1);
      expect(String(recipes[0]!._id)).to.equal(bobRecipe);
      expect(recipes[0]!.notes).to.eql(['fires glossy']);
      // Its links still land on bob's own material and firing log.
      const mat = await Material.findOne({ ownedBy: String(bob.user._id) }).lean();
      expect((recipes[0]!.materials as Row[])[0]!._id).to.equal(String(mat!._id));
      const versions = await RecordVersion.find({ recordId: bobRecipe }).lean();
      expect(versions).to.have.length(1);
      expect((versions[0]!.record as Row).notes).to.eql(['fires satin']);
      // And the record's own Undo puts it back, as after any edit.
      const undone = await post('/recipe/undo/' + bobRecipe, bob.token, {});
      expect(undone).to.have.status(200);
      expect((await Recipe.findById(bobRecipe).lean())!.notes).to.eql(['fires satin']);
    });

    it('counts a replace as a change to the record, and an Undo of the import as another', async () => {
      expect((await Recipe.findById(bobRecipe).lean())!.rev).to.equal(0);
      const res = await post('/import', bob.token, { file, choices: { 'recipes:0': 'replace' } });
      const replaced = await Recipe.findById(bobRecipe).lean();
      expect(replaced!.rev).to.equal(1);
      expect(replaced!.updatedAt).to.be.instanceOf(Date);
      await post('/import/undo/' + res.body.importId, bob.token, {});
      expect((await Recipe.findById(bobRecipe).lean())!.rev).to.equal(2);
    });

    it('is put back as it was by Undo this import', async () => {
      const res = await post('/import', bob.token, { file, choices: { 'recipes:0': 'replace' } });
      const undo = await post('/import/undo/' + res.body.importId, bob.token, {});
      expect(undo).to.have.status(200);
      const recipe = await Recipe.findById(bobRecipe).lean();
      expect(recipe!.notes).to.eql(['fires satin']);
      expect(recipe!.title).to.equal('Satin white');
    });
  });

  it("never trusts the file's ids or owners: another account's records stay untouched", async () => {
    const file = (await exportOf(alice.token)) as { records: { recipes: Row[] } };
    file.records.recipes[0]!.ownedBy = String(alice.user._id);
    file.records.recipes[0]!.__v = 7;
    file.records.recipes[0]!.hash = 'x';
    file.records.recipes[0]!.title = 'Taken over';
    await post('/import', bob.token, { file });
    expect((await Recipe.findById(ids.recipe).lean())!.title).to.equal('Satin white');
    const theirs = await Recipe.findOne({ ownedBy: String(bob.user._id) }).lean();
    expect(String(theirs!._id)).to.not.equal(ids.recipe);
    expect(theirs).to.not.have.property('hash');
    expect(theirs!.title).to.equal('Taken over');
  });

  it('ignores the account, sign-in, tokens and share links in the file', async () => {
    const file = await exportOf(alice.token);
    await post('/import', bob.token, { file, include: { preferences: true, prices: true, shelf: true } });
    const user = await User.findById(bob.user._id).lean();
    expect(user!.email).to.equal(bob.email);
    expect(user!.displayname).to.equal(undefined);
    expect(user!.mfa).to.equal(undefined);
  });

  it('leaves the preferences, prices and shelf alone unless asked', async () => {
    await post('/import', bob.token, { file: await exportOf(alice.token) });
    const user = await User.findById(bob.user._id).lean();
    expect(user!.preferences ?? {}).to.not.have.property('theme');
    expect(user!.prices ?? []).to.eql([]);
    expect(user!.shelf ?? []).to.eql([]);
  });

  it('takes only the preferences it knows, never a name every object has', async () => {
    const names = ['toString', 'constructor', '__proto__', 'hasOwnProperty', 'valueOf'];
    // Written as JSON, so that __proto__ is a key of its own, as a file can have it.
    const preferences = '{' + names.map((name) => `"${name}":"dark"`).join(',') + ',"theme":"dark"}';
    const file = { ...(await exportOf(alice.token)), preferences: '§' };
    const body = JSON.stringify({ file, include: { preferences: true } }).replace('"§"', preferences);
    const send = (path: string) =>
      api()
        .post(path)
        .set('Authorization', 'Bearer ' + bob.token)
        .set('Content-Type', 'application/json')
        .send(body);
    const preview = await send('/import/preview');
    expect(preview, JSON.stringify(preview.body)).to.have.status(200);
    expect(preview.body.preferences).to.equal(1);
    const done = await send('/import');
    expect(done, JSON.stringify(done.body)).to.have.status(200);
    expect(done.body.preferences).to.equal(true);
    const user = await User.findById(bob.user._id).lean();
    expect(Object.keys(user!.preferences ?? {})).to.eql(['theme']);
    expect(user!.preferences).to.include({ theme: 'dark' });
  });

  it('refuses a file with a bad record, listing it, and writes nothing', async () => {
    const file = (await exportOf(alice.token)) as { records: { recipes: Row[]; materials: Row[] } };
    file.records.recipes.push({ title: 'No materials' });
    file.records.materials.push({
      name: 'Bad',
      fields: [],
      loi: 'lots',
      formulaweight: 1,
      molecularweight: 1,
      percentmole: 'molecular',
      equivalent: 1
    });
    const res = await post('/import/preview', bob.token, { file });
    expect(res).to.have.status(422);
    expect(res.body.code).to.equal('import-invalid');
    expect(res.body.problems).to.deep.include({
      kind: 'recipes',
      index: 1,
      title: 'No materials',
      reason: 'missing',
      field: 'materials'
    });
    expect(res.body.problems).to.deep.include({
      kind: 'materials',
      index: 1,
      title: 'Bad',
      reason: 'invalid',
      field: 'loi'
    });
    expect((await post('/import', bob.token, { file })).status).to.equal(422);
    expect(await Material.countDocuments({ ownedBy: String(bob.user._id) })).to.equal(0);
  });

  it('refuses a record larger than the record routes take, and nesting of any depth, as problems in the file', async () => {
    const file = (await exportOf(alice.token)) as { records: { recipes: Row[] } };
    // Each text within the limit, the three together over the record's bytes.
    const long = 'x'.repeat(RECORD_MOST.chars);
    file.records.recipes.push({ title: 'Too long in all', materials: [], notes: [long, long, long] });
    file.records.recipes.push({
      title: 'Too many lines',
      materials: Array.from({ length: RECORD_MOST.items + 1 }, () => ({}))
    });
    const res = await post('/import/preview', bob.token, { file });
    expect(res).to.have.status(422);
    expect(res.body.problems).to.eql([
      { kind: 'recipes', index: 1, title: 'Too long in all', reason: 'invalid', field: 'notes' },
      { kind: 'recipes', index: 2, title: 'Too many lines', reason: 'invalid', field: 'materials' }
    ]);
    for (const depth of [200, 5000, 40000]) {
      const lists = '['.repeat(depth) + ']'.repeat(depth);
      const deep = `{"file":{"format":"glazecalc-export","version":1,"records":{"recipes":[{"title":"t","materials":[${lists}]}]}}}`;
      const answer = await api()
        .post('/import/preview')
        .set('Authorization', 'Bearer ' + bob.token)
        .set('Content-Type', 'application/json')
        .send(deep);
      expect(answer, 'depth ' + depth).to.have.status(422);
      expect(answer.body.problems).to.eql([
        { kind: 'recipes', index: 0, title: 't', reason: 'invalid', field: 'materials' }
      ]);
    }
  });

  it('refuses what is not an export, a newer version, and too many records', async () => {
    expect((await post('/import/preview', bob.token, { file: { hello: 1 } })).body.code).to.equal('import-not-export');
    const file = await exportOf(alice.token);
    const newer = await post('/import/preview', bob.token, { file: { ...file, version: 99 } });
    expect(newer).to.have.status(422);
    expect(newer.body.code).to.equal('import-newer');
    const many = { ...file, records: { notes: Array.from({ length: IMPORT_RECORDS_MOST + 1 }, () => ({})) } };
    const tooMany = await post('/import/preview', bob.token, { file: many });
    expect(tooMany).to.have.status(413);
    expect(tooMany.body.code).to.equal('import-too-many');
  });

  it("refuses an import past the account's limit, writing nothing", async () => {
    const file = await exportOf(alice.token);
    process.env.ACCOUNT_MAX_RECORDS = '2';
    try {
      const preview = await post('/import/preview', bob.token, { file });
      expect(preview.body).to.include({ fits: false, roomLeft: 2, adding: 4 });
      const res = await post('/import', bob.token, { file });
      expect(res).to.have.status(413);
      expect(res.body.code).to.equal('import-over-limit');
    } finally {
      delete process.env.ACCOUNT_MAX_RECORDS;
    }
    expect(await Material.countDocuments({ ownedBy: String(bob.user._id) })).to.equal(0);
  });

  it('leaves nothing behind when saving fails part way', async () => {
    const file = await exportOf(alice.token);
    const original = Recipe.insertMany.bind(Recipe);
    (Recipe as unknown as { insertMany: unknown }).insertMany = () => Promise.reject(new Error('disk full'));
    try {
      const res = await post('/import', bob.token, { file, include: { prices: true, shelf: true } });
      expect(res).to.have.status(500);
      expect(res.body.code).to.equal('import-failed');
    } finally {
      (Recipe as unknown as { insertMany: unknown }).insertMany = original;
    }
    const owner = String(bob.user._id);
    for (const Model of [Material, Firing, Recipe, Note] as RecordModel[]) {
      expect(await Model.countDocuments({ ownedBy: owner }), Model.modelName).to.equal(0);
    }
    expect(await ImportRun.countDocuments({ ownedBy: owner })).to.equal(0);
    const user = await User.findById(bob.user._id).lean();
    expect(user!.prices ?? []).to.eql([]);
    expect(user!.shelf ?? []).to.eql([]);
  });

  it('takes back exactly one import with Undo, once, and only for its own account', async () => {
    const file = await exportOf(alice.token);
    const extra = await material(String(bob.user._id), 'Own one');
    const res = await post('/import', bob.token, { file, include: { prices: true } });
    expect(await post('/import/undo/' + res.body.importId, alice.token, {})).to.have.status(404);
    const undo = await post('/import/undo/' + res.body.importId, bob.token, {});
    expect(undo.body.code).to.equal('import-undone');
    const left = await Material.find({ ownedBy: String(bob.user._id) }).lean();
    expect(left.map((row) => String(row._id))).to.eql([String(extra._id)]);
    expect(await Recipe.countDocuments({ ownedBy: String(bob.user._id) })).to.equal(0);
    expect((await User.findById(bob.user._id).lean())!.prices ?? []).to.eql([]);
    expect(await post('/import/undo/' + res.body.importId, bob.token, {})).to.have.status(404);
  });

  it('is for the web session of an account: never a trial or an access token', async () => {
    const file = { format: 'glazecalc-export', version: 1, records: {} };
    expect(await api().post('/import/preview').send({ file })).to.have.status(401);
    const trial = sessionToken(await api().post('/guest'))!;
    const asTrial = await post('/import', trial, { file });
    expect(asTrial).to.have.status(403);
    expect(asTrial.body.code).to.equal('account-needed');
    const token = await makeToken(bob.user, { scopes: ['data:write'] });
    for (const path of ['/import/preview', '/import']) {
      const res = await post(path, token, { file });
      expect(res, path).to.have.status(403);
      expect(res.body.code).to.equal('token-not-here');
    }
  });

  it('takes a file up to 20 MB, and refuses a larger one', async () => {
    const big = 'x'.repeat(21 * 1024 * 1024);
    const res = await post('/import/preview', bob.token, {
      file: { format: 'glazecalc-export', version: 1, records: {}, pad: big }
    });
    expect(res).to.have.status(413);
    const fine = 'x'.repeat(5 * 1024 * 1024);
    const ok = await post('/import/preview', bob.token, {
      file: { format: 'glazecalc-export', version: 1, records: {}, pad: fine }
    });
    expect(ok).to.have.status(200);
    // Elsewhere the usual limit stays.
    expect(
      (
        await api()
          .put('/prices')
          .set('Authorization', 'Bearer ' + bob.token)
          .send({ pad: fine })
      ).status
    ).to.equal(413);
  });

  it('counts imports per account', async () => {
    const before = process.env.RATE_LIMITS;
    delete process.env.RATE_LIMITS;
    try {
      const file = { format: 'glazecalc-export', version: 1, records: {} };
      const statuses: number[] = [];
      for (let i = 0; i < 6; i++) statuses.push((await post('/import', bob.token, { file })).status);
      expect(statuses).to.eql([200, 200, 200, 200, 200, 429]);
      expect((await post('/import', alice.token, { file })).status).to.equal(200);
    } finally {
      if (before !== undefined) process.env.RATE_LIMITS = before;
    }
  });
});
