// Access tokens that can write (data:write) on the record routes: every kind of
// record created, changed, undone and moved to the Trash with one, each change
// kept as a version and written to the activity log; and the safeguards: the
// scope on every write route, the owner, revocation, the limits on changes,
// and the account's limit on versions.
import { Types } from 'mongoose';
import { TOKEN_LIMITS, TOKEN_WRITE_LIMITS } from '../lib/rate_limit.ts';
import { keepAccountVersionsWithin, saveVersion } from '../lib/record_history.ts';
import AccessToken from '../models/access_token.ts';
import Activity from '../models/activity.ts';
import Recipe from '../models/recipe.ts';
import RecordVersion, { VERSIONS_MOST_ACCOUNT } from '../models/record_version.ts';
import Trash from '../models/trash.ts';
import User, { type UserDocument } from '../models/user.ts';
import { api, expect, makeUser, sessionToken } from './support/app.ts';
import { makeToken } from './support/tokens.ts';

const bearer = (token: string) => 'Bearer ' + token;

/** Each kind of record, by its path: a new one, a change to one, the field the change sets, and its area. */
const KINDS = {
  additives: {
    area: 'additives',
    record: { name: 'Cobalt', fields: [{ name: 'CoO', amount: '1' }] },
    change: { name: 'Cobalt 2' }
  },
  advice: {
    area: 'advice',
    record: { title: 'Crawling', content: 'Less clay.', tags: ['defects'] },
    change: { title: 'Crawling 2' }
  },
  firing: {
    area: 'firing',
    record: { title: 'Bisque', fieldsIncluded: ['time', 'temperature'], rows: [{ time: '0', temperature: '20' }] },
    change: { title: 'Bisque 2' }
  },
  materials: {
    area: 'materials',
    record: {
      name: 'My spar',
      fields: [{ name: 'SiO2', amount: '68' }],
      formulaweight: 100,
      loi: 0,
      molecularweight: 100,
      percentmole: 'percent',
      equivalent: 100
    },
    change: { name: 'My spar 2' }
  },
  notes: {
    area: 'notes',
    record: { title: 'Test', content: 'Glossy at cone 6.', relatedCollection: 'Notes', relatedId: 'general notes' },
    change: { title: 'Test 2' }
  },
  recipe: {
    area: 'recipes',
    record: { title: 'Celadon', materials: [{ name: 'Silica', amount: '30' }] },
    change: { title: 'Celadon 2' },
    wrapper: 'recipe'
  }
} as const;
type Kind = keyof typeof KINDS;

const create = (kind: Kind, as: string, body: object = KINDS[kind].record) =>
  api().post(`/${kind}/create`).set('Authorization', bearer(as)).send(body);
const change = (kind: Kind, id: string, as: string, body: object = KINDS[kind].change) =>
  api()
    .put(`/${kind}/change/${id}`)
    .set('Authorization', bearer(as))
    .send('wrapper' in KINDS[kind] ? { recipe: body } : body);
const remove = (kind: Kind, id: string, as: string) =>
  api().delete(`/${kind}/delete/${id}`).set('Authorization', bearer(as));
const undo = (kind: Kind, id: string, as: string) => api().post(`/${kind}/undo/${id}`).set('Authorization', bearer(as));

