import { Types } from 'mongoose';
import { mergeTrial, deleteAccount } from '../lib/account_data.ts';
import { dateOldTrash } from '../lib/record_history.ts';
import AccessToken from '../models/access_token.ts';
import Activity, { ACTIVITY_DAYS } from '../models/activity.ts';
import Note from '../models/note.ts';
import Recipe from '../models/recipe.ts';
import RecordVersion, { VERSION_DAYS, VERSIONS_KEPT } from '../models/record_version.ts';
import Trash, { TRASH_DAYS, TRASH_MAX_ACCOUNT, TRASH_MAX_TRIAL } from '../models/trash.ts';
import type { UserDocument } from '../models/user.ts';
import { api, expect, makeUser, sessionToken } from './support/app.ts';
import { makeToken } from './support/tokens.ts';

const DAY = 24 * 60 * 60 * 1000;
const recipe = { title: 'Celadon', materials: [{ name: 'Silica', amount: '30' }] };
const bearer = (token: string | null) => 'Bearer ' + token;

/** The TTL of a model's index on one field, in days. */
const ttlDays = async (Model: { listIndexes: () => Promise<Array<Record<string, unknown>>> }, field: string) => {
  const index = (await Model.listIndexes()).find((i) => (i.key as Record<string, number>)[field] === 1);
  return Number(index?.expireAfterSeconds) / (24 * 60 * 60);
};

