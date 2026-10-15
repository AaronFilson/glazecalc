// Decision 6 for the account itself (docs/mfa-plan.md): with two-step sign-in
// on, changing the email or the password and deleting the account need the
// password and a current factor, as the changes to how it signs in do.
import * as recoveryCodes from '../lib/recovery_codes.ts';
import * as totp from '../lib/totp.ts';
import EmailToken from '../models/email_token.ts';
import User from '../models/user.ts';
import { api, expect, makeUser, sessionToken, uniqueEmail } from './support/app.ts';
import * as mail from './support/mail.ts';

type Res = Awaited<ReturnType<ReturnType<typeof api>['get']>>;

interface Account {
  user: Awaited<ReturnType<typeof makeUser>>['user'];
  token: string;
  email: string;
  password: string;
}

const auth = (account: Pick<Account, 'token'>) => ({ Authorization: 'Bearer ' + account.token });

/** An account with an authenticator app, set up through the routes, and its secret and recovery codes. */
const withTotp = async () => {
  const made = await makeUser();
  const account: Account = { user: made.user, token: made.token, email: made.email, password: made.password };
  const started = await api().post('/mfa/totp/start').set(auth(account)).send({ password: account.password });
  expect(started, JSON.stringify(started.body)).to.have.status(200);
  const secret = totp.fromBase32(started.body.secret);
  const added = await api()
    .post('/mfa/totp')
    .set(auth(account))
    .send({ code: totp.codeAt(secret, totp.stepAt()) });
  expect(added, JSON.stringify(added.body)).to.have.status(200);
  account.token = sessionToken(added)!;
  return { account, secret, codes: added.body.recoveryCodes as string[] };
};

/**
 * A code the account will take now. A code is taken once per 30-second step,
 * so rather than wait, the test moves the account's last step back.
 */
const codeNow = async (account: Account, secret: Buffer): Promise<string> => {
  await User.updateOne({ _id: account.user._id }, { $set: { 'mfa.totp.lastStep': totp.stepAt() - 2 } });
  return totp.codeAt(secret, totp.stepAt());
};
const lastStep = async (account: Account) => (await User.findById(account.user._id).lean())!.mfa!.totp!.lastStep;

const changeEmail = (account: Account, body: object) => api().post('/email/change').set(auth(account)).send(body);
const changePassword = (account: Account, body: object) => api().put('/password').set(auth(account)).send(body);
const deleteSelf = (account: Account, body: object) =>
  api()
    .delete('/deleteuser/' + String(account.user._id))
    .set(auth(account))
    .send(body);

/** The password and any factor, as lib/mfa.d.ts IdentityProof (loosely, to send wrong ones too). */
type Proof = { password: string; code?: string; recoveryCode?: string };

/** Each change: how to send it with a proof. */
const CHANGES: Array<[string, (account: Account, proof: Proof) => Promise<Res>]> = [
  ['changing the email', (account, proof) => changeEmail(account, { email: uniqueEmail('moved'), ...proof })],
  [
    'changing the password',
    (account, { password, ...factor }) =>
      changePassword(account, { current: password, password: 'a-new-password', ...factor })
  ],
  ['deleting the account', (account, proof) => deleteSelf(account, proof)]
];