describe('access tokens that write: every kind of record', () => {
  let user: UserDocument;
  let session: string;
  let write: string;
  beforeEach(async () => {
    ({ user, token: session } = await makeUser());
    write = await makeToken(user, { scopes: ['data:write'] });
  });

  for (const kind of Object.keys(KINDS) as Kind[]) {
    it(`creates, changes, undoes and moves ${kind} to the Trash, keeping versions and the activity log`, async () => {
      const { area, change: changed } = KINDS[kind];
      const ownedBy = String(user._id);
      // ownedBy cannot be set: the record is the token owner's.
      const made = await create(kind, write, { ...KINDS[kind].record, ownedBy: new Types.ObjectId().toString() });
      expect(made, JSON.stringify(made.body)).to.have.status(200);
      expect(made.body.ownedBy).to.equal(ownedBy);
      const id = made.body._id as string;

      expect(await change(kind, id, write)).to.have.status(200);
      // The record as it was is kept, made by a personal token.
      const versions = await RecordVersion.find({ ownedBy, recordId: id }).lean();
      expect(versions).to.have.length(1);
      expect(versions[0]!.by).to.equal('pat');
      expect(versions[0]!.fromCollection).to.equal(area);
      // And Undo with the token puts it back.
      const undone = await undo(kind, id, write);
      expect(undone, JSON.stringify(undone.body)).to.have.status(200);
      const [field] = Object.keys(changed);
      expect(undone.body.record[field!]).to.equal((KINDS[kind].record as Record<string, unknown>)[field!]);

      // Removed, it waits in the Trash, and can be put back with the token.
      const removed = await remove(kind, id, write);
      expect(removed).to.have.status(200);
      const entry = await Trash.findOne({ ownedBy, recordId: id }).lean();
      expect(entry).to.include({ fromCollection: area, by: 'pat' });
      const restored = await api()
        .post('/trash/restore/' + removed.body.trashId)
        .set('Authorization', bearer(write));
      expect(restored).to.have.status(200);

      const actions = (await Activity.find({ ownedBy, recordId: id }).sort({ at: 1, _id: 1 }).lean()).map(
        (line) => line.action
      );
      expect(actions).to.eql(['create', 'change', 'undo', 'trash', 'restore']);
      // Nothing the website does is in the log.
      expect(await change(kind, id, session)).to.have.status(200);
      expect(await Activity.countDocuments({ ownedBy, recordId: id })).to.equal(5);
    });
  }
});