describe('Trash', () => {
  let user: UserDocument;
  let token: string;
  beforeEach(async () => {
    ({ user, token } = await makeUser());
  });
  const create = async (body: object = recipe, as = token) =>
    (await api().post('/recipe/create').set('Authorization', bearer(as)).send(body)).body as { _id: string };
  const remove = (id: string, as = token) =>
    api()
      .delete('/recipe/delete/' + id)
      .set('Authorization', bearer(as));
  const trash = async (as = token) => (await api().get('/trash/getAll').set('Authorization', bearer(as))).body;
  const restore = (id: string, as = token) =>
    api()
      .post('/trash/restore/' + id)
      .set('Authorization', bearer(as));

  it('takes a removed record, says what it was and when it goes, and puts it back as it was', async () => {
    const saved = await create({ ...recipe, notes: ['fires clear'] });
    const removed = await remove(saved._id);
    expect(removed).to.have.status(200);
    expect(removed.body.code).to.equal('record-trashed');
    expect((await api().get('/recipe/getAll').set('Authorization', bearer(token))).body).to.eql([]);

    const [entry] = await trash();
    expect(entry).to.include({ fromCollection: 'recipes', label: 'recipe', recordId: saved._id, title: 'Celadon' });
    expect(entry._id).to.equal(removed.body.trashId);
    expect(entry.by).to.equal('session');
    expect(entry).not.to.have.property('record');
    const left = new Date(entry.expiresAt).getTime() - new Date(entry.trashedAt).getTime();
    expect(left).to.equal(TRASH_DAYS * DAY);

    const res = await restore(entry._id);
    expect(res).to.have.status(200);
    expect(res.body.code).to.equal('trash-restored');
    const [back] = (await api().get('/recipe/getAll').set('Authorization', bearer(token))).body;
    expect(back).to.include({ _id: saved._id, title: 'Celadon', ownedBy: String(user._id) });
    expect(back.notes).to.eql(['fires clear']);
    expect(await trash()).to.eql([]);
  });

  it('puts a record back once, however many ask at the same moment', async () => {
    await remove((await create())._id);
    const [entry] = await trash();
    const answers = await Promise.all([restore(entry._id), restore(entry._id), restore(entry._id)]);
    expect(answers.filter((res) => res.status === 200)).to.have.length(1);
    for (const res of answers.filter((other) => other.status !== 200)) expect([404, 409]).to.include(res.status);
    expect(await Recipe.countDocuments({ ownedBy: String(user._id) })).to.equal(1);
  });

  it('keeps the Trash entry when a record with its id is in the list already', async () => {
    const saved = await create();
    await remove(saved._id);
    const [entry] = await trash();
    // The same record back in the list by another way, as a backup restored would bring it.
    await Recipe.collection.insertOne({ ...recipe, _id: new Types.ObjectId(saved._id), ownedBy: String(user._id) });
    const res = await restore(entry._id);
    expect(res).to.have.status(409);
    expect(res.body.code).to.equal('trash-restored-already');
    const [still] = await trash();
    expect(still).to.include({ _id: entry._id, recordId: saved._id, title: 'Celadon' });
    expect(await Trash.countDocuments({ _id: entry._id, record: { $exists: true } })).to.equal(1);
  });

  it('keeps each account’s Trash to itself', async () => {
    const { token: other } = await makeUser();
    await remove((await create())._id);
    const [entry] = await trash();
    expect(await trash(other)).to.eql([]);
    expect(await restore(entry._id, other)).to.have.status(404);
    expect(
      await api()
        .delete('/trash/delete/' + entry._id)
        .set('Authorization', bearer(other))
    ).to.have.status(404);
    expect(await trash()).to.have.length(1);
  });

  it('deletes one for good, with its earlier versions, or empties the Trash', async () => {
    const one = await create();
    await api()
      .put('/recipe/change/' + one._id)
      .set('Authorization', bearer(token))
      .send({ recipe: { title: 'Celadon 2' } });
    await remove(one._id);
    await remove((await create())._id);
    const [, first] = await trash();
    const gone = await api()
      .delete('/trash/delete/' + first._id)
      .set('Authorization', bearer(token));
    expect(gone).to.have.status(200);
    expect(await RecordVersion.countDocuments({ recordId: one._id })).to.equal(0);
    expect(await trash()).to.have.length(1);

    const emptied = await api().delete('/trash/empty').set('Authorization', bearer(token));
    expect(emptied).to.have.status(200);
    expect(emptied.body.code).to.equal('trash-emptied');
    expect(await trash()).to.eql([]);
  });

  it('lets a trial put back only as many as it may keep, and keeps its Trash small', async () => {
    const started = await api().post('/guest');
    const trial = sessionToken(started)!;
    process.env.GUEST_MAX_RECORDS = '1';
    try {
      const first = await create(recipe, trial);
      expect(await remove(first._id, trial)).to.have.status(200);
      // The Trash does not count: the place is free again.
      await create(recipe, trial);
      const [entry] = await trash(trial);
      const refused = await restore(entry._id, trial);
      expect(refused).to.have.status(403);
      expect(refused.body.code).to.equal('trial-limit');
      expect(await trash(trial)).to.have.length(1);
    } finally {
      delete process.env.GUEST_MAX_RECORDS;
    }
    for (let i = 0; i < TRASH_MAX_TRIAL + 2; i++) await remove((await create(recipe, trial))._id, trial);
    expect(await trash(trial)).to.have.length(TRASH_MAX_TRIAL);
  });

  it('goes 30 days after a record is trashed, and leaves out entries from before', async () => {
    expect(await ttlDays(Trash, 'trashedAt')).to.equal(30);
    await Trash.create({ content: ['old'], date: '1/1/2017', fromCollection: 'notes', ownedBy: String(user._id) });
    expect(await trash()).to.eql([]);
  });

  it('dates entries from before the Trash once, so they expire too', async () => {
    const ownedBy = String(user._id);
    const now = new Date();
    // Two days ago, written as those entries were (m/d/yyyy), so MongoDB does not remove it mid-test.
    const then = new Date(now.getTime() - 2 * DAY);
    const date = `${then.getMonth() + 1}/${then.getDate()}/${then.getFullYear()}`;
    const dated = await Trash.create({ content: ['old'], date, fromCollection: 'notes', ownedBy });
    const undated = await Trash.create({ content: ['old'], date: 'someday', fromCollection: 'notes', ownedBy });
    const current = await Trash.findById((await remove((await create())._id)).body.trashId).lean();
    expect(await dateOldTrash(now)).to.be.at.least(2);
    expect((await Trash.findById(dated._id).lean())!.trashedAt!.getTime()).to.equal(new Date(date).getTime());
    expect((await Trash.findById(undated._id).lean())!.trashedAt!.getTime()).to.equal(now.getTime());
    expect((await Trash.findById(current!._id).lean())!.trashedAt!.getTime()).to.equal(current!.trashedAt!.getTime());
    expect(await dateOldTrash()).to.equal(0);
  });

  it('can be read and put back from with an access token, but not deleted from', async () => {
    await remove((await create())._id);
    const [entry] = await trash();
    const read = await makeToken(user, { scopes: ['data:read'] });
    const write = await makeToken(user, { scopes: ['data:write'] });
    expect(await trash(read)).to.have.length(1);
    expect(await restore(entry._id, read)).to.have.status(403);
    for (const request of [api().delete('/trash/delete/' + entry._id), api().delete('/trash/empty')]) {
      const res = await request.set('Authorization', bearer(write));
      expect(res).to.have.status(403);
      expect(res.body.code).to.equal('token-not-here');
    }
    expect(await restore(entry._id, write)).to.have.status(200);
  });

  it('needs a sign-in', async () => {
    expect(await api().get('/trash/getAll')).to.have.status(401);
    expect(await api().post('/trash/restore/0123456789abcdef01234567')).to.have.status(401);
    expect(await api().delete('/trash/empty')).to.have.status(401);
  });

  /** Fills the user's Trash to its limit with entries trashed `daysAgo` and before. */
  const fillTrash = async (daysAgo = 1) => {
    const entries = Array.from({ length: TRASH_MAX_ACCOUNT }, (_, i) => ({
      ownedBy: String(user._id),
      fromCollection: 'recipes',
      recordId: new Types.ObjectId(),
      record: { title: 'Old ' + i },
      title: 'Old ' + i,
      trashedAt: new Date(Date.now() - (daysAgo * DAY + i * 1000)),
      by: 'session'
    }));
    await Trash.insertMany(entries);
    return entries;
  };

  it('refuses a token when the Trash is full, and never pushes out what is in it', async () => {
    const entries = await fillTrash();
    const oldest = entries[entries.length - 1];
    const write = await makeToken(user, { scopes: ['data:write'] });
    const saved = await create();
    const refused = await remove(saved._id, write);
    expect(refused).to.have.status(409);
    expect(refused.body.code).to.equal('trash-full');
    expect(await Recipe.countDocuments({ _id: saved._id })).to.equal(1);
    expect(await Trash.countDocuments({ ownedBy: String(user._id) })).to.equal(TRASH_MAX_ACCOUNT);
    expect(await Trash.countDocuments({ recordId: oldest.recordId })).to.equal(1);
    // On the website the oldest makes room.
    expect(await remove(saved._id)).to.have.status(200);
    expect(await Trash.countDocuments({ ownedBy: String(user._id) })).to.equal(TRASH_MAX_ACCOUNT);
    expect(await Trash.countDocuments({ recordId: oldest.recordId })).to.equal(0);
  });

  it('lets a token move at most 100 records an hour to the Trash, and does not count the website', async function () {
    this.timeout(30000);
    const write = await makeToken(user, { scopes: ['data:write'] });
    const ids = (
      await Recipe.insertMany(
        Array.from({ length: 102 }, (_, i) => ({ ...recipe, title: 'R' + i, ownedBy: String(user._id) }))
      )
    ).map((saved) => String(saved._id));
    process.env.RATE_LIMITS = 'on';
    try {
      for (const id of ids.slice(0, 100)) expect(await remove(id, write)).to.have.status(200);
      const over = await remove(ids[100], write);
      expect(over).to.have.status(429);
      expect(over.body.code).to.equal('too-many-deletes');
      expect(await Recipe.countDocuments({ _id: ids[100] })).to.equal(1);
      // Another token, and the website, are not held up.
      expect(await remove(ids[100], await makeToken(user, { scopes: ['data:write'] }))).to.have.status(200);
      expect(await remove(ids[101])).to.have.status(200);
    } finally {
      process.env.RATE_LIMITS = 'off';
    }
  });

  it('takes a record removed with a token too', async () => {
    const write = await makeToken(user, { scopes: ['data:write'] });
    const saved = await create();
    expect(await remove(saved._id, write)).to.have.status(200);
    const [entry] = await trash();
    expect(entry).to.include({ recordId: saved._id, by: 'pat' });
  });
});

