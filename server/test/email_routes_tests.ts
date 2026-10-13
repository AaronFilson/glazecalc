import EmailToken from '../models/email_token.ts';
import User from '../models/user.ts';
import { api, expect, makeUser, sessionToken, uniqueEmail } from './support/app.ts';
import * as mail from './support/mail.ts';

const auth = (token: string) => ({ Authorization: 'Bearer ' + token });
const signUp = (address: string) => api().post('/signup').send({ email: address, password: 'password123' });
const confirm = (token: string | null) => api().post('/email/confirm').send({ token });
const verify = (token: string) => api().get('/verify').set(auth(token));

// A new account with its emailed link's token.
const newAccount = async () => {
  const address = uniqueEmail('new');
  const res = await signUp(address);
  expect(res).to.have.status(200);
  const [sent] = await mail.waitFor(address, 1);
  return { address, token: sessionToken(res)!, link: mail.linkTokenIn(sent!)! };
};

describe('confirming an address at sign-up', () => {
  it('starts an account unverified, with a link emailed to its address', async () => {
    const { address, token, link } = await newAccount();
    expect(mail.to(address)[0]!.subject).to.eql('Confirm your email for Glazecalc');
    expect(mail.to(address)[0]!.text).to.include('https://glazecalc.test/confirm-email#token=');
    expect((await User.findOne({ email: address }))!.emailUnverified).to.eql(true);
    expect((await verify(token)).body.unverified).to.eql(true);

    const res = await confirm(link);
    expect(res).to.have.status(200);
    expect(res.body.code).to.eql('email-verified');
    expect((await User.findOne({ email: address }))!.emailUnverified).to.eql(undefined);
    expect((await verify(token)).body.unverified).to.eql(undefined);
  });

  it('counts accounts from before as verified', async () => {
    const { token } = await makeUser();
    expect((await verify(token)).body.unverified).to.eql(undefined);
  });

  it('keeps the account usable while it is unverified', async () => {
    const { token } = await newAccount();
    const res = await api().get('/recipe').set(auth(token));
    expect(res.status).to.not.eql(401);
  });

  it('works once, and not for a link that is expired, unknown or not text', async () => {
    const { link } = await newAccount();
    expect(await confirm(link)).to.have.status(200);
    expect(await confirm(link)).to.have.status(400);

    const second = await newAccount();
    await EmailToken.updateMany({}, { $set: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await confirm(second.link)).to.have.status(400);
    expect(await confirm('not-a-real-token')).to.have.status(400);
    expect(await api().post('/email/confirm').send({})).to.have.status(400);
    expect(await confirm({ $ne: null } as unknown as string)).to.have.status(400);
  });

  it('refuses a sign-up with an address an unverified account holds, as it does for any account', async () => {
    const { address } = await newAccount();
    const res = await signUp(address.toUpperCase());
    expect(res).to.have.status(400);
    expect(res.body.code).to.eql('account-exists');
    expect(await User.countDocuments({ email: address })).to.eql(1);
  });

  it('mails an unverified address a reset link on request, which then confirms it', async () => {
    const { address, token } = await newAccount();
    expect(await api().post('/password/forgot').send({ email: address })).to.have.status(200);
    const [, resetMail] = await mail.waitFor(address, 2);
    const resetToken = mail.tokenIn(resetMail!)!;
    expect(await api().post('/password/reset').send({ token: resetToken, password: 'a-new-password' })).to.have.status(
      200
    );
    expect((await User.findOne({ email: address }))!.emailUnverified).to.eql(undefined);
    // The password was the stranger's to choose; now it is the owner's, and the old session is over.
    expect(await verify(token)).to.have.status(401);
    const [, , changed] = await mail.waitFor(address, 3);
    expect(changed!.subject).to.eql('Your Glazecalc password was changed');
  });

  it('sends no password-changed notice to an address nobody has confirmed', async () => {
    const { address, token } = await newAccount();
    const res = await api()
      .put('/password')
      .set(auth(token))
      .send({ current: 'password123', password: 'a-new-password' });
    expect(res).to.have.status(200);
    await mail.settle();
    expect(mail.to(address)).to.have.length(1);
  });

  describe('sending the link again', () => {
    it('sends a new link, and the old one stops working', async () => {
      const { address, token, link } = await newAccount();
      const res = await api().post('/email/resend').set(auth(token));
      expect(res).to.have.status(200);
      expect(res.body.code).to.eql('verification-sent');
      const sent = await mail.waitFor(address, 2);
      expect(await confirm(link)).to.have.status(400);
      expect(await confirm(mail.linkTokenIn(sent[1]!))).to.have.status(200);
    });

    it('says so when the address is already confirmed, and refuses trials and the signed-out', async () => {
      const { token } = await makeUser();
      const done = await api().post('/email/resend').set(auth(token));
      expect(done).to.have.status(400);
      expect(done.body.code).to.eql('already-verified');
      expect(await api().post('/email/resend')).to.have.status(401);
      const trial = await api().post('/guest').send({});
      expect(
        await api()
          .post('/email/resend')
          .set(auth(sessionToken(trial)!))
      ).to.have.status(403);
    });

    it('stops after 5 links in an hour for one account', async () => {
      const { token } = await newAccount();
      const statuses: number[] = [];
      for (let i = 0; i < 5; i++) statuses.push((await api().post('/email/resend').set(auth(token))).status);
      expect(statuses).to.eql([200, 200, 200, 200, 429]);
    });

    it('is rate-limited by address, together with email changes', async () => {
      process.env.RATE_LIMITS = 'on';
      try {
        const { token } = await makeUser();
        // Other tests may have used some of the five already.
        const statuses: number[] = [];
        for (let i = 0; i < 3; i++) statuses.push((await api().post('/email/resend').set(auth(token))).status);
        for (let i = 0; i < 3; i++) statuses.push((await api().post('/email/change').set(auth(token)).send({})).status);
        expect(statuses).to.include(429);
        expect(statuses.indexOf(429)).to.be.at.most(5);
        expect(statuses.filter((status) => status !== 400 && status !== 429)).to.eql([]);
      } finally {
        process.env.RATE_LIMITS = 'off';
      }
    });
  });

  it('works for a trial turned into an account', async () => {
    const trial = await api().post('/guest').send({});
    const address = uniqueEmail('claimed');
    const res = await api()
      .post('/guest/claim')
      .set(auth(sessionToken(trial)!))
      .send({ email: address, password: 'password123' });
    expect(res).to.have.status(200);
    const [sent] = await mail.waitFor(address, 1);
    expect(await confirm(mail.linkTokenIn(sent!))).to.have.status(200);
  });
});

describe('changing the email', () => {
  const change = (token: string, address: string, password = 'password123') =>
    api().post('/email/change').set(auth(token)).send({ email: address, password });

  it('changes the address only when the link sent to the new one is opened', async () => {
    const { user, token, email: old } = await makeUser();
    const address = uniqueEmail('moved');
    const res = await change(token, address.toUpperCase());
    expect(res).to.have.status(200);
    expect(res.body.code).to.eql('email-change-sent');

    const [link] = await mail.waitFor(address, 1);
    expect(link!.subject).to.eql('Confirm your new email for Glazecalc');
    const [notice] = await mail.waitFor(old, 1);
    expect(notice!.subject).to.eql('A new email was requested for your Glazecalc account');
    expect(notice!.text).to.not.include(address);
    expect((await User.findById(user._id))!.email).to.eql(old);
    expect(await verify(token)).to.have.status(200);

    const done = await confirm(mail.linkTokenIn(link!));
    expect(done).to.have.status(200);
    expect(done.body.code).to.eql('email-changed');
    const stored = (await User.findById(user._id))!;
    expect(stored.email).to.eql(address);
    expect(stored.tokenVersion).to.eql(1);
    // Every device is signed out, and the new address signs in.
    expect(await verify(token)).to.have.status(401);
    const signedIn = await api()
      .get('/signin')
      .set('authorization', 'Basic ' + Buffer.from(address + ':password123').toString('base64'));
    expect(signedIn).to.have.status(200);
  });

  it('works once', async () => {
    const { token } = await makeUser();
    const address = uniqueEmail('moved');
    await change(token, address);
    const link = mail.linkTokenIn((await mail.waitFor(address, 1))[0]!);
    expect(await confirm(link)).to.have.status(200);
    expect(await confirm(link)).to.have.status(400);
  });

  it('ends once a newer link is asked for, or the link has expired', async () => {
    const { token } = await makeUser();
    const first = uniqueEmail('first');
    const second = uniqueEmail('second');
    await change(token, first);
    await change(token, second);
    const firstLink = mail.linkTokenIn((await mail.waitFor(first, 1))[0]!);
    const secondLink = mail.linkTokenIn((await mail.waitFor(second, 1))[0]!);
    expect(await confirm(firstLink)).to.have.status(400);
    await EmailToken.updateMany({}, { $set: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await confirm(secondLink)).to.have.status(400);
    expect(await User.countDocuments({ email: { $in: [first, second] } })).to.eql(0);
  });

  it('needs the right password, and a valid address that is not in use', async () => {
    const { user, token } = await makeUser();
    const other = await makeUser();
    expect((await change(token, uniqueEmail(), 'wrong')).body.code).to.eql('current-password-needed');
    expect((await change(token, 'not an address')).body.code).to.eql('email-required');
    expect((await change(token, 'someone@guest.invalid')).body.code).to.eql('email-required');
    // The same answer sign-up gives, and no mail goes to the holder.
    const taken = await change(token, other.email.toUpperCase());
    expect(taken).to.have.status(400);
    expect(taken.body.code).to.eql('email-in-use');
    expect((await change(token, user.email)).body.code).to.eql('email-in-use');
    await mail.settle();
    expect(mail.to(other.email)).to.have.length(0);
    expect(await EmailToken.countDocuments({ userId: user._id })).to.eql(0);
  });

  it('refuses an address taken before its link is opened', async () => {
    const { user, token } = await makeUser();
    const address = uniqueEmail('raced');
    await change(token, address);
    const link = mail.linkTokenIn((await mail.waitFor(address, 1))[0]!);
    await makeUser({ email: address });
    const res = await confirm(link);
    expect(res).to.have.status(400);
    expect(res.body.code).to.eql('email-in-use');
    expect((await User.findById(user._id))!.tokenVersion).to.eql(0);
  });

  it('confirms the new address of an unverified account, and mails no notice to the old one', async () => {
    const { address, token } = await newAccount();
    const moved = uniqueEmail('moved');
    await change(token, moved);
    // No notice goes to the old address while it is unconfirmed.
    await mail.settle();
    expect(mail.to(address)).to.have.length(1);
    const link = mail.linkTokenIn((await mail.waitFor(moved, 1))[0]!);
    expect(await confirm(link)).to.have.status(200);
    expect((await User.findOne({ email: moved }))!.emailUnverified).to.eql(undefined);
  });

  it('needs a sign-in, and is not for trials', async () => {
    expect(await api().post('/email/change').send({ email: uniqueEmail(), password: 'x' })).to.have.status(401);
    const trial = await api().post('/guest').send({});
    expect((await change(sessionToken(trial)!, uniqueEmail())).status).to.eql(403);
  });

  it('stops after 5 links in an hour for one account', async () => {
    const { token } = await makeUser();
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) statuses.push((await change(token, uniqueEmail())).status);
    expect(statuses).to.eql([200, 200, 200, 200, 200, 429]);
  });

  it('is the only way: account settings leave the email alone, an admin changing another account included', async () => {
    const admin = await makeUser({ role: 'admin' });
    const bob = await makeUser();
    const res = await api()
      .put('/usersettings/' + bob.user._id)
      .set(auth(admin.token))
      .send({ email: uniqueEmail('taken') });
    expect(res).to.have.status(400);
    expect((await User.findById(bob.user._id))!.email).to.eql(bob.email);
  });
});

describe('signing out everywhere', () => {
  it('ends every session, this one included', async () => {
    const { user, token } = await makeUser();
    const other = user.generateToken();
    const res = await api().post('/signout-everywhere').set(auth(token));
    expect(res).to.have.status(200);
    expect(res.body.code).to.eql('signed-out-everywhere');
    expect(String(res.headers['set-cookie'])).to.match(/glazecalc_session=;/);
    expect((await User.findById(user._id))!.tokenVersion).to.eql(1);
    expect(await verify(token)).to.have.status(401);
    expect(await verify(other)).to.have.status(401);
  });

  it('needs a sign-in, and is not for trials', async () => {
    expect(await api().post('/signout-everywhere')).to.have.status(401);
    const trial = await api().post('/guest').send({});
    expect(
      await api()
        .post('/signout-everywhere')
        .set(auth(sessionToken(trial)!))
    ).to.have.status(403);
  });
});