describe('access tokens that write: safeguards', () => {
  let user: UserDocument;
  let session: string;
  beforeEach(async () => {
    ({ user, token: session } = await makeUser());
  });

  it('refuses every write route of every kind to a read-only token, changing nothing', async () => {
    const read = await makeToken(user, { scopes: ['data:read'] });
    for (const kind of Object.keys(KINDS) as Kind[]) {
      const id = (await create(kind, session)).body._id as string;
      for (const res of [
        await create(kind, read),
        await change(kind, id, read),
        await remove(kind, id, read),
        await undo(kind, id, read)
      ]) {
        expect(res, kind).to.have.status(403);
        expect(res.headers['www-authenticate']).to.include('insufficient_scope').and.include('scope="data:write"');
      }
      // It can still read them.
      expect(await api().get(`/${kind}/getAll`).set('Authorization', bearer(read))).to.have.status(200);
    }
    const recipeId = (await Recipe.findOne({ ownedBy: String(user._id) }))!._id;
    const firingId = (await create('firing', session)).body._id as string;
    const linked = await api()
      .post(`/recipe/firings/${String(recipeId)}`)
      .set('Authorization', bearer(read))
      .send({ firing: firingId });
    expect(linked).to.have.status(403);
    const trashId = (await remove('notes', (await create('notes', session)).body._id, session)).body.trashId;
    expect(
      await api()
        .post('/trash/restore/' + trashId)
        .set('Authorization', bearer(read))
    ).to.have.status(403);
    expect(await Activity.countDocuments({ ownedBy: String(user._id) })).to.equal(0);
  });

  it('never lets a token change, undo or remove another account’s records', async () => {
    const other = await makeUser();
    const write = await makeToken(user, { scopes: ['data:write'] });
    for (const kind of Object.keys(KINDS) as Kind[]) {
      const theirs = (await create(kind, other.token)).body._id as string;
      await change(kind, theirs, other.token);
      expect(await change(kind, theirs, write), kind).to.have.status(404);
      expect(await undo(kind, theirs, write), kind).to.have.status(404);
      expect(await remove(kind, theirs, write), kind).to.have.status(404);
    }
    const theirTrash = (await remove('recipe', (await create('recipe', other.token)).body._id, other.token)).body
      .trashId;
    expect(
      await api()
        .post('/trash/restore/' + theirTrash)
        .set('Authorization', bearer(write))
    ).to.have.status(404);
    // Their records are as they were.
    expect(await Trash.countDocuments({ ownedBy: String(other.user._id) })).to.equal(1);
  });

  it('stops writing the moment the token is revoked, or the account signs out everywhere', async () => {
    const write = await makeToken(user, { scopes: ['data:write'] });
    expect(await create('recipe', write)).to.have.status(200);
    const row = (await AccessToken.findOne({ userId: user._id }))!;
    expect(
      await api()
        .delete('/tokens/' + String(row._id))
        .set('Authorization', bearer(session))
    ).to.have.status(200);
    const refused = await create('recipe', write);
    expect(refused).to.have.status(401);
    expect(refused.headers['www-authenticate']).to.include('invalid_token');

    const another = await makeToken(user, { scopes: ['data:write'] });
    expect(await create('recipe', another)).to.have.status(200);
    await api().delete('/tokens').set('Authorization', bearer(session));
    expect(await create('recipe', another)).to.have.status(401);
    expect(await Recipe.countDocuments({ ownedBy: String(user._id) })).to.equal(2);
  });

  it('refuses a write token a trial holds, though trials cannot make one', async () => {
    const trial = sessionToken(await api().post('/guest').send({}))!;
    const trialUser = (await User.findOne({ guest: true }).sort({ _id: -1 }))!;
    expect(
      await api().post('/tokens').set('Authorization', bearer(trial)).send({ name: 'x', scope: 'data:write' })
    ).to.have.status(403);
    const held = await makeToken(trialUser, { scopes: ['data:write'] });
    expect(await create('recipe', held)).to.have.status(401);
  });

  it(`allows ${TOKEN_WRITE_LIMITS.minute} changes a minute per account with tokens, apart from reads and the website`, async function () {
    this.timeout(30000);
    const write = await makeToken(user, { scopes: ['data:write'] });
    process.env.RATE_LIMITS = 'on';
    try {
      for (let i = 0; i < TOKEN_WRITE_LIMITS.minute; i++) expect(await create('notes', write)).to.have.status(200);
      const over = await create('notes', write);
      expect(over).to.have.status(429);
      expect(over.body.code).to.equal('too-many-changes');
      // Per account: another of its tokens is held up too, for every kind of change.
      const second = await makeToken(user, { scopes: ['data:write'] });
      expect(await create('recipe', second)).to.have.status(429);
      const id = (await create('recipe', session)).body._id as string;
      expect(await change('recipe', id, second)).to.have.status(429);
      // Reads go on (TOKEN_LIMITS), and so does the website, and another account.
      expect(TOKEN_LIMITS.minute).to.be.above(TOKEN_WRITE_LIMITS.minute);
      expect(await api().get('/notes/getAll').set('Authorization', bearer(write))).to.have.status(200);
      expect(await create('notes', session)).to.have.status(200);
      const other = await makeUser();
      expect(await create('notes', await makeToken(other.user, { scopes: ['data:write'] }))).to.have.status(200);
    } finally {
      process.env.RATE_LIMITS = 'off';
    }
  });

  it(`allows ${TOKEN_WRITE_LIMITS.day} changes a day per account with tokens`, async function () {
    this.timeout(30000);
    const write = await makeToken(user, { scopes: ['data:write'] });
    const limits = TOKEN_WRITE_LIMITS as { minute: number; day: number };
    const was = { ...limits };
    // A smaller day, and a minute that is not reached first, to see it work.
    limits.day = 5;
    limits.minute = 100;
    process.env.RATE_LIMITS = 'on';
    try {
      for (let i = 0; i < 5; i++) expect(await create('notes', write)).to.have.status(200);
      const over = await create('notes', write);
      expect(over).to.have.status(429);
      expect(over.body.code).to.equal('too-many-changes');
    } finally {
      process.env.RATE_LIMITS = 'off';
      Object.assign(limits, was);
    }
  });
});