describe('record versions and Undo', () => {
  let token: string;
  beforeEach(async () => {
    ({ token } = await makeUser());
  });
  const create = async () =>
    (await api().post('/recipe/create').set('Authorization', bearer(token)).send(recipe)).body as { _id: string };
  const change = (id: string, title: string, as = token) =>
    api()
      .put('/recipe/change/' + id)
      .set('Authorization', bearer(as))
      .send({ recipe: { title } });
  const undo = (id: string, as = token) =>
    api()
      .post('/recipe/undo/' + id)
      .set('Authorization', bearer(as));
  const versions = async (id: string) =>
    (
      await api()
        .get('/recipe/versions/' + id)
        .set('Authorization', bearer(token))
    ).body;

  it('keeps the record as it was before each change, and Undo goes back, itself undoable', async () => {
    const saved = await create();
    await change(saved._id, 'Celadon 2');
    await change(saved._id, 'Celadon 3');
    const list = await versions(saved._id);
    expect(list.map((v: { title: string }) => v.title)).to.eql(['Celadon 2', 'Celadon']);
    expect(list[0].by).to.equal('session');

    const first = await undo(saved._id);
    expect(first).to.have.status(200);
    expect(first.body.code).to.equal('record-undone');
    expect(first.body.record).to.include({ _id: saved._id, title: 'Celadon 2' });
    // What the undo replaced is the newest version now, in place of the one it put back.
    const after = (await versions(saved._id)).map((v: { title: string }) => v.title);
    expect(after).to.eql(['Celadon 3', 'Celadon']);
    expect((await undo(saved._id)).body.record.title).to.equal('Celadon 3');
    expect((await undo(saved._id)).body.record.title).to.equal('Celadon 2');
    const [now] = (await api().get('/recipe/getAll').set('Authorization', bearer(token))).body;
    expect(now).to.include({ title: 'Celadon 2' });
    expect(now.materials).to.eql(recipe.materials);
  });

  it('has nothing to undo before the first change', async () => {
    const none = await undo((await create())._id);
    expect(none).to.have.status(404);
    expect(none.body.code).to.equal('nothing-to-undo');
  });

  it('always keeps the version from before a token’s changes, however many it makes', async () => {
    const { user, token: session } = await makeUser();
    token = session;
    const saved = await create();
    await change(saved._id, 'Mine');
    const write = await makeToken(user, { scopes: ['data:write'] });
    for (let i = 1; i <= VERSIONS_KEPT + 3; i++) await change(saved._id, 'Token ' + i, write);
    const titles = (await versions(saved._id)).map((v: { title: string }) => v.title);
    expect(titles).to.have.length(VERSIONS_KEPT + 1);
    expect(titles[0]).to.equal('Token ' + (VERSIONS_KEPT + 2));
    expect(titles[VERSIONS_KEPT]).to.equal('Mine');
    expect(titles).not.to.include('Celadon');
    // Token undos only swap the newest two; the version from before stays.
    for (let i = 0; i < 5; i++) await undo(saved._id, write);
    expect((await versions(saved._id)).map((v: { title: string }) => v.title)).to.include('Mine');
  });

  it(`keeps the last ${VERSIONS_KEPT} of a record, for ${VERSION_DAYS} days`, async () => {
    const saved = await create();
    for (let i = 1; i <= VERSIONS_KEPT + 2; i++) await change(saved._id, 'Celadon ' + i);
    const list = await versions(saved._id);
    expect(list).to.have.length(VERSIONS_KEPT);
    expect(list[0].title).to.equal('Celadon ' + (VERSIONS_KEPT + 1));
    expect(await ttlDays(RecordVersion, 'savedAt')).to.equal(90);
  });

  it('does not undo a record in the Trash, and keeps its versions for when it is back', async () => {
    const saved = await create();
    await change(saved._id, 'Celadon 2');
    await api()
      .delete('/recipe/delete/' + saved._id)
      .set('Authorization', bearer(token));
    expect(await undo(saved._id)).to.have.status(404);
    const [entry] = (await api().get('/trash/getAll').set('Authorization', bearer(token))).body;
    await api()
      .post('/trash/restore/' + entry._id)
      .set('Authorization', bearer(token));
    expect((await undo(saved._id)).body.record.title).to.equal('Celadon');
  });

  it('keeps a trashed record’s versions only as long as its Trash entry, and for their own time once it is back', async () => {
    const saved = await create();
    await change(saved._id, 'Celadon 2');
    const removed = await api()
      .delete('/recipe/delete/' + saved._id)
      .set('Authorization', bearer(token));
    const entry = await Trash.findById(removed.body.trashId).lean();
    const [version] = await RecordVersion.find({ recordId: saved._id }).lean();
    expect(version.expiresAt!.getTime()).to.equal(entry!.trashedAt!.getTime() + TRASH_DAYS * DAY);
    expect(await ttlDays(RecordVersion, 'expiresAt')).to.equal(0);
    await api()
      .post('/trash/restore/' + removed.body.trashId)
      .set('Authorization', bearer(token));
    expect((await RecordVersion.findById(version._id).lean())!.expiresAt).to.equal(undefined);
  });

  it('deletes a trashed record’s versions when the Trash pushes it out', async () => {
    const { user, token: session } = await makeUser();
    token = session;
    const saved = await create();
    await change(saved._id, 'Celadon 2');
    await api()
      .delete('/recipe/delete/' + saved._id)
      .set('Authorization', bearer(token));
    await Trash.updateOne({ recordId: saved._id }, { $set: { trashedAt: new Date(Date.now() - DAY) } });
    await Trash.insertMany(
      Array.from({ length: TRASH_MAX_ACCOUNT }, (_, i) => ({
        ownedBy: String(user._id),
        fromCollection: 'recipes',
        recordId: new Types.ObjectId(),
        record: { title: 'Newer ' + i },
        trashedAt: new Date(Date.now() - 1000 - i)
      }))
    );
    // One more on the website pushes out the oldest: the record changed above.
    await api()
      .delete('/recipe/delete/' + (await create())._id)
      .set('Authorization', bearer(token));
    expect(await Trash.countDocuments({ recordId: saved._id })).to.equal(0);
    expect(await RecordVersion.countDocuments({ recordId: saved._id })).to.equal(0);
  });

  it('never shows or undoes another account’s versions', async () => {
    const saved = await create();
    await change(saved._id, 'Celadon 2');
    const { token: other } = await makeUser();
    expect(
      (
        await api()
          .get('/recipe/versions/' + saved._id)
          .set('Authorization', bearer(other))
      ).body
    ).to.eql([]);
    expect(await undo(saved._id, other)).to.have.status(404);
  });

  it('undoes with a data:write token, and lists with data:read', async () => {
    const { user, token: session } = await makeUser();
    token = session;
    const saved = await create();
    await change(saved._id, 'Celadon 2');
    const read = await makeToken(user, { scopes: ['data:read'] });
    const write = await makeToken(user, { scopes: ['data:write'] });
    expect(
      await api()
        .get('/recipe/versions/' + saved._id)
        .set('Authorization', bearer(read))
    ).to.have.status(200);
    expect(await undo(saved._id, read)).to.have.status(403);
    expect(await undo(saved._id, write)).to.have.status(200);
  });
});

