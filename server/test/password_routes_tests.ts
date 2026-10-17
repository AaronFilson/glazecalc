import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { api, expect, sessionToken } from './support/app.ts';
import User from '../models/user.ts';
import PasswordReset from '../models/password_reset.ts';
import appSecret from '../lib/app_secret.ts';
import * as mail from './support/mail.ts';
import { makeToken } from './support/tokens.ts';
import AccessToken from '../models/access_token.ts';
import Recipe from '../models/recipe.ts';
import ShareLink from '../models/share_link.ts';

const basic = (address: string, pw: string) => 'Basic ' + Buffer.from(address + ':' + pw).toString('base64');

let count = 0;
const newAddress = () => 'reset' + Date.now() + '-' + count++ + '@tester.com';

const makeUser = async (address: string, pw = 'old-password') => {
  const user = new User({ email: address });
  user.hashPassword(pw);
  await user.save();
  return user;
};
const signIn = (address: string, pw: string) => api().get('/signin').set('authorization', basic(address, pw));
const forgot = (address: string) => api().post('/password/forgot').send({ email: address });
const reset = (token: string | null, pw: string) => api().post('/password/reset').send({ token, password: pw });
const verify = (token: string | null) =>
  api()
    .get('/verify')
    .set('Authorization', 'Bearer ' + token);

// Asks for a reset link for the address and returns the token from the email.
const resetToken = async (address: string) => {
  const before = mail.to(address).length;
  const res = await forgot(address);
  expect(res).to.have.status(200);
  const sent = await mail.waitFor(address, before + 1);
  expect(sent).to.have.length(before + 1);
  return mail.tokenIn(sent[sent.length - 1]);
};