describe('record versions: the account’s limit', () => {
  const ownedBy = () => new Types.ObjectId().toString();
  const row = (owner: string, recordId: Types.ObjectId, title: string) => ({ _id: recordId, ownedBy: owner, title });

  it(`keeps at most ${VERSIONS_MOST_ACCOUNT} on an account, the oldest going first`, async () => {
    const owner = ownedBy();
    const records = Array.from({ length: 4 }, () => new Types.ObjectId());
    const start = Date.now() - 60 * 60 * 1000;
    let n = 0;
    for (const recordId of records) {
      for (let i = 0; i < 3; i++) {
        await saveVersion('recipes', row(owner, recordId, 'v' + n), 'session', { now: new Date(start + n * 1000) });
        n++;
      }
    }
    expect(await RecordVersion.countDocuments({ ownedBy: owner })).to.equal(12);
    expect(await keepAccountVersionsWithin(owner, 8)).to.equal(4);
    const left = await RecordVersion.find({ ownedBy: owner }).sort({ savedAt: 1 }).lean();
    expect(left.map((v) => (v.record as { title: string }).title)).to.eql([
      'v4',
      'v5',
      'v6',
      'v7',
      'v8',
      'v9',
      'v10',
      'v11'
    ]);
    // Another account is not touched.
    const other = ownedBy();
    await saveVersion('recipes', row(other, new Types.ObjectId(), 'theirs'), 'session');
    expect(await keepAccountVersionsWithin(owner, 1)).to.equal(7);
    expect(await RecordVersion.countDocuments({ ownedBy: other })).to.equal(1);
  });

  it('never drops a record’s version from before a token’s changes, so Undo can still go back to it', async () => {
    const owner = ownedBy();
    const start = Date.now() - 60 * 60 * 1000;
    const kept = new Types.ObjectId();
    // The person's version, then a token's run of changes: the first of the run holds what the person had.
    await saveVersion('recipes', row(owner, kept, 'mine'), 'session', { now: new Date(start) });
    await saveVersion('recipes', row(owner, kept, 'before the token'), 'pat', { now: new Date(start + 1000) });
    await saveVersion('recipes', row(owner, kept, 'token 1'), 'pat', { now: new Date(start + 2000) });
    // Newer versions of other records.
    for (let i = 0; i < 5; i++) {
      await saveVersion('recipes', row(owner, new Types.ObjectId(), 'other ' + i), 'session', {
        now: new Date(start + 10000 + i * 1000)
      });
    }
    await keepAccountVersionsWithin(owner, 3);
    const titles = (await RecordVersion.find({ ownedBy: owner }).sort({ savedAt: 1 }).lean()).map(
      (v) => (v.record as { title: string }).title
    );
    expect(titles).to.include('before the token');
    expect(titles).not.to.include('mine');
    expect(titles).not.to.include('token 1');
  });

  it('keeps what the person had before a token’s changes through the record routes, and Undo still works', async () => {
    const { user, token } = await makeUser();
    const write = await makeToken(user, { scopes: ['data:write'] });
    const id = (await create('recipe', token)).body._id as string;
    for (let i = 0; i < 3; i++) await change('recipe', id, write, { title: 'T' + i });
    expect(await keepAccountVersionsWithin(String(user._id), 2)).to.equal(1);
    const titles = (
      await RecordVersion.find({ ownedBy: String(user._id) })
        .sort({ savedAt: 1 })
        .lean()
    ).map((v) => (v.record as { title: string }).title);
    expect(titles).to.eql(['Celadon', 'T1']);
    const undone = await undo('recipe', id, token);
    expect(undone.body.record.title).to.equal('T1');
  });
});

