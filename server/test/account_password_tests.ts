import User, { type UserDocument } from '../models/user.ts';
import { api, expect, makeUser } from './support/app.ts';

// A stolen sign-in token alone must not be enough to take over or remove an account.
describe('changing the email or deleting the account needs the current password', () => {
  let user: UserDocument;
  let token: string;

  beforeEach(async () => {
    user = new User({ email: 'owner' + Date.now() + '@tester.com' });
    user.hashPassword('right-password');
    await user.save();
    token = user.generateToken();
  });

  it('refuses an email change without the right password, and keeps the sign-in', async () => {
    for (const body of [{ email: 'new@tester.com' }, { email: 'new@tester.com', password: 'wrong' }]) {
      const res = await api()
        .put('/usersettings/' + user._id)
        .set('Authorization', 'Bearer ' + token)
        .send(body);
      expect(res).to.have.status(400);
      expect(res.body.msg).to.eql('Please enter your current password.');
    }
    expect((await User.findById(user._id))!.email).to.eql(user.email);
    expect(
      await api()
        .get('/verify')
        .set('Authorization', 'Bearer ' + token)
    ).to.have.status(200);
  });

  it('changes other settings without a password', async () => {
    const res = await api()
      .put('/usersettings/' + user._id)
      .set('Authorization', 'Bearer ' + token)
      .send({ displayname: 'Potter' });
    expect(res).to.have.status(200);
  });

  it('refuses to delete the account without the right password', async () => {
    for (const body of [{}, { password: 'wrong' }]) {
      const res = await api()
        .delete('/deleteuser/' + user._id)
        .set('Authorization', 'Bearer ' + token)
        .send(body);
      expect(res).to.have.status(400);
    }
    expect(await User.findById(user._id)).to.not.eql(null);
  });

  it('deletes the account with the right password', async () => {
    const res = await api()
      .delete('/deleteuser/' + user._id)
      .set('Authorization', 'Bearer ' + token)
      .send({ password: 'right-password' });
    expect(res).to.have.status(200);
    expect(await User.findById(user._id)).to.eql(null);
  });
});

// Someone holding a stolen session could otherwise guess the password over and
// over through these routes; the limit counts per account, from any address.
describe('guessing the current password', () => {
  beforeEach(() => {
    process.env.RATE_LIMITS = 'on';
  });
  afterEach(() => {
    process.env.RATE_LIMITS = 'off';
  });

  it('stops after 10 tries in 15 minutes on one account, across the routes that check it', async () => {
    const { user, token } = await makeUser({ password: 'right-password' });
    const statuses: number[] = [];
    for (let i = 0; i < 4; i++) {
      const res = await api()
        .delete('/deleteuser/' + user._id)
        .set('Authorization', 'Bearer ' + token)
        .send({ password: 'guess-' + i });
      statuses.push(res.status);
    }
    for (let i = 0; i < 4; i++) {
      const res = await api()
        .put('/usersettings/' + user._id)
        .set('Authorization', 'Bearer ' + token)
        .send({ email: 'taken-over-' + i + '@tester.com', password: 'guess-' + i });
      statuses.push(res.status);
    }
    for (let i = 0; i < 3; i++) {
      const res = await api()
        .put('/password')
        .set('Authorization', 'Bearer ' + token)
        .send({ current: 'guess-' + i, password: 'a-new-password' });
      statuses.push(res.status);
    }
    expect(statuses).to.eql([400, 400, 400, 400, 400, 400, 400, 400, 400, 400, 429]);

    // Even the right password waits now, and nothing changed.
    const right = await api()
      .delete('/deleteuser/' + user._id)
      .set('Authorization', 'Bearer ' + token)
      .send({ password: 'right-password' });
    expect(right).to.have.status(429);
    expect(right.body.msg).to.match(/Too many attempts/);
    expect(await User.findById(user._id)).to.not.eql(null);

    // Another account is not held up.
    const other = await makeUser({ password: 'right-password' });
    const ok = await api()
      .put('/usersettings/' + other.user._id)
      .set('Authorization', 'Bearer ' + other.token)
      .send({ displayname: 'Potter' });
    expect(ok).to.have.status(200);
  });
});
