import jwt from 'jsonwebtoken';
import { api, expect, makeUser, uniqueEmail } from './support/app.ts';
import appSecret from '../lib/app_secret.ts';
import User, { type UserDocument } from '../models/user.ts';
import Note from '../models/note.ts';
import Firing from '../models/firing.ts';

type TestUser = Awaited<ReturnType<typeof makeUser>>;

const basic = (address: string, password: string) =>
  'Basic ' + Buffer.from(address + ':' + password).toString('base64');
const signIn = (address: string, password: string) =>
  api().get('/signin').set('Authorization', basic(address, password));
const firing = (owner: UserDocument, title: string) => ({
  title,
  fieldsIncluded: ['Time'],
  rows: [],
  ownedBy: String(owner._id)
});

describe('record ownership and input checks', () => {
  let alice: TestUser;
  let bob: TestUser;

  beforeEach(async () => {
    [alice, bob] = await Promise.all([makeUser(), makeUser()]);
  });

  describe('change routes', () => {
    let aliceNote: { _id: string };
    const changeNote = (token: string, body: object) =>
      api()
        .put('/notes/change/' + aliceNote._id)
        .set('Authorization', 'Bearer ' + token)
        .send(body);
    const storedNote = () => Note.findById(aliceNote._id);

    beforeEach(async () => {
      const res = await api()
        .post('/notes/create')
        .set('Authorization', 'Bearer ' + alice.token)
        .send({ title: 'Mine', content: 'alice only', relatedCollection: 'Notes', relatedId: 'general notes' });
      expect(res).to.have.status(200);
      aliceNote = res.body;
    });

    it('cannot rewrite ownedBy to publish into the standard library', async () => {
      const res = await changeNote(alice.token, { content: 'edited', ownedBy: 'Standard' });
      expect(res).to.have.status(200);
      expect(res.body.msg).to.eql('Successfully updated note');
      const note = await storedNote();
      expect(note!.ownedBy).to.eql(String(alice.user._id));
      expect(note!.content).to.eql('edited');
    });

    it('does not let another user change or delete a record', async () => {
      const change = await changeNote(bob.token, { content: 'bob was here' });
      expect(change).to.have.status(404);
      expect(change.body.msg).to.eql('No note with that id');

      const remove = await api()
        .delete('/notes/delete/' + aliceNote._id)
        .set('Authorization', 'Bearer ' + bob.token);
      expect(remove).to.have.status(404);
      expect(remove.body.msg).to.eql('No note with that id');

      expect((await storedNote())!.content).to.eql('alice only');
    });

    it('refuses an empty body instead of erasing the record', async () => {
      const res = await changeNote(alice.token, {});
      expect(res).to.have.status(400);
      expect(res.body.msg).to.eql('Nothing to update');
      expect((await storedNote())!.content).to.eql('alice only');
    });

    it('refuses to blank out a required field', async () => {
      const res = await changeNote(alice.token, { content: '' });
      expect(res).to.have.status(400);
      expect(res.body.msg).to.eql('Invalid note');
      expect((await storedNote())!.content).to.eql('alice only');
    });

    it('answers not found for an id that does not exist', async () => {
      const res = await api()
        .put('/notes/change/000000000000000000000000')
        .set('Authorization', 'Bearer ' + alice.token)
        .send({ content: 'x' });
      expect(res).to.have.status(404);
      expect(res.body.msg).to.eql('No note with that id');
    });

    it('refuses a wrapped route without its wrapper object', async () => {
      const res = await api()
        .put('/recipe/change/000000000000000000000000')
        .set('Authorization', 'Bearer ' + alice.token)
        .send({ title: 'not wrapped' });
      expect(res).to.have.status(400);
      expect(res.body.msg).to.eql('Missing required information');
    });
  });

  describe('getLatest and getStandard', () => {
    it('returns the newest record', async () => {
      // Created one at a time, so the second has the larger _id.
      await Firing.create(firing(bob.user, 'first'));
      await Firing.create(firing(bob.user, 'second'));
      const res = await api()
        .get('/firing/getLatest')
        .set('Authorization', 'Bearer ' + bob.token);
      expect(res).to.have.status(200);
      expect(res.body.title).to.eql('second');
    });

    it('lists standard additives and advice', async () => {
      for (const path of ['/additives/getStandard', '/advice/getStandard']) {
        const res = await api()
          .get(path)
          .set('Authorization', 'Bearer ' + alice.token);
        expect(res, path).to.have.status(200);
        expect(res.body, path).to.be.an('array');
      }
    });
  });

  describe('sign up and sign in', () => {
    it('rejects an email that is not text', async () => {
      const res = await api()
        .post('/signup')
        .send({ email: { $ne: null }, password: 'password123' });
      expect(res).to.have.status(400);
      expect(res.body.msg).to.eql('Please enter an email');
    });

    it('treats emails without regard to case or spaces', async () => {
      const signup = await api()
        .post('/signup')
        .send({ email: ' ' + alice.email.toUpperCase() + ' ', password: 'password123' });
      expect(signup).to.have.status(400);
      expect(signup.body.msg).to.eql('An account with that email already exists.');

      const mixedCase = alice.email.replace(/[a-z]/g, (c, i: number) => (i % 2 ? c.toUpperCase() : c));
      const res = await signIn(mixedCase, 'password123');
      expect(res).to.have.status(200);
      expect(res.body.email).to.eql(alice.email);
    });

    it('signs in with a password containing colons', async () => {
      const address = uniqueEmail('colon');
      expect(await api().post('/signup').send({ email: address, password: 'pass:word:123' })).to.have.status(200);
      const res = await signIn(address, 'pass:word:123');
      expect(res).to.have.status(200);
      expect(res.body.email).to.eql(address);
    });

    it('refuses an unknown email and a malformed header', async () => {
      const unknown = await signIn(uniqueEmail('nobody'), 'password123');
      expect(unknown).to.have.status(401);
      expect(unknown.body.msg).to.eql('Email or password is incorrect.');

      const malformed = await api().get('/signin').set('Authorization', 'Basic !!!notbase64');
      expect(malformed).to.have.status(401);
      expect(malformed.body.msg).to.eql('could not authenticate user');
    });

    it('refuses expired tokens and tokens signed with another secret', async () => {
      const id = alice.user._id;
      const expired = jwt.sign({ id, exp: Math.floor(Date.now() / 1000) - 60 }, appSecret);
      const forged = jwt.sign({ id }, 'not-the-secret');
      for (const token of [expired, forged]) {
        const res = await api()
          .get('/notes/getAll')
          .set('Authorization', 'Bearer ' + token);
        expect(res).to.have.status(401);
        expect(res.body.msg).to.eql('could not authenticate user');
      }
      // The same token, current and signed with the app's secret, works.
      expect(
        await api()
          .get('/notes/getAll')
          .set('Authorization', 'Bearer ' + jwt.sign({ id }, appSecret))
      ).to.have.status(200);
    });
  });

  describe('accounts', () => {
    let admin: TestUser;

    beforeEach(async () => {
      admin = await makeUser({ role: 'admin' });
    });

    it('lets an admin change another account', async () => {
      const res = await api()
        .put('/usersettings/' + bob.user._id)
        .set('Authorization', 'Bearer ' + admin.token)
        .send({ displayname: 'Bobby' });
      expect(res).to.have.status(200);
      expect(res.body.msg).to.eql('User updated');
      expect((await User.findById(bob.user._id))!.displayname).to.eql('Bobby');
    });

    it('rejects a non-text email in settings', async () => {
      const res = await api()
        .put('/usersettings/' + bob.user._id)
        .set('Authorization', 'Bearer ' + bob.token)
        .send({ email: { $gt: '' } });
      expect(res).to.have.status(400);
      expect(res.body.msg).to.eql('Please enter an email');
      expect((await User.findById(bob.user._id))!.email).to.eql(bob.email);
    });

    it('removes an account together with its records', async () => {
      await Firing.create([firing(bob.user, 'bob 1'), firing(bob.user, 'bob 2'), firing(alice.user, 'alice 1')]);
      const res = await api()
        .delete('/deleteuser/' + bob.user._id)
        .set('Authorization', 'Bearer ' + admin.token);
      expect(res).to.have.status(200);
      expect(res.body.msg).to.eql('User deleted');
      expect(await User.findById(bob.user._id)).to.eql(null);
      expect(await Firing.countDocuments({ ownedBy: String(bob.user._id) })).to.eql(0);
      // Only that account's records.
      expect(await Firing.countDocuments({ ownedBy: String(alice.user._id) })).to.eql(1);
    });

    it('reads an id in capitals as the same account', async () => {
      // An admin's own email still needs the admin's password, so a stolen token cannot take the account.
      const own = await api()
        .put('/usersettings/' + String(admin.user._id).toUpperCase())
        .set('Authorization', 'Bearer ' + admin.token)
        .send({ email: uniqueEmail('taken') });
      expect(own).to.have.status(400);
      expect(own.body.code).to.eql('current-password-needed');
      expect((await User.findById(admin.user._id))!.email).to.eql(admin.email);
      // And another account goes with all its records.
      await Firing.create([firing(bob.user, 'bob 1')]);
      const removed = await api()
        .delete('/deleteuser/' + String(bob.user._id).toUpperCase())
        .set('Authorization', 'Bearer ' + admin.token);
      expect(removed).to.have.status(200);
      expect(await User.findById(bob.user._id)).to.eql(null);
      expect(await Firing.countDocuments({ ownedBy: String(bob.user._id) })).to.eql(0);
    });
  });

  describe('malformed requests', () => {
    it('answers bad JSON with a short JSON error, not a stack trace', async () => {
      const res = await api().post('/signup').set('Content-Type', 'application/json').send('{bad');
      expect(res).to.have.status(400);
      expect(res.body).to.eql({ code: 'bad-request', msg: 'Bad request' });
    });
  });
});