describe('activity log', () => {
  it('records what a token did, by title, never a note’s text, and nothing done on the website', async () => {
    const { user, token: session } = await makeUser();
    const write = await makeToken(user, { scopes: ['data:write'] });
    await api().post('/recipe/create').set('Authorization', bearer(session)).send(recipe);
    expect(await Activity.countDocuments({ ownedBy: String(user._id) })).to.equal(0);

    const long = 'A'.repeat(200);
    const note = await api()
      .post('/notes/create')
      .set('Authorization', bearer(write))
      .send({ title: long, content: 'Secret glaze text', relatedCollection: 'Notes', relatedId: 'general' });
    const id = note.body._id as string;
    await api()
      .put('/notes/change/' + id)
      .set('Authorization', bearer(write))
      .send({ content: 'Still secret' });
    await api()
      .post('/notes/undo/' + id)
      .set('Authorization', bearer(write));
    await api()
      .delete('/notes/delete/' + id)
      .set('Authorization', bearer(write));
    const [entry] = (await api().get('/trash/getAll').set('Authorization', bearer(write))).body;
    await api()
      .post('/trash/restore/' + entry._id)
      .set('Authorization', bearer(write));

    const lines = await Activity.find({ ownedBy: String(user._id) })
      .sort({ at: 1, _id: 1 })
      .lean();
    expect(lines.map((line) => line.action)).to.eql(['create', 'change', 'undo', 'trash', 'restore']);
    for (const line of lines) {
      expect(line).to.include({ via: 'pat', client: 'Test token', fromCollection: 'notes' });
      expect(String(line.recordId)).to.equal(id);
      expect(line.title).to.equal('A'.repeat(80));
    }
    expect(JSON.stringify(lines)).not.to.include('secret');
    expect(JSON.stringify(lines)).not.to.include('Secret');
    expect(await ttlDays(Activity, 'at')).to.equal(ACTIVITY_DAYS);
  });
});