describe('access tokens that write: the shelf', () => {
  let user: UserDocument;
  let session: string;
  let write: string;
  let ownedBy: string;
  const shelf = (as: string) => api().get('/shelf').set('Authorization', bearer(as));
  const post = (as: string, path: string, body: object = {}) =>
    api()
      .post('/shelf/' + path)
      .set('Authorization', bearer(as))
      .send(body);

  beforeEach(async () => {
    ({ user, token: session } = await makeUser());
    ownedBy = String(user._id);
    write = await makeToken(user, { scopes: ['data:write'] });
  });

  it('reads with a read token, and adds, removes and undoes one material with a write token', async () => {
    const read = await makeToken(user, { scopes: ['data:read'] });
    expect((await shelf(read)).body).to.eql({ shelf: [] });
    const added = await post(write, 'add', { key: 'name:Silica' });
    expect(added.body).to.eql({ shelf: ['name:Silica'], changed: true });
    await post(write, 'add', { name: 'Whiting' });
    expect((await User.findById(user._id))!.shelfPrevious).to.eql(['name:Silica']);
    expect((await post(write, 'remove', { key: 'name:Silica' })).body.shelf).to.have.length(1);
    const undone = await post(write, 'undo');
    expect(undone.body.shelf).to.have.length(2);
    expect((await shelf(read)).body.shelf).to.have.length(2);
    // One step, then nothing to undo.
    expect(await post(write, 'undo')).to.have.status(409);
  });

  it('refuses a read-only token on add, remove and undo, changing nothing and logging nothing', async () => {
    const read = await makeToken(user, { scopes: ['data:read'] });
    await post(session, 'add', { key: 'name:Silica' });
    for (const [path, body] of [
      ['add', { key: 'name:Whiting' }],
      ['remove', { key: 'name:Silica' }],
      ['undo', {}]
    ] as const) {
      const res = await post(read, path, body);
      expect(res, path).to.have.status(403);
      expect(res.headers['www-authenticate']).to.include('insufficient_scope').and.include('scope="data:write"');
    }
    expect((await shelf(session)).body).to.eql({ shelf: ['name:Silica'] });
    expect(await Activity.countDocuments({ ownedBy })).to.equal(0);
  });

  it('writes what a token changed to the activity log, and what the website changed to nothing', async () => {
    await post(write, 'add', { name: 'Whiting' });
    await post(write, 'remove', { name: 'Whiting' });
    await post(write, 'undo');
    // Back on the shelf by Undo, so these change nothing, and nothing is logged.
    expect(await post(write, 'add', { name: 'Whiting' })).to.have.status(200);
    expect(await post(write, 'add', { name: 'Whiting' })).to.have.status(200);
    expect(await post(write, 'remove', { key: 'name:Nothing' })).to.have.status(200);
    await post(session, 'add', { key: 'name:Silica' });
    await post(session, 'undo');
    const lines = await Activity.find({ ownedBy }).sort({ at: 1, _id: 1 }).lean();
    expect(lines.map((l) => [l.action, l.fromCollection, l.title, l.via])).to.eql([
      ['change', 'shelf', 'Whiting', 'pat'],
      ['change', 'shelf', 'Whiting', 'pat'],
      ['undo', 'shelf', 'Shelf', 'pat']
    ]);
  });

  it('counts its changes against the limits on changes made with tokens, but not reads', async function () {
    this.timeout(30000);
    process.env.RATE_LIMITS = 'on';
    try {
      for (let i = 0; i < TOKEN_WRITE_LIMITS.minute; i++) {
        expect(await post(write, 'add', { key: 'name:M' + i })).to.have.status(200);
      }
      const over = await post(write, 'add', { key: 'name:Over' });
      expect(over).to.have.status(429);
      expect(over.body.code).to.equal('too-many-changes');
      expect(await post(write, 'remove', { key: 'name:M1' })).to.have.status(429);
      expect(await post(write, 'undo')).to.have.status(429);
      // Reads go on, and so does the website.
      expect(await shelf(write)).to.have.status(200);
      expect(await post(session, 'add', { key: 'name:Website' })).to.have.status(200);
    } finally {
      process.env.RATE_LIMITS = 'off';
    }
  });

  it('never touches another account’s shelf', async () => {
    const other = await makeUser();
    await post(other.token, 'add', { key: 'name:Silica' });
    await post(write, 'add', { key: 'name:Whiting' });
    expect((await shelf(other.token)).body).to.eql({ shelf: ['name:Silica'] });
    expect((await post(write, 'remove', { key: 'name:Silica' })).body.changed).to.equal(false);
    expect((await shelf(other.token)).body).to.eql({ shelf: ['name:Silica'] });
  });
});
