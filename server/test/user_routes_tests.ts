import User, { type UserDocument } from '../models/user.ts';
import { api, expect, makeUser, uniqueEmail } from './support/app.ts';

// Checking a sign-in, and changing or deleting accounts. The password checks on
// email changes and deletes are covered in account_password_tests.ts.
describe('user API', () => {
  let user: UserDocument;
  let token: string;

  beforeEach(async () => {
    ({ user, token } = await makeUser());
  });

  describe('verify', () => {
    it('answers with the signed-in account', async () => {
      user.displayname = 'Test Potter';
      await user.save();
      const res = await api()
        .get('/verify')
        .set('Authorization', 'Bearer ' + token);
      expect(res).to.have.status(200);
      expect(res.body).to.eql({ msg: 'User verified', id: String(user._id), name: 'Test Potter', email: user.email });
    });

    it('says goodbye, without an error, when there is no token yet', async () => {
      // Before sign-in the client sends the string 'null', or no token at all.
      for (const req of [
        api()
          .get('/verify')
          .set('Authorization', 'Bearer ' + 'null'),
        api().get('/verify').set('trashdata', 'junk')
      ]) {
        const res = await req;
        expect(res).to.have.status(200);
        expect(res.body.msg).to.eql('No token yet, so there is no email to find. Goodbye.');
      }
    });

    it('refuses a token that does not check out', async () => {
      const res = await api()
        .get('/verify')
        .set('Authorization', 'Bearer ' + 'not-a-token');
      expect(res).to.have.status(401);
    });
  });

  describe('your own account', () => {
    it('changes your email when you give your password', async () => {
      const address = uniqueEmail('changed');
      const res = await api()
        .put('/usersettings/' + user._id)
        .set('Authorization', 'Bearer ' + token)
        .send({ email: address, password: 'password123' });
      expect(res).to.have.status(200);
      expect(res.body.msg).to.eql('User updated');
      expect((await User.findById(user._id))!.email).to.eql(address);
    });

    it('deletes your account when you give your password', async () => {
      const res = await api()
        .delete('/deleteuser/' + user._id)
        .set('Authorization', 'Bearer ' + token)
        .send({ password: 'password123' });
      expect(res).to.have.status(200);
      expect(res.body.msg).to.eql('User deleted');
      expect(await User.findById(user._id)).to.eql(null);
    });

    it('ignores role and password in settings changes', async () => {
      const res = await api()
        .put('/usersettings/' + user._id)
        .set('Authorization', 'Bearer ' + token)
        .send({ role: 'admin', password: 'plaintext', displayname: 'Victim' });
      expect(res).to.have.status(200);
      const stored = (await User.findById(user._id))!;
      expect(stored.role).to.eql(undefined);
      expect(stored.displayname).to.eql('Victim');
      expect(stored.comparePassword('password123')).to.eql(true);
    });

    it('does not take an email already in use, whatever its case', async () => {
      const other = await makeUser();
      const res = await api()
        .put('/usersettings/' + user._id)
        .set('Authorization', 'Bearer ' + token)
        .send({ email: other.email.toUpperCase(), password: 'password123' });
      expect(res).to.have.status(400);
      expect(res.body.msg).to.eql('That email is already in use');
      expect((await User.findById(user._id))!.email).to.eql(user.email);
    });

    it('does not sign up a second account with the same email', async () => {
      const res = await api().post('/signup').send({ email: user.email, password: 'password123' });
      expect(res).to.have.status(400);
      expect(res.body.msg).to.eql('An account with that email already exists.');
    });
  });

  describe('other accounts', () => {
    let attackerToken: string;

    beforeEach(async () => {
      ({ token: attackerToken } = await makeUser());
    });

    it('does not let a user change another account', async () => {
      const res = await api()
        .put('/usersettings/' + user._id)
        .set('Authorization', 'Bearer ' + attackerToken)
        .send({ email: uniqueEmail('stolen') });
      expect(res).to.have.status(403);
      expect(res.body.msg).to.eql('Not allowed to change another user');
      expect((await User.findById(user._id))!.email).to.eql(user.email);
    });

    it('does not let a user delete another account', async () => {
      const res = await api()
        .delete('/deleteuser/' + user._id)
        .set('Authorization', 'Bearer ' + attackerToken);
      expect(res).to.have.status(403);
      expect(res.body.msg).to.eql('Not allowed to change another user');
      expect(await User.findById(user._id)).to.not.eql(null);
    });
  });
});