describe('account data: the new collections', () => {
  /** An account with a version, a Trash entry, an activity line and a token. */
  const makeOwner = async () => {
    const owner = await makeUser();
    const write = await makeToken(owner.user, { scopes: ['data:write'] });
    const saved = (await api().post('/recipe/create').set('Authorization', bearer(write)).send(recipe)).body;
    await api()
      .put('/recipe/change/' + saved._id)
      .set('Authorization', bearer(write))
      .send({ recipe: { title: 'Celadon 2' } });
    const other = (await api().post('/recipe/create').set('Authorization', bearer(owner.token)).send(recipe)).body;
    await api()
      .delete('/recipe/delete/' + other._id)
      .set('Authorization', bearer(owner.token));
    return { ...owner, write };
  };
  const countsOf = async (id: string) => [
    await RecordVersion.countDocuments({ ownedBy: id }),
    await Trash.countDocuments({ ownedBy: id }),
    await Activity.countDocuments({ ownedBy: id }),
    await AccessToken.countDocuments({ userId: id })
  ];

  it('exports versions, activity and tokens, in names and dates, never a token or its hash', async () => {
    const { token, write } = await makeOwner();
    const { body, text } = await api().get('/export').set('Authorization', bearer(token));
    expect(body.versions).to.have.length(1);
    expect(body.versions[0]).to.include({ fromCollection: 'recipes', by: 'pat' });
    expect(body.versions[0].record).to.include({ title: 'Celadon' });
    expect(body.versions[0].record).not.to.have.property('ownedBy');
    expect(body.activity.map((line: { action: string }) => line.action)).to.eql(['create', 'change']);
    expect(body.records.trash).to.have.length(1);
    expect(body.accessTokens).to.have.length(1);
    expect(body.accessTokens[0]).to.include({ kind: 'pat', name: 'Test token', endsWith: write.slice(-4) });
    expect(body.accessTokens[0].scopes).to.eql(['data:write']);
    expect(text).not.to.include(write);
    expect(text).not.to.include('"hash"');
  });

  it('deletes them with the account', async () => {
    const { user } = await makeOwner();
    const id = String(user._id);
    expect(await countsOf(id)).to.eql([1, 1, 2, 1]);
    await deleteAccount(user._id);
    expect(await countsOf(id)).to.eql([0, 0, 0, 0]);
  });

  it('moves a trial’s Trash and versions into the account it becomes', async () => {
    const started = await api().post('/guest');
    const trial = sessionToken(started)!;
    const trialId = (await api().get('/verify').set('Authorization', bearer(trial))).body.id as string;
    const saved = (await api().post('/recipe/create').set('Authorization', bearer(trial)).send(recipe)).body;
    await api()
      .put('/recipe/change/' + saved._id)
      .set('Authorization', bearer(trial))
      .send({ recipe: { title: 'Celadon 2' } });
    await api()
      .delete('/recipe/delete/' + saved._id)
      .set('Authorization', bearer(trial));
    const { user } = await makeUser();
    // One record, in the Trash; its earlier version moves but is not counted.
    expect(await mergeTrial(trialId, user._id)).to.equal(1);
    expect(await RecordVersion.countDocuments({ ownedBy: String(user._id) })).to.equal(1);
    expect(await Trash.countDocuments({ ownedBy: String(user._id) })).to.equal(1);
    expect(await RecordVersion.countDocuments({ ownedBy: trialId })).to.equal(0);
    expect(await Note.countDocuments({ ownedBy: trialId })).to.equal(0);
  });
});