describe('password reset and change', () => {
  describe('asking for a reset link', () => {
    it('answers the same for an unknown email and only mails real accounts', async () => {
      const known = newAddress();
      await makeUser(known);
      const unknown = newAddress();

      const a = await forgot(known);
      const b = await forgot(unknown);
      expect(a).to.have.status(200);
      expect(b).to.have.status(200);
      expect(a.body).to.eql(b.body);

      const sent = await mail.waitFor(known, 1);
      expect(sent).to.have.length(1);
      expect(sent[0].subject).to.eql('Reset your Glazecalc password');
      expect(sent[0].text).to.match(/https:\/\/glazecalc\.test\/reset#token=[A-Za-z0-9_-]{43}\n/);
      await mail.settle();
      expect(mail.to(unknown)).to.have.length(0);
    });

    it('finds the account whatever the case of the email', async () => {
      const address = newAddress();
      await makeUser(address);
      await forgot(address.toUpperCase());
      expect(await mail.waitFor(address, 1)).to.have.length(1);
    });

    it('stores only a hash of the token, kept for the hour the limit counts', async () => {
      const address = newAddress();
      const user = await makeUser(address);
      const token = await resetToken(address);
      const stored = await PasswordReset.find({ userId: user._id });
      expect(stored).to.have.length(1);
      expect(stored[0].tokenHash).to.eql(crypto.createHash('sha256').update(token!).digest('hex'));
      expect(JSON.stringify(stored[0])).to.not.include(token);
      // MongoDB deletes it then; deleted after the link's 30 minutes, it would no longer count.
      const minutes = (stored[0].expiresAt.getTime() - Date.now()) / 60000;
      expect(minutes).to.be.within(59, 60.1);
    });

    it('needs an email', async () => {
      for (const body of [{}, { email: 'nope' }, { email: { $ne: null } }]) {
        const res = await api().post('/password/forgot').send(body);
        expect(res).to.have.status(400);
        expect(res.body.msg).to.eql('Please enter an email');
      }
    });

    it('sends at most three links an hour to one account', async () => {
      const address = newAddress();
      await makeUser(address);
      for (let i = 1; i <= 4; i++) {
        expect(await forgot(address)).to.have.status(200);
        await mail.waitFor(address, Math.min(i, 3));
      }
      await mail.settle();
      expect(mail.to(address)).to.have.length(3);
    });

    it('says so when email is not set up in production', async () => {
      const saved = { node: process.env.NODE_ENV, transport: process.env.MAIL_TRANSPORT };
      process.env.NODE_ENV = 'production';
      delete process.env.MAIL_TRANSPORT;
      try {
        const res = await forgot(newAddress());
        expect(res).to.have.status(503);
        expect(res.body.msg).to.eql('Password reset by email is not available yet.');
      } finally {
        process.env.NODE_ENV = saved.node;
        if (saved.node === undefined) delete process.env.NODE_ENV;
        process.env.MAIL_TRANSPORT = saved.transport;
      }
    });
  });

  describe('using a reset link', () => {
    it('sets the new password, signs out every device and sends a notice', async () => {
      const address = newAddress();
      const user = await makeUser(address);
      const oldLogin = user.generateToken();
      expect(await verify(oldLogin)).to.have.status(200);

      const res = await reset(await resetToken(address), 'brand-new-password');
      expect(res).to.have.status(200);
      expect(res.body).to.not.have.property('token');

      expect(await signIn(address, 'old-password')).to.have.status(401);
      expect(await signIn(address, 'brand-new-password')).to.have.status(200);
      expect(await verify(oldLogin)).to.have.status(401);
      const sent = await mail.waitFor(address, 2);
      expect(sent[1].subject).to.eql('Your Glazecalc password was changed');
    });

    it('works only once', async () => {
      const address = newAddress();
      await makeUser(address);
      const token = await resetToken(address);
      expect(await reset(token, 'first-new-password')).to.have.status(200);
      const again = await reset(token, 'second-new-password');
      expect(again).to.have.status(400);
      expect(again.body.msg).to.match(/not valid or has expired/);
      expect(await signIn(address, 'first-new-password')).to.have.status(200);
    });

    it('stops working when a newer link is sent', async () => {
      const address = newAddress();
      await makeUser(address);
      const first = await resetToken(address);
      const second = await resetToken(address);
      expect(await reset(first, 'new-password-1')).to.have.status(400);
      expect(await reset(second, 'new-password-2')).to.have.status(200);
    });

    it("stops working when the account's email changes", async () => {
      // A link sent to the old address, which someone else may read.
      const address = newAddress();
      const user = await makeUser(address);
      const token = await resetToken(address);
      const moved = newAddress();
      const change = await api()
        .post('/email/change')
        .set('Authorization', 'Bearer ' + user.generateToken())
        .send({ email: moved, password: 'old-password' });
      expect(change).to.have.status(200);
      const link = mail.linkTokenIn((await mail.waitFor(moved, 1))[0]!);
      expect(await api().post('/email/confirm').send({ token: link })).to.have.status(200);
      expect(await reset(token, 'taken-over-password')).to.have.status(400);
      expect(await signIn(moved, 'old-password')).to.have.status(200);
    });

    it('refuses expired, unknown and missing tokens', async () => {
      const address = newAddress();
      const user = await makeUser(address);
      const token = await resetToken(address);
      // Sent 31 minutes ago: the link has expired, though the request is kept for the hour.
      await PasswordReset.collection.updateOne(
        { userId: user._id },
        { $set: { createdAt: new Date(Date.now() - 31 * 60 * 1000) } }
      );
      expect(await reset(token, 'new-password')).to.have.status(400);
      expect(await reset('not-a-real-token', 'new-password')).to.have.status(400);
      expect(await api().post('/password/reset').send({ password: 'new-password' })).to.have.status(400);
      expect(
        await api()
          .post('/password/reset')
          .send({ token: { $ne: null }, password: 'new-password' })
      ).to.have.status(400);
      expect(await signIn(address, 'old-password')).to.have.status(200);
    });

    it('applies the password rules and keeps the link usable after a refusal', async () => {
      const address = newAddress();
      await makeUser(address);
      const token = await resetToken(address);
      const short = await reset(token, 'short');
      expect(short).to.have.status(400);
      expect(short.body.msg).to.match(/8 characters or longer/);
      expect(short.body.field).to.equal('password');
      // bcrypt would ignore everything past 72 bytes.
      const long = await reset(token, 'a'.repeat(73));
      expect(long).to.have.status(400);
      expect(long.body.msg).to.match(/at most 72 characters/);
      expect(await reset(token, 'é'.repeat(40))).to.have.status(400);
      expect(await reset(token, 'a'.repeat(72))).to.have.status(200);
    });

    it('stops the access tokens, the provider links and the share links together, and says so in one email', async () => {
      const address = newAddress();
      const user = await makeUser(address);
      const linkedAt = new Date();
      user.identities = [
        { provider: 'google', subject: 'g-' + address, uid: 'google:g-' + address, linkedAt },
        { provider: 'github', subject: 'h-' + address, uid: 'github:h-' + address, linkedAt }
      ];
      await user.save();
      const tokens = [await makeToken(user), await makeToken(user, { kind: 'oauth' })];
      const recipe = await Recipe.create({ title: 'Shared', ownedBy: String(user._id), materials: [{ name: 'Talc' }] });
      await ShareLink.create({
        ownedBy: String(user._id),
        recipeId: recipe._id,
        hash: crypto.randomBytes(32).toString('hex')
      });

      const before = mail.to(address).length;
      expect(await reset(await resetToken(address), 'brand-new-password')).to.have.status(200);
      expect(await AccessToken.countDocuments({ userId: user._id, revokedWhy: 'password-reset' })).to.equal(
        tokens.length
      );
      expect((await User.findById(user._id).lean())!.identities).to.eql([]);
      expect(await ShareLink.countDocuments({ ownedBy: String(user._id) })).to.equal(0);

      // One notice after the reset email, with a line for each, in one piece.
      const sent = await mail.waitFor(address, before + 2);
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(mail.to(address)).to.have.length(before + 2);
      const notice = sent[before + 1]!;
      expect(notice.subject).to.equal('Your Glazecalc password was changed');
      const lines = notice.text.split('\n');
      const at = (start: string) => lines.findIndex((line) => line.startsWith(start));
      expect(notice.text).to.include('In case someone else had the old password, the reset also stopped these:');
      expect(lines[at('- The access tokens')]).to.include('could reach your saved work (2)');
      expect(lines[at('- Signing in with')]).to.include('Signing in with Google, GitHub, which you can link again');
      expect(lines[at('- The links you had made to share recipes')]).to.include('make new ones from each recipe');
      expect([at('- The access tokens'), at('- Signing in with'), at('- The links')]).to.satisfy((order: number[]) =>
        order.every((index, i) => index > 0 && (i === 0 || index === order[i - 1]! + 1))
      );
      expect(notice.text).to.include('/account');
      expect(notice.text).to.match(
        /If this was you, there is nothing else to do\. If not, reset your password right away at \S+\/forgot\n/
      );
      expect(notice.text).to.match(/\n-- \nGlazecalc, \S+\n$/);
    });

    it('names only what a reset stopped, and is the changed-password email in its language when it stopped nothing', async () => {
      const onlyLinks = newAddress();
      const user = await makeUser(onlyLinks);
      const recipe = await Recipe.create({ title: 'Shared', ownedBy: String(user._id), materials: [{ name: 'Talc' }] });
      await ShareLink.create({
        ownedBy: String(user._id),
        recipeId: recipe._id,
        hash: crypto.randomBytes(32).toString('hex')
      });
      const before = mail.to(onlyLinks).length;
      expect(await reset(await resetToken(onlyLinks), 'brand-new-password')).to.have.status(200);
      const notice = (await mail.waitFor(onlyLinks, before + 2))[before + 1]!;
      expect(notice.text).to.include('- The links you had made to share recipes');
      expect(notice.text).to.not.include('access tokens').and.not.include('Signing in with');

      // Nothing to stop: the changed-password email, translated.
      const plain = newAddress();
      const german = await makeUser(plain);
      german.preferences = { ...german.preferences, language: 'de' };
      await german.save();
      const plainBefore = mail.to(plain).length;
      expect(await reset(await resetToken(plain), 'brand-new-password')).to.have.status(200);
      const changed = (await mail.waitFor(plain, plainBefore + 2))[plainBefore + 1]!;
      expect(changed.subject).to.equal('Ihr Passwort für Glazecalc wurde geändert');
      expect(changed.text).to.not.include('stopped');
    });
  });

  describe('changing the password while signed in', () => {
    const change = (token: string, body: object) =>
      api()
        .put('/password')
        .set('Authorization', 'Bearer ' + token)
        .send(body);

    it('needs the current password, then keeps only this device signed in', async () => {
      const address = newAddress();
      const user = await makeUser(address);
      const otherDevice = user.generateToken();
      const thisDevice = user.generateToken();

      const wrong = await change(thisDevice, { current: 'not-it', password: 'changed-password' });
      expect(wrong).to.have.status(400);
      expect(wrong.body).to.eql({
        code: 'current-password-wrong',
        msg: 'Your current password is not correct.',
        field: 'current'
      });
      expect(await verify(thisDevice)).to.have.status(200);

      const res = await change(thisDevice, { current: 'old-password', password: 'changed-password' });
      expect(res).to.have.status(200);
      expect(res.body.email).to.eql(address);
      expect(await verify(sessionToken(res))).to.have.status(200);
      expect(await verify(otherDevice)).to.have.status(401);
      expect(await verify(thisDevice)).to.have.status(401);
      expect(await signIn(address, 'changed-password')).to.have.status(200);
      const sent = await mail.waitFor(address, 1);
      expect(sent[0].subject).to.eql('Your Glazecalc password was changed');
    });

    it('applies the password rules and needs a sign-in', async () => {
      const address = newAddress();
      const user = await makeUser(address);
      expect(await change(user.generateToken(), { current: 'old-password', password: 'short' })).to.have.status(400);
      expect(
        await api().put('/password').send({ current: 'old-password', password: 'changed-password' })
      ).to.have.status(401);
    });

    it('cancels open reset links', async () => {
      const address = newAddress();
      const user = await makeUser(address);
      const token = await resetToken(address);
      expect(
        await change(user.generateToken(), { current: 'old-password', password: 'changed-password' })
      ).to.have.status(200);
      expect(await reset(token, 'another-password')).to.have.status(400);
    });
  });

  describe('sign-in', () => {
    it('gives the same answer for an unknown email and a wrong password', async () => {
      const address = newAddress();
      await makeUser(address);
      const unknown = await signIn(newAddress(), 'old-password');
      const wrong = await signIn(address, 'wrong-password');
      expect(unknown).to.have.status(401);
      expect(wrong).to.have.status(401);
      expect(unknown.body).to.eql(wrong.body);
      expect(wrong.body.msg).to.eql('Email or password is incorrect.');
    });

    it('still accepts login tokens made before token versions existed', async () => {
      const user = await makeUser(newAddress());
      const oldStyle = jwt.sign({ id: user._id }, appSecret, { algorithm: 'HS256', expiresIn: '7d' });
      expect(await verify(oldStyle)).to.have.status(200);
    });

    it('treats a database failure as a server error, not a sign-out', async () => {
      const user = await makeUser(newAddress());
      const token = user.generateToken();
      const findById = User.findById;
      // The sign-in check awaits User.findById(id, projection) itself.
      User.findById = (() => Promise.reject(new Error('connection lost'))) as unknown as typeof User.findById;
      try {
        const res = await verify(token);
        expect(res).to.have.status(500);
      } finally {
        User.findById = findById;
      }
    });
  });

  describe('rate limits', () => {
    beforeEach(() => {
      process.env.RATE_LIMITS = 'on';
    });
    afterEach(() => {
      process.env.RATE_LIMITS = 'off';
    });

    it('slows down repeated reset requests from one address', async () => {
      const statuses: number[] = [];
      for (let i = 0; i < 6; i++) statuses.push((await forgot(newAddress())).status);
      expect(statuses).to.eql([200, 200, 200, 200, 200, 429]);
      const res = await forgot(newAddress());
      expect(res.body.msg).to.match(/Too many password reset requests/);
      expect(res.headers).to.have.property('ratelimit-policy');
    });

    it('slows down repeated sign-in attempts', async () => {
      let last: ChaiHttp.Response | undefined;
      for (let i = 0; i < 21; i++) last = await signIn('nobody@tester.com', 'wrong-password');
      expect(last).to.have.status(429);
    });
  });
});
