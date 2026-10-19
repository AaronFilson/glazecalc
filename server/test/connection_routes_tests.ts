// Connected apps (server/routes/connection_routes.ts): the list with its
// counts, the activity pages, the Trash a connection filled and putting it all
// back, and revoking. Every query is the account's own.
import { Types } from 'mongoose';
import { ACTIVITY_PAGE } from '../routes/connection_routes.ts';
import { mintToken } from '../lib/token_auth.ts';
import AccessToken from '../models/access_token.ts';
import Activity, { type ActivityAction } from '../models/activity.ts';
import Recipe from '../models/recipe.ts';
import Trash from '../models/trash.ts';
import type { UserDocument } from '../models/user.ts';
import { api, expect, makeUser } from './support/app.ts';

const DAY = 24 * 60 * 60 * 1000;
const bearer = (token: string | null) => 'Bearer ' + token;
const recipe = { title: 'Celadon', materials: [{ name: 'Silica', amount: '30' }] };

/** A token row for the user, with its token. */
const connect = async (
  user: UserDocument,
  {
    kind = 'pat',
    name = 'Claude Code',
    scopes = ['data:read'],
    ...more
  }: { kind?: 'pat' | 'oauth'; name?: string; scopes?: string[]; [field: string]: unknown } = {}
) => {
  const { token, hash, hint } = mintToken('pat');
  const row = await AccessToken.create({
    kind,
    userId: user._id,
    name,
    hash,
    hint,
    scopes,
    expiresAt: new Date(Date.now() + 30 * DAY),
    ...more
  });
  return { token, id: String(row._id) };
};

