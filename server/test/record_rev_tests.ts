import { Types } from 'mongoose';
import { addMissingRevs } from '../lib/record_rev_migration.ts';
import { ifMatchOf, revFilter, revOf } from '../lib/record_rev.ts';
import Note from '../models/note.ts';
import Recipe from '../models/recipe.ts';
import Trash from '../models/trash.ts';
import User, { type UserDocument } from '../models/user.ts';
import { api, expect, makeUser } from './support/app.ts';

const bearer = (token: string) => 'Bearer ' + token;
const recipe = { title: 'Celadon', materials: [{ name: 'Silica', amount: '30' }] };

describe('Record revisions: rev, updatedAt and If-Match', () => {
  let user: UserDocument;
  let token: string;
  beforeEach(async () => {
    ({ user, token } = await makeUser());
  });

  const create = async (body: object = recipe) =>
    (await api().post('/recipe/create').set('Authorization', bearer(token)).send(body)).body as {
      _id: string;
      rev: number;
      updatedAt: string;
    };
  const change = (id: string, title: string, match?: string) => {
    const req = api()
      .put('/recipe/change/' + id)
      .set('Authorization', bearer(token));
    return (match === undefined ? req : req.set('If-Match', match)).send({ recipe: { title } });
  };
  const remove = (id: string, match?: string) => {
    const req = api()
      .delete('/recipe/delete/' + id)
      .set('Authorization', bearer(token));
    return match === undefined ? req : req.set('If-Match', match);
  };
  const stored = async (id: string) => (await Recipe.findById(id).lean())!;

  it('makes a record at rev 0 with the time it was made', async () => {
    const saved = await create();
    expect(saved.rev).to.equal(0);
    expect(new Date(saved.updatedAt).getTime()).to.be.closeTo(Date.now(), 60000);
  });

  it('changes a record whose If-Match is its rev, answers the new rev and keeps counting', async () => {
    const saved = await create();
    const first = await change(saved._id, 'Celadon 2', '"0"');
    expect(first).to.have.status(200);
    expect(first.body.code).to.equal('record-updated');
    expect(first.body.rev).to.equal(1);
    expect(new Date(first.body.updatedAt).getTime()).to.be.at.least(new Date(saved.updatedAt).getTime());
    const second = await change(saved._id, 'Celadon 3', '"1"');
    expect(second).to.have.status(200);
    expect(second.body.rev).to.equal(2);
    const row = await stored(saved._id);
    expect(row).to.include({ title: 'Celadon 3', rev: 2 });
  });

  it('refuses a change from a stale rev with 409 and the record as it is now, changing nothing', async () => {
    const saved = await create();
    expect(await change(saved._id, 'Theirs', '"0"')).to.have.status(200);
    const stale = await change(saved._id, 'Mine', '"0"');
    expect(stale).to.have.status(409);
    expect(stale.body.code).to.equal('record-conflict');
    expect(stale.body.msg).to.be.a('string');
    expect(stale.body.record).to.include({ _id: saved._id, title: 'Theirs', rev: 1 });
    expect((await stored(saved._id)).title).to.equal('Theirs');
  });

  it('lets the last write win when there is no If-Match, and still counts it', async () => {
    const saved = await create();
    expect(await change(saved._id, 'Theirs', '"0"')).to.have.status(200);
    const blind = await change(saved._id, 'Mine');
    expect(blind).to.have.status(200);
    expect(blind.body.rev).to.equal(2);
    expect(await change(saved._id, 'Star', '*')).to.have.status(200);
    expect((await stored(saved._id)).title).to.equal('Star');
  });

  it('answers record-gone for a change or removal that names a rev when the record is not there', async () => {
    const gone = new Types.ObjectId().toString();
    const changed = await change(gone, 'Nobody', '"0"');
    expect(changed).to.have.status(404);
    expect(changed.body.code).to.equal('record-gone');
    const removed = await remove(gone, '"0"');
    expect(removed).to.have.status(404);
    expect(removed.body.code).to.equal('record-gone');
    // Without a rev it says what it always said.
    expect((await change(gone, 'Nobody')).body.code).to.equal('record-not-found');
    expect((await remove(gone)).body.code).to.equal('record-not-found');
  });

  it('does not trash a record removed from a stale rev, and trashes one removed from its own', async () => {
    const saved = await create();
    expect(await change(saved._id, 'Theirs', '"0"')).to.have.status(200);
    const stale = await remove(saved._id, '"0"');
    expect(stale).to.have.status(409);
    expect(stale.body.code).to.equal('record-conflict');
    expect(stale.body.record).to.include({ title: 'Theirs', rev: 1 });
    expect(await Trash.countDocuments({ ownedBy: String(user._id) })).to.equal(0);
    expect(await Recipe.countDocuments({ _id: saved._id })).to.equal(1);
    const fresh = await remove(saved._id, '"1"');
    expect(fresh).to.have.status(200);
    expect(await Trash.countDocuments({ ownedBy: String(user._id) })).to.equal(1);
  });

  it('counts an undo as a change and refuses one from a stale rev', async () => {
    const saved = await create();
    await change(saved._id, 'Second', '"0"');
    const stale = await api()
      .post('/recipe/undo/' + saved._id)
      .set('Authorization', bearer(token))
      .set('If-Match', '"0"');
    expect(stale).to.have.status(409);
    expect((await stored(saved._id)).title).to.equal('Second');
    const undone = await api()
      .post('/recipe/undo/' + saved._id)
      .set('Authorization', bearer(token))
      .set('If-Match', '"1"');
    expect(undone).to.have.status(200);
    expect(undone.body.record).to.include({ title: 'Celadon', rev: 2 });
    const blind = await api()
      .post('/recipe/undo/' + saved._id)
      .set('Authorization', bearer(token));
    expect(blind).to.have.status(200);
    expect(blind.body.record).to.include({ title: 'Second', rev: 3 });
  });

  it('counts putting a record back from the Trash as a change', async () => {
    const saved = await create();
    await change(saved._id, 'Second', '"0"');
    const removed = await remove(saved._id, '"1"');
    const restored = await api()
      .post('/trash/restore/' + removed.body.trashId)
      .set('Authorization', bearer(token));
    expect(restored).to.have.status(200);
    expect(restored.body.record.rev).to.equal(2);
    expect((await stored(saved._id)).rev).to.equal(2);
  });

  it('counts changes to notes too', async () => {
    const made = await api()
      .post('/notes/create')
      .set('Authorization', bearer(token))
      .send({ content: 'Fires clear', relatedCollection: 'Notes', relatedId: 'general notes' });
    expect(made).to.have.status(200);
    expect(made.body.rev).to.equal(0);
    const stale = await api()
      .put('/notes/change/' + made.body._id)
      .set('Authorization', bearer(token))
      .set('If-Match', '"3"')
      .send({ content: 'Never saved' });
    expect(stale).to.have.status(409);
    expect((await Note.findById(made.body._id).lean())!.content).to.equal('Fires clear');
  });

  it('counts the preferences and the prices as the account changes them', async () => {
    const revs = async () => {
      const row = (await User.findById(user._id).lean()) as unknown as { prefsRev?: number; pricesRev?: number };
      return [row.prefsRev ?? 0, row.pricesRev ?? 0];
    };
    expect(await revs()).to.eql([0, 0]);
    await api().put('/preferences').set('Authorization', bearer(token)).send({ theme: 'dark' });
    expect(await revs()).to.eql([1, 0]);
    await api()
      .patch('/prices')
      .set('Authorization', bearer(token))
      .send({ set: [{ key: 'name:Silica', perKg: 2 }] });
    expect(await revs()).to.eql([1, 1]);
    await api()
      .put('/prices')
      .set('Authorization', bearer(token))
      .send({ prices: [{ key: 'name:Silica', perKg: 3 }] });
    expect(await revs()).to.eql([1, 2]);
  });

  it('sends prefsRev and pricesRev with the preferences and the prices', async () => {
    const get = async (path: string) => (await api().get(path).set('Authorization', bearer(token))).body;
    expect((await get('/preferences')).prefsRev).to.equal(0);
    expect((await get('/prices')).pricesRev).to.equal(0);
    const put = await api().put('/preferences').set('Authorization', bearer(token)).send({ theme: 'dark' });
    expect(put.body).to.include({ theme: 'dark', prefsRev: 1 });
    expect((await get('/preferences')).prefsRev).to.equal(1);
    const patch = await api()
      .patch('/prices')
      .set('Authorization', bearer(token))
      .send({ set: [{ key: 'name:Silica', perKg: 2 }] });
    expect(patch.body.pricesRev).to.equal(1);
    const replaced = await api()
      .put('/prices')
      .set('Authorization', bearer(token))
      .send({ prices: [{ key: 'name:Silica', perKg: 3 }] });
    expect(replaced.body.pricesRev).to.equal(2);
    expect((await get('/prices')).pricesRev).to.equal(2);
  });

  it('counts advice like the other records', async () => {
    const made = await api()
      .post('/advice/create')
      .set('Authorization', bearer(token))
      .send({ title: 'Tip', content: 'Sieve it', tags: ['mixing'] });
    expect(made).to.have.status(200);
    expect(made.body.rev).to.equal(0);
    const changed = await api()
      .put('/advice/change/' + made.body._id)
      .set('Authorization', bearer(token))
      .set('If-Match', '"0"')
      .send({ title: 'Tip 2' });
    expect(changed).to.have.status(200);
    expect(changed.body.rev).to.equal(1);
    const stale = await api()
      .put('/advice/change/' + made.body._id)
      .set('Authorization', bearer(token))
      .set('If-Match', '"0"')
      .send({ title: 'Lost' });
    expect(stale).to.have.status(409);
    expect(stale.body.record.title).to.equal('Tip 2');
  });

  describe('the helpers', () => {
    it('read If-Match as a count, and anything else as no check', () => {
      const of = (value?: string) => ifMatchOf({ headers: value === undefined ? {} : { 'if-match': value } });
      expect(of('"3"')).to.equal(3);
      expect(of('W/"12"')).to.equal(12);
      expect(of('7')).to.equal(7);
      expect(of('*')).to.equal(undefined);
      expect(of('"abc"')).to.equal(undefined);
      expect(of('"-1"')).to.equal(undefined);
      expect(of()).to.equal(undefined);
    });

    it('read a record with no rev as 0', () => {
      expect(revOf({})).to.equal(0);
      expect(revOf(null)).to.equal(0);
      expect(revOf({ rev: 4 })).to.equal(4);
      expect(revOf({ rev: -1 })).to.equal(0);
      expect(revFilter(undefined)).to.eql({});
      expect(revFilter(2)).to.eql({ rev: 2 });
      expect(revFilter(0)).to.have.property('$or');
    });
  });

  describe('the start-up migration', () => {
    it('gives older records a rev of 0 once, and leaves counted ones alone', async () => {
      const owner = String(user._id);
      const old = new Types.ObjectId();
      await Recipe.collection.insertOne({ ...recipe, _id: old, ownedBy: owner });
      const counted = await create();
      await change(counted._id, 'Changed', '"0"');
      await User.collection.updateOne({ _id: user._id }, { $unset: { prefsRev: 1, pricesRev: 1 } });

      const first = await addMissingRevs();
      expect(first.records).to.be.at.least(1);
      expect(first.accounts).to.be.at.least(1);
      expect(await Recipe.collection.countDocuments({ rev: { $exists: false } })).to.equal(0);
      expect(((await Recipe.collection.findOne({ _id: old })) as { rev?: number }).rev).to.equal(0);
      expect((await stored(counted._id)).rev).to.equal(1);
      const row = (await User.collection.findOne({ _id: user._id })) as { prefsRev?: number; pricesRev?: number };
      expect([row.prefsRev, row.pricesRev]).to.eql([0, 0]);

      const second = await addMissingRevs();
      expect(second).to.eql({ records: 0, accounts: 0 });
    });

    it('lets a record with no rev be changed from If-Match 0', async () => {
      const old = new Types.ObjectId();
      await Recipe.collection.insertOne({ ...recipe, _id: old, ownedBy: String(user._id) });
      expect(await change(String(old), 'Now counted', '"0"')).to.have.status(200);
      expect((await stored(String(old))).rev).to.equal(1);
    });
  });
});