describe('changing the email or password, or deleting, with two-step sign-in on (decision 6)', () => {
  for (const [what, send] of CHANGES) {
    describe(what, () => {
      it('refuses the password alone, with factor-needed, and changes nothing', async () => {
        const { account } = await withTotp();
        const res = await send(account, { password: account.password });
        expect(res, JSON.stringify(res.body)).to.have.status(400);
        expect(res.body.code).to.eql('factor-needed');
        expect(await User.exists({ _id: account.user._id })).to.not.eql(null);
      });

      it('refuses a wrong code', async () => {
        const { account, secret } = await withTotp();
        const right = await codeNow(account, secret);
        const wrong = String((Number(right) + 1) % 1_000_000).padStart(6, '0');
        const res = await send(account, { password: account.password, code: wrong });
        expect(res).to.have.status(400);
        expect(res.body.code).to.eql('code-wrong');
        expect(res.body.field).to.eql('code');
      });

      it('never uses a factor when the password is wrong', async () => {
        const { account, secret, codes } = await withTotp();
        const code = await codeNow(account, secret);
        const before = await lastStep(account);
        const res = await send(account, { password: 'not-the-password', code });
        expect(res).to.have.status(400);
        expect(res.body.code).to.eql('current-password-wrong');
        expect(await lastStep(account)).to.eql(before);

        const recovery = await send(account, { password: 'not-the-password', recoveryCode: codes[0] });
        expect(recovery).to.have.status(400);
        const fresh = await User.findById(account.user._id).lean();
        expect(recoveryCodes.left(fresh!)).to.eql(codes.length);

        // The code is still good for the right password.
        const ok = await send(account, { password: account.password, code });
        expect(ok, JSON.stringify(ok.body)).to.have.status(200);
      });

      it('goes ahead with the password and a code', async () => {
        const { account, secret } = await withTotp();
        const res = await send(account, { password: account.password, code: await codeNow(account, secret) });
        expect(res, JSON.stringify(res.body)).to.have.status(200);
      });

      it('goes ahead with the password and a recovery code, which is then used up', async () => {
        const { account, codes } = await withTotp();
        const res = await send(account, { password: account.password, recoveryCode: codes[0] });
        expect(res, JSON.stringify(res.body)).to.have.status(200);
        // A deleted account has none left to count.
        const after = await User.findById(account.user._id).lean();
        if (after) expect(recoveryCodes.left(after)).to.eql(codes.length - 1);
        expect((await send(account, { password: account.password, recoveryCode: codes[0] })).status).to.not.eql(200);
      });
    });
  }

  it('names the current password field "current" when changing the password', async () => {
    const { account } = await withTotp();
    const res = await changePassword(account, { password: 'a-new-password' });
    expect(res).to.have.status(400);
    expect(res.body.code).to.eql('current-password-needed');
    expect(res.body.field).to.eql('current');
  });

  it('checks the new address is free before using a factor', async () => {
    const { account, secret } = await withTotp();
    const other = await makeUser();
    const code = await codeNow(account, secret);
    const before = await lastStep(account);
    const res = await changeEmail(account, { email: other.email, password: account.password, code });
    expect(res).to.have.status(400);
    expect(res.body.code).to.eql('email-in-use');
    expect(await lastStep(account)).to.eql(before);
  });

  it('cancels a pending request to turn two-step sign-in off once a factor is used', async () => {
    const { account, secret } = await withTotp();
    await User.updateOne({ _id: account.user._id }, { $set: { 'mfa.clearRequestedAt': new Date() } });
    const res = await changeEmail(account, {
      email: uniqueEmail('moved'),
      password: account.password,
      code: await codeNow(account, secret)
    });
    expect(res).to.have.status(200);
    expect((await User.findById(account.user._id).lean())!.mfa!.clearRequestedAt).to.eql(undefined);
  });

  it('asks for the password alone without two-step sign-in, as before', async () => {
    const plain = await makeUser();
    const account = { user: plain.user, token: plain.token, email: plain.email, password: plain.password };
    expect(await changeEmail(account, { email: uniqueEmail('moved'), password: plain.password })).to.have.status(200);
    const wrong = await changePassword(account, { current: 'nope', password: 'a-new-password' });
    expect(wrong.body.code).to.eql('current-password-wrong');
    expect(await changePassword(account, { current: plain.password, password: 'a-new-password' })).to.have.status(200);
  });
});

describe('when the email last changed (emailChangedAt)', () => {
  it('is set when the link to a new address is opened, and not before', async () => {
    const { user, token, password } = await makeUser();
    const address = uniqueEmail('moved');
    const asked = await api()
      .post('/email/change')
      .set({ Authorization: 'Bearer ' + token })
      .send({ email: address, password });
    expect(asked).to.have.status(200);
    expect((await User.findById(user._id).lean())!.emailChangedAt).to.eql(undefined);

    const [sent] = await mail.waitFor(address, 1);
    const before = Date.now();
    const res = await api()
      .post('/email/confirm')
      .send({ token: mail.linkTokenIn(sent!) });
    expect(res.body.code).to.eql('email-changed');
    const changedAt = (await User.findById(user._id).lean())!.emailChangedAt!;
    expect(changedAt.getTime()).to.be.within(before - 1000, Date.now() + 1000);
    expect(await EmailToken.countDocuments({ userId: user._id, usedAt: null })).to.eql(0);
  });

  it('is in the data export', async () => {
    const { user, token } = await makeUser();
    const when = new Date('2026-10-01T10:00:00Z');
    await User.updateOne({ _id: user._id }, { $set: { emailChangedAt: when } });
    const res = await api()
      .get('/export')
      .set({ Authorization: 'Bearer ' + token });
    expect(res, JSON.stringify(res.body)).to.have.status(200);
    expect(res.body.account.emailChangedAt).to.eql(when.toISOString());
  });
});