describe('Connected apps', () => {
  let user: UserDocument;
  let session: string;
  const get = (path: string, as = session) =>
    api()
      .get('/connections' + path)
      .set('Authorization', bearer(as));
  const post = (path: string, as = session) =>
    api()
      .post('/connections' + path)
      .set('Authorization', bearer(as));
  const del = (path: string, as = session) =>
    api()
      .delete('/connections' + path)
      .set('Authorization', bearer(as));

  beforeEach(async () => {
    ({ user, token: session } = await makeUser());
  });

  describe('the list', () => {
    it('lists personal tokens and OAuth connections with what each may do, and never a hash', async () => {
      const pat = await connect(user, { name: 'Script', lastUsedAt: new Date() });
      const oauth = await connect(user, {
        kind: 'oauth',
        name: 'Claude',
        scopes: ['data:read', 'data:write'],
        clientHost: 'claude.ai',
        redirectHost: 'claude.ai'
      });
      const res = await get('');
      expect(res).to.have.status(200);
      const [newest, older] = res.body.connections;
      expect(newest).to.include({
        id: oauth.id,
        kind: 'oauth',
        name: 'Claude',
        access: 'write',
        clientHost: 'claude.ai',
        redirectHost: 'claude.ai',
        working: true
      });
      expect(older).to.include({ id: pat.id, kind: 'pat', name: 'Script', access: 'read', working: true });
      expect(older.hint).to.equal(pat.token.slice(-4));
      expect(older).to.have.property('lastUsedAt');
      expect(newest).not.to.have.property('hint');
      expect(JSON.stringify(res.body)).not.to.match(/"hash"/);
      expect(JSON.stringify(res.body)).not.to.include(pat.token);
      expect(older.changes).to.eql({ create: 0, change: 0, trash: 0, restore: 0, undo: 0 });
    });

    it('says when one is revoked or has expired', async () => {
      const revoked = await connect(user, { name: 'Old', revokedAt: new Date() });
      const expired = await connect(user, { name: 'Expired', expiresAt: new Date(Date.now() - DAY) });
      const { connections } = (await get('')).body;
      expect(connections.find((c: { id: string }) => c.id === revoked.id)).to.include({ working: false });
      expect(connections.find((c: { id: string }) => c.id === expired.id)).to.include({ working: false });
    });

    it('counts the last 90 days of what each did, by action, in one place', async () => {
      const one = await connect(user, { name: 'One', scopes: ['data:write'] });
      const two = await connect(user, { name: 'Two', scopes: ['data:write'] });
      const ownedBy = String(user._id);
      const line = (id: string, action: ActivityAction, at = new Date()) => ({
        ownedBy,
        via: 'pat' as const,
        tokenId: id,
        client: 'x',
        action,
        fromCollection: 'recipes',
        at
      });
      await Activity.create([
        line(one.id, 'create'),
        line(one.id, 'change'),
        line(one.id, 'change'),
        line(one.id, 'trash'),
        line(one.id, 'change', new Date(Date.now() - 91 * DAY)),
        line(two.id, 'restore')
      ]);
      // Another account's lines under the same token id never count.
      await Activity.create({ ...line(one.id, 'create'), ownedBy: new Types.ObjectId().toHexString() });
      const { connections } = (await get('')).body;
      const by = (id: string) => connections.find((c: { id: string }) => c.id === id).changes;
      expect(by(one.id)).to.eql({ create: 1, change: 2, trash: 1, restore: 0, undo: 0 });
      expect(by(two.id)).to.eql({ create: 0, change: 0, trash: 0, restore: 1, undo: 0 });
    });

    it('lists only the account’s own, and only to the web session', async () => {
      const { user: other } = await makeUser();
      await connect(other, { name: 'Not yours' });
      const mine = await connect(user, { name: 'Mine' });
      const { connections } = (await get('')).body;
      expect(connections.map((c: { name: string }) => c.name)).to.eql(['Mine']);
      // A token cannot see the list, not even its own.
      expect(await get('', mine.token)).to.have.status(403);
      expect(await api().get('/connections')).to.have.status(401);
    });

    it('is not for a trial', async () => {
      const started = await api().post('/guest');
      const cookie = String(started.headers['set-cookie']).match(/glazecalc_session=([^;]*)/)![1]!;
      expect(await get('', cookie)).to.have.status(403);
    });
  });

  describe('activity', () => {
    const lines = async (tokenId: string, count: number, ownedBy = String(user._id)) => {
      const start = Date.now() - count * 1000;
      await Activity.create(
        Array.from({ length: count }, (_x, i) => ({
          ownedBy,
          via: 'pat' as const,
          tokenId,
          client: 'x',
          action: 'change' as const,
          fromCollection: 'recipes',
          title: 'Glaze ' + i,
          at: new Date(start + i * 1000)
        }))
      );
    };

    it('pages 50 at a time, newest first, with no line twice or missed', async () => {
      const { id } = await connect(user);
      await lines(id, ACTIVITY_PAGE * 2 + 5);
      const first = (await get(`/${id}/activity`)).body;
      expect(first.activity).to.have.length(ACTIVITY_PAGE);
      expect(first.activity[0].title).to.equal('Glaze 104');
      expect(first.next).to.be.a('string');
      const second = (await get(`/${id}/activity?before=${first.next}`)).body;
      expect(second.activity).to.have.length(ACTIVITY_PAGE);
      const third = (await get(`/${id}/activity?before=${second.next}`)).body;
      expect(third.activity).to.have.length(5);
      expect(third.next).to.equal(null);
      const titles = [...first.activity, ...second.activity, ...third.activity].map((l: { title: string }) => l.title);
      expect(new Set(titles).size).to.equal(ACTIVITY_PAGE * 2 + 5);
    });

    it('does not lose lines written in the same millisecond', async () => {
      const { id } = await connect(user);
      const at = new Date();
      await Activity.create(
        Array.from({ length: ACTIVITY_PAGE + 3 }, (_x, i) => ({
          ownedBy: String(user._id),
          via: 'pat' as const,
          tokenId: id,
          client: 'x',
          action: 'create' as const,
          fromCollection: 'recipes',
          title: 'Same ' + i,
          at
        }))
      );
      const first = (await get(`/${id}/activity`)).body;
      const second = (await get(`/${id}/activity?before=${first.next}`)).body;
      expect(second.activity).to.have.length(3);
      const ids = [...first.activity, ...second.activity].map((l: { id: string }) => l.id);
      expect(new Set(ids).size).to.equal(ACTIVITY_PAGE + 3);
    });

    it('keeps one connection’s lines from another’s and refuses a bad cursor', async () => {
      const a = await connect(user, { name: 'A' });
      const b = await connect(user, { name: 'B' });
      await lines(a.id, 2);
      await lines(b.id, 3);
      expect((await get(`/${a.id}/activity`)).body.activity).to.have.length(2);
      expect((await get(`/${b.id}/activity`)).body.activity).to.have.length(3);
      for (const before of ['nope', '1-2', 'x'.repeat(40)]) {
        expect(await get(`/${a.id}/activity?before=${before}`), before).to.have.status(400);
      }
    });

    it('is the account’s own: another account’s connection, a bad id, a session’s own id', async () => {
      const { user: other, token: otherSession } = await makeUser();
      const theirs = await connect(other);
      await lines(theirs.id, 1, String(other._id));
      expect(await get(`/${theirs.id}/activity`)).to.have.status(404);
      expect(await get(`/${new Types.ObjectId()}/activity`)).to.have.status(404);
      expect(await get('/not-an-id/activity')).to.have.status(400);
      expect((await get(`/${theirs.id}/activity`, otherSession)).body.activity).to.have.length(1);
      // The same id under another account's lines shows nothing of theirs to me.
      const mine = await connect(user);
      await lines(mine.id, 1, String(other._id));
      expect((await get(`/${mine.id}/activity`)).body.activity).to.eql([]);
    });
  });

  describe('the Trash a connection filled', () => {
    const create = async (token: string, title = 'Celadon') =>
      (
        await api()
          .post('/recipe/create')
          .set('Authorization', bearer(token))
          .send({ ...recipe, title })
      ).body as {
        _id: string;
      };
    const remove = (id: string, token: string) =>
      api()
        .delete('/recipe/delete/' + id)
        .set('Authorization', bearer(token));

    it('marks what a token moves with its id, and lists it with Restore data', async () => {
      const one = await connect(user, { name: 'One', scopes: ['data:read', 'data:write'] });
      const two = await connect(user, { name: 'Two', scopes: ['data:read', 'data:write'] });
      const a = await create(one.token, 'Made by one');
      const b = await create(two.token, 'Made by two');
      await remove(a._id, one.token);
      await remove(b._id, two.token);
      // Removed on the website: nobody's but the person's own.
      const own = await create(session, 'Mine');
      await api()
        .delete('/recipe/delete/' + own._id)
        .set('Authorization', bearer(session));

      expect((await Trash.findOne({ recordId: a._id }).lean())!.tokenId!.toString()).to.equal(one.id);
      expect((await Trash.findOne({ recordId: own._id }).lean())!.tokenId).to.equal(undefined);

      const { entries } = (await get(`/${one.id}/trash`)).body;
      expect(entries).to.have.length(1);
      expect(entries[0]).to.include({ title: 'Made by one', fromCollection: 'recipes', label: 'recipe' });
      expect(entries[0]).to.have.property('expiresAt');
      expect(entries[0]).not.to.have.property('record');
      expect((await get(`/${two.id}/trash`)).body.entries.map((e: { title: string }) => e.title)).to.eql([
        'Made by two'
      ]);
    });

    it('finds older entries, with no id on them, by the activity log’s trash lines', async () => {
      const one = await connect(user, { scopes: ['data:write'] });
      const ownedBy = String(user._id);
      const recordId = new Types.ObjectId();
      await Trash.create({
        ownedBy,
        fromCollection: 'recipes',
        recordId,
        record: { ...recipe, _id: recordId, ownedBy },
        title: 'Before',
        trashedAt: new Date(),
        by: 'pat'
      });
      // One the person trashed themselves later, with no line for it, and one a session moved: not listed.
      const sessionId = new Types.ObjectId();
      await Trash.create({
        ownedBy,
        fromCollection: 'recipes',
        recordId: sessionId,
        record: { ...recipe, _id: sessionId, ownedBy },
        title: 'Session',
        trashedAt: new Date(),
        by: 'session'
      });
      await Activity.create([
        { ownedBy, via: 'pat', tokenId: one.id, client: 'x', action: 'trash', fromCollection: 'recipes', recordId },
        {
          ownedBy,
          via: 'pat',
          tokenId: one.id,
          client: 'x',
          action: 'trash',
          fromCollection: 'recipes',
          recordId: sessionId
        }
      ]);
      expect((await get(`/${one.id}/trash`)).body.entries.map((e: { title: string }) => e.title)).to.eql(['Before']);
    });

    it('puts everything back, and leaves what would clash in the Trash', async () => {
      const one = await connect(user, { scopes: ['data:read', 'data:write'] });
      const ids = [await create(one.token, 'A'), await create(one.token, 'B'), await create(one.token, 'C')];
      for (const { _id } of ids) await remove(_id, one.token);
      // B is back in its list already, as a backup restored would bring it.
      await Recipe.collection.insertOne({
        ...recipe,
        title: 'B again',
        _id: new Types.ObjectId(ids[1]!._id),
        ownedBy: String(user._id)
      });
      const res = await post(`/${one.id}/restore-all`);
      expect(res).to.have.status(200);
      expect(res.body).to.include({ code: 'connection-restored-skipped', count: 2, skipped: 1 });
      expect(res.body.msg).to.include('2 records were put back');
      const titles = (await Recipe.find({ ownedBy: String(user._id) }).lean()).map((r) => r.title).sort();
      expect(titles).to.eql(['A', 'B again', 'C']);
      // The clash stays in the Trash, still its own.
      const left = (await get(`/${one.id}/trash`)).body.entries;
      expect(left.map((e: { recordId: string }) => e.recordId)).to.eql([ids[1]!._id]);
      // Nothing more to put back the second time.
      const again = await post(`/${one.id}/restore-all`);
      expect(again.body).to.include({ code: 'connection-restored-skipped', count: 0, skipped: 1 });
    });

    it('says plainly when nothing was in the Trash', async () => {
      const one = await connect(user);
      const res = await post(`/${one.id}/restore-all`);
      expect(res.body).to.include({ code: 'connection-restored', count: 0, skipped: 0 });
    });

    it('puts back nothing that another account’s connection, or the person, moved', async () => {
      const { user: other } = await makeUser();
      const theirs = await connect(other, { scopes: ['data:read', 'data:write'] });
      const mine = await connect(user, { scopes: ['data:read', 'data:write'] });
      const made = await create(theirs.token, 'Theirs');
      await remove(made._id, theirs.token);
      const own = await create(session, 'Own');
      await api()
        .delete('/recipe/delete/' + own._id)
        .set('Authorization', bearer(session));
      // Their connection is not mine to use, in any of its paths.
      expect(await post(`/${theirs.id}/restore-all`)).to.have.status(404);
      expect(await get(`/${theirs.id}/trash`)).to.have.status(404);
      expect((await post(`/${mine.id}/restore-all`)).body.count).to.equal(0);
      expect(await Trash.countDocuments({ ownedBy: String(other._id) })).to.equal(1);
      expect(await Trash.countDocuments({ ownedBy: String(user._id) })).to.equal(1);
    });
  });

  describe('revoking', () => {
    it('revokes one, so it stops working, and keeps its row; a second time is no error', async () => {
      const pat = await connect(user, { name: 'Script' });
      const keep = await connect(user, { name: 'Keep' });
      expect(await api().get('/recipe/getAll').set('Authorization', bearer(pat.token))).to.have.status(200);
      const res = await del('/' + pat.id);
      expect(res).to.have.status(200);
      expect(res.body.code).to.equal('token-revoked');
      expect(await api().get('/recipe/getAll').set('Authorization', bearer(pat.token))).to.have.status(401);
      expect(await api().get('/recipe/getAll').set('Authorization', bearer(keep.token))).to.have.status(200);
      const row = await AccessToken.findById(pat.id).lean();
      expect(row).to.include({ revokedWhy: 'person' });
      expect(await del('/' + pat.id)).to.have.status(200);
      const listed = (await get('')).body.connections.find((c: { id: string }) => c.id === pat.id);
      expect(listed.working).to.equal(false);
    });

    it('revokes an OAuth connection by the same path', async () => {
      const grant = await connect(user, { kind: 'oauth', name: 'Claude' });
      expect(await del('/' + grant.id)).to.have.status(200);
      expect((await AccessToken.findById(grant.id).lean())!.revokedAt).to.be.instanceOf(Date);
    });

    it('revokes all of them, and only the account’s own', async () => {
      const { user: other } = await makeUser();
      const theirs = await connect(other);
      await connect(user, { name: 'A' });
      await connect(user, { kind: 'oauth', name: 'B' });
      const res = await del('');
      expect(res).to.have.status(200);
      expect(res.body).to.include({ code: 'tokens-revoked' });
      expect(res.body.params).to.eql({ count: 2 });
      expect(await AccessToken.countDocuments({ userId: user._id, revokedAt: null })).to.equal(0);
      expect(await api().get('/recipe/getAll').set('Authorization', bearer(theirs.token))).to.have.status(200);
    });

    it('will not revoke another account’s, and no token can revoke anything', async () => {
      const { user: other } = await makeUser();
      const theirs = await connect(other);
      const mine = await connect(user);
      expect(await del('/' + theirs.id)).to.have.status(404);
      expect(await del('/not-an-id')).to.have.status(400);
      expect(await del('/' + mine.id, mine.token)).to.have.status(403);
      expect(await del('', mine.token)).to.have.status(403);
      expect(await post(`/${mine.id}/restore-all`, mine.token)).to.have.status(403);
      expect(await api().get('/recipe/getAll').set('Authorization', bearer(theirs.token))).to.have.status(200);
      expect(await api().get('/recipe/getAll').set('Authorization', bearer(mine.token))).to.have.status(200);
    });
  });
});

describe('Trash marks the token that moved a record', () => {
  it('stores the token id from the REST routes and not for the web session', async () => {
    const { user, token: session } = await makeUser();
    const { token, id } = await connect(user, { scopes: ['data:read', 'data:write'] });
    const made = (await api().post('/recipe/create').set('Authorization', bearer(token)).send(recipe)).body;
    await api()
      .delete('/recipe/delete/' + made._id)
      .set('Authorization', bearer(token));
    const entry = await Trash.findOne({ recordId: made._id }).lean();
    expect(entry).to.include({ by: 'pat' });
    expect(String(entry!.tokenId)).to.equal(id);
    const own = (await api().post('/recipe/create').set('Authorization', bearer(session)).send(recipe)).body;
    await api()
      .delete('/recipe/delete/' + own._id)
      .set('Authorization', bearer(session));
    expect((await Trash.findOne({ recordId: own._id }).lean())!.tokenId).to.equal(undefined);
  });
});
